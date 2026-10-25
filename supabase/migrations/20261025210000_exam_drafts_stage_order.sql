ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.exams
  ALTER COLUMN is_published SET DEFAULT false;

WITH ranked_exams AS (
  SELECT id,
         row_number() OVER (PARTITION BY stage ORDER BY created_at, id) * 10 AS next_order
  FROM public.exams
  WHERE sort_order = 0
)
UPDATE public.exams AS exam
SET sort_order = ranked_exams.next_order
FROM ranked_exams
WHERE exam.id = ranked_exams.id;

CREATE INDEX IF NOT EXISTS exams_stage_sort_order_idx
  ON public.exams (stage, sort_order, created_at, id);

DROP POLICY IF EXISTS "exams read" ON public.exams;
CREATE POLICY "exams read" ON public.exams
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (
      is_published
      AND public.is_approved()
      AND stage = public.my_stage()
    )
  );

CREATE OR REPLACE FUNCTION public.admin_move_exam(_exam_id uuid, _direction text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _stage public.stage_level;
  _exam_ids uuid[];
  _position integer;
  _sort_index integer := 0;
  _swap_id uuid;
  _ordered_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _direction NOT IN ('up', 'down') THEN
    RAISE EXCEPTION 'invalid_direction';
  END IF;

  LOCK TABLE public.exams IN SHARE ROW EXCLUSIVE MODE;

  SELECT stage INTO _stage
  FROM public.exams
  WHERE id = _exam_id;

  IF _stage IS NULL THEN
    RETURN false;
  END IF;

  SELECT array_agg(id ORDER BY sort_order, created_at, id)
  INTO _exam_ids
  FROM public.exams
  WHERE stage = _stage;

  _position := array_position(_exam_ids, _exam_id);
  IF (_direction = 'up' AND _position <= 1)
     OR (_direction = 'down' AND _position >= cardinality(_exam_ids)) THEN
    RETURN false;
  END IF;

  IF _direction = 'up' THEN
    _swap_id := _exam_ids[_position - 1];
    _exam_ids[_position - 1] := _exam_id;
    _exam_ids[_position] := _swap_id;
  ELSE
    _swap_id := _exam_ids[_position + 1];
    _exam_ids[_position + 1] := _exam_id;
    _exam_ids[_position] := _swap_id;
  END IF;

  FOREACH _ordered_id IN ARRAY _exam_ids LOOP
    UPDATE public.exams
    SET sort_order = _sort_index * 10
    WHERE id = _ordered_id;
    _sort_index := _sort_index + 1;
  END LOOP;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_move_exam(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_move_exam(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_exam_questions(_exam_id uuid)
RETURNS TABLE (id uuid, q_order integer, prompt text, image_url text, options jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.exams AS exam
      WHERE exam.id = _exam_id
        AND exam.is_published
        AND public.is_approved()
        AND exam.stage = public.my_stage()
    )
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT question.id, question.q_order, question.prompt, question.image_url, question.options
  FROM public.questions AS question
  WHERE question.exam_id = _exam_id
  ORDER BY question.q_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_exam_review(_exam_id uuid)
RETURNS TABLE (
  id uuid,
  q_order integer,
  prompt text,
  image_url text,
  options jsonb,
  correct_index integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.exams AS exam
      WHERE exam.id = _exam_id
        AND exam.is_published
        AND exam.is_closed
        AND public.is_approved()
        AND exam.stage = public.my_stage()
    )
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    question.id,
    question.q_order,
    question.prompt,
    question.image_url,
    question.options,
    question.correct_index
  FROM public.questions AS question
  WHERE question.exam_id = _exam_id
  ORDER BY question.q_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_attempt(
  _exam_id uuid,
  _answers jsonb,
  _is_cheating boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _objective_score integer := 0;
  _total integer := 0;
  _essay_count integer := 0;
  _status text;
  _answer text;
  question record;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.exams AS exam
    WHERE exam.id = _exam_id
      AND (
        public.is_admin()
        OR (
          exam.is_published
          AND public.is_approved()
          AND exam.stage = public.my_stage()
        )
      )
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.attempts AS attempt
    WHERE attempt.exam_id = _exam_id
      AND attempt.user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_submitted');
  END IF;

  FOR question IN
    SELECT id, correct_index, question_type, points
    FROM public.questions
    WHERE exam_id = _exam_id
  LOOP
    _total := _total + question.points;

    IF question.question_type = 'essay' THEN
      _essay_count := _essay_count + 1;
      CONTINUE;
    END IF;

    _answer := _answers ->> question.id::text;
    IF _answer ~ '^[0-9]{1,10}$'
       AND _answer::numeric = question.correct_index THEN
      _objective_score := _objective_score + question.points;
    END IF;
  END LOOP;

  _status := CASE WHEN _essay_count > 0 THEN 'pending' ELSE 'graded' END;

  INSERT INTO public.attempts (
    exam_id,
    user_id,
    score,
    total,
    answers,
    objective_score,
    essay_score,
    essay_scores,
    grading_status,
    cheating_detected
  )
  VALUES (
    _exam_id,
    auth.uid(),
    _objective_score,
    _total,
    _answers,
    _objective_score,
    0,
    '{}'::jsonb,
    _status,
    COALESCE(_is_cheating, false)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'score', _objective_score,
    'total', _total,
    'objective_score', _objective_score,
    'grading_status', _status,
    'cheating_detected', COALESCE(_is_cheating, false)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_attempt(_exam_id uuid, _answers jsonb)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.submit_attempt(_exam_id, _answers, false);
$$;

REVOKE EXECUTE ON FUNCTION public.submit_attempt(uuid, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_attempt(uuid, jsonb, boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_attempt(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_attempt(uuid, jsonb) TO authenticated;
