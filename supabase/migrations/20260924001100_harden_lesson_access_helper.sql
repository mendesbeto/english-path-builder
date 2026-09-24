-- Harden internal lesson-access helper exposure.
-- The function is called from RLS policies and other privileged routines;
-- clients do not need direct RPC access to it.

REVOKE EXECUTE ON FUNCTION public.can_access_lesson(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_access_lesson(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_lesson(UUID, UUID) FROM authenticated;
