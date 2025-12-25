"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

type Profile = {
    id: string;
    full_name: string;
    role: string;
};

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

type GymStoreContextType = {
    profile: Profile | null;
    credits: number;
    sessions: Session[];
    todayBookingsCount?: number;
    upcomingSession: any | null;
    loading: boolean;
    refreshData: (force?: boolean) => Promise<void>;
    cancelBooking: (sessionId: string) => Promise<{ success: boolean; message: string }>;
};

const GymStoreContext = createContext<GymStoreContextType>({
    profile: null,
    credits: 0,
    sessions: [],
    upcomingSession: null,
    loading: true,
    refreshData: async () => { },
    cancelBooking: async () => ({ success: false, message: "Not implemented" }),
});

export const useGymStore = () => useContext(GymStoreContext);

// Cache freshness duration (5 minutes)
const CACHE_FRESHNESS_MS = 5 * 60 * 1000;

// Helper to check if cache is fresh
function isCacheFresh(timestampKey: string): boolean {
    const timestamp = localStorage.getItem(timestampKey);
    if (!timestamp) return false;
    return Date.now() - parseInt(timestamp, 10) < CACHE_FRESHNESS_MS;
}

export function GymStoreProvider({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [credits, setCredits] = useState<number>(0);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [upcomingSession, setUpcomingSession] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const fetchedRef = useRef(false);

    // Use singleton Supabase client
    const supabase = getSupabaseClient();



    const cancelBooking = async (sessionId: string) => {
        // Optimistic Update: Immediately mark as not registered locally
        const previousSessions = [...sessions];
        setSessions(prev => prev.map(s =>
            s.id === sessionId
                ? { ...s, isRegistered: false, current_bookings: Math.max(0, s.current_bookings - 1) }
                : s
        ));

        // Also optimistically update credits (add 1)
        const previousCredits = credits;
        setCredits(prev => prev + 1);

        try {
            console.log("Calling RPC cancel_booking with:", sessionId);
            const { data, error } = await supabase.rpc("cancel_booking", { session_id_param: sessionId });

            console.log("RPC Response:", { data, error });

            if (error) throw error;

            // Trigger actual data refresh in background to ensure consistency
            fetchData(true);

            // Safeguard against null data
            return data || { success: false, message: "No response from server" };
        } catch (error: any) {
            console.error("Cancel error:", error);
            // Revert on failure
            setSessions(previousSessions);
            setCredits(previousCredits);
            return { success: false, message: error.message || "Failed to cancel" };
        }
    };

    // Initial Cache Loading
    useEffect(() => {
        const cachedProfile = localStorage.getItem("talia_profile");
        const cachedCredits = localStorage.getItem("talia_credits");

        if (cachedProfile) setProfile(JSON.parse(cachedProfile));
        if (cachedCredits) setCredits(parseInt(cachedCredits));

        // Even if cached, we set loading to true initially to trigger the background fetch? 
        // No, for Stale-While-Revalidate, we want to show cached data immediately and loading=false if we have data.
        if (cachedProfile && cachedCredits) setLoading(false);
    }, []);

    const fetchData = useCallback(async (force: boolean = false) => {
        // Skip fetch if cache is fresh and not forced
        if (!force && isCacheFresh("talia_cache_timestamp")) {
            console.log("[GymStore] Cache is fresh, skipping network fetch");
            setLoading(false);
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            console.log("[GymStore] Fetching fresh data from network");

            // PARALLEL FETCHING: Fire only essential user data requests
            const [profileRes, creditRes] = await Promise.all([
                supabase.from("profiles").select("id, full_name, role").eq("id", user.id).single(),
                supabase.from("user_credits").select("balance").eq("user_id", user.id).single(),
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

            // Sessions & Upcoming are loaded lazily by specific pages now
            setLoading(false);

        } catch (error) {
            console.error("Error refreshing gym data:", error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        // Prevent double-fetch in strict mode
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        fetchData();
    }, [fetchData]);

    return (
        <GymStoreContext.Provider value={{ profile, credits, sessions, upcomingSession, loading, refreshData: fetchData, cancelBooking }}>
            {children}
        </GymStoreContext.Provider>
    );
}
