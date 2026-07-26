
-- Metadata table
CREATE TABLE public.pronunciation_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pronunciation_recordings TO authenticated;
GRANT ALL ON public.pronunciation_recordings TO service_role;

ALTER TABLE public.pronunciation_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY pron_select_own_or_staff ON public.pronunciation_recordings
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'teacher')
  );

CREATE POLICY pron_insert_own ON public.pronunciation_recordings
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY pron_delete_own ON public.pronunciation_recordings
  FOR DELETE TO authenticated
  USING (student_id = auth.uid());

CREATE INDEX idx_pron_lesson_student ON public.pronunciation_recordings(lesson_id, student_id);

-- Storage RLS on the private bucket 'pronunciation-recordings'
-- Path convention: {user_id}/{lesson_id}/{filename}
CREATE POLICY pron_storage_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pronunciation-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY pron_storage_select_own_or_staff ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'pronunciation-recordings'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'teacher')
    )
  );

CREATE POLICY pron_storage_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'pronunciation-recordings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
