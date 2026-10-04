-- Acquire invited users in a deterministic order so concurrent private lessons
-- cannot deadlock when the same trainees are selected in reverse order.
BEGIN;

CREATE OR REPLACE FUNCTION public.admin_create_session(
    p_title TEXT,
    p_description TEXT,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_max_capacity INTEGER,
    p_user_ids UUID[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session_id UUID;
    v_user_id UUID;
    v_ticket_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Administrator access required';
    END IF;
    IF NULLIF(BTRIM(p_title), '') IS NULL THEN
        RAISE EXCEPTION 'Lesson title is required';
    END IF;
    IF p_start_time IS NULL OR p_end_time IS NULL OR p_start_time <= NOW() OR p_end_time <= p_start_time THEN
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
        SELECT id INTO v_ticket_id
        FROM public.user_tickets
        WHERE user_id = v_user_id AND used_at IS NULL AND expires_at > NOW()
        ORDER BY expires_at ASC, id ASC
        LIMIT 1 FOR UPDATE;

        IF v_ticket_id IS NULL THEN
            RAISE EXCEPTION 'A selected trainee has no available ticket';
        END IF;

        UPDATE public.user_tickets
        SET used_at = NOW(), used_for_session = v_session_id
        WHERE id = v_ticket_id;

        INSERT INTO public.bookings (user_id, session_id, status)
        VALUES (v_user_id, v_session_id, 'confirmed');
    END LOOP;

    RETURN json_build_object('success', true, 'session_id', v_session_id,
        'bookings_created', CARDINALITY(p_user_ids));
END;
$$;


COMMIT;
