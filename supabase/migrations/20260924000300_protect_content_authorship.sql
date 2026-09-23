-- Protect content authorship while keeping the current shared teacher authoring model.
-- Teachers may collaborate on shared content, but cannot impersonate another author
-- or rewrite the creator attribution. Admins retain full management control.

CREATE OR REPLACE FUNCTION public.enforce_content_author()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'teacher') AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.created_by := auth.uid();
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.created_by := OLD.created_by;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_modules_enforce_content_author ON public.modules;
CREATE TRIGGER trg_modules_enforce_content_author
BEFORE INSERT OR UPDATE ON public.modules
FOR EACH ROW
EXECUTE FUNCTION public.enforce_content_author();

DROP TRIGGER IF EXISTS trg_lessons_enforce_content_author ON public.lessons;
CREATE TRIGGER trg_lessons_enforce_content_author
BEFORE INSERT OR UPDATE ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION public.enforce_content_author();

-- Defensive data constraints for content ordering and duration.
ALTER TABLE public.modules
  DROP CONSTRAINT IF EXISTS modules_order_num_nonnegative;
ALTER TABLE public.modules
  ADD CONSTRAINT modules_order_num_nonnegative CHECK (order_num >= 0);

ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS lessons_order_num_nonnegative;
ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_order_num_nonnegative CHECK (order_num >= 0);

ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS lessons_duration_nonnegative;
ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_duration_nonnegative CHECK (duration_minutes IS NULL OR duration_minutes >= 0);
