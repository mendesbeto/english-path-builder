-- Ensure new classes receive an invite code when created from the teacher UI.
-- The frontend intentionally does not need to manufacture join codes.

ALTER TABLE public.classes
  ALTER COLUMN join_code SET DEFAULT upper(substr(md5(gen_random_uuid()::text), 1, 6));

ALTER TABLE public.classes
  DROP CONSTRAINT IF EXISTS classes_join_code_length;

ALTER TABLE public.classes
  ADD CONSTRAINT classes_join_code_length
  CHECK (char_length(join_code) BETWEEN 6 AND 10);
