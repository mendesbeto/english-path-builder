-- Final hardening for the five intentional public SECURITY DEFINER business RPCs.
-- Internal authorization helpers live in private schema; these RPCs are the supported API surface.

CREATE OR REPLACE FUNCTION public.create_exercise(
  p_lesson_id uuid, p_question text, p_options jsonb,
  p_correct_answer text, p_points integer DEFAULT 10, p_order_num integer DEFAULT 0
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_id uuid; v_options text[];
BEGIN
  IF auth.uid() IS NULL OR NOT (private.has_approved_role(auth.uid(),'teacher') OR private.has_approved_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Staff authorization required';
  END IF;
  IF p_lesson_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.lessons WHERE id=p_lesson_id) THEN RAISE EXCEPTION 'Lesson not found'; END IF;
  IF p_question IS NULL OR length(trim(p_question))=0 THEN RAISE EXCEPTION 'Question is required'; END IF;
  IF jsonb_typeof(p_options) <> 'array' OR jsonb_array_length(p_options)<2
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_options) x WHERE jsonb_typeof(x) <> 'string') THEN
    RAISE EXCEPTION 'Options must be an array of at least two strings';
  END IF;
  SELECT array_agg(value ORDER BY ord) INTO v_options FROM jsonb_array_elements_text(p_options) WITH ORDINALITY t(value,ord);
  IF (SELECT count(*) FROM unnest(v_options)) <> (SELECT count(DISTINCT x) FROM unnest(v_options) x) THEN RAISE EXCEPTION 'Options must be unique'; END IF;
  IF p_correct_answer IS NULL OR NOT (p_options ? p_correct_answer) THEN RAISE EXCEPTION 'Correct answer must be one of the options'; END IF;
  IF p_points IS NULL OR p_points < 0 THEN RAISE EXCEPTION 'Points must be non-negative'; END IF;
  IF p_order_num IS NULL OR p_order_num < 0 THEN RAISE EXCEPTION 'Order must be non-negative'; END IF;
  INSERT INTO public.exercises(lesson_id,question,options,points,order_num)
  VALUES(p_lesson_id,trim(p_question),p_options,p_points,p_order_num) RETURNING id INTO v_id;
  INSERT INTO public.exercise_answers(exercise_id,correct_answer) VALUES(v_id,p_correct_answer);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.join_class_by_code(_code text)
RETURNS TABLE(class_id uuid,class_name text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_class public.classes%ROWTYPE; v_student uuid:=auth.uid(); v_code text;
BEGIN
  IF v_student IS NULL THEN RAISE EXCEPTION 'não autenticado'; END IF;
  IF NOT private.has_role(v_student,'student') THEN RAISE EXCEPTION 'apenas alunos podem entrar em turmas'; END IF;
  v_code:=upper(trim(_code));
  IF v_code IS NULL OR v_code !~ '^[A-Z0-9]{6}$' THEN RAISE EXCEPTION 'código inválido'; END IF;
  SELECT c.* INTO v_class FROM public.classes c WHERE upper(c.join_code)=v_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'código inválido'; END IF;
  IF NOT v_class.is_active THEN RAISE EXCEPTION 'turma não está mais ativa'; END IF;
  IF v_class.join_code_expires_at IS NOT NULL AND v_class.join_code_expires_at<=now() THEN RAISE EXCEPTION 'código expirado'; END IF;
  IF v_class.join_code_max_uses IS NOT NULL AND v_class.join_code_uses>=v_class.join_code_max_uses THEN RAISE EXCEPTION 'limite de usos atingido'; END IF;
  IF EXISTS(SELECT 1 FROM public.class_students cs WHERE cs.class_id=v_class.id AND cs.student_id=v_student) THEN RAISE EXCEPTION 'já está matriculado nesta turma'; END IF;
  INSERT INTO public.class_students(class_id,student_id) VALUES(v_class.id,v_student);
  UPDATE public.classes c SET join_code_uses=c.join_code_uses+1,updated_at=now() WHERE c.id=v_class.id;
  RETURN QUERY SELECT v_class.id,v_class.name;
END $$;

CREATE OR REPLACE FUNCTION public.regenerate_class_join_code(_class_id uuid,_valid_days integer DEFAULT NULL,_max_uses integer DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_code text; v_class public.classes%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'não autenticado'; END IF;
  IF NOT (private.has_approved_role(auth.uid(),'teacher') OR private.has_approved_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'staff authorization required'; END IF;
  SELECT * INTO v_class FROM public.classes WHERE id=_class_id AND (teacher_id=auth.uid() OR private.has_role(auth.uid(),'admin')) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'turma não encontrada ou sem permissão'; END IF;
  IF _valid_days IS NOT NULL AND _valid_days<=0 THEN RAISE EXCEPTION 'validade inválida'; END IF;
  IF _max_uses IS NOT NULL AND _max_uses<=0 THEN RAISE EXCEPTION 'limite inválido'; END IF;
  LOOP
    v_code:=upper(substr(md5(random()::text||clock_timestamp()::text),1,6));
    EXIT WHEN NOT EXISTS(SELECT 1 FROM public.classes WHERE join_code=v_code);
  END LOOP;
  UPDATE public.classes SET join_code=v_code,
    join_code_expires_at=CASE WHEN _valid_days IS NULL THEN NULL ELSE now()+make_interval(days=>_valid_days) END,
    join_code_max_uses=_max_uses,join_code_uses=0,updated_at=now() WHERE id=_class_id;
  RETURN v_code;
END $$;

CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id uuid,new_role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE caller uuid:=auth.uid(); admin_count integer;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'autenticação necessária'; END IF;
  IF NOT private.has_role(caller,'admin') THEN RAISE EXCEPTION 'somente administradores podem alterar papéis'; END IF;
  IF target_user_id IS NULL OR new_role IS NULL THEN RAISE EXCEPTION 'usuário ou papel inválido'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('user_roles:admin-invariant',0));
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=target_user_id) THEN RAISE EXCEPTION 'usuário não encontrado'; END IF;
  SELECT count(*) INTO admin_count FROM public.user_roles WHERE role='admin';
  IF new_role<>'admin' AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=target_user_id AND role='admin') AND admin_count<=1 THEN
    RAISE EXCEPTION 'não é possível remover o último administrador';
  END IF;
  DELETE FROM public.user_roles WHERE user_id=target_user_id;
  INSERT INTO public.user_roles(user_id,role) VALUES(target_user_id,new_role);
