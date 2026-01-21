-- =====================================================
-- SUBSCRIPTION TICKET SYSTEM
-- 3 tiers: 4/8/12 sessions at 240/450/670 NIS
-- Tickets expire at end of month, no rollover
-- =====================================================

-- 1. SUBSCRIPTION TIERS TABLE (Static reference data)
CREATE TABLE IF NOT EXISTS subscription_tiers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    sessions INTEGER NOT NULL,
    price_nis NUMERIC NOT NULL,
    price_per_session NUMERIC GENERATED ALWAYS AS (price_nis / sessions) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the 3 tiers
INSERT INTO subscription_tiers (name, display_name, sessions, price_nis) VALUES
    ('basic', 'בסיסי', 4, 240),
    ('standard', 'סטנדרטי', 8, 450),
    ('premium', 'פרימיום', 12, 650)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    sessions = EXCLUDED.sessions,
    price_nis = EXCLUDED.price_nis;

-- 2. USER SUBSCRIPTIONS TABLE (Active subscriptions)
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    tier_id INTEGER REFERENCES subscription_tiers(id) NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id, is_active);

-- RLS for user_subscriptions
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions"
ON user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage subscriptions" ON user_subscriptions;
CREATE POLICY "Admins can manage subscriptions"
ON user_subscriptions FOR ALL
USING (is_admin());


-- 3. USER TICKETS TABLE (Individual session tickets)
CREATE TABLE IF NOT EXISTS user_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    source TEXT CHECK (source IN ('subscription', 'purchase', 'migration', 'admin')) DEFAULT 'subscription',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NULL,
    used_for_session UUID REFERENCES gym_sessions(id) DEFAULT NULL
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_user_tickets_available ON user_tickets(user_id, used_at, expires_at) 
    WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_tickets_user ON user_tickets(user_id);

-- RLS for user_tickets
ALTER TABLE user_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tickets" ON user_tickets;
CREATE POLICY "Users can view own tickets"
ON user_tickets FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage tickets" ON user_tickets;
CREATE POLICY "Admins can manage tickets"
ON user_tickets FOR ALL
USING (is_admin());


-- 4. HELPER FUNCTION: Get end of current month
CREATE OR REPLACE FUNCTION end_of_month(dt TIMESTAMPTZ DEFAULT NOW())
RETURNS TIMESTAMPTZ
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT (date_trunc('month', dt) + INTERVAL '1 month' - INTERVAL '1 second')::TIMESTAMPTZ;
$$;


-- 5. FUNCTION: Get available tickets count for a user
CREATE OR REPLACE FUNCTION get_available_tickets(p_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
    SELECT COUNT(*)::INTEGER
    FROM user_tickets
    WHERE user_id = p_user_id
      AND used_at IS NULL
      AND expires_at > NOW();
$$;


-- 6. FUNCTION: Get user subscription info
CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'tier_name', st.name,
        'tier_display_name', st.display_name,
        'sessions', st.sessions,
        'price_nis', st.price_nis,
        'expires_at', us.expires_at,
        'is_active', us.is_active AND us.expires_at > NOW()
    ) INTO result
    FROM user_subscriptions us
    JOIN subscription_tiers st ON us.tier_id = st.id
    WHERE us.user_id = p_user_id
      AND us.is_active = TRUE
      AND us.expires_at > NOW()
    ORDER BY us.expires_at DESC
    LIMIT 1;
    
    RETURN COALESCE(result, '{"is_active": false}'::JSON);
END;
$$;


-- 7. UPDATED book_session FUNCTION (Uses tickets instead of credits)
-- Drop the old function first to avoid return type conflict
DROP FUNCTION IF EXISTS book_session(UUID);

CREATE OR REPLACE FUNCTION book_session(session_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    ticket_id UUID;
    session_capacity INT;
    current_bookings INT;
    available_tickets INT;
BEGIN
    -- 1. Check for available tickets
    SELECT id INTO ticket_id
    FROM user_tickets
    WHERE user_id = auth.uid()
      AND used_at IS NULL
      AND expires_at > NOW()
    ORDER BY expires_at ASC  -- Use tickets expiring soonest first
    LIMIT 1
    FOR UPDATE;
    
    IF ticket_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'אין כרטיסים זמינים');
    END IF;

    -- 2. Check Session Capacity
    SELECT max_capacity INTO session_capacity FROM gym_sessions WHERE id = session_id;
    SELECT COUNT(*) INTO current_bookings FROM bookings 
        WHERE bookings.session_id = book_session.session_id AND status = 'confirmed';

    IF current_bookings >= session_capacity THEN
        RETURN json_build_object('success', false, 'message', 'האימון מלא');
    END IF;

    -- 3. Use the ticket
    UPDATE user_tickets 
    SET used_at = NOW(), used_for_session = session_id
    WHERE id = ticket_id;

    -- 4. Create booking
    INSERT INTO bookings (user_id, session_id) VALUES (auth.uid(), session_id);

    RETURN json_build_object('success', true, 'message', 'נרשמת בהצלחה!');

EXCEPTION 
    WHEN unique_violation THEN
        -- Return the ticket if booking failed
        UPDATE user_tickets SET used_at = NULL, used_for_session = NULL WHERE id = ticket_id;
        RETURN json_build_object('success', false, 'message', 'כבר רשומה לאימון זה');
    WHEN OTHERS THEN
        -- Return the ticket on any error
        UPDATE user_tickets SET used_at = NULL, used_for_session = NULL WHERE id = ticket_id;
        RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;


-- 8. UPDATED cancel_booking FUNCTION (Returns ticket instead of credit)
-- Drop the old function first to avoid return type conflict
DROP FUNCTION IF EXISTS cancel_booking(UUID);

