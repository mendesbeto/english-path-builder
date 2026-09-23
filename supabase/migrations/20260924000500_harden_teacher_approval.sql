-- Harden teacher approval: users cannot approve their own account.
-- Also sanitize self-registration so user-editable metadata can never create an admin.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role TEXT;
  chosen_role public.app_role;
  is_first_user BOOLEAN;
BEGIN
  requested_role := lower(COALESCE(NEW.raw_user_meta_data->>'role', 'student'));

  -- Public signup may request only student or teacher. Admin is never self-assignable.
  IF requested_role NOT IN ('student', 'teacher') THEN
    requested_role := 'student';
  END IF;

  chosen_role := requested_role::public.app_role;

  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'
  ) INTO is_first_user;

  INSERT INTO public.profiles (id, full_name, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    CASE WHEN chosen_role = 'teacher' THEN false ELSE true END
  );

  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    UPDATE public.profiles SET is_approved = true WHERE id = NEW.id;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, chosen_role);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_self_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = NEW.id
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
    RAISE EXCEPTION 'somente um administrador pode alterar a aprovação';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_approval ON public.profiles;
CREATE TRIGGER trg_prevent_self_approval
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_approval();

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'admin')
  );
