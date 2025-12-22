-- Migration: Translate cancel_booking messages to Hebrew

CREATE OR REPLACE FUNCTION cancel_booking(session_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    booking_record RECORD;
    session_record RECORD;
    user_id_param UUID;
BEGIN
    user_id_param := auth.uid();

    -- 1. Find the booking
    SELECT * INTO booking_record
    FROM bookings
    WHERE session_id = session_id_param 
      AND user_id = user_id_param
      AND status = 'confirmed';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'האימון לא נמצא או שכבר בוטל');
    END IF;

    -- 2. Find session details for time check
    SELECT * INTO session_record
    FROM sessions
    WHERE id = session_id_param;

    -- 3. Check 10-hour rule
    -- Condition: NOW + 10 hours > Start Time => Too Late
    IF (now() + interval '10 hours') > session_record.start_time THEN
        RETURN jsonb_build_object('success', false, 'message', 'מאוחר מדי לביטול (פחות מ-10 שעות לפני האימון)');
    END IF;

    -- 4. Proceed to Cancel
    UPDATE bookings
    SET status = 'cancelled'
    WHERE id = booking_record.id;

    -- 5. Refund Credit
    -- (Trigger should handle this, but for safety/clarity regarding race conditions with triggers vs manual update)
    -- The existing trigger `refund_credit_on_cancel` listens to UPDATE on bookings status='cancelled'.
    -- So we just need to update the status.

    RETURN jsonb_build_object('success', true, 'message', 'האימון בוטל בהצלחה');
END;
$$;
