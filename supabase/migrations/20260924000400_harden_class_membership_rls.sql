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


-- Approved-teacher authorization helper.
-- A teacher role alone is not enough for staff operations; admin approval is required.
CREATE OR REPLACE FUNCTION public.has_approved_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN _role = 'admin' THEN public.has_role(_user_id, 'admin')
      WHEN _role = 'teacher' THEN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.profiles p ON p.id = ur.user_id
        WHERE ur.user_id = _user_id
          AND ur.role = 'teacher'
          AND p.is_approved = true
      )
      ELSE public.has_role(_user_id, _role)
    END;
$$;

REVOKE ALL ON FUNCTION public.has_approved_role(UUID, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_approved_role(UUID, public.app_role) TO authenticated;

-- Existing content policies: approved teachers only for staff access.
DROP POLICY IF EXISTS "profiles_select_own_or_staff" ON public.profiles;
CREATE POLICY "profiles_select_own_or_staff" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.has_approved_role(auth.uid(), 'teacher')
    OR public.has_approved_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "lessons_select_published_or_staff" ON public.lessons;
CREATE POLICY "lessons_select_published_or_staff" ON public.lessons
  FOR SELECT TO authenticated
  USING (
    is_published
    OR public.has_approved_role(auth.uid(), 'teacher')
    OR public.has_approved_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "exercises_select_published_or_staff" ON public.exercises;
CREATE POLICY "exercises_select_published_or_staff" ON public.exercises
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = exercises.lesson_id
        AND (
          l.is_published
          OR public.has_approved_role(auth.uid(), 'teacher')
          OR public.has_approved_role(auth.uid(), 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "modules_manage_staff" ON public.modules;
CREATE POLICY "modules_manage_staff" ON public.modules
  FOR ALL TO authenticated
  USING (public.has_approved_role(auth.uid(), 'admin') OR public.has_approved_role(auth.uid(), 'teacher'))
  WITH CHECK (public.has_approved_role(auth.uid(), 'admin') OR public.has_approved_role(auth.uid(), 'teacher'));

DROP POLICY IF EXISTS "lessons_manage_staff" ON public.lessons;
CREATE POLICY "lessons_manage_staff" ON public.lessons
  FOR ALL TO authenticated
  USING (public.has_approved_role(auth.uid(), 'admin') OR public.has_approved_role(auth.uid(), 'teacher'))
  WITH CHECK (public.has_approved_role(auth.uid(), 'admin') OR public.has_approved_role(auth.uid(), 'teacher'));

DROP POLICY IF EXISTS "exercises_manage_staff" ON public.exercises;
CREATE POLICY "exercises_manage_staff" ON public.exercises
  FOR ALL TO authenticated
  USING (public.has_approved_role(auth.uid(), 'admin') OR public.has_approved_role(auth.uid(), 'teacher'))
  WITH CHECK (public.has_approved_role(auth.uid(), 'admin') OR public.has_approved_role(auth.uid(), 'teacher'));

DROP POLICY IF EXISTS "progress_select_own_or_staff" ON public.lesson_progress;
CREATE POLICY "progress_select_own_or_staff" ON public.lesson_progress
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.has_approved_role(auth.uid(), 'teacher')
    OR public.has_approved_role(auth.uid(), 'admin')
  );

-- Class access must also require an approved teacher.
DROP POLICY IF EXISTS "classes_select_staff" ON public.classes;
CREATE POLICY "classes_select_staff" ON public.classes
  FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.has_approved_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "classes_insert_teacher" ON public.classes;
CREATE POLICY "classes_insert_teacher" ON public.classes
  FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    AND (public.has_approved_role(auth.uid(), 'teacher') OR public.has_approved_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "classes_update_owner" ON public.classes;
CREATE POLICY "classes_update_owner" ON public.classes
  FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid() OR public.has_approved_role(auth.uid(), 'admin'))
  WITH CHECK (
    (teacher_id = auth.uid() AND (public.has_approved_role(auth.uid(), 'teacher') OR public.has_approved_role(auth.uid(), 'admin')))
    OR public.has_approved_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "class_students_select_member_or_staff" ON public.class_students;
CREATE POLICY "class_students_select_member_or_staff" ON public.class_students
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_students.class_id
        AND (c.teacher_id = auth.uid() OR public.has_approved_role(auth.uid(), 'admin'))
    )
  );

DROP POLICY IF EXISTS "class_students_insert_staff" ON public.class_students;
CREATE POLICY "class_students_insert_staff" ON public.class_students
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_students.class_id
        AND (c.teacher_id = auth.uid() OR public.has_approved_role(auth.uid(), 'admin'))
    )
  );

DROP POLICY IF EXISTS "class_students_delete_member_or_staff" ON public.class_students;
CREATE POLICY "class_students_delete_member_or_staff" ON public.class_students
  FOR DELETE TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_students.class_id
        AND (c.teacher_id = auth.uid() OR public.has_approved_role(auth.uid(), 'admin'))
    )
  );
