CREATE TABLE IF NOT EXISTS public.stage_lesson_prices (
  stage text PRIMARY KEY CHECK (stage IN ('sec1', 'sec2', 'sec3', 'prep3')),
  price_per_lesson numeric(10, 2) NOT NULL DEFAULT 0 CHECK (price_per_lesson >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.stage_lesson_prices (stage, price_per_lesson)
VALUES ('sec1', 0), ('sec2', 0), ('sec3', 0), ('prep3', 0)
ON CONFLICT (stage) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.private_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.private_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.private_groups(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (length(trim(full_name)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.private_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.private_students(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.private_groups(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((student_id IS NOT NULL) <> (group_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_date date NOT NULL DEFAULT current_date,
  stage text NOT NULL CHECK (stage IN ('sec1', 'sec2', 'sec3', 'prep3')),
  attendee_count integer NOT NULL CHECK (attendee_count >= 0),
  price_per_student numeric(10, 2) NOT NULL CHECK (price_per_student >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stage_lesson_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin manages stage lesson prices" ON public.stage_lesson_prices;
CREATE POLICY "admin manages stage lesson prices" ON public.stage_lesson_prices
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin manages private groups" ON public.private_groups;
CREATE POLICY "admin manages private groups" ON public.private_groups
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin manages private students" ON public.private_students;
CREATE POLICY "admin manages private students" ON public.private_students
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin manages private payments" ON public.private_payments;
CREATE POLICY "admin manages private payments" ON public.private_payments
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin manages attendance sessions" ON public.attendance_sessions;
CREATE POLICY "admin manages attendance sessions" ON public.attendance_sessions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stage_lesson_prices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_sessions TO authenticated;
