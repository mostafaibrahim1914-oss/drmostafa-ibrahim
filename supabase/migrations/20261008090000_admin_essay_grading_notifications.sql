ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS link_data jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.grade_attempt_essays(_attempt_id uuid, _essay_scores jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exam_id uuid;
  _objective_score integer;
  _essay_score integer;
  _essay_count integer;
  _graded_count integer;
  _status text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF jsonb_typeof(_essay_scores) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'essay scores must be a JSON object';
  END IF;

  SELECT a.exam_id, a.objective_score
    INTO _exam_id, _objective_score
    FROM public.attempts AS a
    WHERE a.id = _attempt_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'attempt not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_each(_essay_scores) AS entry(key, value)
    LEFT JOIN public.questions AS q
      ON q.id::text = entry.key
      AND q.exam_id = _exam_id
      AND q.question_type = 'essay'
    WHERE q.id IS NULL
       OR jsonb_typeof(entry.value) IS DISTINCT FROM 'number'
       OR (entry.value #>> '{}') !~ '^[0-9]{1,10}$'
       OR CASE
            WHEN (entry.value #>> '{}') ~ '^[0-9]{1,10}$'
              THEN (entry.value #>> '{}')::numeric > q.points
            ELSE true
          END
  ) THEN
    RAISE EXCEPTION 'essay marks must be whole numbers between zero and each question maximum';
  END IF;

  SELECT count(*)::integer
    INTO _essay_count
    FROM public.questions AS q
    WHERE q.exam_id = _exam_id
      AND q.question_type = 'essay';

  IF _essay_count = 0 THEN
    RAISE EXCEPTION 'attempt has no essay questions';
  END IF;

  SELECT
      COALESCE(sum((entry.value #>> '{}')::integer), 0)::integer,
      count(*)::integer
    INTO _essay_score, _graded_count
    FROM jsonb_each(_essay_scores) AS entry(key, value);

  _status := CASE WHEN _graded_count = _essay_count THEN 'graded' ELSE 'pending' END;

  UPDATE public.attempts
    SET essay_scores = _essay_scores,
        essay_score = _essay_score,
        score = _objective_score + _essay_score,
        grading_status = _status
    WHERE id = _attempt_id;

  RETURN jsonb_build_object(
    'ok', true,
    'score', _objective_score + _essay_score,
    'essay_score', _essay_score,
    'grading_status', _status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grade_attempt_essays(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grade_attempt_essays(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_admin_attempt_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _student text;
  _exam text;
  _stage public.stage_level;
  _has_essay boolean;
BEGIN
  SELECT p.full_name INTO _student
    FROM public.profiles AS p
    WHERE p.id = NEW.user_id;
  SELECT e.title, e.stage INTO _exam, _stage
    FROM public.exams AS e
    WHERE e.id = NEW.exam_id;
  SELECT EXISTS (
    SELECT 1 FROM public.questions AS q
    WHERE q.exam_id = NEW.exam_id
      AND q.question_type = 'essay'
  ) INTO _has_essay;

  INSERT INTO public.notifications (audience, title, body, link_data)
  VALUES (
    'admin',
    CASE WHEN _has_essay THEN 'إجابة مقالية تحتاج إلى تصحيح' ELSE 'إجابة امتحان جديدة' END,
    COALESCE(_student, 'طالب') || ' سلّم امتحان ' || COALESCE(_exam, ''),
    jsonb_build_object(
      'type', CASE WHEN _has_essay THEN 'essay_submission' ELSE 'exam_submission' END,
      'attempt_id', NEW.id,
      'exam_id', NEW.exam_id,
      'user_id', NEW.user_id,
      'stage', _stage
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_attempt_created ON public.attempts;
CREATE TRIGGER on_attempt_created
  AFTER INSERT ON public.attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_attempt_activity();

CREATE OR REPLACE FUNCTION public.notify_student_essay_graded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exam text;
  _stage public.stage_level;
BEGIN
  IF NEW.grading_status = 'graded' AND OLD.grading_status = 'pending' THEN
    SELECT e.title, e.stage INTO _exam, _stage
      FROM public.exams AS e
      WHERE e.id = NEW.exam_id;
    INSERT INTO public.notifications (user_id, audience, title, body, link_data)
    VALUES (
      NEW.user_id,
      'user',
      'اكتمل تصحيح امتحانك',
      'درجتك النهائية في ' || COALESCE(_exam, 'الامتحان') || ': ' || NEW.score || '/' || NEW.total,
      jsonb_build_object('type', 'exam_review', 'exam_id', NEW.exam_id, 'stage', _stage)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_essay_graded ON public.attempts;
CREATE TRIGGER on_essay_graded
  AFTER UPDATE OF grading_status ON public.attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_student_essay_graded();

CREATE OR REPLACE FUNCTION public.mark_notification_read(_notification_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications AS n
  SET read_by = CASE
    WHEN jsonb_typeof(n.read_by) = 'array'
      THEN n.read_by || jsonb_build_array(auth.uid()::text)
    ELSE jsonb_build_array(auth.uid()::text)
  END
  WHERE n.id = _notification_id
    AND auth.uid() IS NOT NULL
    AND NOT (COALESCE(n.read_by, '[]'::jsonb) ? auth.uid()::text)
    AND (
      public.is_admin()
      OR n.user_id = auth.uid()
      OR (
        n.audience = 'students'
        AND public.is_approved()
        AND (n.stage IS NULL OR n.stage = public.my_stage())
      )
    );
$$;

REVOKE ALL ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;
