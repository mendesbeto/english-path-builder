CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow callers to check their own roles. Internal/service contexts
  -- (no JWT, or service_role) may check any user.
  IF auth.uid() IS NOT NULL
     AND _user_id IS DISTINCT FROM auth.uid()
     AND coalesce(current_setting('request.jwt.claim.role', true), current_setting('role', true)) <> 'service_role'
  THEN
    RETURN false;
  END IF;

  RETURN EXISTS(
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;