END $$;

CREATE OR REPLACE FUNCTION public.submit_lesson_attempt(p_lesson_id uuid,p_answers jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_user_id uuid:=auth.uid(); v_exercise_count integer:=0; v_correct_count integer:=0; v_score integer:=0; v_max_points integer:=0; v_results jsonb:='{}'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT private.has_role(v_user_id,'student') THEN RAISE EXCEPTION 'Only students can submit lesson attempts'; END IF;
  IF NOT private.can_access_lesson(v_user_id,p_lesson_id) THEN RAISE EXCEPTION 'Lesson is not available for the current level'; END IF;
  IF jsonb_typeof(COALESCE(p_answers,'{}'::jsonb))<>'object' THEN RAISE EXCEPTION 'Answers must be a JSON object'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_each(COALESCE(p_answers,'{}'::jsonb)) e WHERE jsonb_typeof(e.value)<>'string') THEN RAISE EXCEPTION 'Answer values must be strings'; END IF;
  SELECT count(*)::integer,COALESCE(sum(e.points),0)::integer INTO v_exercise_count,v_max_points FROM public.exercises e WHERE e.lesson_id=p_lesson_id;
  IF v_exercise_count>0 THEN
    IF EXISTS(SELECT 1 FROM public.exercises e WHERE e.lesson_id=p_lesson_id AND NOT (p_answers ? e.id::text)) THEN RAISE EXCEPTION 'All exercises must be answered'; END IF;
    SELECT count(*) FILTER(WHERE p_answers->>e.id::text=a.correct_answer)::integer,
      COALESCE(sum(e.points) FILTER(WHERE p_answers->>e.id::text=a.correct_answer),0)::integer,
      COALESCE(jsonb_object_agg(e.id::text,(p_answers->>e.id::text=a.correct_answer)),'{}'::jsonb)
      INTO v_correct_count,v_score,v_results
      FROM public.exercises e JOIN public.exercise_answers a ON a.exercise_id=e.id WHERE e.lesson_id=p_lesson_id;
  END IF;
  INSERT INTO public.lesson_progress(student_id,lesson_id,completed,score,completed_at)
  VALUES(v_user_id,p_lesson_id,true,v_score,now())
  ON CONFLICT(student_id,lesson_id) DO UPDATE SET completed=true,score=EXCLUDED.score,completed_at=EXCLUDED.completed_at;
  RETURN jsonb_build_object('completed',true,'score',v_score,'max_points',v_max_points,'correct',v_correct_count,'total',v_exercise_count,'results',v_results);
END $$;
