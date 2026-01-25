"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

type Profile = {
    id: string;
    full_name: string;
    role: string;
    email?: string;
};

type Subscription = {
    tier_name: string;
    tier_display_name: string;
    sessions: number;
    price_nis: number;
    expires_at: string;
    is_active: boolean;
};

type GymStoreContextType = {
    profile: Profile | null;
    tickets: number;  // Available tickets count
    subscription: Subscription | null;
    loading: boolean;
    refreshData: (force?: boolean, userId?: string) => Promise<void>;
    cancelBooking: (sessionId: string) => Promise<{ success: boolean; message: string }>;
};

const GymStoreContext = createContext<GymStoreContextType>({
    profile: null,
    tickets: 0,
    subscription: null,
    loading: true,
    refreshData: async () => { },
    cancelBooking: async () => ({ success: false, message: "Not implemented" }),
});

export const useGymStore = () => useContext(GymStoreContext);

// NOTE: We do NOT cache data freshness anymore - data must always be fresh
// LocalStorage is ONLY used for instant initial render (optimistic UI) - DEPRECATED: Now we don't use it at all.

export function GymStoreProvider({ children }: { children: React.ReactNode }) {
    // Start as loading - no caching
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [tickets, setTickets] = useState<number>(0);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const fetchedRef = useRef(false);

    // Lazy-initialize supabase client only when needed (client-side only)
    const getClient = useCallback(() => {
        return getSupabaseClient();
    }, []);

    const cancelBooking = useCallback(async (sessionId: string) => {
        const supabase = getClient();

        // Optimistically update tickets (add 1)
        setTickets(prev => prev + 1);

        try {
            console.log("Calling RPC cancel_booking with:", sessionId);
            const { data, error } = await supabase.rpc("cancel_booking", { session_id_param: sessionId });

            console.log("RPC Response:", { data, error });

            if (error) throw error;

            // Safeguard against null data
            return data || { success: false, message: "No response from server" };
        } catch (error: any) {
            console.error("Cancel error:", error);
            // Revert on failure
            setTickets(prev => prev - 1);
            return { success: false, message: error.message || "Failed to cancel" };
        }
    }, [getClient]);

    const fetchData = useCallback(async (force: boolean = false, userId?: string) => {
        // ALWAYS fetch from network - data must be fresh (no caching)
        console.log("[GymStore] Fetching fresh data from network (caching disabled)");

        const supabase = getClient();
        if (!supabase) {
            console.error("[GymStore] Supabase client is not available (check env vars)");
            setLoading(false);
            return;
        }

        try {
            // Use passed userId if available (from SSR), otherwise check auth
            let uid = userId;
            if (!uid) {
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError || !user) {
                    console.log("[GymStore] No user found directly or error:", authError);
                    setLoading(false);
                    return;
                }
                uid = user.id;
            }

            console.log("[GymStore] Fetching fresh data from network for:", uid);

            // PARALLEL FETCHING: Fire essential user data requests
            const [profileRes, ticketRes, subRes] = await Promise.all([
                supabase.from("profiles").select("id, full_name, role").eq("id", uid).single(),
                supabase.rpc("get_available_tickets", { p_user_id: uid }),
                supabase.rpc("get_user_subscription", { p_user_id: uid }),
            ]);

            // 1. Set Profile
            if (profileRes.data) {
                // Determine email from auth session if available (since not in public profile)
                // We likely need to pass it down or store it.
                // For now, let's just use the profile data as is, and update the type.
                // Actually, let's get email from the `user` object if we found it.
                // We need to store it.
                // Let's modify the profile state to include email from auth.
                let userEmail = "";
                const { data: { user } } = await supabase.auth.getUser();
                if (user) userEmail = user.email || "";

                setProfile({ ...profileRes.data, email: userEmail });
            }

            // 2. Set Tickets (new system)
            if (ticketRes.data !== null) {
                setTickets(ticketRes.data);
            }

            // 3. Set Subscription
            if (subRes.data) {
                const subData = subRes.data.is_active ? subRes.data : null;
                setSubscription(subData);
            }

        } catch (error) {
            console.error("Error refreshing gym data:", error);
        } finally {
            setLoading(false);
        }
    }, [getClient]);

    // Auth Listener for real-time state updates
    useEffect(() => {
        try {
            const supabase = getClient();
            if (!supabase) {
                console.error("[GymStore] Supabase client is null");
                return;
            }

            const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
                if (event === 'SIGNED_OUT') {
                    setProfile(null);
                    setTickets(0);
                    setSubscription(null);
                    localStorage.removeItem("talia_profile");
                    localStorage.removeItem("talia_tickets");
                    localStorage.removeItem("talia_subscription");
                    localStorage.removeItem("talia_cache_timestamp");
                    setLoading(false);
                } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    // If we have a session but empty profile, fetch data
                    if (session?.user && !profile) {
                        fetchData(true, session.user.id);
                    }
                }
            });

            return () => {
                authSub.unsubscribe();
            };
        } catch (error) {
            console.error("[GymStore] Error in auth listener:", error);
        }
    }, [getClient, fetchData, profile]);

    useEffect(() => {
        // Prevent double-fetch in strict mode
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        // Always fetch fresh data on mount - don't rely on cache
        fetchData();
    }, [fetchData]);

    // Backward compatibility: expose tickets as 'credits' alias
    const credits = tickets;

    return (
        <GymStoreContext.Provider value={{ profile, tickets, subscription, loading, refreshData: fetchData, cancelBooking }}>
            {children}
        </GymStoreContext.Provider>
    );
}

// Re-export Session type for backward compatibility
export type Session = {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    max_capacity: number;
    current_bookings: number;
    description?: string | null;
    isRegistered?: boolean;
};
