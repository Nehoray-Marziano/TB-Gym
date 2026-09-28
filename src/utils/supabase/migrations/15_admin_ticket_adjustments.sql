-- Positive and negative admin adjustments must match the ticket balance shown
-- in the trainee manager. Never remove tickets already used for a booking.
BEGIN;

CREATE OR REPLACE FUNCTION public.admin_grant_tickets(
    p_user_id UUID,
    p_quantity INTEGER,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_expiry TIMESTAMPTZ;
    v_changed INTEGER;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Administrator access required';
    END IF;
    IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'Trainee not found';
    END IF;
    IF p_quantity IS NULL OR p_quantity = 0 OR ABS(p_quantity) > 100 THEN
        RAISE EXCEPTION 'Ticket adjustment must be between -100 and 100, excluding zero';
    END IF;

    IF p_quantity > 0 THEN
        v_expiry := COALESCE(p_expires_at, public.end_of_month());
        IF v_expiry <= NOW() THEN
            RAISE EXCEPTION 'Ticket expiry must be in the future';
        END IF;
        INSERT INTO public.user_tickets (user_id, source, expires_at)
        SELECT p_user_id, 'admin', v_expiry FROM generate_series(1, p_quantity);
        v_changed := p_quantity;
    ELSE
        WITH chosen AS (
            SELECT id FROM public.user_tickets
            WHERE user_id = p_user_id AND used_at IS NULL AND expires_at > NOW()
            ORDER BY expires_at DESC, id DESC
            LIMIT -p_quantity FOR UPDATE
        )
        DELETE FROM public.user_tickets AS tickets
        USING chosen WHERE tickets.id = chosen.id;
        GET DIAGNOSTICS v_changed = ROW_COUNT;
        IF v_changed <> -p_quantity THEN
            RAISE EXCEPTION 'Not enough unused tickets to remove';
        END IF;
    END IF;

    RETURN json_build_object('success', true, 'tickets_changed', p_quantity);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_grant_tickets(UUID, INTEGER, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_tickets(UUID, INTEGER, TIMESTAMPTZ) TO authenticated;

COMMIT;
