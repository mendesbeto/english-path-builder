-- Keep student streaks in sync with lesson completion.
-- Also backfill the current streak from existing completed lesson days.

CREATE OR REPLACE FUNCTION public.submit_lesson_attempt(p_lesson_id uuid, p_answers jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_exercise_count integer := 0;
  v_correct_count integer := 0;
  v_score integer := 0;
  v_max_points integer := 0;
  v_results jsonb := '{}'::jsonb;
  v_previous_score integer := 0;
  v_was_completed boolean := false;
  v_points_delta integer := 0;
  v_previous_activity_date date;
  v_current_streak integer := 0;
  v_new_streak integer := 1;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT private.has_role(v_user_id, 'student') THEN RAISE EXCEPTION 'Only students can submit lesson attempts'; END IF;
  IF NOT private.can_access_lesson(v_user_id, p_lesson_id) THEN RAISE EXCEPTION 'Lesson is not available for the current level'; END IF;
  IF jsonb_typeof(COALESCE(p_answers, '{}'::jsonb)) <> 'object' THEN RAISE EXCEPTION 'Answers must be a JSON object'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_each(COALESCE(p_answers, '{}'::jsonb)) e
    WHERE jsonb_typeof(e.value) <> 'string'
  ) THEN RAISE EXCEPTION 'Answer values must be strings'; END IF;

  SELECT count(*)::integer, COALESCE(sum(e.points), 0)::integer
    INTO v_exercise_count, v_max_points
  FROM public.exercises e
  WHERE e.lesson_id = p_lesson_id;

  IF v_exercise_count > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.lesson_id = p_lesson_id
        AND NOT (p_answers ? e.id::text)
    ) THEN
      RAISE EXCEPTION 'All exercises must be answered';
    END IF;

    SELECT
      count(*) FILTER (WHERE p_answers->>e.id::text = a.correct_answer)::integer,
      COALESCE(sum(e.points) FILTER (WHERE p_answers->>e.id::text = a.correct_answer), 0)::integer,
      COALESCE(jsonb_object_agg(e.id::text, (p_answers->>e.id::text = a.correct_answer)), '{}'::jsonb)
      INTO v_correct_count, v_score, v_results
    FROM public.exercises e
    JOIN public.exercise_answers a ON a.exercise_id = e.id
    WHERE e.lesson_id = p_lesson_id;
  END IF;

  SELECT COALESCE(lp.score, 0), COALESCE(lp.completed, false)
    INTO v_previous_score, v_was_completed
  FROM public.lesson_progress lp
  WHERE lp.student_id = v_user_id
    AND lp.lesson_id = p_lesson_id;

  SELECT MAX(lp.completed_at::date)
    INTO v_previous_activity_date
  FROM public.lesson_progress lp
  WHERE lp.student_id = v_user_id
    AND lp.completed = true;

  SELECT COALESCE(p.streak_days, 0)
    INTO v_current_streak
  FROM public.profiles p
  WHERE p.id = v_user_id;

  v_points_delta := CASE
    WHEN v_was_completed THEN v_score - v_previous_score
    ELSE v_score
  END;

  IF v_previous_activity_date = CURRENT_DATE THEN
    v_new_streak := v_current_streak;
  ELSIF v_previous_activity_date = CURRENT_DATE - 1 THEN
    v_new_streak := v_current_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  INSERT INTO public.lesson_progress(student_id, lesson_id, completed, score, completed_at)
  VALUES (v_user_id, p_lesson_id, true, v_score, now())
  ON CONFLICT (student_id, lesson_id)
  DO UPDATE SET completed = true, score = EXCLUDED.score, completed_at = EXCLUDED.completed_at;

  PERFORM set_config('app.system_update', 'true', true);
  UPDATE public.profiles
  SET
    points = GREATEST(0, points + v_points_delta),
    streak_days = v_new_streak,
    updated_at = now()
  WHERE id = v_user_id;
  PERFORM set_config('app.system_update', 'false', true);

  RETURN jsonb_build_object(
    'completed', true,
    'score', v_score,
    'max_points', v_max_points,
    'correct', v_correct_count,
    'total', v_exercise_count,
    'streak_days', v_new_streak,
    'results', v_results
  );
END;
$function$;

WITH activity_days AS (
  SELECT DISTINCT student_id, completed_at::date AS activity_date
  FROM public.lesson_progress
  WHERE completed = true AND completed_at IS NOT NULL
),
numbered AS (
  SELECT student_id, activity_date,
         activity_date - (ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY activity_date))::integer AS grp
  FROM activity_days
),
streak_groups AS (
  SELECT student_id, grp, COUNT(*)::integer AS streak
  FROM numbered
  GROUP BY student_id, grp
),
current_streaks AS (
  SELECT DISTINCT ON (sg.student_id) sg.student_id, sg.streak
  FROM streak_groups sg
  JOIN numbered n ON n.student_id = sg.student_id AND n.grp = sg.grp
  WHERE n.activity_date = CURRENT_DATE
)
UPDATE public.profiles p
SET streak_days = COALESCE(cs.streak, 0),
    updated_at = now()
FROM (
  SELECT p2.id, COALESCE(cs2.streak, 0) AS streak
  FROM public.profiles p2
  LEFT JOIN current_streaks cs2 ON cs2.student_id = p2.id
) cs
WHERE p.id = cs.id;
