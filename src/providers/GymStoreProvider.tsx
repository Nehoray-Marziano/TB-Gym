"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

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
    refreshData: () => Promise<void>;
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

export function GymStoreProvider({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [credits, setCredits] = useState<number>(0);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [upcomingSession, setUpcomingSession] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    const fetchData = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            // 1. Fetch Profile
            const { data: profileData } = await supabase
                .from("profiles")
                .select("id, full_name, role")
                .eq("id", user.id)
                .single();

            if (profileData) setProfile(profileData);

            // 2. Fetch Credits
            const { data: creditData } = await supabase
                .from("user_credits")
                .select("balance")
                .eq("user_id", user.id)
                .single();

            if (creditData) setCredits(creditData.balance);

            // 3. Fetch Sessions with Counts (Using View)
            const { data: sessionData } = await supabase
                .from("gym_sessions_with_counts") // <-- Querying the VIEW
                .select("*")
                .gte("start_time", new Date().toISOString())
                .order("start_time", { ascending: true });

            if (sessionData) {
                // 4. Fetch My Bookings (to check registration)
                const { data: myBookings } = await supabase
                    .from("bookings")
                    .select("session_id, status, session:gym_sessions(*)")
                    .eq("user_id", user.id)
                    .eq("status", "confirmed");

                const registeredIds = new Set(myBookings?.map(b => b.session_id));

                const sessionsWithStatus = sessionData.map(session => ({
                    ...session,
                    isRegistered: registeredIds.has(session.id),
                    // current_bookings is now valid from the view!
                }));

                setSessions(sessionsWithStatus);

                // 5. Calculate Upcoming Session
                if (myBookings && myBookings.length > 0) {
                    // Filter for future confirmed bookings
                    const futureBookings = myBookings
                        .map((b: any) => b.session)
                        .filter((s: any) => s && new Date(s.start_time) > new Date())
                        .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

                    if (futureBookings.length > 0) {
                        setUpcomingSession(futureBookings[0]);
                    } else {
                        setUpcomingSession(null);
                    }
                } else {
                    setUpcomingSession(null);
                }
            }

        } catch (error) {
            console.error("Error refreshing gym data:", error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

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
            fetchData();

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

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <GymStoreContext.Provider value={{ profile, credits, sessions, upcomingSession, loading, refreshData: fetchData, cancelBooking }}>
            {children}
        </GymStoreContext.Provider>
    );
}
