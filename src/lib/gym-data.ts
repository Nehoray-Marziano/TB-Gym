import type { SupabaseClient } from "@supabase/supabase-js";

export type Profile = { id: string; full_name: string; role: string; email?: string };
export type Subscription = {
    tier_name: string;
    tier_display_name: string;
    sessions: number;
    price_nis: number;
    expires_at: string;
    is_active: boolean;
};
export type GymSnapshot = {
    userId: string;
    profile: Profile | null;
    tickets: number;
    subscription: Subscription | null;
};
export type UpcomingSession = { id: string; title: string; start_time: string };

// One data contract for the server bootstrap and subsequent client refreshes.
export async function loadGymSnapshot(supabase: SupabaseClient, userId: string, email = ""): Promise<GymSnapshot> {
    const signal = AbortSignal.timeout(10000);
    const [profile, tickets, subscription] = await Promise.all([
        supabase.from("profiles").select("id, full_name, role").eq("id", userId).abortSignal(signal).maybeSingle(),
        supabase.rpc("get_available_tickets", { p_user_id: userId }).abortSignal(signal),
        supabase.rpc("get_user_subscription", { p_user_id: userId }).abortSignal(signal),
    ]);
    const error = profile.error || tickets.error || subscription.error;
    if (error) throw error;
    if (!profile.data) throw new Error("Account profile is unavailable");
    if (typeof tickets.data !== "number" || !Number.isFinite(tickets.data) || tickets.data < 0) {
        throw new Error("Account balance is unavailable");
    }
    return {
        userId,
        profile: { ...profile.data, email },
        tickets: tickets.data,
        subscription: subscription.data?.is_active ? subscription.data : null,
    };
}

export async function loadUpcomingSession(supabase: SupabaseClient, userId: string): Promise<UpcomingSession | null> {
    const { data, error } = await supabase.from("bookings")
        .select("session:gym_sessions!inner(id,title,start_time)")
        .eq("user_id", userId)
        .eq("status", "confirmed")
        .gt("session.start_time", new Date().toISOString())
        .abortSignal(AbortSignal.timeout(10000));
    if (error) throw error;
    return (data as unknown as { session: UpcomingSession | null }[])
        .map(({ session }) => session)
        .filter((session): session is UpcomingSession => Boolean(session))
        .sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time))[0] ?? null;
}
