-- Keep profile points consistent with completed lesson scores for existing data.
SELECT set_config('app.system_update','true',true);

UPDATE public.profiles p
SET points = COALESCE((
  SELECT SUM(lp.score)
  FROM public.lesson_progress lp
  WHERE lp.student_id=p.id
    AND lp.completed=true
),0)
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id=p.id AND ur.role='student'
);

SELECT set_config('app.system_update','false',true);