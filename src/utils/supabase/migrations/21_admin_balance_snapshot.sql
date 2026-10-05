-- Count balances in one statement snapshot. Offset paging of mutable ticket
-- rows can skip/double-count rows during bookings, cancellations and grants.
BEGIN;
CREATE OR REPLACE FUNCTION public.admin_list_trainees()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE v_result JSONB;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Administrator access required';
    END IF;
    SELECT COALESCE(jsonb_agg(trainee ORDER BY trainee.full_name, trainee.id), '[]'::JSONB)
    INTO v_result FROM (
        SELECT p.id, p.full_name, p.email, p.phone, p.role, COALESCE(t.available, 0) AS tickets
        FROM public.profiles p LEFT JOIN (
            SELECT user_id, COUNT(*) AS available FROM public.user_tickets
            WHERE used_at IS NULL AND expires_at > NOW() GROUP BY user_id
        ) t ON t.user_id = p.id
        WHERE p.role IS DISTINCT FROM 'administrator'
    ) trainee;
    RETURN v_result;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_trainees() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_trainees() TO authenticated;
COMMIT;
