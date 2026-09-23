-- Class management and invitation flows
-- Adds the classes model used by the teacher and student interfaces.

CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  level_code public.level_code,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  join_code TEXT NOT NULL UNIQUE,
  join_code_expires_at TIMESTAMPTZ,
  join_code_max_uses INTEGER,
  join_code_uses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT classes_join_code_length CHECK (char_length(join_code) BETWEEN 6 AND 10),
  CONSTRAINT classes_join_code_max_uses_check CHECK (join_code_max_uses IS NULL OR join_code_max_uses > 0),
  CONSTRAINT classes_join_code_uses_check CHECK (join_code_uses >= 0)
);

CREATE TABLE IF NOT EXISTS public.class_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON public.classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_join_code ON public.classes(join_code);
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON public.class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON public.class_students(class_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.class_students TO authenticated;
GRANT ALL ON public.classes TO service_role;
GRANT ALL ON public.class_students TO service_role;

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classes_select_staff" ON public.classes;
DROP POLICY IF EXISTS "classes_select_enrolled" ON public.classes;
DROP POLICY IF EXISTS "classes_insert_teacher" ON public.classes;
DROP POLICY IF EXISTS "classes_update_owner" ON public.classes;
DROP POLICY IF EXISTS "classes_delete_owner" ON public.classes;

CREATE POLICY "classes_select_staff" ON public.classes
  FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "classes_select_enrolled" ON public.classes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.class_students cs
      WHERE cs.class_id = classes.id
        AND cs.student_id = auth.uid()
    )
  );

CREATE POLICY "classes_insert_teacher" ON public.classes
  FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "classes_update_owner" ON public.classes
  FOR UPDATE TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    (teacher_id = auth.uid() AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin')))
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "classes_delete_owner" ON public.classes
  FOR DELETE TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "class_students_select_member_or_staff" ON public.class_students;
DROP POLICY IF EXISTS "class_students_insert_staff" ON public.class_students;
DROP POLICY IF EXISTS "class_students_delete_member_or_staff" ON public.class_students;

CREATE POLICY "class_students_select_member_or_staff" ON public.class_students
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_students.class_id
        AND (c.teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "class_students_insert_staff" ON public.class_students
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_students.class_id
        AND (c.teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "class_students_delete_member_or_staff" ON public.class_students
  FOR DELETE TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_students.class_id
        AND (c.teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE OR REPLACE FUNCTION public.regenerate_class_join_code(
  _class_id UUID,
  _valid_days INTEGER DEFAULT NULL,
  _max_uses INTEGER DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_class public.classes%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;

  SELECT * INTO v_class
  FROM public.classes
  WHERE id = _class_id
    AND (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'turma não encontrada ou sem permissão';
  END IF;

  IF _valid_days IS NOT NULL AND _valid_days <= 0 THEN
    RAISE EXCEPTION 'validade inválida';
  END IF;

  IF _max_uses IS NOT NULL AND _max_uses <= 0 THEN
    RAISE EXCEPTION 'limite inválido';
  END IF;

  LOOP
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.classes WHERE join_code = v_code);
  END LOOP;

  UPDATE public.classes
  SET join_code = v_code,
      join_code_expires_at = CASE
        WHEN _valid_days IS NULL THEN NULL
        ELSE now() + make_interval(days => _valid_days)
      END,
      join_code_max_uses = _max_uses,
      join_code_uses = 0,
      updated_at = now()
  WHERE id = _class_id;

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_class_by_code(_code TEXT)
RETURNS TABLE(class_id UUID, class_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  SELECT * INTO v_class
  FROM public.classes
  WHERE upper(join_code) = upper(trim(_code))
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
    SELECT 1 FROM public.class_students
    WHERE class_id = v_class.id AND student_id = v_student
  ) THEN
    RAISE EXCEPTION 'já está matriculado nesta turma';
  END IF;

  INSERT INTO public.class_students (class_id, student_id)
  VALUES (v_class.id, v_student);

  UPDATE public.classes
  SET join_code_uses = join_code_uses + 1,
      updated_at = now()
  WHERE id = v_class.id;

  RETURN QUERY SELECT v_class.id, v_class.name;
END;
$$;

REVOKE ALL ON FUNCTION public.regenerate_class_join_code(UUID, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_class_by_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regenerate_class_join_code(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_class_by_code(TEXT) TO authenticated;
