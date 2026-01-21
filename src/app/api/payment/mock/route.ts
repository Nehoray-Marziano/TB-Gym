import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Mock Payment API
 * Simulates payment processing for subscriptions and ticket purchases.
 * 
 * POST /api/payment/mock
 * Body: { type: 'subscription' | 'additional_tickets', tierId?: number, quantity?: number }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, tierId, quantity } = body;

        // Simulate payment processing delay (1-2 seconds)
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

        // 95% success rate for mock payments
        const isSuccessful = Math.random() < 0.95;

        if (!isSuccessful) {
            return NextResponse.json({
                success: false,
                message: 'התשלום נכשל. אנא נסי שוב.',
                transactionId: null
            }, { status: 402 });
        }

        // Generate mock transaction ID
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;

        // Get authenticated user
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({
                success: false,
                message: 'יש להתחבר כדי לבצע רכישה',
                transactionId: null
            }, { status: 401 });
        }

        // Process based on payment type
        if (type === 'subscription') {
            if (!tierId) {
                return NextResponse.json({
                    success: false,
                    message: 'חסר מזהה מנוי',
                    transactionId: null
                }, { status: 400 });
            }

            // Call the purchase_subscription RPC
            const { data, error } = await supabase.rpc('purchase_subscription', {
                p_tier_id: tierId
            });

            if (error) {
                console.error('Subscription purchase error:', error);
                return NextResponse.json({
                    success: false,
                    message: error.message,
                    transactionId: null
                }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                message: 'המנוי הופעל בהצלחה!',
                transactionId,
                data
            });
        }

        if (type === 'additional_tickets') {
            if (!quantity || quantity < 1) {
                return NextResponse.json({
                    success: false,
                    message: 'כמות לא תקינה',
                    transactionId: null
                }, { status: 400 });
            }

            // Call the purchase_additional_tickets RPC
            const { data, error } = await supabase.rpc('purchase_additional_tickets', {
                p_quantity: quantity
            });

            if (error) {
                console.error('Additional tickets purchase error:', error);
                return NextResponse.json({
                    success: false,
                    message: error.message,
                    transactionId: null
                }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                message: `${quantity} כרטיסים נוספו בהצלחה!`,
                transactionId,
                data
            });
        }

        return NextResponse.json({
            success: false,
            message: 'סוג תשלום לא תקין',
            transactionId: null
        }, { status: 400 });

    } catch (error) {
        console.error('Mock payment error:', error);
        return NextResponse.json({
            success: false,
            message: 'שגיאה בעיבוד התשלום',
            transactionId: null
        }, { status: 500 });
    }
}

// GET endpoint to fetch subscription tiers
export async function GET() {
    // Fallback tiers for when database migration hasn't been applied yet
    const fallbackTiers = [
        { id: 1, name: 'basic', display_name: 'בסיסי', sessions: 4, price_nis: 240, price_per_session: 60 },
        { id: 2, name: 'standard', display_name: 'סטנדרטי', sessions: 8, price_nis: 450, price_per_session: 56.25 },
        { id: 3, name: 'premium', display_name: 'פרימיום', sessions: 12, price_nis: 650, price_per_session: 54.16 },
    ];

    try {
        const supabase = await createClient();

        const { data: tiers, error } = await supabase
            .from('subscription_tiers')
            .select('*')
            .order('sessions', { ascending: true });

        if (error) {
            console.log('subscription_tiers table not found, using fallback tiers');
            // Return fallback tiers if table doesn't exist
            return NextResponse.json({
                success: true,
                tiers: fallbackTiers,
                fallback: true
            });
        }

        // If table exists but empty, use fallback
        if (!tiers || tiers.length === 0) {
            return NextResponse.json({
                success: true,
                tiers: fallbackTiers,
                fallback: true
            });
        }

        return NextResponse.json({
            success: true,
            tiers
        });
    } catch (error) {
        console.error('Error:', error);
        // On any error, return fallback tiers so UI can still work
        return NextResponse.json({
            success: true,
            tiers: fallbackTiers,
            fallback: true
        });
    }
}
