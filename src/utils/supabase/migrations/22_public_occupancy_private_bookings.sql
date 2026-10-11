-- Preserve booking-row privacy while making public class occupancy accurate.
-- A security-invoker join counts only the caller's RLS-visible bookings.
BEGIN;

CREATE SCHEMA IF NOT EXISTS studio_internal;
REVOKE ALL ON SCHEMA studio_internal FROM PUBLIC;
GRANT USAGE ON SCHEMA studio_internal TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION studio_internal.confirmed_session_occupancy(p_session_id UUID)
RETURNS BIGINT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT COUNT(*)
    FROM public.bookings AS b
    WHERE b.session_id = p_session_id
      AND b.status = 'confirmed';
$$;

REVOKE ALL ON FUNCTION studio_internal.confirmed_session_occupancy(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION studio_internal.confirmed_session_occupancy(UUID)
    TO anon, authenticated, service_role;

-- Only public session columns and an aggregate are returned. Base session RLS
-- still applies, and no booking rows/identities are exposed through this view.
CREATE OR REPLACE VIEW public.gym_sessions_with_counts
WITH (security_invoker = true)
AS
SELECT s.*, studio_internal.confirmed_session_occupancy(s.id) AS current_bookings
FROM public.gym_sessions AS s;

GRANT SELECT ON public.gym_sessions_with_counts TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
