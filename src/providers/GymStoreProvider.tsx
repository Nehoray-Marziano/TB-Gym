"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { AuthChangeEvent, Session as AuthSession } from "@supabase/supabase-js";
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


export function GymStoreProvider({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [tickets, setTickets] = useState<number>(0);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const fetchedRef = useRef(false);
    const inFlightFetchRef = useRef<Promise<void> | null>(null);
    const requestVersionRef = useRef(0);
    const currentUserRef = useRef<string | null>(null);

    // Lazy-initialize supabase client only when needed (client-side only)
    const getClient = useCallback(() => {
        return getSupabaseClient();
    }, []);

    const cancelBooking = useCallback(async (sessionId: string) => {
        const supabase = getClient();

        // Optimistically update tickets (add 1)
        setTickets(prev => prev + 1);

        try {
            const { data, error } = await supabase.rpc("cancel_booking", { p_session_id: sessionId });

            if (error) throw error;

            if (!data?.success) {
                setTickets(prev => prev - 1);
                return data || { success: false, message: "No response from server" };
            }
            return data;
        } catch (error) {
            console.error("Cancel error:", error);
            // Revert on failure
            setTickets(prev => prev - 1);
            return { success: false, message: error instanceof Error ? error.message : "Failed to cancel" };
        }
    }, [getClient]);

    const fetchData = useCallback((force: boolean = false, userId?: string) => {
        // The provider and dashboard can request the same fresh data during one
        // navigation. Share that request instead of repeating the three RPCs.
        if (!force && inFlightFetchRef.current) return inFlightFetchRef.current;

        const requestVersion = ++requestVersionRef.current;
        const isCurrent = () => requestVersionRef.current === requestVersion;

        const request = (async () => {
            const supabase = getClient();
            if (!supabase) {
                console.error("[GymStore] Supabase client is not available (check env vars)");
                if (isCurrent()) setLoading(false);
                return;
            }

            try {
                // Use passed userId if available (from SSR), otherwise check auth
                let uid = userId;
                let authenticatedEmail = "";
                if (!uid) {
                    const { data: { user }, error: authError } = await supabase.auth.getUser();
                    if (authError || !user) {
                        if (isCurrent()) {
                            currentUserRef.current = null;
                            setProfile(null);
                            setTickets(0);
                            setSubscription(null);
                        }
                        return;
                    }
                    uid = user.id;
                    authenticatedEmail = user.email || "";
                }

                const [profileRes, ticketRes, subRes] = await Promise.all([
                    supabase.from("profiles").select("id, full_name, role").eq("id", uid).single(),
                    supabase.rpc("get_available_tickets", { p_user_id: uid }),
                    supabase.rpc("get_user_subscription", { p_user_id: uid }),
                ]);

                if (!isCurrent()) return;
                currentUserRef.current = uid ?? null;

                if (profileRes.data) {
                    let userEmail = authenticatedEmail;
                    if (!userEmail) {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!isCurrent()) return;
                        userEmail = user?.email || "";
                    }

                    setProfile({ ...profileRes.data, email: userEmail });
                } else {
                    setProfile(null);
                }

                setTickets(ticketRes.data ?? 0);
                setSubscription(subRes.data?.is_active ? subRes.data : null);

            } catch (error) {
                console.error("Error refreshing gym data:", error);
            } finally {
                if (isCurrent()) setLoading(false);
            }
        })();

        inFlightFetchRef.current = request;
        void request.then(() => {
            if (inFlightFetchRef.current === request) inFlightFetchRef.current = null;
        });
        return request;
    }, [getClient]);

    // Auth Listener for real-time state updates
    useEffect(() => {
        try {
            const supabase = getClient();
            if (!supabase) {
                console.error("[GymStore] Supabase client is null");
                return;
            }

            const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: AuthSession | null) => {
                if (event === 'SIGNED_OUT') {
                    requestVersionRef.current += 1;
                    inFlightFetchRef.current = null;
                    currentUserRef.current = null;
                    setProfile(null);
                    setTickets(0);
                    setSubscription(null);
                    setLoading(false);
                } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    if (session?.user && currentUserRef.current !== session.user.id) {
                        void fetchData(true, session.user.id);
                    }
                }
            });

            return () => {
                authSub.unsubscribe();
            };
        } catch (error) {
            console.error("[GymStore] Error in auth listener:", error);
        }
    }, [getClient, fetchData]);

    useEffect(() => {
        // Prevent double-fetch in strict mode
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        // Always fetch fresh data on mount - don't rely on cache
        fetchData();
    }, [fetchData]);

    return (
        <GymStoreContext.Provider value={{
            profile,
            tickets,
            subscription,
            loading,
            refreshData: fetchData,
            cancelBooking,
        }}>
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
