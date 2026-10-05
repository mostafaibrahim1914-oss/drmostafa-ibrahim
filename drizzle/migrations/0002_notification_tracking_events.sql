CREATE OR REPLACE FUNCTION public.notify_admin_attempt_activity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _name text; _exam text;
BEGIN
  SELECT full_name INTO _name FROM public.profiles WHERE id = NEW.user_id;
  SELECT title INTO _exam FROM public.exams WHERE id = NEW.exam_id;
  INSERT INTO public.notifications (audience, title, body)
  VALUES ('admin', 'إجابة امتحان جديدة', COALESCE(_name, 'طالب') || ' سلّم امتحان ' || COALESCE(_exam, ''));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_attempt_created AFTER INSERT ON public.attempts FOR EACH ROW EXECUTE FUNCTION public.notify_admin_attempt_activity();

CREATE OR REPLACE FUNCTION public.notify_admin_video_unlock()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _name text; _video text;
BEGIN
  SELECT full_name INTO _name FROM public.profiles WHERE id = NEW.user_id;
  SELECT title INTO _video FROM public.videos WHERE id = NEW.video_id;
  INSERT INTO public.notifications (audience, title, body)
  VALUES ('admin', 'فتح محاضرة بكود', COALESCE(_name, 'طالب') || ' فتح محاضرة ' || COALESCE(_video, ''));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_video_unlocked AFTER INSERT ON public.video_unlocks FOR EACH ROW EXECUTE FUNCTION public.notify_admin_video_unlock();

CREATE OR REPLACE FUNCTION public.notify_student_profile_status()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, audience, title, body)
    VALUES (NEW.id, 'user', CASE WHEN NEW.status = 'approved' THEN 'تم تفعيل حسابك' ELSE 'تحديث حالة الحساب' END,
      CASE WHEN NEW.status = 'approved' THEN 'يمكنك الآن الدخول إلى كل محتوى مرحلتك.' WHEN NEW.status = 'blocked' THEN 'تم إيقاف الحساب، تواصل مع الأستاذ.' ELSE 'تم تحديث حالة حسابك.' END);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_profile_status_changed AFTER UPDATE OF status ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.notify_student_profile_status();

CREATE OR REPLACE FUNCTION public.notify_student_essay_graded()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _exam text;
BEGIN
  IF NEW.grading_status = 'graded' AND OLD.grading_status = 'pending' THEN
    SELECT title INTO _exam FROM public.exams WHERE id = NEW.exam_id;
    INSERT INTO public.notifications (user_id, audience, title, body)
    VALUES (NEW.user_id, 'user', 'تم تصحيح السؤال المقالي', 'ظهرت درجتك النهائية في امتحان ' || COALESCE(_exam, ''));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_essay_graded AFTER UPDATE OF grading_status ON public.attempts FOR EACH ROW EXECUTE FUNCTION public.notify_student_essay_graded();