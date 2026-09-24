-- Restrict SECURITY DEFINER helpers to internal database use.
-- Public RPCs used by the application remain executable by authenticated users:
-- create_exercise, join_class_by_code, regenerate_class_join_code,
-- set_user_role and submit_lesson_attempt.

REVOKE EXECUTE ON FUNCTION public.get_user_role(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(UUID) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.has_approved_role(UUID, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_approved_role(UUID, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_approved_role(UUID, public.app_role) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.is_class_member(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_class_member(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_class_member(UUID, UUID) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- kv_store_fed55169 is not part of the LMS API. Keep RLS enabled and make
-- the deny-by-default posture explicit so the security advisor can verify it.
DROP POLICY IF EXISTS kv_store_deny_all ON public.kv_store_fed55169;
CREATE POLICY kv_store_deny_all
ON public.kv_store_fed55169
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