CREATE OR REPLACE FUNCTION cancel_booking(session_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    booking_record RECORD;
    ticket_record RECORD;
BEGIN
    -- Find the booking
    SELECT * INTO booking_record
    FROM bookings
    WHERE user_id = auth.uid()
      AND session_id = session_id_param
      AND status = 'confirmed';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'לא נמצאה הזמנה לביטול');
    END IF;

    -- Find the ticket used for this booking and return it
    SELECT * INTO ticket_record
    FROM user_tickets
    WHERE user_id = auth.uid()
      AND used_for_session = session_id_param
    LIMIT 1;
    
    IF FOUND THEN
        UPDATE user_tickets 
        SET used_at = NULL, used_for_session = NULL
        WHERE id = ticket_record.id;
    END IF;

    -- Cancel the booking
    UPDATE bookings 
    SET status = 'cancelled'
    WHERE id = booking_record.id;

    RETURN json_build_object('success', true, 'message', 'האימון בוטל והכרטיס הוחזר');
END;
$$;


-- 9. FUNCTION: Purchase subscription (called after mock payment)
CREATE OR REPLACE FUNCTION purchase_subscription(p_tier_id INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    tier_record RECORD;
    sub_id UUID;
    ticket_expiry TIMESTAMPTZ;
BEGIN
    -- Get tier info
    SELECT * INTO tier_record FROM subscription_tiers WHERE id = p_tier_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'מנוי לא תקף');
    END IF;

    -- Set expiry to end of current month
    ticket_expiry := end_of_month();
    
    -- Deactivate any existing active subscriptions
    UPDATE user_subscriptions 
    SET is_active = FALSE 
    WHERE user_id = auth.uid() AND is_active = TRUE;
    
    -- Create new subscription
    INSERT INTO user_subscriptions (user_id, tier_id, expires_at)
    VALUES (auth.uid(), p_tier_id, ticket_expiry)
    RETURNING id INTO sub_id;
    
    -- Issue tickets
    INSERT INTO user_tickets (user_id, source, expires_at)
    SELECT auth.uid(), 'subscription', ticket_expiry
    FROM generate_series(1, tier_record.sessions);
    
    RETURN json_build_object(
        'success', true, 
        'message', 'המנוי הופעל בהצלחה!',
        'subscription_id', sub_id,
        'tickets_issued', tier_record.sessions,
        'expires_at', ticket_expiry
    );
END;
$$;


-- 10. FUNCTION: Purchase additional tickets at tier discount
CREATE OR REPLACE FUNCTION purchase_additional_tickets(p_quantity INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_sub RECORD;
    ticket_expiry TIMESTAMPTZ;
    price_per_ticket NUMERIC;
    total_price NUMERIC;
BEGIN
    -- User must have active subscription to buy additional tickets at discount
    SELECT us.*, st.price_per_session 
    INTO user_sub
    FROM user_subscriptions us
    JOIN subscription_tiers st ON us.tier_id = st.id
    WHERE us.user_id = auth.uid()
      AND us.is_active = TRUE
      AND us.expires_at > NOW()
    ORDER BY us.expires_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'יש צורך במנוי פעיל לרכישת כרטיסים נוספים');
    END IF;
    
    -- Calculate price at subscription discount
    price_per_ticket := user_sub.price_per_session;
    total_price := price_per_ticket * p_quantity;
    
    -- Tickets expire at end of month (same as subscription)
    ticket_expiry := end_of_month();
    
    -- Issue tickets
    INSERT INTO user_tickets (user_id, source, expires_at)
    SELECT auth.uid(), 'purchase', ticket_expiry
    FROM generate_series(1, p_quantity);
    
    RETURN json_build_object(
        'success', true, 
        'message', p_quantity || ' כרטיסים נוספו בהצלחה!',
        'tickets_issued', p_quantity,
        'total_price', total_price,
        'expires_at', ticket_expiry
    );
END;
$$;


-- 11. FUNCTION: Admin grant tickets
CREATE OR REPLACE FUNCTION admin_grant_tickets(p_user_id UUID, p_quantity INTEGER, p_expires_at TIMESTAMPTZ DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    ticket_expiry TIMESTAMPTZ;
BEGIN
    -- Only admins can call this
    IF NOT is_admin() THEN
        RETURN json_build_object('success', false, 'message', 'אין הרשאה');
    END IF;
    
    ticket_expiry := COALESCE(p_expires_at, end_of_month());
    
    INSERT INTO user_tickets (user_id, source, expires_at)
    SELECT p_user_id, 'admin', ticket_expiry
    FROM generate_series(1, p_quantity);
    
    RETURN json_build_object(
        'success', true, 
        'message', p_quantity || ' כרטיסים ניתנו בהצלחה',
        'tickets_issued', p_quantity,
        'expires_at', ticket_expiry
    );
END;
$$;


-- 12. MIGRATE EXISTING CREDITS TO TICKETS
-- Convert existing user_credits balance to tickets expiring end of this month
DO $$
DECLARE
    credit_record RECORD;
    ticket_expiry TIMESTAMPTZ := (date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second')::TIMESTAMPTZ;
BEGIN
    FOR credit_record IN 
        SELECT user_id, balance FROM user_credits WHERE balance > 0
    LOOP
        INSERT INTO user_tickets (user_id, source, expires_at)
        SELECT credit_record.user_id, 'migration', ticket_expiry
        FROM generate_series(1, credit_record.balance);
    END LOOP;
END;
$$;

-- Note: We keep user_credits table for backward compatibility but new code uses user_tickets
