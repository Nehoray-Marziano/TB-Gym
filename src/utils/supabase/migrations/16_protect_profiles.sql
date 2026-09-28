-- RLS permits edits to a user's own profile, but RLS cannot compare NEW.role
-- with OLD.role. Guard identity and role fields in a trigger instead.
BEGIN;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'administrator'
    );
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.role IS DISTINCT FROM 'trainee' THEN
            RAISE EXCEPTION 'Profile role cannot be set by a trainee';
        END IF;
    ELSIF NEW.id IS DISTINCT FROM OLD.id OR NEW.email IS DISTINCT FROM OLD.email OR
          (NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin()) THEN
        RAISE EXCEPTION 'Profile identity and role cannot be changed by a trainee';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_identity ON public.profiles;
CREATE TRIGGER protect_profile_identity
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_identity();

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

COMMIT;
