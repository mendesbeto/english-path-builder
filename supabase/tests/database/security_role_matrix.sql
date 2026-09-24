-- Cross-user authorization regression harness for the LMS.
--
-- This is intentionally pgTAP-independent because the production project does not
-- currently expose the pgTAP extension. It creates temporary Auth identities and
-- fixtures inside one transaction, executes the RLS checks as authenticated users,
-- and rolls everything back at the end.
--
-- Run against a test/staging database with:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/database/security_role_matrix.sql
--
-- The harness must never be run against production with COMMIT enabled.

BEGIN;

DO $$
DECLARE
  v_student_1 uuid := gen_random_uuid();
  v_student_2 uuid := gen_random_uuid();
  v_teacher_1 uuid := gen_random_uuid();
  v_teacher_2 uuid := gen_random_uuid();
  v_unapproved_teacher uuid := gen_random_uuid();
  v_admin uuid := gen_random_uuid();
  v_lesson uuid := gen_random_uuid();
  v_module uuid;
  v_level uuid;
  v_class uuid := gen_random_uuid();
  v_join_code text := substr(replace(v_class::text, '-', ''), 1, 8);
  v_count integer;
  v_exercise uuid;
  v_denied boolean;
BEGIN
  -- Use an existing published A1 level/module so the access helper exercises
  -- the same CEFR path used by the application.
  SELECT id INTO v_level
  FROM public.levels
  WHERE code = 'A1'::public.level_code
    AND is_published
  ORDER BY order_num
  LIMIT 1;

  IF v_level IS NULL THEN
    RAISE EXCEPTION 'security harness requires a published A1 level';
  END IF;

  SELECT id INTO v_module
  FROM public.modules
  WHERE level_id = v_level
  ORDER BY order_num
  LIMIT 1;

  IF v_module IS NULL THEN
    v_module := gen_random_uuid();
    INSERT INTO public.modules (
      id, level_id, title, description, order_num, created_by
    )
    VALUES (
      v_module, v_level, 'RLS Regression Module',
      'Temporary authorization fixture', 9999, NULL
    );
  END IF;

  -- Auth rows invoke the normal profile/role trigger. The test then normalizes
  -- roles explicitly so the matrix is independent of signup ordering.
  INSERT INTO auth.users (id, aud, role, email, raw_user_meta_data)
  VALUES
    (v_student_1, 'authenticated', 'authenticated', 'rls-student-1@example.invalid', '{"full_name":"RLS Student 1","role":"student"}'::jsonb),
    (v_student_2, 'authenticated', 'authenticated', 'rls-student-2@example.invalid', '{"full_name":"RLS Student 2","role":"student"}'::jsonb),
    (v_teacher_1, 'authenticated', 'authenticated', 'rls-teacher-1@example.invalid', '{"full_name":"RLS Teacher 1","role":"teacher"}'::jsonb),
    (v_teacher_2, 'authenticated', 'authenticated', 'rls-teacher-2@example.invalid', '{"full_name":"RLS Teacher 2","role":"teacher"}'::jsonb),
    (v_unapproved_teacher, 'authenticated', 'authenticated', 'rls-teacher-pending@example.invalid', '{"full_name":"RLS Pending Teacher","role":"teacher"}'::jsonb),
    (v_admin, 'authenticated', 'authenticated', 'rls-admin@example.invalid', '{"full_name":"RLS Admin","role":"admin"}'::jsonb);

  DELETE FROM public.user_roles
  WHERE user_id IN (v_student_1, v_student_2, v_teacher_1, v_teacher_2, v_unapproved_teacher);

  INSERT INTO public.user_roles (user_id, role)
  VALUES
    (v_student_1, 'student'::public.app_role),
    (v_student_2, 'student'::public.app_role),
    (v_teacher_1, 'teacher'::public.app_role),
    (v_teacher_2, 'teacher'::public.app_role),
    (v_unapproved_teacher, 'teacher'::public.app_role),
    (v_admin, 'admin'::public.app_role);

  UPDATE public.profiles
  SET current_level = 'A1'::public.level_code,
      is_approved = CASE
        WHEN id IN (v_teacher_1, v_teacher_2) THEN true
        WHEN id = v_unapproved_teacher THEN false
        ELSE true
      END
  WHERE id IN (v_student_1, v_student_2, v_teacher_1, v_teacher_2, v_unapproved_teacher);

  IF (SELECT count(*) FROM public.profiles WHERE id IN
      (v_student_1, v_student_2, v_teacher_1, v_teacher_2, v_unapproved_teacher)) <> 5 THEN
    RAISE EXCEPTION 'security harness failed to create profiles';
  END IF;

  -- Published lesson that both A1 students may access.
  INSERT INTO public.lessons (
    id, module_id, title, description, type, content, duration_minutes,
    order_num, is_published, created_by
  )
  VALUES (
    v_lesson, v_module, 'RLS Regression Lesson', 'Temporary authorization fixture',
    'quiz'::public.lesson_type, 'Temporary lesson for RLS regression testing.',
    5, 9999, true, v_teacher_1
  );

  -- Seed progress for student 1; student 2 must not see or modify it.
  INSERT INTO public.lesson_progress (
    student_id, lesson_id, completed, score
  )
  VALUES (v_student_1, v_lesson, true, 100);

  -- Class owned by teacher 1 with student 1 enrolled.
  INSERT INTO public.classes (
    id, name, description, level_code, teacher_id, is_active, join_code,
    join_code_expires_at, join_code_max_uses
  )
  VALUES (
    v_class, 'RLS Regression Class', 'Temporary authorization fixture',
    'A1'::public.level_code, v_teacher_1, true, v_join_code,
    now() + interval '1 day', 10
  );

  INSERT INTO public.class_students (class_id, student_id)
  VALUES (v_class, v_student_1);

  -- One exercise is enough to verify that the protected answer key remains
  -- staff-only while the exercise itself is student-readable.
  INSERT INTO public.exercises (
    id, lesson_id, question, options, points, order_num
  )
  VALUES (
    gen_random_uuid(), v_lesson, 'RLS fixture question',
    '["A","B"]'::jsonb, 10, 1
  )
  RETURNING id INTO v_exercise;

  INSERT INTO public.exercise_answers (exercise_id, correct_answer)
  SELECT id, 'A'
  FROM public.exercises
  WHERE lesson_id = v_lesson
  ORDER BY created_at DESC
  LIMIT 1;

  -- All following reads/writes are executed as the application role.
  SET LOCAL ROLE authenticated;

  -- Student 1: own profile visible, peer profile hidden.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_student_1::text, 'role', 'authenticated', 'aud', 'authenticated')::text,
    true
  );

  SELECT count(*) INTO v_count
  FROM public.profiles
  WHERE id IN (v_student_1, v_student_2);

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'student isolation failed: expected 1 visible profile, got %', v_count;
  END IF;

  -- Student 1 cannot update student 2's profile.
  UPDATE public.profiles
  SET full_name = 'SHOULD NOT CHANGE'
  WHERE id = v_student_2;

  IF FOUND THEN
    RAISE EXCEPTION 'student isolation failed: peer profile update was allowed';
  END IF;

  -- Student 1 sees only their own progress.
  SELECT count(*) INTO v_count
  FROM public.lesson_progress
  WHERE student_id IN (v_student_1, v_student_2);

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'progress isolation failed: expected 1 visible row, got %', v_count;
  END IF;

  -- Direct progress writes are globally blocked; the score path is the only
  -- supported write API.
  v_denied := false;
  BEGIN
    UPDATE public.lesson_progress
    SET score = 1
    WHERE student_id = v_student_2
      AND lesson_id = v_lesson;
    v_denied := false;
  EXCEPTION WHEN insufficient_privilege OR others THEN
    v_denied := true;
  END;

  IF NOT v_denied THEN
    RAISE EXCEPTION 'progress isolation failed: direct peer progress update was allowed';
  END IF;

  -- Student 1 can read the published exercise but never its answer key.
  SELECT count(*) INTO v_count
  FROM public.exercises
  WHERE lesson_id = v_lesson;

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'student exercise access failed: expected 1 exercise, got %', v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.exercise_answers;

  IF v_count <> 0 THEN
    RAISE EXCEPTION 'answer-key isolation failed: student saw % answer rows', v_count;
  END IF;

  -- Student 2 is not enrolled in teacher 1's class and cannot see its membership.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_student_2::text, 'role', 'authenticated', 'aud', 'authenticated')::text,
    true
  );

  SELECT count(*) INTO v_count
  FROM public.class_students
  WHERE class_id = v_class;

  IF v_count <> 0 THEN
    RAISE EXCEPTION 'class membership isolation failed: non-member saw class membership';
  END IF;

  -- Teacher 2 is approved but does not own teacher 1's class.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_teacher_2::text, 'role', 'authenticated', 'aud', 'authenticated')::text,
    true
  );

  SELECT count(*) INTO v_count
  FROM public.classes
  WHERE id = v_class;

  IF v_count <> 0 THEN
    RAISE EXCEPTION 'class owner isolation failed: non-owner teacher saw another teacher class';
  END IF;

  UPDATE public.classes
  SET name = 'SHOULD NOT CHANGE'
  WHERE id = v_class;

  IF FOUND THEN
    RAISE EXCEPTION 'class owner isolation failed: non-owner teacher updated class';
  END IF;

  DELETE FROM public.classes
  WHERE id = v_class;

  IF FOUND THEN
    RAISE EXCEPTION 'class owner isolation failed: non-owner teacher deleted class';
  END IF;

  -- Teacher 2 cannot mutate the protected answer key through direct table access
  -- even though staff can read/write shared exercise content through its intended
  -- staff policy. The answer-key policy is deliberately staff-only, not student.
  SELECT count(*) INTO v_count
  FROM public.exercise_answers;

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'staff answer-key access failed: expected 1 answer row, got %', v_count;
  END IF;

  -- An unapproved teacher is denied staff data access.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_unapproved_teacher::text, 'role', 'authenticated', 'aud', 'authenticated')::text,
    true
  );

  SELECT count(*) INTO v_count
  FROM public.profiles
  WHERE id = v_student_1;

  IF v_count <> 0 THEN
    RAISE EXCEPTION 'approval boundary failed: unapproved teacher saw staff profile data';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.classes
  WHERE id = v_class;

  IF v_count <> 0 THEN
    RAISE EXCEPTION 'approval boundary failed: unapproved teacher saw another teacher class';
  END IF;

  -- Student 2 cannot directly insert progress for student 1.
  v_denied := false;
  BEGIN
    INSERT INTO public.lesson_progress (student_id, lesson_id, completed, score)
    VALUES (v_student_1, v_lesson, false, 0);
    v_denied := false;
  EXCEPTION WHEN insufficient_privilege OR check_violation OR others THEN
    v_denied := true;
  END;

  IF NOT v_denied THEN
    RAISE EXCEPTION 'progress isolation failed: non-owner insert was allowed';
  END IF;

  -- Escalation boundary: a student cannot call admin role management.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_student_1::text, 'role', 'authenticated', 'aud', 'authenticated')::text,
    true
  );

  v_denied := false;
  BEGIN
    PERFORM public.set_user_role(v_teacher_2, 'student'::public.app_role);
  EXCEPTION WHEN others THEN
    v_denied := true;
  END;

  IF NOT v_denied THEN
    RAISE EXCEPTION 'privilege escalation failed: student changed another user role';
  END IF;

  -- A student cannot self-approve or modify system-managed profile fields.
  v_denied := false;
  BEGIN
    UPDATE public.profiles
    SET is_approved = false
    WHERE id = v_student_1;
  EXCEPTION WHEN others THEN
    v_denied := true;
  END;

  IF NOT v_denied THEN
    RAISE EXCEPTION 'self-approval protection failed';
  END IF;

  v_denied := false;
  BEGIN
    UPDATE public.profiles
    SET points = 999999, streak_days = 999, current_level = 'C2'::public.level_code
    WHERE id = v_student_1;
  EXCEPTION WHEN others THEN
    v_denied := true;
  END;

  IF NOT v_denied THEN
    RAISE EXCEPTION 'profile system-field protection failed';
  END IF;

  -- Admin can change a user's role through the controlled RPC.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', v_admin::text, 'role', 'authenticated', 'aud', 'authenticated')::text,
    true
  );

  PERFORM public.set_user_role(v_teacher_2, 'student'::public.app_role);

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_teacher_2 AND role = 'student'::public.app_role
  ) THEN
    RAISE EXCEPTION 'admin role-management RPC failed';
  END IF;

  -- The RPC must protect the last administrator. Make the temporary admin the
  -- only admin inside this transaction, then verify demotion is rejected.
  DELETE FROM public.user_roles WHERE role = 'admin'::public.app_role AND user_id <> v_admin;

  v_denied := false;
  BEGIN
    PERFORM public.set_user_role(v_admin, 'student'::public.app_role);
  EXCEPTION WHEN others THEN
    v_denied := true;
  END;

  IF NOT v_denied THEN
    RAISE EXCEPTION 'last-admin protection failed';
  END IF;

  -- Restore the temporary teacher fixture role so later assertions remain clear.
  PERFORM public.set_user_role(v_teacher_2, 'teacher'::public.app_role);

  -- Restore the database execution role before completing the block.
  RESET ROLE;

  RAISE NOTICE 'security_role_matrix: all cross-user RLS assertions passed';
END
$$;

ROLLBACK;
