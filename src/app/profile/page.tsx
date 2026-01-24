"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import ProfileClient from "@/components/profile/ProfileClient";

const CACHE_KEYS = {
    profile: "talia_profile_full",
    health: "talia_health",
    timestamp: "talia_profile_timestamp"
};

// NOTE: Cache is ONLY used for instant initial render, data is always fetched fresh

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
    const router = useRouter();
    const supabase = getSupabaseClient();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [health, setHealth] = useState<HealthDeclaration>({ is_healthy: true, medical_conditions: "" });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    router.push("/auth/login");
                    return;
                }

                console.log("[Profile] Fetching fresh data from network");

                // Fetch all data in parallel
                const [profileRes, ticketRes, healthRes] = await Promise.all([
                    supabase.from("profiles").select("*").eq("id", user.id).single(),
                    supabase.rpc("get_available_tickets", { p_user_id: user.id }),
                    supabase.from("health_declarations").select("*").eq("id", user.id).single()
                ]);

                const profileData = profileRes.data;
                const ticketCount = ticketRes.data;
                const healthData = healthRes.data;

                if (profileData) {
                    setProfile({
                        id: profileData.id,
                        full_name: profileData.full_name,
                        email: user.email || "",
                        phone: profileData.phone,
                        balance: ticketCount ?? 0,
                        role: profileData.role,
                    });
                } else if (ticketCount !== null) {
                    // Fallback if profile fetch fails but we have tickets (shouldn't happen often)
                    console.warn("Profile fetch failed but tickets loaded");
                }

                setHealth(healthData || { is_healthy: true, medical_conditions: "" });

            } catch (error) {
                console.error("Error fetching profile data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [supabase, router]);

    // Show loading skeleton only if we don't have cached data
    if (loading && !profile) {
        return <ProfileSkeleton />;
    }

    // Render with cached data (will update when fresh data arrives)
    return <ProfileClient initialProfile={profile} initialHealth={health} />;
}

// Inline skeleton component for faster initial render
function ProfileSkeleton() {
    return (
        <div className="min-h-screen bg-background p-6 pb-20 space-y-8 overflow-hidden">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center mb-8 sticky top-0 py-4 bg-background/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-muted/20 rounded-full animate-pulse" />
                    <div className="h-8 w-32 bg-muted/20 rounded-xl animate-pulse" />
                </div>
                <div className="w-24 h-10 bg-muted/20 rounded-full animate-pulse" />
            </div>

            {/* Profile Avatar Skeleton */}
            <div className="flex flex-col items-center mb-10">
                <div className="w-32 h-32 bg-muted/20 blur-[50px] rounded-full absolute top-20" />
                <div className="w-28 h-28 bg-muted/20 rounded-[2rem] border-2 border-muted/10 animate-pulse relative z-10 mb-4" />
                <div className="h-8 w-40 bg-muted/20 rounded-xl animate-pulse mb-2" />
                <div className="h-6 w-24 bg-muted/20 rounded-full animate-pulse" />
            </div>

            {/* Details Skeleton */}
            <div className="space-y-4">
                <div className="bg-card/50 border border-border rounded-3xl p-1 h-32 animate-pulse" />
                <div className="bg-card/50 border border-border rounded-3xl p-1 h-24 animate-pulse" />
            </div>

            {/* Actions Skeleton */}
            <div className="space-y-3">
                <div className="w-full h-20 bg-muted/10 rounded-3xl animate-pulse" />
                <div className="w-full h-20 bg-muted/10 rounded-3xl animate-pulse" />
            </div>
        </div>
    );
}
