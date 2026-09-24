-- Regression tests for the LMS authorization boundary.
-- These tests are schema/invariant checks only: they do not create users or business data.
-- Run locally with: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

-- All API-facing application tables must have RLS enabled.
select results_eq(
  $$select count(*) from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname in (
        'profiles','user_roles','levels','modules','lessons','exercises',
        'lesson_progress','classes','class_students','exercise_answers'
      )
      and c.relrowsecurity$$,
  $$values (10::bigint)$$,
  'all LMS public tables have RLS enabled'
);

-- The client must never receive the exercise answer key.
select is(
  (select count(*)::int
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'exercises'
     and column_name = 'correct_answer'),
  0,
  'exercises no longer exposes correct_answer'
);

select is(
  (select count(*)::int
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'exercise_answers'
     and column_name = 'correct_answer'),
  1,
  'exercise_answers stores the protected answer key'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'exercise_answers'
      and policyname = 'exercise_answers_staff_only'
      and cmd = 'ALL'
  ),
  'exercise answer keys have a dedicated staff-only policy'
);

-- Direct student writes to lesson_progress are intentionally blocked.
select ok(
  has_table_privilege('authenticated', 'public.lesson_progress', 'INSERT') = false
  and has_table_privilege('authenticated', 'public.lesson_progress', 'UPDATE') = false
  and has_table_privilege('authenticated', 'public.lesson_progress', 'DELETE') = false,
  'authenticated clients cannot write lesson_progress directly'
);

-- The score/attempt path is the controlled write API.
select ok(
  has_function_privilege(
    'authenticated',
    'public.submit_lesson_attempt(uuid,jsonb)',
    'EXECUTE'
  ),
  'authenticated clients can execute submit_lesson_attempt'
);

-- Internal access helper must not be callable as a REST RPC.
select ok(
  not has_function_privilege(
    'authenticated',
    'public.can_access_lesson(uuid,uuid)',
    'EXECUTE'
  ),
  'can_access_lesson is internal and not directly executable by authenticated users'
);

-- Exercise creation is staff-only at the function boundary.
select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_exercise'
      and p.prosecdef
  ),
  'create_exercise is SECURITY DEFINER for controlled staff creation'
);

-- Role changes are controlled through the admin-only RPC.
select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_user_role'
      and p.prosecdef
  ),
  'set_user_role is SECURITY DEFINER for controlled admin role changes'
);

-- Lesson attempts must run with a fixed search_path.
select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'submit_lesson_attempt'
      and array_to_string(p.proconfig, ',') like '%search_path=public%'
  ),
  'submit_lesson_attempt pins search_path'
);

-- Published lesson access is enforced by a SECURITY DEFINER helper.
select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'can_access_lesson'
      and p.prosecdef
      and array_to_string(p.proconfig, ',') like '%search_path=public%'
  ),
  'can_access_lesson is hardened as SECURITY DEFINER with fixed search_path'
);

-- Student lesson access policy must delegate to the access helper.
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lessons'
      and policyname = 'lessons_select_published_or_staff'
      and qual::text like '%can_access_lesson%'
  ),
  'lesson SELECT policy enforces current-level access through can_access_lesson'
);

select * from finish();
rollback;
