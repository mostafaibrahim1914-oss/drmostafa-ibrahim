ALTER TABLE public.private_payments
  ALTER COLUMN student_id DROP NOT NULL;

ALTER TABLE public.private_payments
  ADD COLUMN IF NOT EXISTS group_id uuid
  REFERENCES public.private_groups(id) ON DELETE CASCADE;

ALTER TABLE public.private_payments
  DROP CONSTRAINT IF EXISTS private_payments_student_or_group_check;

ALTER TABLE public.private_payments
  ADD CONSTRAINT private_payments_student_or_group_check
  CHECK ((student_id IS NOT NULL) <> (group_id IS NOT NULL));
