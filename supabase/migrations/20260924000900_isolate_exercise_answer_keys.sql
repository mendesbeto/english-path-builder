-- Keep exercise answer keys out of the student-readable exercises table.
CREATE TABLE IF NOT EXISTS public.exercise_answers (
  exercise_id UUID PRIMARY KEY REFERENCES public.exercises(id) ON DELETE CASCADE,
  correct_answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exercise_answers ENABLE ROW LEVEL SECURITY;

INSERT INTO public.exercise_answers (exercise_id, correct_answer)
SELECT id, correct_answer
FROM public.exercises
WHERE correct_answer IS NOT NULL
ON CONFLICT (exercise_id) DO UPDATE SET correct_answer = EXCLUDED.correct_answer;

DROP POLICY IF EXISTS "exercise_answers_staff_only" ON public.exercise_answers;
CREATE POLICY "exercise_answers_staff_only"
  ON public.exercise_answers
  FOR ALL TO authenticated
  USING (
    public.has_approved_role(auth.uid(), 'teacher')
    OR public.has_approved_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_approved_role(auth.uid(), 'teacher')
    OR public.has_approved_role(auth.uid(), 'admin')
  );

REVOKE ALL ON public.exercise_answers FROM PUBLIC;
REVOKE ALL ON public.exercise_answers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_answers TO authenticated;

CREATE OR REPLACE FUNCTION public.create_exercise(
  p_lesson_id UUID,
  p_question TEXT,
  p_options JSONB,
  p_correct_answer TEXT,
  p_points INTEGER DEFAULT 10,
  p_order_num INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_approved_role(auth.uid(), 'teacher')
    OR public.has_approved_role(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'Staff authorization required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.lessons WHERE id = p_lesson_id) THEN
    RAISE EXCEPTION 'Lesson not found';
  END IF;

  IF p_question IS NULL OR length(trim(p_question)) = 0 THEN
    RAISE EXCEPTION 'Question is required';
  END IF;

  IF jsonb_typeof(p_options) <> 'array' OR jsonb_array_length(p_options) < 2 THEN
    RAISE EXCEPTION 'At least two options are required';
  END IF;

  IF p_correct_answer IS NULL OR NOT (p_options ? p_correct_answer) THEN
    RAISE EXCEPTION 'Correct answer must be one of the options';
  END IF;

  IF p_points IS NULL OR p_points < 0 THEN
    RAISE EXCEPTION 'Points must be non-negative';
  END IF;

  INSERT INTO public.exercises (lesson_id, question, options, points, order_num)
  VALUES (p_lesson_id, trim(p_question), p_options, p_points, p_order_num)
  RETURNING id INTO v_id;

  INSERT INTO public.exercise_answers (exercise_id, correct_answer)
  VALUES (v_id, p_correct_answer);

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_exercise(UUID,TEXT,JSONB,TEXT,INTEGER,INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_exercise(UUID,TEXT,JSONB,TEXT,INTEGER,INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_exercise(UUID,TEXT,JSONB,TEXT,INTEGER,INTEGER) TO authenticated;

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
  v_results JSONB := '{}'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.has_role(v_user_id, 'student') THEN RAISE EXCEPTION 'Only students can submit lesson attempts'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = p_lesson_id AND l.is_published = true
  ) THEN RAISE EXCEPTION 'Lesson is not available'; END IF;

  SELECT count(*)::INTEGER, COALESCE(sum(e.points), 0)::INTEGER
  INTO v_exercise_count, v_max_points
  FROM public.exercises e WHERE e.lesson_id = p_lesson_id;

  IF v_exercise_count > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.lesson_id = p_lesson_id
        AND NOT (COALESCE(p_answers, '{}'::jsonb) ? e.id::text)
    ) THEN RAISE EXCEPTION 'All exercises must be answered'; END IF;

    SELECT
      count(*) FILTER (WHERE COALESCE(p_answers, '{}'::jsonb) ->> e.id::text = a.correct_answer)::INTEGER,
      COALESCE(sum(e.points) FILTER (WHERE COALESCE(p_answers, '{}'::jsonb) ->> e.id::text = a.correct_answer), 0)::INTEGER,
      COALESCE(jsonb_object_agg(e.id::text, (COALESCE(p_answers, '{}'::jsonb) ->> e.id::text = a.correct_answer)), '{}'::jsonb)
    INTO v_correct_count, v_score, v_results
    FROM public.exercises e
    JOIN public.exercise_answers a ON a.exercise_id = e.id
    WHERE e.lesson_id = p_lesson_id;
  END IF;

  INSERT INTO public.lesson_progress (student_id, lesson_id, completed, score, completed_at)
  VALUES (v_user_id, p_lesson_id, true, v_score, now())
  ON CONFLICT (student_id, lesson_id)
  DO UPDATE SET completed = true, score = EXCLUDED.score, completed_at = EXCLUDED.completed_at;

  RETURN jsonb_build_object(
    'completed', true,
    'score', v_score,
    'max_points', v_max_points,
    'correct', v_correct_count,
    'total', v_exercise_count,
    'results', v_results
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_lesson_attempt(UUID, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_lesson_attempt(UUID, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_lesson_attempt(UUID, JSONB) TO authenticated;

ALTER TABLE public.exercises DROP COLUMN IF EXISTS correct_answer;
