-- Final auth bootstrap hardening.
-- Serialize first-user detection so concurrent signups cannot both become admin.
-- Also pin SECURITY DEFINER search_path to an empty path.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $function$
DECLARE
  requested_role text;
  chosen_role public.app_role;
  is_first_user boolean;
BEGIN
  requested_role := lower(coalesce(NEW.raw_user_meta_data->>'role', 'student'));
  IF requested_role NOT IN ('student', 'teacher') THEN requested_role := 'student'; END IF;
  chosen_role := requested_role::public.app_role;
  PERFORM pg_advisory_xact_lock(hashtextextended('auth:first-user-bootstrap', 0));
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO is_first_user;
  INSERT INTO public.profiles (id, full_name, is_approved)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), CASE WHEN chosen_role = 'teacher' THEN false ELSE true END);
  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    UPDATE public.profiles SET is_approved = true WHERE id = NEW.id;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, chosen_role);
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
