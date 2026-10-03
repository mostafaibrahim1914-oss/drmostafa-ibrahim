CREATE TABLE public.lecture_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  position_seconds integer NOT NULL DEFAULT 0,
  duration_seconds integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  first_watched_at timestamptz NOT NULL DEFAULT now(),
  last_watched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lecture_progress TO authenticated;
GRANT ALL ON public.lecture_progress TO service_role;
ALTER TABLE public.lecture_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress read" ON public.lecture_progress FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "progress insert own" ON public.lecture_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_approved());
CREATE POLICY "progress update own" ON public.lecture_progress FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "progress admin all" ON public.lecture_progress FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.student_absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  absence_date date NOT NULL DEFAULT current_date,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_absences TO authenticated;
GRANT ALL ON public.student_absences TO service_role;
ALTER TABLE public.student_absences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "absences read" ON public.student_absences FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "absences admin all" ON public.student_absences FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.center_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_title text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 100,
  exam_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.center_grades TO authenticated;
GRANT ALL ON public.center_grades TO service_role;
ALTER TABLE public.center_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grades read" ON public.center_grades FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "grades admin all" ON public.center_grades FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.generate_access_codes(_video_id uuid, _count integer)
RETURNS SETOF public.access_codes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  _price numeric; _code text; _made integer := 0; _tries integer := 0; _row public.access_codes%ROWTYPE;
  _bytes bytea; i integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _count < 1 OR _count > 500 THEN RAISE EXCEPTION 'count must be 1-500'; END IF;
  SELECT price INTO _price FROM public.videos WHERE id = _video_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'video not found'; END IF;
  WHILE _made < _count AND _tries < _count * 20 LOOP
    _tries := _tries + 1;
    _bytes := extensions.gen_random_bytes(10);
    _code := '';
    FOR i IN 0..9 LOOP
      _code := _code || substr(_alphabet, (get_byte(_bytes, i) % 32) + 1, 1);
      IF i = 4 THEN _code := _code || '-'; END IF;
    END LOOP;
    INSERT INTO public.access_codes (code, video_id, price) VALUES (_code, _video_id, _price)
      ON CONFLICT (code) DO NOTHING RETURNING * INTO _row;
    IF FOUND THEN _made := _made + 1; RETURN NEXT _row; END IF;
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.generate_access_codes(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.generate_access_codes(uuid, integer) TO authenticated;