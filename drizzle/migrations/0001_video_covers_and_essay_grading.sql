ALTER TABLE public.videos ADD COLUMN cover_image_url text;
ALTER TABLE public.questions ADD COLUMN question_type text NOT NULL DEFAULT 'multiple_choice';
ALTER TABLE public.questions ADD COLUMN points integer NOT NULL DEFAULT 1;
ALTER TABLE public.attempts ADD COLUMN objective_score integer NOT NULL DEFAULT 0;
ALTER TABLE public.attempts ADD COLUMN essay_score integer NOT NULL DEFAULT 0;
ALTER TABLE public.attempts ADD COLUMN grading_status text NOT NULL DEFAULT 'graded';

ALTER TABLE public.questions ADD CONSTRAINT questions_type_valid CHECK (question_type IN ('multiple_choice', 'essay'));
ALTER TABLE public.questions ADD CONSTRAINT questions_points_positive CHECK (points > 0 AND points <= 1000);
ALTER TABLE public.attempts ADD CONSTRAINT attempts_grading_status_valid CHECK (grading_status IN ('pending', 'graded'));

DROP FUNCTION public.get_exam_questions(uuid);
CREATE FUNCTION public.get_exam_questions(_exam_id uuid)
RETURNS TABLE(id uuid, q_order integer, prompt text, image_url text, options jsonb, question_type text, points integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin() OR EXISTS (
      SELECT 1 FROM public.exams e WHERE e.id = _exam_id AND public.is_approved() AND e.stage = public.my_stage()))
  THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT q.id, q.q_order, q.prompt, q.image_url, q.options, q.question_type, q.points
  FROM public.questions q WHERE q.exam_id = _exam_id ORDER BY q.q_order;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_exam_questions(uuid) TO authenticated;

DROP FUNCTION public.get_exam_review(uuid);
CREATE FUNCTION public.get_exam_review(_exam_id uuid)
RETURNS TABLE(id uuid, q_order integer, prompt text, image_url text, options jsonb, correct_index integer, question_type text, points integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin() OR EXISTS (
      SELECT 1 FROM public.exams e
      WHERE e.id = _exam_id AND e.is_closed AND public.is_approved() AND e.stage = public.my_stage()))
  THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT q.id, q.q_order, q.prompt, q.image_url, q.options, q.correct_index, q.question_type, q.points
  FROM public.questions q WHERE q.exam_id = _exam_id ORDER BY q.q_order;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_exam_review(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_attempt(_exam_id uuid, _answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _score integer := 0; _total integer := 0; _has_essay boolean := false; q record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.exams e WHERE e.id = _exam_id AND public.is_approved()
                 AND (public.is_admin() OR e.stage = public.my_stage()))
  THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM public.attempts a WHERE a.exam_id = _exam_id AND a.user_id = auth.uid())
  THEN RETURN jsonb_build_object('ok', false, 'error', 'already_submitted'); END IF;
  FOR q IN SELECT id, correct_index, question_type, points FROM public.questions WHERE exam_id = _exam_id LOOP
    _total := _total + q.points;
    IF q.question_type = 'essay' THEN
      _has_essay := true;
    ELSIF (_answers->>q.id::text) IS NOT NULL AND (_answers->>q.id::text)::int = q.correct_index THEN
      _score := _score + q.points;
    END IF;
  END LOOP;
  INSERT INTO public.attempts (exam_id, user_id, score, total, answers, objective_score, essay_score, grading_status)
  VALUES (_exam_id, auth.uid(), _score, _total, _answers, _score, 0, CASE WHEN _has_essay THEN 'pending' ELSE 'graded' END);
  RETURN jsonb_build_object('ok', true, 'score', _score, 'total', _total, 'grading_status', CASE WHEN _has_essay THEN 'pending' ELSE 'graded' END);
END; $$;