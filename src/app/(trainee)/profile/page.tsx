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

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [health, setHealth] = useState<HealthDeclaration>({ is_healthy: null, medical_conditions: "" });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                console.log("[Profile] Fetching fresh data from network");

                // Fetch all data in parallel
                const [profileRes, ticketRes, healthRes] = await Promise.all([
                    supabase.from("profiles").select("*").eq("id", userId).single(),
                    supabase.rpc("get_available_tickets", { p_user_id: userId }),
                    supabase.from("health_declarations").select("*").eq("id", userId).single()
                ]);

                const profileData = profileRes.data;
                const ticketCount = ticketRes.data;
                const healthData = healthRes.data;

                if (profileData) {
                    setProfile({
                        id: profileData.id,
                        full_name: profileData.full_name,
                        email: summary?.email || "",
                        phone: profileData.phone,
                        balance: ticketCount ?? 0,
                        role: profileData.role,
                    });
                } else if (ticketCount !== null) {
                    // Fallback if profile fetch fails but we have tickets (shouldn't happen often)
                    console.warn("Profile fetch failed but tickets loaded");
                }

                setHealth(healthData || { is_healthy: null, medical_conditions: "" });

            } catch (error) {
                console.error("Error fetching profile data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [supabase, userId, summary?.email]);

    // Show loading skeleton only if we don't have cached data
    if (loading && !profile && !summary) {
        return <ProfileSkeleton />;
    }

    const initialProfile = profile ?? (summary ? { id: summary.id, full_name: summary.full_name, email: summary.email || "", phone: "", balance: tickets, role: summary.role } : null);
    return <ProfileClient initialProfile={initialProfile} initialHealth={health} />;
}

// Inline skeleton component for faster initial render
function ProfileSkeleton() {
    return (
        <div className="h-full w-full overflow-hidden bg-[var(--studio-canvas)] px-5 pt-5" aria-busy="true">
            <div className="mx-auto max-w-lg animate-pulse">
                <div className="h-10 w-44 rounded-xl bg-[var(--studio-card)]" />
                <div className="mt-8 h-12 w-48 rounded-xl bg-[var(--studio-card)]" />
                <div className="mt-6 h-32 rounded-[1.5rem] bg-[var(--studio-deep)]/20" />
                <div className="mt-4 h-14 rounded-[1.5rem] bg-[var(--studio-card)]" />
            </div>
        </div>
    );
}
