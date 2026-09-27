-- Award lesson score points once per completed lesson and adjust only score deltas on retries.
CREATE OR REPLACE FUNCTION public.prevent_profile_system_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = NEW.id
     AND NOT public.has_role(auth.uid(), 'admin')
     AND COALESCE(current_setting('app.system_update', true), '') <> 'true'
  THEN
    IF NEW.points IS DISTINCT FROM OLD.points
       OR NEW.streak_days IS DISTINCT FROM OLD.streak_days
       OR NEW.current_level IS DISTINCT FROM OLD.current_level
       OR NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
      RAISE EXCEPTION 'campos de progresso e aprovação são controlados pelo sistema';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_lesson_attempt(p_lesson_id uuid, p_answers jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT private.has_role(v_user_id,'student') THEN RAISE EXCEPTION 'Only students can submit lesson attempts'; END IF;
  IF NOT private.can_access_lesson(v_user_id,p_lesson_id) THEN RAISE EXCEPTION 'Lesson is not available for the current level'; END IF;
  IF jsonb_typeof(COALESCE(p_answers,'{}'::jsonb)) <> 'object' THEN RAISE EXCEPTION 'Answers must be a JSON object'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_each(COALESCE(p_answers,'{}'::jsonb)) e WHERE jsonb_typeof(e.value) <> 'string') THEN
    RAISE EXCEPTION 'Answer values must be strings';
  END IF;

  SELECT count(*)::integer, COALESCE(sum(e.points),0)::integer
    INTO v_exercise_count,v_max_points
  FROM public.exercises e WHERE e.lesson_id=p_lesson_id;

  IF v_exercise_count > 0 THEN
    IF EXISTS (SELECT 1 FROM public.exercises e WHERE e.lesson_id=p_lesson_id AND NOT (p_answers ? e.id::text)) THEN
      RAISE EXCEPTION 'All exercises must be answered';
    END IF;

    SELECT
      count(*) FILTER(WHERE p_answers->>e.id::text=a.correct_answer)::integer,
      COALESCE(sum(e.points) FILTER(WHERE p_answers->>e.id::text=a.correct_answer),0)::integer,
      COALESCE(jsonb_object_agg(e.id::text,(p_answers->>e.id::text=a.correct_answer)),'{}'::jsonb)
      INTO v_correct_count,v_score,v_results
    FROM public.exercises e
    JOIN public.exercise_answers a ON a.exercise_id=e.id
    WHERE e.lesson_id=p_lesson_id;
  END IF;

  SELECT COALESCE(lp.score,0), COALESCE(lp.completed,false)
    INTO v_previous_score,v_was_completed
  FROM public.lesson_progress lp
  WHERE lp.student_id=v_user_id AND lp.lesson_id=p_lesson_id;

  v_points_delta := CASE WHEN v_was_completed THEN v_score-v_previous_score ELSE v_score END;

  INSERT INTO public.lesson_progress(student_id,lesson_id,completed,score,completed_at)
  VALUES(v_user_id,p_lesson_id,true,v_score,now())
  ON CONFLICT(student_id,lesson_id)
  DO UPDATE SET completed=true,score=EXCLUDED.score,completed_at=EXCLUDED.completed_at;

  IF v_points_delta <> 0 THEN
    PERFORM set_config('app.system_update','true',true);
    UPDATE public.profiles
    SET points=GREATEST(0,points+v_points_delta)
    WHERE id=v_user_id;
    PERFORM set_config('app.system_update','false',true);
  END IF;

  RETURN jsonb_build_object(
    'completed',true,'score',v_score,'max_points',v_max_points,
    'correct',v_correct_count,'total',v_exercise_count,'results',v_results
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.submit_lesson_attempt(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_lesson_attempt(uuid,jsonb) TO authenticated;