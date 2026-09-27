
CREATE TYPE public.app_role AS ENUM ('admin','student');
CREATE TYPE public.stage_level AS ENUM ('prep3','sec1','sec2','sec3');
CREATE TYPE public.account_status AS ENUM ('pending','approved','blocked');
CREATE TYPE public.video_source AS ENUM ('upload','youtube','external');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  parent_phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  stage public.stage_level,
  avatar_url text,
  status public.account_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE OR REPLACE FUNCTION public.my_stage()
RETURNS public.stage_level LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT stage FROM public.profiles WHERE id = auth.uid() AND status = 'approved'
$$;

CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'approved')
     OR public.has_role(auth.uid(),'admin')
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "admin delete profile" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, whatsapp, parent_phone, address, stage)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    COALESCE(NEW.raw_user_meta_data->>'whatsapp',''),
    COALESCE(NEW.raw_user_meta_data->>'parent_phone',''),
    COALESCE(NEW.raw_user_meta_data->>'address',''),
    NULLIF(NEW.raw_user_meta_data->>'stage','')::public.stage_level
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  stage public.stage_level NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folders TO authenticated;
GRANT ALL ON public.folders TO service_role;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "folders read" ON public.folders FOR SELECT TO authenticated
  USING (public.is_admin() OR (public.is_approved() AND stage = public.my_stage()));
CREATE POLICY "folders admin write" ON public.folders FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  stage public.stage_level NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  source public.video_source NOT NULL DEFAULT 'youtube',
  url text NOT NULL,
  is_locked boolean NOT NULL DEFAULT false,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "videos read" ON public.videos FOR SELECT TO authenticated
  USING (public.is_admin() OR (public.is_approved() AND stage = public.my_stage()));
CREATE POLICY "videos admin write" ON public.videos FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  price numeric NOT NULL DEFAULT 0,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_codes TO authenticated;
GRANT ALL ON public.access_codes TO service_role;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "codes admin all" ON public.access_codes FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.video_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_unlocks TO authenticated;
GRANT ALL ON public.video_unlocks TO service_role;
ALTER TABLE public.video_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unlocks read" ON public.video_unlocks FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "unlocks admin write" ON public.video_unlocks FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.redeem_code(_code text, _video_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rec public.access_codes%ROWTYPE;
BEGIN
  IF NOT public.is_approved() THEN RETURN jsonb_build_object('ok', false, 'error', 'not_approved'); END IF;
  SELECT * INTO rec FROM public.access_codes WHERE code = upper(trim(_code)) AND video_id = _video_id;
  IF rec.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid'); END IF;
  IF rec.used_by IS NOT NULL AND rec.used_by <> auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'used');
  END IF;
  UPDATE public.access_codes SET used_by = auth.uid(), used_at = now() WHERE id = rec.id;
  INSERT INTO public.video_unlocks (user_id, video_id) VALUES (auth.uid(), _video_id) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  stage public.stage_level NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exams read" ON public.exams FOR SELECT TO authenticated
  USING (public.is_admin() OR (public.is_approved() AND stage = public.my_stage()));
CREATE POLICY "exams admin write" ON public.exams FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  q_order integer NOT NULL DEFAULT 1,
  prompt text NOT NULL DEFAULT '',
  image_url text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions admin all" ON public.questions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attempts TO authenticated;
GRANT ALL ON public.attempts TO service_role;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempts read" ON public.attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "attempts admin write" ON public.attempts FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.get_exam_questions(_exam_id uuid)
RETURNS TABLE (id uuid, q_order integer, prompt text, image_url text, options jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_admin() OR EXISTS (
      SELECT 1 FROM public.exams e WHERE e.id = _exam_id AND public.is_approved() AND e.stage = public.my_stage()))
  THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT q.id, q.q_order, q.prompt, q.image_url, q.options
  FROM public.questions q WHERE q.exam_id = _exam_id ORDER BY q.q_order;
END; $$;

CREATE OR REPLACE FUNCTION public.get_exam_review(_exam_id uuid)
RETURNS TABLE (id uuid, q_order integer, prompt text, image_url text, options jsonb, correct_index integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_admin() OR EXISTS (
      SELECT 1 FROM public.exams e
      WHERE e.id = _exam_id AND e.is_closed AND public.is_approved() AND e.stage = public.my_stage()))
  THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT q.id, q.q_order, q.prompt, q.image_url, q.options, q.correct_index
  FROM public.questions q WHERE q.exam_id = _exam_id ORDER BY q.q_order;
END; $$;

CREATE OR REPLACE FUNCTION public.submit_attempt(_exam_id uuid, _answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _score integer := 0; _total integer := 0; q record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.exams e WHERE e.id = _exam_id AND public.is_approved()
                 AND (public.is_admin() OR e.stage = public.my_stage()))
  THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM public.attempts a WHERE a.exam_id = _exam_id AND a.user_id = auth.uid())
  THEN RETURN jsonb_build_object('ok', false, 'error', 'already_submitted'); END IF;
  FOR q IN SELECT id, correct_index FROM public.questions WHERE exam_id = _exam_id LOOP
    _total := _total + 1;
    IF (_answers->>q.id::text) IS NOT NULL AND (_answers->>q.id::text)::int = q.correct_index THEN
      _score := _score + 1;
    END IF;
  END LOOP;
  INSERT INTO public.attempts (exam_id, user_id, score, total, answers)
  VALUES (_exam_id, auth.uid(), _score, _total, _answers);
  RETURN jsonb_build_object('ok', true, 'score', _score, 'total', _total);
END; $$;

CREATE OR REPLACE FUNCTION public.leaderboard(_stage public.stage_level)
RETURNS TABLE (user_id uuid, full_name text, avatar_url text, score bigint, total bigint, percent numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_approved() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT public.is_admin() AND _stage IS DISTINCT FROM public.my_stage() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, p.avatar_url,
         COALESCE(SUM(a.score),0)::bigint, COALESCE(SUM(a.total),0)::bigint,
         CASE WHEN COALESCE(SUM(a.total),0) = 0 THEN 0
              ELSE ROUND(100.0 * SUM(a.score) / SUM(a.total), 1) END
  FROM public.profiles p
  LEFT JOIN public.attempts a ON a.user_id = p.id
  WHERE p.stage = _stage AND p.status = 'approved'
  GROUP BY p.id, p.full_name, p.avatar_url
  ORDER BY 6 DESC, 4 DESC;
END; $$;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  audience text NOT NULL DEFAULT 'user',
  stage public.stage_level,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  read_by jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications read" ON public.notifications FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR (audience = 'students' AND public.is_approved() AND (stage IS NULL OR stage = public.my_stage()))
  );
CREATE POLICY "notifications admin write" ON public.notifications FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.notify_admin_new_student()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (audience, title, body)
  VALUES ('admin', 'طلب تسجيل جديد', COALESCE(NEW.full_name,'طالب جديد') || ' سجّل حساباً جديداً');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_profile_created AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_student();

CREATE OR REPLACE FUNCTION public.notify_students_new_content()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (audience, stage, title, body)
  VALUES ('students', NEW.stage, TG_ARGV[0], NEW.title);
  RETURN NEW;
END; $$;
CREATE TRIGGER on_video_created AFTER INSERT ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.notify_students_new_content('فيديو جديد');
CREATE TRIGGER on_exam_created AFTER INSERT ON public.exams
FOR EACH ROW EXECUTE FUNCTION public.notify_students_new_content('امتحان جديد');
