-- Harden lesson completion and scoring.
-- Scores are calculated from server-side exercise answers; clients cannot write lesson_progress directly.

CREATE OR REPLACE FUNCTION public.submit_lesson_attempt(
  p_lesson_id UUID,
  p_answers JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_exercise_count INTEGER := 0;
  v_correct_count INTEGER := 0;
  v_score INTEGER := 0;
  v_max_points INTEGER := 0;
  v_correct_answers JSONB := '{}'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.has_role(v_user_id, 'student') THEN
    RAISE EXCEPTION 'Only students can submit lesson attempts';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.lessons l
    WHERE l.id = p_lesson_id
      AND l.is_published = true
  ) THEN
    RAISE EXCEPTION 'Lesson is not available';
  END IF;

  SELECT
    count(*)::INTEGER,
    COALESCE(sum(e.points), 0)::INTEGER
  INTO v_exercise_count, v_max_points
  FROM public.exercises e
  WHERE e.lesson_id = p_lesson_id;

  IF v_exercise_count > 0 THEN
    IF EXISTS (
      SELECT 1
      FROM public.exercises e
      WHERE e.lesson_id = p_lesson_id
        AND NOT (COALESCE(p_answers, '{}'::jsonb) ? e.id::text)
    ) THEN
      RAISE EXCEPTION 'All exercises must be answered';
    END IF;

    SELECT
      count(*) FILTER (
        WHERE COALESCE(p_answers, '{}'::jsonb) ->> e.id::text = e.correct_answer
      )::INTEGER,
      COALESCE(sum(e.points) FILTER (
        WHERE COALESCE(p_answers, '{}'::jsonb) ->> e.id::text = e.correct_answer
      ), 0)::INTEGER
    INTO v_correct_count, v_score
    FROM public.exercises e
    WHERE e.lesson_id = p_lesson_id;

    SELECT COALESCE(
      jsonb_object_agg(e.id::text, e.correct_answer),
      '{}'::jsonb
    )
    INTO v_correct_answers
    FROM public.exercises e
    WHERE e.lesson_id = p_lesson_id;
  END IF;

  INSERT INTO public.lesson_progress (
    student_id,
    lesson_id,
    completed,
    score,
    completed_at
  )
  VALUES (
    v_user_id,
    p_lesson_id,
    true,
    v_score,
    now()
  )
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
    'correct_answers', v_correct_answers
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_lesson_attempt(UUID, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_lesson_attempt(UUID, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_lesson_attempt(UUID, JSONB) TO authenticated;

-- Students must use the trusted submission function; direct writes would allow
-- arbitrary completion/score values from the browser.
REVOKE INSERT, UPDATE, DELETE ON public.lesson_progress FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.lesson_progress FROM anon;
GRANT SELECT ON public.lesson_progress TO authenticated;
