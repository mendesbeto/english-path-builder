ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS join_code_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS join_code_max_uses integer,
  ADD COLUMN IF NOT EXISTS join_code_uses integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.join_class_by_code(_code text)
 RETURNS TABLE(class_id uuid, class_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c public.classes%ROWTYPE;
  inserted boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO c FROM public.classes
  WHERE upper(join_code) = upper(btrim(_code)) LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código de turma inválido';
  END IF;

  IF NOT c.is_active THEN
    RAISE EXCEPTION 'Esta turma não está mais ativa';
  END IF;

  IF c.join_code_expires_at IS NOT NULL AND c.join_code_expires_at < now() THEN
    RAISE EXCEPTION 'Código expirado';
  END IF;

  IF EXISTS (SELECT 1 FROM public.class_students WHERE class_students.class_id = c.id AND student_id = auth.uid()) THEN
    RAISE EXCEPTION 'Você já está matriculado nesta turma';
  END IF;

  IF c.join_code_max_uses IS NOT NULL AND c.join_code_uses >= c.join_code_max_uses THEN
    RAISE EXCEPTION 'Limite de usos deste código foi atingido';
  END IF;

  INSERT INTO public.class_students (class_id, student_id)
  VALUES (c.id, auth.uid())
  ON CONFLICT DO NOTHING;

  UPDATE public.classes SET join_code_uses = join_code_uses + 1 WHERE id = c.id;

  RETURN QUERY SELECT c.id, c.name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.regenerate_class_join_code(_class_id uuid, _valid_days integer DEFAULT NULL, _max_uses integer DEFAULT NULL)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_code text;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  new_code := public.generate_join_code();
  UPDATE public.classes
  SET join_code = new_code,
      join_code_uses = 0,
      join_code_expires_at = CASE WHEN _valid_days IS NULL THEN NULL ELSE now() + (_valid_days || ' days')::interval END,
      join_code_max_uses = _max_uses
  WHERE id = _class_id;
  RETURN new_code;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.regenerate_class_join_code(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regenerate_class_join_code(uuid, integer, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.join_class_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_class_by_code(text) TO authenticated;