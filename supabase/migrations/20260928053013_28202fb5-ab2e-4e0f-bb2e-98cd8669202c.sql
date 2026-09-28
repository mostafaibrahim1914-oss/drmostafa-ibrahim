CREATE OR REPLACE FUNCTION public.guard_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.status := OLD.status;
    NEW.stage := OLD.stage;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_profile_fields ON public.profiles;
CREATE TRIGGER guard_profile_fields BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_fields();

CREATE OR REPLACE FUNCTION public.mark_notifications_read()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.notifications n SET read_by = n.read_by || to_jsonb(auth.uid()::text)
  WHERE NOT (n.read_by ? auth.uid()::text)
    AND (
      (public.is_admin() AND n.audience = 'admin')
      OR n.user_id = auth.uid()
      OR (n.audience = 'students' AND public.is_approved() AND (n.stage IS NULL OR n.stage = public.my_stage()))
    );
$$;
REVOKE EXECUTE ON FUNCTION public.mark_notifications_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read() TO authenticated;