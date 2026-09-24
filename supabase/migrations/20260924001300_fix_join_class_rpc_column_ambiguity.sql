-- Fix column ambiguity in join_class_by_code caused by RETURNS TABLE(class_id, class_name).
-- Qualify class_students columns so the function can be called successfully.

CREATE OR REPLACE FUNCTION public.join_class_by_code(_code text)
RETURNS TABLE(class_id uuid, class_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_class public.classes%ROWTYPE;
  v_student UUID := auth.uid();
BEGIN
  IF v_student IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;

  IF NOT public.has_role(v_student, 'student') THEN
    RAISE EXCEPTION 'apenas alunos podem entrar em turmas';
  END IF;

  SELECT c.* INTO v_class
  FROM public.classes AS c
  WHERE upper(c.join_code) = upper(trim(_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'código inválido';
  END IF;

  IF NOT v_class.is_active THEN
    RAISE EXCEPTION 'turma não está mais ativa';
  END IF;

  IF v_class.join_code_expires_at IS NOT NULL AND v_class.join_code_expires_at <= now() THEN
    RAISE EXCEPTION 'código expirado';
  END IF;

  IF v_class.join_code_max_uses IS NOT NULL AND v_class.join_code_uses >= v_class.join_code_max_uses THEN
    RAISE EXCEPTION 'limite de usos atingido';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.class_students AS cs
    WHERE cs.class_id = v_class.id
      AND cs.student_id = v_student
  ) THEN
    RAISE EXCEPTION 'já está matriculado nesta turma';
  END IF;

  INSERT INTO public.class_students (class_id, student_id)
  VALUES (v_class.id, v_student);

  UPDATE public.classes AS c
  SET join_code_uses = c.join_code_uses + 1,
      updated_at = now()
  WHERE c.id = v_class.id;

  RETURN QUERY
  SELECT v_class.id, v_class.name;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.join_class_by_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.join_class_by_code(text) TO authenticated;
