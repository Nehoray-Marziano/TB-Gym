-- Persist the result in the SAME transaction as each admin mutation. A retry
-- or concurrent delivery of one request ID must never apply the action twice.
BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_mutation_receipts (
    request_id UUID PRIMARY KEY,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    operation TEXT NOT NULL,
    payload JSONB NOT NULL,
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.admin_mutation_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_mutation_receipts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_grant_tickets_once(
    p_request_id UUID, p_user_id UUID, p_quantity INTEGER,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
    v_receipt public.admin_mutation_receipts%ROWTYPE;
    v_payload JSONB := jsonb_build_object('user_id', p_user_id, 'quantity', p_quantity, 'expires_at', p_expires_at);
    v_result JSONB;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Administrator access required';
    END IF;
    IF p_request_id IS NULL THEN
        RAISE EXCEPTION 'Request ID is required';
    END IF;
    INSERT INTO public.admin_mutation_receipts (request_id, actor_id, operation, payload)
    VALUES (p_request_id, auth.uid(), 'grant_tickets', v_payload)
    ON CONFLICT (request_id) DO NOTHING;
    -- INSERT waits for any conflicting transaction; this next statement gets
    -- a fresh READ COMMITTED snapshot and locks its committed receipt.
    SELECT * INTO STRICT v_receipt FROM public.admin_mutation_receipts
    WHERE request_id = p_request_id FOR UPDATE;
    IF v_receipt.actor_id <> auth.uid() OR v_receipt.operation <> 'grant_tickets'
        OR v_receipt.payload <> v_payload THEN
        RAISE EXCEPTION 'Request ID belongs to a different action';
    END IF;
    IF v_receipt.result IS NOT NULL THEN
        RETURN (v_receipt.result || jsonb_build_object('replayed', true))::JSON;
    END IF;
    v_result := public.admin_grant_tickets(p_user_id, p_quantity, p_expires_at)::JSONB;
    UPDATE public.admin_mutation_receipts SET result = v_result WHERE request_id = p_request_id;
    RETURN (v_result || jsonb_build_object('replayed', false))::JSON;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_session_once(
    p_request_id UUID, p_title TEXT, p_description TEXT,
    p_start_time TIMESTAMPTZ, p_end_time TIMESTAMPTZ,
    p_max_capacity INTEGER, p_user_ids UUID[]
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
    v_receipt public.admin_mutation_receipts%ROWTYPE;
    v_payload JSONB;
    v_result JSONB;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Administrator access required';
    END IF;
    IF p_request_id IS NULL THEN
        RAISE EXCEPTION 'Request ID is required';
    END IF;
    v_payload := jsonb_build_object('title', p_title, 'description', p_description,
        'start_time', p_start_time, 'end_time', p_end_time, 'capacity', p_max_capacity,
        'users', CASE WHEN p_user_ids IS NULL THEN NULL ELSE
            (SELECT COALESCE(jsonb_agg(id ORDER BY id), '[]'::JSONB) FROM unnest(p_user_ids) AS invited(id)) END);
    INSERT INTO public.admin_mutation_receipts (request_id, actor_id, operation, payload)
    VALUES (p_request_id, auth.uid(), 'create_session', v_payload)
    ON CONFLICT (request_id) DO NOTHING;
    SELECT * INTO STRICT v_receipt FROM public.admin_mutation_receipts
    WHERE request_id = p_request_id FOR UPDATE;
    IF v_receipt.actor_id <> auth.uid() OR v_receipt.operation <> 'create_session'
        OR v_receipt.payload <> v_payload THEN
        RAISE EXCEPTION 'Request ID belongs to a different action';
    END IF;
    IF v_receipt.result IS NOT NULL THEN
        RETURN (v_receipt.result || jsonb_build_object('replayed', true))::JSON;
    END IF;
    v_result := public.admin_create_session(p_title, p_description, p_start_time,
        p_end_time, p_max_capacity, p_user_ids)::JSONB;
    UPDATE public.admin_mutation_receipts SET result = v_result WHERE request_id = p_request_id;
    RETURN (v_result || jsonb_build_object('replayed', false))::JSON;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_grant_tickets_once(UUID, UUID, INTEGER, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_session_once(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_tickets_once(UUID, UUID, INTEGER, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_session_once(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, UUID[]) TO authenticated;

COMMIT;
