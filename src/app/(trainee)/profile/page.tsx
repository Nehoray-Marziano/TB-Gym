"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import ProfileClient from "@/components/profile/ProfileClient";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useTraineeUserId } from "@/components/TraineeIdentity";

type UserProfile = {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    balance: number;
    role: string;
};

type HealthDeclaration = {
    is_healthy: boolean | null;
    medical_conditions: string | null;
};

export default function ProfilePage() {
    const supabase = getSupabaseClient();
    const userId = useTraineeUserId();
    const { profile: summary, tickets } = useGymStore();

    const [remoteProfile, setRemoteProfile] = useState<UserProfile | null>(null);
    const [health, setHealth] = useState<HealthDeclaration>({ is_healthy: null, medical_conditions: "" });
    const [loading, setLoading] = useState(!summary);
    const [loadError, setLoadError] = useState(false);
    const [reload, setReload] = useState(0);

    const profile: UserProfile | null = remoteProfile ?? (summary ? {
        id: summary.id,
        full_name: summary.full_name,
        email: summary.email || "",
        phone: "",
        balance: tickets,
        role: summary.role
    } : null);

    useEffect(() => {
        let active = true;
        const fetchData = async () => {
            setLoadError(false);
            try {
                const signal = AbortSignal.timeout(10_000);
                // Fetch all data in parallel
                const [profileRes, ticketRes, healthRes] = await Promise.all([
                    supabase
                        .from("profiles")
                        .select("id, full_name, phone, role")
                        .eq("id", userId)
                        .abortSignal(signal)
                        .single(),
                    supabase.rpc("get_available_tickets", { p_user_id: userId }).abortSignal(signal),
                    supabase
                        .from("health_declarations")
                        .select("is_healthy, medical_conditions")
                        .eq("id", userId)
                        .abortSignal(signal)
                        .maybeSingle()
                ]);

                if (profileRes.error || ticketRes.error || healthRes.error)
                    throw profileRes.error || ticketRes.error || healthRes.error;
                if (!profileRes.data || typeof ticketRes.data !== "number" || !Number.isFinite(ticketRes.data))
                    throw new Error("Account data unavailable");
                if (!active) return;

                const profileData = profileRes.data;
                const ticketCount = ticketRes.data;
                const healthData = healthRes.data;

                if (profileData) {
                    setRemoteProfile({
                        id: profileData.id,
                        full_name: profileData.full_name,
                        email: summary?.email || "",
                        phone: profileData.phone || "",
                        balance: ticketCount ?? tickets,
                        role: profileData.role
                    });
                }

                setHealth(healthData || { is_healthy: null, medical_conditions: "" });
            } catch (error) {
                console.error("Error fetching profile data:", error);
                if (active) setLoadError(true);
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchData();
        return () => {
            active = false;
        };
    }, [supabase, userId, summary?.email, reload, tickets]);

    // Show loading skeleton only if we don't have profile yet and are loading
    if (!profile && loading) {
        return <ProfileSkeleton />;
    }

    if (loadError && !profile) {
        return (
            <div
                data-member-scroll
                className="h-full overflow-y-auto bg-[var(--studio-canvas)] px-5 py-8 text-[var(--studio-ink)]"
            >
                <div role="alert" className="mx-auto max-w-lg space-y-4">
                    <h1 className="text-2xl font-bold">לא הצלחנו לטעון את החשבון</h1>
                    <p className="text-sm text-[var(--studio-muted)]">הפרטים שלך נשמרו. בדקי את החיבור ונסי שוב.</p>
                    <button
                        type="button"
                        onClick={() => {
                            setLoading(true);
                            setReload((value) => value + 1);
                        }}
                        className="studio-tap-feedback min-h-12 rounded-full bg-[var(--studio-deep)] px-6 text-sm font-bold text-[var(--studio-deep-contrast)]"
                    >
                        ניסיון נוסף
                    </button>
                </div>
            </div>
        );
    }

    return <ProfileClient initialProfile={profile} initialHealth={health} />;
}

// Inline skeleton component for faster initial render
function ProfileSkeleton() {
    return (
        <div className="h-full w-full overflow-hidden bg-[var(--studio-canvas)] px-4.5 pt-3" aria-busy="true">
            <div className="mx-auto max-w-lg animate-pulse space-y-2.5">
                <div className="h-7 w-36 rounded-xl bg-[var(--studio-card)]" />
                <div className="h-9 w-40 rounded-xl bg-[var(--studio-card)]" />
                <div className="h-20 rounded-[1.25rem] bg-[var(--studio-deep)]/20" />
                <div className="h-10 rounded-[1.25rem] bg-[var(--studio-card)]" />
            </div>
        </div>
    );
}
