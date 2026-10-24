ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'multiple_choice',
  ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'questions_question_type_check'
      AND conrelid = 'public.questions'::regclass
  ) THEN
    ALTER TABLE public.questions
      ADD CONSTRAINT questions_question_type_check
      CHECK (question_type IN ('multiple_choice', 'essay'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'questions_points_positive'
      AND conrelid = 'public.questions'::regclass
  ) THEN
    ALTER TABLE public.questions
      ADD CONSTRAINT questions_points_positive CHECK (points > 0);
  END IF;
END $$;

ALTER TABLE public.attempts
  ADD COLUMN IF NOT EXISTS objective_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS essay_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS essay_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS grading_status text NOT NULL DEFAULT 'graded';

UPDATE public.attempts
SET objective_score = score
WHERE objective_score = 0
  AND essay_score = 0
  AND score <> 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attempts_grading_status_check'
      AND conrelid = 'public.attempts'::regclass
  ) THEN
    ALTER TABLE public.attempts
      ADD CONSTRAINT attempts_grading_status_check
      CHECK (grading_status IN ('pending', 'graded'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.submit_attempt(_exam_id uuid, _answers jsonb)
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
  q record;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.exams AS e
    WHERE e.id = _exam_id
      AND public.is_approved()
      AND (public.is_admin() OR e.stage = public.my_stage())
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.attempts AS a
    WHERE a.exam_id = _exam_id
      AND a.user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_submitted');
  END IF;

  FOR q IN
    SELECT id, correct_index, question_type, points
    FROM public.questions
    WHERE exam_id = _exam_id
  LOOP
    _total := _total + q.points;

    IF q.question_type = 'essay' THEN
      _essay_count := _essay_count + 1;
      CONTINUE;
    END IF;

    _answer := _answers ->> q.id::text;
    IF _answer ~ '^[0-9]{1,10}$'
       AND _answer::numeric = q.correct_index THEN
      _objective_score := _objective_score + q.points;
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
    grading_status
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
    _status
  );

  RETURN jsonb_build_object(
    'ok', true,
    'score', _objective_score,
    'total', _total,
    'objective_score', _objective_score,
    'grading_status', _status
  );
END;
$$;
