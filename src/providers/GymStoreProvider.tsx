"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

type Profile = {
    id: string;
    full_name: string;
    role: string;
};

type GymStoreContextType = {
    profile: Profile | null;
    credits: number;
    loading: boolean;
    refreshData: (force?: boolean, userId?: string) => Promise<void>;
    cancelBooking: (sessionId: string) => Promise<{ success: boolean; message: string }>;
};

const GymStoreContext = createContext<GymStoreContextType>({
    profile: null,
    credits: 0,
    loading: true,
    refreshData: async () => { },
    cancelBooking: async () => ({ success: false, message: "Not implemented" }),
});

export const useGymStore = () => useContext(GymStoreContext);

// Cache freshness duration (5 minutes)
const CACHE_FRESHNESS_MS = 5 * 60 * 1000;

// Helper to check if cache is fresh
function isCacheFresh(timestampKey: string): boolean {
    if (typeof window === 'undefined') return false;
    const timestamp = localStorage.getItem(timestampKey);
    if (!timestamp) return false;
    return Date.now() - parseInt(timestamp, 10) < CACHE_FRESHNESS_MS;
}

// Helper to check if we have cached data
function hasCachedData(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(localStorage.getItem("talia_profile") && localStorage.getItem("talia_credits"));
}

export function GymStoreProvider({ children }: { children: React.ReactNode }) {
    // Start as NOT loading if we have cached data - show UI immediately!
    const [loading, setLoading] = useState(() => !hasCachedData());
    const [profile, setProfile] = useState<Profile | null>(() => {
        if (typeof window === 'undefined') return null;
        const cached = localStorage.getItem("talia_profile");
        return cached ? JSON.parse(cached) : null;
    });
    const [credits, setCredits] = useState<number>(() => {
        if (typeof window === 'undefined') return 0;
        const cached = localStorage.getItem("talia_credits");
        return cached ? parseInt(cached) : 0;
    });
    const fetchedRef = useRef(false);

    // Lazy-initialize supabase client only when needed (client-side only)
    const getClient = useCallback(() => {
        return getSupabaseClient();
    }, []);

    const cancelBooking = useCallback(async (sessionId: string) => {
        const supabase = getClient();

        // Optimistically update credits (add 1)
        setCredits(prev => prev + 1);

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
            setCredits(prev => prev - 1);
            return { success: false, message: error.message || "Failed to cancel" };
        }
    }, [getClient]);

    const fetchData = useCallback(async (force: boolean = false, userId?: string) => {
        // Skip fetch if cache is fresh and not forced
        if (!force && isCacheFresh("talia_cache_timestamp")) {
            console.log("[GymStore] Cache is fresh, skipping network fetch");
            setLoading(false);
            return;
        }

        const supabase = getClient();

        try {
            // Use passed userId if available (from SSR), otherwise check auth
            let uid = userId;
            if (!uid) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }
                uid = user.id;
            }

            console.log("[GymStore] Fetching fresh data from network");

            // PARALLEL FETCHING: Fire only essential user data requests
            const [profileRes, creditRes] = await Promise.all([
                supabase.from("profiles").select("id, full_name, role").eq("id", uid).single(),
                supabase.from("user_credits").select("balance").eq("user_id", uid).single(),
            ]);

            // 1. Set Profile
            if (profileRes.data) {
                setProfile(profileRes.data);
                localStorage.setItem("talia_profile", JSON.stringify(profileRes.data));
            }

            // 2. Set Credits
            if (creditRes.data) {
                setCredits(creditRes.data.balance);
                localStorage.setItem("talia_credits", creditRes.data.balance.toString());
            }

            // Save cache timestamp
            localStorage.setItem("talia_cache_timestamp", Date.now().toString());

        } catch (error) {
            console.error("Error refreshing gym data:", error);
        } finally {
            setLoading(false);
        }
    }, [getClient]);

    // Auth Listener for real-time state updates
    useEffect(() => {
        const supabase = getClient();

        const { data: { subscription } } = supabase.auth.onAuthStateChanged((event: string, session: any) => {
            if (event === 'SIGNED_OUT') {
                setProfile(null);
                setCredits(0);
                localStorage.removeItem("talia_profile");
                localStorage.removeItem("talia_credits");
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
            subscription.unsubscribe();
        };
    }, [getClient, fetchData, profile]);

    useEffect(() => {
        // Prevent double-fetch in strict mode
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        // Only fetch if cache is stale or missing
        if (!hasCachedData() || !isCacheFresh("talia_cache_timestamp")) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [fetchData]);

    return (
        <GymStoreContext.Provider value={{ profile, credits, loading, refreshData: fetchData, cancelBooking }}>
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
