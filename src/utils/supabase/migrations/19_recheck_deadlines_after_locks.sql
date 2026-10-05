-- NOW() is fixed at transaction start. Validate wall-clock deadlines after
-- locks and again after mutations that can wait on foreign-key/booking locks.
-- Exceptions roll back the whole operation, including partial invitations.
BEGIN;

CREATE OR REPLACE FUNCTION public.book_session(p_session_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_ticket_id UUID;
    v_ticket_expiry TIMESTAMPTZ;
    v_capacity INT;
    v_start TIMESTAMPTZ;
    v_count INT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Authentication required');
    END IF;
    SELECT max_capacity, start_time INTO v_capacity, v_start
    FROM public.gym_sessions WHERE id = p_session_id FOR UPDATE;
    IF v_capacity IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Session not found');
    END IF;
    IF v_start <= clock_timestamp() THEN
        RETURN json_build_object('success', false, 'message', 'Session has already started');
    END IF;
    IF EXISTS (SELECT 1 FROM public.bookings WHERE user_id = v_user_id
        AND session_id = p_session_id AND status = 'confirmed') THEN
        RETURN json_build_object('success', false, 'message', 'כבר רשומה לאימון זה');
    END IF;

    LOOP
        SELECT id, expires_at INTO v_ticket_id, v_ticket_expiry
        FROM public.user_tickets WHERE user_id = v_user_id
            AND used_at IS NULL AND expires_at > clock_timestamp()
        ORDER BY expires_at ASC, id ASC LIMIT 1 FOR UPDATE;
        IF v_ticket_id IS NULL THEN
            RETURN json_build_object('success', false, 'message', 'אין כרטיסים זמינים');
        END IF;
        -- Even an unchanged row can expire while SELECT waits for its lock.
        EXIT WHEN v_ticket_expiry > clock_timestamp();
    END LOOP;
    IF v_start <= clock_timestamp() THEN
        RETURN json_build_object('success', false, 'message', 'Session has already started');
    END IF;
    SELECT COUNT(*) INTO v_count FROM public.bookings
    WHERE session_id = p_session_id AND status = 'confirmed';
    IF v_count >= v_capacity THEN
        RETURN json_build_object('success', false, 'message', 'האימון מלא');
    END IF;
    UPDATE public.user_tickets SET used_at = clock_timestamp(), used_for_session = p_session_id
    WHERE id = v_ticket_id;
    INSERT INTO public.bookings (user_id, session_id, status)
    VALUES (v_user_id, p_session_id, 'confirmed')
    ON CONFLICT (user_id, session_id)
    DO UPDATE SET status = 'confirmed', created_at = clock_timestamp();
    IF v_start <= clock_timestamp() THEN
        RAISE EXCEPTION 'Session has already started';
    END IF;
    IF v_ticket_expiry <= clock_timestamp() THEN
        RAISE EXCEPTION 'Ticket expired while completing booking';
    END IF;
    RETURN json_build_object('success', true, 'message', 'נרשמת בהצלחה!');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_booking(p_session_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_start TIMESTAMPTZ;
    v_booking_id UUID;
    v_refunded INT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Authentication required');
    END IF;
    SELECT start_time INTO v_start FROM public.gym_sessions WHERE id = p_session_id FOR UPDATE;
    IF v_start IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Session not found');
    END IF;
    IF clock_timestamp() + INTERVAL '10 hours' > v_start THEN
        RETURN json_build_object('success', false, 'message', 'Too late to cancel');
    END IF;
    SELECT id INTO v_booking_id FROM public.bookings WHERE user_id = v_user_id
        AND session_id = p_session_id AND status = 'confirmed' FOR UPDATE;
    IF v_booking_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Booking not found');
    END IF;
    UPDATE public.user_tickets SET used_at = NULL, used_for_session = NULL
    WHERE user_id = v_user_id AND used_for_session = p_session_id;
    GET DIAGNOSTICS v_refunded = ROW_COUNT;
    DELETE FROM public.bookings WHERE id = v_booking_id;
    IF clock_timestamp() + INTERVAL '10 hours' > v_start THEN
        RAISE EXCEPTION 'Too late to cancel';
    END IF;
    RETURN json_build_object('success', true, 'refunded', v_refunded > 0,
        'message', CASE WHEN v_refunded > 0 THEN 'האימון בוטל והכרטיס הוחזר' ELSE 'האימון בוטל' END);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_tickets(
    p_user_id UUID, p_quantity INTEGER, p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
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
    -- Direct range checks also reject INTEGER_MIN without ABS overflow.
    IF p_quantity IS NULL OR p_quantity = 0 OR p_quantity < -100 OR p_quantity > 100 THEN
        RAISE EXCEPTION 'Ticket adjustment must be between -100 and 100, excluding zero';
    END IF;
    IF p_quantity > 0 THEN
        v_expiry := COALESCE(p_expires_at, public.end_of_month());
        IF v_expiry <= clock_timestamp() THEN
            RAISE EXCEPTION 'Ticket expiry must be in the future';
        END IF;
        INSERT INTO public.user_tickets (user_id, source, expires_at)
        SELECT p_user_id, 'admin', v_expiry FROM generate_series(1, p_quantity);
        IF v_expiry <= clock_timestamp() THEN
            RAISE EXCEPTION 'Ticket expiry must be in the future';
        END IF;
    ELSE
        WITH chosen AS (
            SELECT id FROM public.user_tickets
            WHERE user_id = p_user_id AND used_at IS NULL AND expires_at > clock_timestamp()
            ORDER BY expires_at DESC, id DESC LIMIT -p_quantity FOR UPDATE
        )
        DELETE FROM public.user_tickets AS tickets USING chosen
        WHERE tickets.id = chosen.id AND tickets.used_at IS NULL
            AND tickets.expires_at > clock_timestamp();
        GET DIAGNOSTICS v_changed = ROW_COUNT;
        IF v_changed <> -p_quantity THEN
            RAISE EXCEPTION 'Not enough unused tickets to remove';
        END IF;
    END IF;
    RETURN json_build_object('success', true, 'tickets_changed', p_quantity);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_session(
    p_title TEXT, p_description TEXT, p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ, p_max_capacity INTEGER, p_user_ids UUID[]
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
    v_session_id UUID;
    v_user_id UUID;
    v_ticket_id UUID;
    v_ticket_expiry TIMESTAMPTZ;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Administrator access required';
    END IF;
    IF NULLIF(BTRIM(p_title), '') IS NULL THEN
        RAISE EXCEPTION 'Lesson title is required';
    END IF;
    IF p_start_time IS NULL OR p_end_time IS NULL OR p_start_time <= clock_timestamp() OR p_end_time <= p_start_time THEN
        RAISE EXCEPTION 'Choose a future lesson start and a later end time';
    END IF;
    IF p_max_capacity IS NULL OR p_max_capacity < 1 OR p_max_capacity > 100 THEN
        RAISE EXCEPTION 'Lesson capacity must be between 1 and 100';
    END IF;
    IF p_user_ids IS NULL OR CARDINALITY(p_user_ids) > p_max_capacity OR
       (SELECT COUNT(DISTINCT id) FROM UNNEST(p_user_ids) AS invited(id)) <> CARDINALITY(p_user_ids) THEN
        RAISE EXCEPTION 'Invited trainees must be unique and fit lesson capacity';
    END IF;
    INSERT INTO public.gym_sessions (title, description, start_time, end_time, max_capacity)
    VALUES (BTRIM(p_title), p_description, p_start_time, p_end_time, p_max_capacity)
    RETURNING id INTO v_session_id;
    FOR v_user_id IN SELECT invited.id FROM UNNEST(p_user_ids) AS invited(id) ORDER BY invited.id LOOP
        LOOP
            SELECT id, expires_at INTO v_ticket_id, v_ticket_expiry
            FROM public.user_tickets WHERE user_id = v_user_id
                AND used_at IS NULL AND expires_at > clock_timestamp()
            ORDER BY expires_at ASC, id ASC LIMIT 1 FOR UPDATE;
            IF v_ticket_id IS NULL THEN
                RAISE EXCEPTION 'A selected trainee has no available ticket';
            END IF;
            EXIT WHEN v_ticket_expiry > clock_timestamp();
        END LOOP;
        UPDATE public.user_tickets SET used_at = clock_timestamp(), used_for_session = v_session_id
        WHERE id = v_ticket_id;
        INSERT INTO public.bookings (user_id, session_id, status)
        VALUES (v_user_id, v_session_id, 'confirmed');
    END LOOP;
    IF p_start_time <= clock_timestamp() THEN
        RAISE EXCEPTION 'Choose a future lesson start and a later end time';
    END IF;
    IF EXISTS (SELECT 1 FROM public.user_tickets
        WHERE used_for_session = v_session_id AND expires_at <= clock_timestamp()) THEN
        RAISE EXCEPTION 'A selected trainee ticket expired while creating lesson';
    END IF;
    RETURN json_build_object('success', true, 'session_id', v_session_id,
        'bookings_created', CARDINALITY(p_user_ids));
END;
$$;

COMMIT;
