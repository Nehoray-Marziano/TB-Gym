-- Match the advertised 10-hour cancellation rule and prevent unverified
-- client-side subscription purchases from minting tickets.
BEGIN;

CREATE OR REPLACE FUNCTION public.cancel_booking(p_session_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_start_time TIMESTAMPTZ;
    v_booking_id UUID;
    v_refunded_count INT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Authentication required');
    END IF;

    -- Use the same session lock order as book_session. This keeps a booking
    -- and its cancellation from racing against each other.
    SELECT start_time INTO v_start_time
    FROM public.gym_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF v_start_time IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Session not found');
    END IF;
    IF NOW() + INTERVAL '10 hours' > v_start_time THEN
        RETURN json_build_object('success', false, 'message', 'Too late to cancel');
    END IF;

    SELECT id INTO v_booking_id
    FROM public.bookings
    WHERE user_id = v_user_id
      AND session_id = p_session_id
      AND status = 'confirmed'
    FOR UPDATE;

    IF v_booking_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Booking not found');
    END IF;

    UPDATE public.user_tickets
    SET used_at = NULL, used_for_session = NULL
    WHERE user_id = v_user_id AND used_for_session = p_session_id;
    GET DIAGNOSTICS v_refunded_count = ROW_COUNT;

    DELETE FROM public.bookings WHERE id = v_booking_id;

    RETURN json_build_object('success', true, 'refunded', v_refunded_count > 0,
        'message', CASE WHEN v_refunded_count > 0
            THEN 'האימון בוטל והכרטיס הוחזר'
            ELSE 'האימון בוטל'
        END);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- The app redirects to Bit and explicitly waits for Talia to verify payment.
-- Neither function has a payment-verification parameter or trusted callback.
-- Admins can issue tickets with admin_grant_tickets after verification.
REVOKE EXECUTE ON FUNCTION public.purchase_subscription(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purchase_additional_tickets(INTEGER) FROM PUBLIC, anon, authenticated;

COMMIT;
