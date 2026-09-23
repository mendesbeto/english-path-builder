-- Harden admin role management: make role changes atomic and prevent removing the last admin.

CREATE OR REPLACE FUNCTION public.set_user_role(
  target_user_id UUID,
  new_role public.app_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  admin_count INTEGER;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'autenticação necessária';
  END IF;

  IF NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'somente administradores podem alterar papéis';
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'usuário inválido';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'usuário não encontrado';
  END IF;

  SELECT count(*) INTO admin_count
  FROM public.user_roles
  WHERE role = 'admin';

  IF new_role <> 'admin' AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = target_user_id AND role = 'admin'
  ) AND admin_count <= 1 THEN
    RAISE EXCEPTION 'não é possível remover o último administrador';
  END IF;

  -- Replace the user's role set atomically. The unique constraint prevents duplicates.
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, new_role);
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role(UUID, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_role(UUID, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, public.app_role) TO authenticated;
