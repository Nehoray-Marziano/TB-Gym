"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type UserProfile = {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    balance: number;
};

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push("/auth/login");
            return;
        }

        // Fetch Profile
        const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        // Fetch Credits
        const { data: creditData, error: creditError } = await supabase
            .from("user_credits")
            .select("balance")
            .eq("user_id", user.id)
            .single();

        if (profileData) {
            setProfile({
                ...profileData,
                email: user.email || "", // Fallback to auth email
                balance: creditData ? creditData.balance : 0,
            });
        }
        setLoading(false);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/auth/login");
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-white">טוען נתונים...</div>;

    return (
        <div className="min-h-screen pb-20 p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <Link href="/" className="text-sm text-neutral-400 hover:text-white transition-colors">
                    ← חזרה לדף הבית
                </Link>
                <h1 className="text-2xl font-bold text-accent">הפרופיל שלי</h1>
            </div>

            {/* Profile Card */}
            <div className="bg-secondary/50 border border-neutral-800 rounded-2xl p-6 space-y-6">

                {/* Avatar / Name */}
                <div className="text-center space-y-2">
                    <div className="w-20 h-20 bg-primary/20 text-primary rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4 border border-primary/30">
                        {profile?.full_name?.charAt(0) || "?"}
                    </div>
                    <h2 className="text-xl font-semibold text-white">{profile?.full_name || "משתמש אנונימי"}</h2>
                    <p className="text-neutral-400 text-sm">{profile?.email}</p>
                </div>

                <div className="h-px bg-neutral-800 my-4" />

                {/* Details */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-neutral-800">
                        <span className="text-neutral-400">מספר טלפון</span>
                        <span className="text-white dir-ltr">{profile?.phone || "-"}</span>
                    </div>

                    <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-neutral-800">
                        <span className="text-neutral-400">יתרת כרטיסייה</span>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-primary">{profile?.balance}</span>
                            <span className="text-xs text-primary/70">אימונים</span>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-neutral-800 my-4" />

                {/* Actions */}
                <button
                    onClick={handleSignOut}
                    className="w-full py-4 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    התנתקי מהמערכת
                </button>
            </div>

            <p className="text-center text-neutral-600 text-xs mt-8">
                Talia Gym App v1.0.0
            </p>
        </div>
    );
}
