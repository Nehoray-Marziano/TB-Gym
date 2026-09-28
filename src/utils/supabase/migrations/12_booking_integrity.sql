-- Trainees must use book_session so capacity and ticket checks cannot be bypassed.
-- The separate administrator INSERT policy remains in place for manual bookings.
BEGIN;

DROP POLICY IF EXISTS "Create own booking" ON public.bookings;

CREATE OR REPLACE FUNCTION public.book_session(p_session_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_ticket_id UUID;
    v_session_capacity INT;
    v_session_start TIMESTAMPTZ;
    v_current_bookings INT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Authentication required');
    END IF;

    -- Serialize all bookings for this session before reading its occupancy.
    SELECT max_capacity, start_time
    INTO v_session_capacity, v_session_start
    FROM public.gym_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF v_session_capacity IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Session not found');
    END IF;
    IF v_session_start <= NOW() THEN
        RETURN json_build_object('success', false, 'message', 'Session has already started');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.bookings
        WHERE user_id = v_user_id AND session_id = p_session_id AND status = 'confirmed'
    ) THEN
        RETURN json_build_object('success', false, 'message', 'כבר רשומה לאימון זה');
    END IF;

    SELECT id INTO v_ticket_id
    FROM public.user_tickets
    WHERE user_id = v_user_id
      AND used_at IS NULL
      AND expires_at > NOW()
    ORDER BY expires_at ASC, id ASC
    LIMIT 1
    FOR UPDATE;

    IF v_ticket_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'אין כרטיסים זמינים');
    END IF;

    SELECT COUNT(*) INTO v_current_bookings
    FROM public.bookings
    WHERE session_id = p_session_id AND status = 'confirmed';

    IF v_current_bookings >= v_session_capacity THEN
        RETURN json_build_object('success', false, 'message', 'האימון מלא');
    END IF;

    UPDATE public.user_tickets
    SET used_at = NOW(), used_for_session = p_session_id
    WHERE id = v_ticket_id;

    INSERT INTO public.bookings (user_id, session_id, status)
    VALUES (v_user_id, p_session_id, 'confirmed')
    ON CONFLICT (user_id, session_id)
    DO UPDATE SET status = 'confirmed', created_at = NOW();

    RETURN json_build_object('success', true, 'message', 'נרשמת בהצלחה!');
EXCEPTION WHEN OTHERS THEN
    -- Changes inside this block roll back automatically before the handler runs.
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

COMMIT;
