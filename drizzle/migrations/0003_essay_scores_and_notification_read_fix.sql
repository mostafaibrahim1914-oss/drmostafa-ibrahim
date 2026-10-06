ALTER TABLE public.attempts
ADD COLUMN IF NOT EXISTS essay_scores jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.attempts.essay_scores IS 'Per-question essay marks keyed by question UUID.';

CREATE OR REPLACE FUNCTION public.mark_notifications_read()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.notifications n
  SET read_by = CASE
    WHEN jsonb_typeof(n.read_by) = 'array' THEN n.read_by || jsonb_build_array(auth.uid()::text)
    ELSE jsonb_build_array(auth.uid()::text)
  END
  WHERE auth.uid() IS NOT NULL
    AND NOT (COALESCE(n.read_by, '[]'::jsonb) ? auth.uid()::text)
    AND (
      public.is_admin()
      OR n.user_id = auth.uid()
      OR (n.audience = 'students' AND public.is_approved() AND (n.stage IS NULL OR n.stage = public.my_stage()))
    );
$function$;