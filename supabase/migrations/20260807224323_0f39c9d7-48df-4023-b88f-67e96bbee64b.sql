
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS join_code text;

CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.classes WHERE join_code = code);
  END LOOP;
  RETURN code;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_join_code() FROM PUBLIC, anon, authenticated;

UPDATE public.classes SET join_code = public.generate_join_code() WHERE join_code IS NULL;

ALTER TABLE public.classes ALTER COLUMN join_code SET DEFAULT public.generate_join_code();
ALTER TABLE public.classes ALTER COLUMN join_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS classes_join_code_key ON public.classes (join_code);

CREATE OR REPLACE FUNCTION public.join_class_by_code(_code text)
RETURNS TABLE (class_id uuid, class_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.classes%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO c FROM public.classes
  WHERE upper(join_code) = upper(btrim(_code)) AND is_active LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código de turma inválido';
  END IF;

  INSERT INTO public.class_students (class_id, student_id)
  VALUES (c.id, auth.uid())
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT c.id, c.name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.join_class_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_class_by_code(text) TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS class_students_class_student_key ON public.class_students (class_id, student_id);

CREATE OR REPLACE FUNCTION public.regenerate_class_join_code(_class_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  new_code := public.generate_join_code();
  UPDATE public.classes SET join_code = new_code WHERE id = _class_id;
  RETURN new_code;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.regenerate_class_join_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regenerate_class_join_code(uuid) TO authenticated;
