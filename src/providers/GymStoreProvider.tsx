"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { AuthChangeEvent, Session as AuthSession } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { loadGymSnapshot, type GymSnapshot, type Profile, type Subscription } from "@/lib/gym-data";

type GymStoreContextType = {
    userId: string | null | undefined;
    profile: Profile | null;
    tickets: number;  // Available tickets count
    subscription: Subscription | null;
    loading: boolean;
    error: boolean;
    hasData: boolean;
    hydrateData: (snapshot: GymSnapshot) => void;
    refreshData: (force?: boolean, userId?: string) => Promise<boolean>;
    cancelBooking: (sessionId: string) => Promise<{ success: boolean; message: string }>;
};

const GymStoreContext = createContext<GymStoreContextType>({
    userId: undefined,
    profile: null,
    tickets: 0,
    subscription: null,
    loading: true,
    error: false,
    hasData: false,
    hydrateData: () => { },
    refreshData: async () => false,
    cancelBooking: async () => ({ success: false, message: "Not implemented" }),
});

export const useGymStore = () => useContext(GymStoreContext);


export function GymStoreProvider({ children, initialData, initialUserId, initialEmail = "" }: {
    children: React.ReactNode;
    initialData?: GymSnapshot | null;
    initialUserId?: string;
    initialEmail?: string;
}) {
    const [accountUserId, setAccountUserId] = useState<string | null | undefined>(initialData?.userId ?? initialUserId ?? (initialData === null ? null : undefined));
    const [loading, setLoading] = useState(initialData === undefined);
    const [error, setError] = useState(false);
    const [hasData, setHasData] = useState(Boolean(initialData));
    const [profile, setProfile] = useState<Profile | null>(initialData?.profile ?? null);
    const [tickets, setTickets] = useState(initialData?.tickets ?? 0);
    const [subscription, setSubscription] = useState<Subscription | null>(initialData?.subscription ?? null);
    const fetchedRef = useRef(initialData !== undefined);
    const inFlightFetchRef = useRef<Promise<boolean> | null>(null);
    const requestVersionRef = useRef(0);
    const currentUserRef = useRef<string | null>(initialData?.userId ?? initialUserId ?? null);
    const emailRef = useRef(initialData?.profile?.email ?? initialEmail);
    const hasDataRef = useRef(Boolean(initialData));
    const lastFetchRef = useRef(initialData ? Date.now() : 0);

    const hydrateData = useCallback((snapshot: GymSnapshot) => {
        requestVersionRef.current += 1;
        inFlightFetchRef.current = null;
        fetchedRef.current = true;
        currentUserRef.current = snapshot.userId;
        setAccountUserId(snapshot.userId);
        emailRef.current = snapshot.profile?.email ?? "";
        hasDataRef.current = true;
        setProfile(snapshot.profile);
        setTickets(snapshot.tickets);
        setSubscription(snapshot.subscription);
        setLoading(false);
        setError(false);
        setHasData(true);
    }, []);

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
        if (!force && inFlightFetchRef.current && (!userId || userId === currentUserRef.current)) return inFlightFetchRef.current;
        // The server snapshot (or a completed login fetch) is already fresh.
        // Coalesce immediate entry requests without delaying forced updates.
        if (!force && hasDataRef.current && (!userId || userId === currentUserRef.current) && Date.now() - lastFetchRef.current < 1000) return Promise.resolve(true);

        const requestVersion = ++requestVersionRef.current;
        fetchedRef.current = true;
        const isCurrent = () => requestVersionRef.current === requestVersion;
        if (!hasDataRef.current || (userId && userId !== currentUserRef.current)) {
            setLoading(true);
            setError(false);
        }

        const request = (async () => {
            const supabase = getClient();
            if (!supabase) {
                console.error("[GymStore] Supabase client is not available (check env vars)");
                if (isCurrent()) { setError(true); setLoading(false); }
                return false;
            }

            try {
                // Use passed userId if available (from SSR), otherwise check auth
                let uid = userId ?? currentUserRef.current ?? undefined;
                let authenticatedEmail = emailRef.current;
                if (!uid) {
                    const { data: { user }, error: authError } = await supabase.auth.getUser();
                    if (authError || !user) {
                        if (isCurrent()) {
                            currentUserRef.current = null;
                            setAccountUserId(null);
                            hasDataRef.current = false;
                            setProfile(null);
                            setTickets(0);
                            setSubscription(null);
                            setHasData(false);
                            setError(Boolean(authError));
                        }
                        return false;
                    }
                    uid = user.id;
                    authenticatedEmail = user.email || "";
                }

                if (!uid) return false;
                if (!isCurrent()) return false;
                currentUserRef.current = uid;
                setAccountUserId(uid);
                const snapshot = await loadGymSnapshot(supabase, uid, authenticatedEmail);
                if (!isCurrent()) return false;
                currentUserRef.current = uid;
                emailRef.current = authenticatedEmail;
                hasDataRef.current = true;
                lastFetchRef.current = Date.now();
                setProfile(snapshot.profile);
                setTickets(snapshot.tickets);
                setSubscription(snapshot.subscription);
                setError(false);
                setHasData(true);
                return true;

            } catch (error) {
                console.error("Error refreshing gym data:", error);
                if (isCurrent()) setError(true);
                return false;
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
                    setAccountUserId(null);
                    hasDataRef.current = false;
                    emailRef.current = "";
                    setProfile(null);
                    setTickets(0);
                    setSubscription(null);
                    setLoading(false);
                    setError(false);
                    setHasData(false);
                } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    if (session?.user && currentUserRef.current !== session.user.id) {
                        currentUserRef.current = session.user.id;
                        setAccountUserId(session.user.id);
                        hasDataRef.current = false;
                        emailRef.current = session.user.email ?? "";
                        setProfile(null);
                        setTickets(0);
                        setSubscription(null);
                        setLoading(true);
                        setError(false);
                        setHasData(false);
                        // Release the auth callback before requesting data.
                        // Login awaits the same request before navigating.
                        setTimeout(() => {
                            if (currentUserRef.current === session.user.id) void fetchData(false, session.user.id);
                        }, 0);
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

        // A server snapshot is already fresh; only bootstrap on the client when
        // the server could not supply one.
        fetchData();
    }, [fetchData]);

    return (
        <GymStoreContext.Provider value={{
            userId: accountUserId,
            profile,
            tickets,
            subscription,
            loading,
            error,
            hasData,
            hydrateData,
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
