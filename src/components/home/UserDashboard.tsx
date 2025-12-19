"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";
import Link from "next/link";

export default function UserDashboard({ user }: { user: any }) {
    const supabase = createClient();
    const [profile, setProfile] = useState<any>(null);
    const [credits, setCredits] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            // 1. Fetch Profile
            const { data: profileData } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            setProfile(profileData);

            // 2. Fetch Credits
            const { data: creditData } = await supabase
                .from("user_credits")
                .select("balance")
                .eq("user_id", user.id)
                .single();

            if (creditData) setCredits(creditData.balance);
            setLoading(false);
        };

        fetchData();
    }, [user, supabase]);

    if (loading) return <div className="min-h-screen flex items-center justify-center text-primary">טוען נתונים...</div>;

    return (
        <div className="min-h-screen bg-background text-foreground p-6 pb-24">
            {/* Header */}
            <header className="flex justify-between items-center mb-10 mt-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">היי, {profile?.full_name?.split(" ")[0]} 👋</h1>
                    <p className="text-neutral-400 text-sm">מוכנה לאימון?</p>
                </div>
                <div className="bg-neutral-900/50 border border-neutral-800 p-3 rounded-2xl flex items-center gap-3">
                    <div className="text-right">
                        <span className="block text-xs text-neutral-500">יתרה</span>
                        <span className="block text-lg font-bold text-primary leading-none">{credits} שיעורים</span>
                    </div>
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                        🎫
                    </div>
                </div>
            </header>

            {/* Quick Actions */}
            <section className="mb-8">
                <h2 className="text-lg font-semibold mb-4 text-neutral-300">פעולות מהירות</h2>
                <div className="grid grid-cols-2 gap-4">
                    <Link href="/book" className="bg-primary text-primary-foreground p-6 rounded-3xl font-bold text-lg shadow-[0_4px_20px_rgba(156,169,134,0.2)] hover:scale-[1.02] transition-transform text-right flex flex-col justify-between h-32">
                        <span>📅</span>
                        <span>הזמנת אימון</span>
                    </Link>
                    <button className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl font-bold text-lg hover:border-neutral-700 transition-colors text-right flex flex-col justify-between h-32">
                        <span>💳</span>
                        <span>רכישת כרטיסייה</span>
                    </button>
                </div>
            </section>

            {/* Upcoming Sessions Placeholder */}
            <section>
                <h2 className="text-lg font-semibold mb-4 text-neutral-300">האימונים הקרובים שלך</h2>
                <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-3xl p-8 text-center">
                    <p className="text-neutral-500 mb-4">עדיין לא נרשמת לאימונים השבוע</p>
                    <button className="text-primary text-sm font-semibold hover:underline">צפייה בלוח השיעורים המלא</button>
                </div>
            </section>

            {/* Bottom Nav Placeholder */}
            <nav className="fixed bottom-6 left-6 right-6 bg-[#1A1C19]/90 backdrop-blur-md border border-white/5 p-4 rounded-full flex justify-around items-center shadow-2xl z-50">
                <Link href="/" className="text-primary"><span className="text-2xl">🏠</span></Link>
                <Link href="/book" className="text-neutral-500 hover:text-white transition-colors"><span className="text-2xl">📅</span></Link>
                <Link href="/profile" className="text-neutral-500 hover:text-white transition-colors"><span className="text-2xl">👤</span></Link>
            </nav>
        </div>
    );
}
