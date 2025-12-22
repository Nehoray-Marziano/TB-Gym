-- 1. Create a View to get sessions with their booking counts efficiently
-- This allows us to easily see if a session is "FULL" in the frontend
CREATE OR REPLACE VIEW gym_sessions_with_counts AS
SELECT
    s.id,
    s.title,
    s.start_time,
    s.end_time,
    s.max_capacity,
    -- Add other columns from gym_sessions if needed, e.g. location, trainer_id
    COUNT(b.session_id) FILTER (WHERE b.status = 'confirmed') as current_bookings
FROM
    gym_sessions s
LEFT JOIN
    bookings b ON s.id = b.session_id
GROUP BY
    s.id;

-- 2. Create RPC function to cancel a booking safely
-- Enforces: 10-hour cancellation policy
-- Action: Deletes booking AND refunds credit
CREATE OR REPLACE FUNCTION cancel_booking(session_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMP WITH TIME ZONE; -- Using WITH TIME ZONE to be safe with comparisons
    v_user_id UUID;
    v_rows_deleted INT;
BEGIN
    v_user_id := auth.uid();

    -- Get session start time for this user's booking
    -- We join to ensure the booking actually exists for this user
    SELECT s.start_time INTO v_start_time
    FROM bookings b
    JOIN gym_sessions s ON b.session_id = s.id
    WHERE b.session_id = session_id_param 
      AND b.user_id = v_user_id 
      AND b.status = 'confirmed';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Booking not found or already cancelled');
    END IF;

    -- Check 10 hour rule
    -- If current time + 10 hours is GREATER than start time, it means we are within the 10h window (Fail)
    -- Example: Now=8:00, Start=14:00. Now+10h = 18:00. 18:00 > 14:00 -> TRUE (Too late)
    -- Example: Now=8:00, Start=20:00. Now+10h = 18:00. 18:00 < 20:00 -> FALSE (OK to cancel)
    IF (now() + interval '10 hours') > v_start_time THEN
        RETURN jsonb_build_object('success', false, 'message', 'Too late to cancel (less than 10 hours notice)');
    END IF;

    -- Delete booking
    DELETE FROM bookings
    WHERE session_id = session_id_param AND user_id = v_user_id;

    GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;

    IF v_rows_deleted > 0 THEN
        -- Refund Credit
        UPDATE user_credits
        SET balance = balance + 1
        WHERE user_id = v_user_id;
        
        RETURN jsonb_build_object('success', true, 'message', 'Cancelled successfully');
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Failed to delete booking');
    END IF;
END;
$$;
