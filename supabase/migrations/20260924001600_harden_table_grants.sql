-- Least-privilege table grants for the LMS Data API.
-- RLS remains the row-level authorization boundary; these grants remove
-- direct write paths that the application does not need.
--
-- Profiles are created by the auth/profile trigger and edited through the
-- existing RLS-protected UPDATE path. Deletion is admin-only but is not used
-- by the current application.
REVOKE INSERT, DELETE ON TABLE public.profiles FROM authenticated;

-- Exercises are created together with their protected answer key through
-- create_exercise(). Staff may still update/delete exercises through RLS.
REVOKE INSERT ON TABLE public.exercises FROM authenticated;

-- Answer keys are readable by approved staff for the teacher UI, but all
-- writes are performed by the SECURITY DEFINER create_exercise() path.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.exercise_answers FROM authenticated;

-- Role changes are performed exclusively through set_user_role().
REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_roles FROM authenticated;
