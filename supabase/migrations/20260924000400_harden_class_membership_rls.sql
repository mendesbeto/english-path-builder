-- Avoid recursive RLS evaluation between classes and class_students.
-- The membership lookup is narrowly scoped and does not expose class data.

CREATE OR REPLACE FUNCTION public.is_class_member(_class_id UUID, _student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_students
    WHERE class_id = _class_id
      AND student_id = _student_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_class_member(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_class_member(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "classes_select_enrolled" ON public.classes;
CREATE POLICY "classes_select_enrolled"
  ON public.classes
  FOR SELECT TO authenticated
  USING (public.is_class_member(id, auth.uid()));

-- Keep direct membership reads/writes scoped to the student or the class owner.
-- These policies no longer participate in the classes SELECT policy above.
DROP POLICY IF EXISTS "class_students_select_member_or_staff" ON public.class_students;
CREATE POLICY "class_students_select_member_or_staff"
  ON public.class_students
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = class_students.class_id
        AND (c.teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

DROP POLICY IF EXISTS "class_students_insert_staff" ON public.class_students;
CREATE POLICY "class_students_insert_staff"
  ON public.class_students
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = class_students.class_id
        AND (c.teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

DROP POLICY IF EXISTS "class_students_delete_member_or_staff" ON public.class_students;
CREATE POLICY "class_students_delete_member_or_staff"
  ON public.class_students
  FOR DELETE TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = class_students.class_id
        AND (c.teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
