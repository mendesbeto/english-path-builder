-- Prevent users from changing server-controlled profile state through the Data API.

CREATE OR REPLACE FUNCTION public.prevent_profile_system_field_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = NEW.id
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.points IS DISTINCT FROM OLD.points
       OR NEW.streak_days IS DISTINCT FROM OLD.streak_days
       OR NEW.current_level IS DISTINCT FROM OLD.current_level
       OR NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
      RAISE EXCEPTION 'campos de progresso e aprovação são controlados pelo sistema';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_system_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_system_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_system_field_changes();
