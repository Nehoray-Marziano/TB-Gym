"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useGymStore } from "@/providers/GymStoreProvider";
import { Calendar, Home, Plus, Activity, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import StudioLogo from "@/components/StudioLogo";

export default function UserDashboard({ user }: { user: any }) {
    const router = useRouter();
    const { profile, credits, loading, refreshData } = useGymStore();
    const [upcomingSession, setUpcomingSession] = useState<any | null>(null);
    const [loadingSession, setLoadingSession] = useState(true);

    useEffect(() => {
        if (user?.id) {
            refreshData(false, user.id);
        }

        const cached = localStorage.getItem("talia_upcoming");
        if (cached) {
            setUpcomingSession(JSON.parse(cached));
            setLoadingSession(false);
        }

        const fetchUpcoming = async () => {
            if (!user) return;
            const supabase = getSupabaseClient();

            const { data: myBookings } = await supabase
                .from("bookings")
                .select("session:gym_sessions(*)")
                .eq("user_id", user.id)
                .eq("status", "confirmed")
                .gte("session.start_time", new Date().toISOString());

            if (myBookings && myBookings.length > 0) {
                const futureBookings = myBookings
                    .map((b: any) => b.session)
                    .filter((s: any) => s && new Date(s.start_time) > new Date())
                    .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

                const nextSession = futureBookings[0] || null;
                setUpcomingSession(nextSession);
                localStorage.setItem("talia_upcoming", JSON.stringify(nextSession));
            } else {
                setUpcomingSession(null);
                localStorage.removeItem("talia_upcoming");
            }
            setLoadingSession(false);
        };
        fetchUpcoming();
    }, [user, refreshData]);

    useEffect(() => {
        router.prefetch('/subscription');
        router.prefetch('/book');
        router.prefetch('/profile');
        router.prefetch('/admin/schedule');
    }, [router]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const firstName = profile?.full_name?.split(" ")[0] || "מתאמנת";
    const greeting = getGreeting();

    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return "בוקר טוב";
        if (hour < 18) return "צהריים טובים";
        return "ערב טוב";
    }

    return (
        <div className="fixed inset-0 bg-background text-foreground overflow-hidden font-sans">
            {/* Simple gradient background - no blur */}
            <div className="fixed top-0 right-0 w-[200px] h-[200px] bg-primary/5 rounded-full pointer-events-none" />

            <div className="h-full overflow-hidden pb-24">
                <div className="p-6 relative z-10 h-full">
                    {/* Logo Header */}
                    <div className="flex justify-center pb-4 pt-4 mb-2">
                        <StudioLogo className="w-16 h-16" />
                    </div>

                    {/* Header */}
                    <header className="flex justify-between items-start mb-8">
                        <div>
                            <p className="text-muted-foreground text-sm font-medium mb-1">{greeting},</p>
                            <h1 className="text-4xl font-bold text-foreground tracking-tight">
                                {firstName} <span className="inline-block">👋</span>
                            </h1>
                        </div>

                        <div className="flex items-center gap-3">
                            {profile?.role === 'administrator' && (
                                <Link href="/admin/schedule" prefetch={true}>
                                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 text-black active:scale-95 transition-transform">
                                        <Activity className="w-6 h-6" />
                                    </div>
                                </Link>
                            )}

                            <Link href="/profile" prefetch={true}>
                                <div className="w-12 h-12 bg-card border border-border rounded-full flex items-center justify-center overflow-hidden active:scale-95 transition-transform">
                                    <div className="w-full h-full flex items-center justify-center text-lg font-bold text-foreground">
                                        {firstName[0]}
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </header>

                    {/* Credit Card */}
                    <div className="mb-8">
                        <Link href="/subscription" prefetch={true}>
                            <div className="bg-gradient-to-br from-[#E2F163] to-[#d4e450] rounded-[2rem] p-6 text-black shadow-lg active:scale-[0.98] transition-transform">
                                <div className="flex justify-between items-start mb-12">
                                    <div>
                                        <p className="font-bold text-black/60 text-sm mb-1 uppercase tracking-wider">היתרה שלך</p>
                                        <h2 className="text-5xl font-bold tracking-tighter">{credits}</h2>
                                    </div>
                                    <div className="bg-black/10 p-2 rounded-xl">
                                        <Zap className="w-6 h-6 text-black" />
                                    </div>
                                </div>

                                <div className="flex justify-between items-end">
                                    <p className="font-medium text-sm text-black/70">שיעורים זמינים</p>
                                    <span className="bg-black text-[#E2F163] px-4 py-2 rounded-xl text-xs font-bold">
                                        רכישה מהירה +
                                    </span>
                                </div>
                            </div>
                        </Link>
                    </div>

                    {/* Next Workout */}
                    <div className="mb-8">
                        <div className="flex justify-between items-end mb-4 px-1">
                            <h2 className="text-xl font-bold text-foreground">האימון הבא</h2>
                            {upcomingSession && <Link href="/book" prefetch={true} className="text-primary text-xs font-bold">לכל האימונים</Link>}
                        </div>

                        {loadingSession ? (
                            <div className="bg-card/50 border border-border rounded-[2rem] p-1 flex items-center pr-2 h-28 animate-pulse">
                                <div className="bg-muted/20 w-20 h-20 rounded-[1.5rem] shrink-0 ml-4" />
                                <div className="flex-1 py-4 space-y-2">
                                    <div className="h-6 w-3/4 bg-muted/20 rounded-lg" />
                                    <div className="h-4 w-1/2 bg-muted/20 rounded-lg" />
                                </div>
                            </div>
                        ) : upcomingSession ? (
                            <Link href="/book" prefetch={true}>
                                <div className="bg-card/50 border border-border rounded-[2rem] p-1 flex items-center pr-2 active:scale-[0.98] transition-transform">
                                    <div className="bg-muted/50 w-20 h-20 rounded-[1.5rem] flex flex-col items-center justify-center text-center shrink-0 ml-4">
                                        <span className="text-primary font-bold text-xl leading-none">
                                            {new Date(upcomingSession.start_time).getDate()}
                                        </span>
                                        <span className="text-muted-foreground text-xs font-medium uppercase mt-1">
                                            {new Date(upcomingSession.start_time).toLocaleDateString('en-US', { month: 'short' })}
                                        </span>
                                    </div>
                                    <div className="py-4">
                                        <h3 className="font-bold text-lg text-foreground mb-1">{upcomingSession.title}</h3>
                                        <p className="text-muted-foreground text-sm">
                                            {new Date(upcomingSession.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} • סטודיו ראשי
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ) : (
                            <Link href="/book" className="block">
                                <div className="bg-card/30 border border-dashed border-border rounded-[2rem] p-8 text-center active:scale-[0.98] transition-transform">
                                    <div className="mx-auto w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mb-3">
                                        <Activity className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-muted-foreground text-sm font-medium">לא נרשמת לאימונים קרובים</p>
                                    <span className="text-primary text-sm font-bold mt-2 inline-block">זה הזמן להירשם →</span>
                                </div>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Navigation - No animation */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50">
                <div className="bg-card/90 border border-border rounded-full p-2 flex justify-between items-center shadow-xl">
                    <Link href="/" className="w-12 h-12 flex items-center justify-center rounded-full text-primary bg-primary/10">
                        <Home className="w-5 h-5" />
                    </Link>

                    <Link href="/book" prefetch={true}>
                        <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center -mt-8 shadow-lg border-[4px] border-background active:scale-95 transition-transform">
                            <Plus className="w-8 h-8 text-black" />
                        </div>
                    </Link>

                    <Link href="/book" className="w-12 h-12 flex items-center justify-center rounded-full text-muted-foreground">
                        <Calendar className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
