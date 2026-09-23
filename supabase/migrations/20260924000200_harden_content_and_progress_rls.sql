-- Security hardening for student visibility and lesson progress.
-- Students can access only published lessons/exercises and their own profile/progress.
-- Staff retains access to the full content set for authoring and review.

DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_own_or_staff"
  ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "lessons_select_all" ON public.lessons;
CREATE POLICY "lessons_select_published_or_staff"
  ON public.lessons
  FOR SELECT TO authenticated
  USING (
    is_published
    OR public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "exercises_select_all" ON public.exercises;
CREATE POLICY "exercises_select_published_or_staff"
  ON public.exercises
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lessons l
      WHERE l.id = exercises.lesson_id
        AND (
          l.is_published
          OR public.has_role(auth.uid(), 'teacher')
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "progress_insert_own" ON public.lesson_progress;
CREATE POLICY "progress_insert_own_published_lesson"
  ON public.lesson_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.lessons l
      WHERE l.id = lesson_progress.lesson_id
        AND l.is_published
    )
  );

DROP POLICY IF EXISTS "progress_update_own" ON public.lesson_progress;
CREATE POLICY "progress_update_own_published_lesson"
  ON public.lesson_progress
  FOR UPDATE TO authenticated
  USING (
    student_id = auth.uid()
  )
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.lessons l
      WHERE l.id = lesson_progress.lesson_id
        AND l.is_published
    )
  );

ALTER TABLE public.lesson_progress
  DROP CONSTRAINT IF EXISTS lesson_progress_score_nonnegative;

ALTER TABLE public.lesson_progress
  ADD CONSTRAINT lesson_progress_score_nonnegative
  CHECK (score IS NULL OR score >= 0);

ALTER TABLE public.exercises
  DROP CONSTRAINT IF EXISTS exercises_points_nonnegative;

ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_points_nonnegative
  CHECK (points >= 0);

-- Keep timestamps coherent when clients complete progress.
CREATE OR REPLACE FUNCTION public.normalize_lesson_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.completed THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  ELSE
    NEW.completed_at := NULL;
    NEW.score := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_lesson_progress ON public.lesson_progress;
CREATE TRIGGER trg_normalize_lesson_progress
BEFORE INSERT OR UPDATE ON public.lesson_progress
FOR EACH ROW
EXECUTE FUNCTION public.normalize_lesson_progress();
