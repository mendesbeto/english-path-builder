-- RLS policies execute these SECURITY DEFINER helpers in the authenticated request context.
-- Keep them non-anonymous and self-scoped so they cannot be used as arbitrary role/member lookup RPCs.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL OR _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.has_approved_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL OR _user_id IS DISTINCT FROM auth.uid() THEN false
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

CREATE OR REPLACE FUNCTION public.is_class_member(_class_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL OR _student_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.class_students
      WHERE class_id = _class_id
        AND student_id = _student_id
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_lesson(_student_id uuid, _lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL OR _student_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.levels current_level
        ON current_level.code = p.current_level
       AND current_level.is_published = true
      JOIN public.lessons lesson
        ON lesson.id = _lesson_id
       AND lesson.is_published = true
      JOIN public.modules module
        ON module.id = lesson.module_id
      JOIN public.levels lesson_level
        ON lesson_level.id = module.level_id
       AND lesson_level.is_published = true
      WHERE p.id = _student_id
        AND public.has_role(_student_id, 'student')
        AND lesson_level.order_num <= current_level.order_num
    )
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_approved_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_class_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_lesson(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_approved_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_class_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_lesson(uuid, uuid) TO authenticated;
