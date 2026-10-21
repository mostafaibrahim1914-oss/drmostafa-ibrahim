ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exams_duration_minutes_positive'
      AND conrelid = 'public.exams'::regclass
  ) THEN
    ALTER TABLE public.exams
      ADD CONSTRAINT exams_duration_minutes_positive
      CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 600);
  END IF;
END $$;
