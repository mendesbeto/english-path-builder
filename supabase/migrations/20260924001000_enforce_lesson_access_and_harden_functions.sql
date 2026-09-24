-- Enforce the same level-access rules in the database that the frontend exposes.
-- Students may access published lessons only up to their current CEFR level.
-- Staff access remains governed by the approved-role policies.

CREATE OR REPLACE FUNCTION public.can_access_lesson(
  _student_id UUID,
  _lesson_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
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
  );
$fn$;

REVOKE ALL ON FUNCTION public.can_access_lesson(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_lesson(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_lesson(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "lessons_select_published_or_staff" ON public.lessons;
CREATE POLICY "lessons_select_published_or_staff"
  ON public.lessons
  FOR SELECT TO authenticated
  USING (
    (is_published AND public.can_access_lesson(auth.uid(), id))
    OR public.has_approved_role(auth.uid(), 'teacher')
    OR public.has_approved_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "exercises_select_published_or_staff" ON public.exercises;
CREATE POLICY "exercises_select_published_or_staff"
  ON public.exercises
  FOR SELECT TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1
        FROM public.lessons l
        WHERE l.id = exercises.lesson_id
          AND l.is_published
          AND public.can_access_lesson(auth.uid(), l.id)
      )
    )
    OR public.has_approved_role(auth.uid(), 'teacher')
    OR public.has_approved_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "progress_insert_own_published_lesson" ON public.lesson_progress;
CREATE POLICY "progress_insert_own_published_lesson"
  ON public.lesson_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND public.can_access_lesson(auth.uid(), lesson_id)
  );

DROP POLICY IF EXISTS "progress_update_own_published_lesson" ON public.lesson_progress;
CREATE POLICY "progress_update_own_published_lesson"
  ON public.lesson_progress
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (
    student_id = auth.uid()
    AND public.can_access_lesson(auth.uid(), lesson_id)
  );

CREATE OR REPLACE FUNCTION public.submit_lesson_attempt(
  p_lesson_id UUID,
  p_answers JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_user_id UUID := auth.uid();
  v_exercise_count INTEGER := 0;
  v_correct_count INTEGER := 0;
  v_score INTEGER := 0;
  v_max_points INTEGER := 0;
  v_results JSONB := '{}'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.has_role(v_user_id, 'student') THEN
    RAISE EXCEPTION 'Only students can submit lesson attempts';
  END IF;
  IF NOT public.can_access_lesson(v_user_id, p_lesson_id) THEN
    RAISE EXCEPTION 'Lesson is not available for the current level';
  END IF;

  SELECT count(*)::INTEGER, COALESCE(sum(e.points), 0)::INTEGER
  INTO v_exercise_count, v_max_points
  FROM public.exercises e
  WHERE e.lesson_id = p_lesson_id;

  IF v_exercise_count > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.lesson_id = p_lesson_id
        AND NOT (COALESCE(p_answers, '{}'::jsonb) ? e.id::text)
    ) THEN
      RAISE EXCEPTION 'All exercises must be answered';
    END IF;

    SELECT
      count(*) FILTER (
        WHERE COALESCE(p_answers, '{}'::jsonb) ->> e.id::text = a.correct_answer
      )::INTEGER,
      COALESCE(sum(e.points) FILTER (
        WHERE COALESCE(p_answers, '{}'::jsonb) ->> e.id::text = a.correct_answer
      ), 0)::INTEGER,
      COALESCE(jsonb_object_agg(
        e.id::text,
        (COALESCE(p_answers, '{}'::jsonb) ->> e.id::text = a.correct_answer)
      ), '{}'::jsonb)
    INTO v_correct_count, v_score, v_results
    FROM public.exercises e
    JOIN public.exercise_answers a ON a.exercise_id = e.id
    WHERE e.lesson_id = p_lesson_id;
  END IF;

  INSERT INTO public.lesson_progress (
    student_id, lesson_id, completed, score, completed_at
  )
  VALUES (v_user_id, p_lesson_id, true, v_score, now())
  ON CONFLICT (student_id, lesson_id)
  DO UPDATE SET
    completed = true,
    score = EXCLUDED.score,
    completed_at = EXCLUDED.completed_at;

  RETURN jsonb_build_object(
    'completed', true,
    'score', v_score,
    'max_points', v_max_points,
    'correct', v_correct_count,
    'total', v_exercise_count,
    'results', v_results
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.submit_lesson_attempt(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_lesson_attempt(UUID, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_lesson_attempt(UUID, JSONB) TO authenticated;

-- Harden trigger/helper functions against mutable search_path resolution.
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.normalize_lesson_progress() SET search_path = public;
ALTER FUNCTION public.enforce_content_author() SET search_path = public;
ALTER FUNCTION public.prevent_self_approval() SET search_path = public;
ALTER FUNCTION public.prevent_profile_system_field_changes() SET search_path = public;

-- SECURITY DEFINER helpers are not anonymous APIs.
REVOKE EXECUTE ON FUNCTION public.get_user_role(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_approved_role(UUID, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_class_member(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_class_by_code(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.regenerate_class_join_code(UUID, INTEGER, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_exercise(UUID,TEXT,JSONB,TEXT,INTEGER,INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_user_role(UUID, public.app_role) FROM anon;
