-- Keep the content-author trigger compatible with the private RLS helper schema.
CREATE OR REPLACE FUNCTION public.enforce_content_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $function$
BEGIN
  IF private.has_role(auth.uid(), 'teacher'::public.app_role)
     AND NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.created_by := auth.uid();
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.created_by := OLD.created_by;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
