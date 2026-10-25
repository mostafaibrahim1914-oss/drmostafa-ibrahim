CREATE OR REPLACE FUNCTION public.admin_delete_student(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot delete yourself';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
  ) THEN
    RAISE EXCEPTION 'student not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'cannot delete an admin';
  END IF;

  DELETE FROM auth.users
  WHERE id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_student(uuid) TO authenticated;
