"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useGymStore } from "@/providers/GymStoreProvider";
import { Calendar, User, Home, CreditCard, Plus, ArrowRight, Activity, Zap, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UserDashboard({ user }: { user: any }) {
    const supabase = createClient();
    const router = useRouter();

    // Using Cached Data!
    const { profile, credits, loading } = useGymStore();
    const [upcomingSession, setUpcomingSession] = useState<any | null>(null);
    const [loadingSession, setLoadingSession] = useState(true);

    useEffect(() => {
        // Load from Cache first
        const cached = localStorage.getItem("talia_upcoming");
        if (cached) {
            setUpcomingSession(JSON.parse(cached));
            setLoadingSession(false);
        }

        const fetchUpcoming = async () => {
            if (!user) return;
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
    }, [user, supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
    };

    if (loading) return (
        // Kept for initial first load, but usually this won't show on navigation
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
        <div className="h-[100dvh] bg-background text-foreground overflow-hidden selection:bg-primary selection:text-black font-sans transition-colors duration-300 relative">
            {/* Background Ambient Light */}
            <div className="fixed top-0 right-0 w-[300px] h-[300px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="fixed bottom-0 left-0 w-[200px] h-[200px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

            {/* Scrollable Content Area */}
            <div className="h-full overflow-y-auto pb-32">
                <div className="p-6 max-w-md mx-auto relative z-10">
                    {/* Header */}
                    <header className="flex justify-between items-start mb-8">
                        <div>
                            <p className="text-muted-foreground text-sm font-medium mb-1">{greeting},</p>
                            <h1 className="text-4xl font-bold text-foreground tracking-tight">
                                {firstName} <span className="inline-block animate-wave origin-bottom-right">👋</span>
                            </h1>
                        </div>

                        {profile?.role === 'administrator' && (
                            <Link href="/admin/schedule" passHref>
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 text-black cursor-pointer"
                                    title="ניהול המערכת"
                                >
                                    <Activity className="w-6 h-6" />
                                </motion.div>
                            </Link>
                        )}

                        <Link href="/profile" passHref>
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="w-12 h-12 bg-card border border-border rounded-full flex items-center justify-center overflow-hidden cursor-pointer"
                            >
                                <div className="w-full h-full bg-gradient-to-br from-card to-card flex items-center justify-center text-lg font-bold text-foreground">
                                    {firstName[0]}
                                </div>
                            </motion.div>
                        </Link>
                    </header>

                    {/* Stats / Credit Card */}
                    <div className="mb-8">
                        <div className="bg-gradient-to-br from-[#E2F163] to-[#d4e450] dark:from-[#E2F163] dark:to-[#d4e450] rounded-[2rem] p-6 text-black shadow-[0_10px_40px_rgba(226,241,99,0.2)] relative overflow-hidden group">
                            <div className="absolute right-[-20%] top-[-20%] w-40 h-40 bg-white/20 blur-3xl rounded-full" />

                            <div className="relative z-10 flex justify-between items-start mb-12">
                                <div>
                                    <p className="font-bold text-black/60 text-sm mb-1 uppercase tracking-wider">היתרה שלך</p>
                                    <h2 className="text-5xl font-bold tracking-tighter counter-value">
                                        {credits}
                                    </h2>
                                </div>
                                <div className="bg-black/10 p-2 rounded-xl backdrop-blur-sm">
                                    <Zap className="w-6 h-6 text-black" />
                                </div>
                            </div>

                            <div className="relative z-10 flex justify-between items-end">
                                <p className="font-medium text-sm text-black/70">שיעורים זמינים</p>
                                <button className="bg-black text-[#E2F163] px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:scale-105 transition-transform">
                                    רכישה מהירה +
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Next Workout */}
                    <div className="mb-8">
                        <div className="flex justify-between items-end mb-4 px-1">
                            <h2 className="text-xl font-bold text-foreground">האימון הבא</h2>
                            {upcomingSession && <Link href="/book" className="text-primary text-xs font-bold hover:underline">לכל האימונים</Link>}
                        </div>

                        {loadingSession ? (
                            // Skeleton for Next Workout Card
                            <div className="bg-card/50 border border-border rounded-[2rem] p-1 flex items-center pr-2 relative overflow-hidden h-28 animate-pulse">
                                <div className="bg-muted/20 w-20 h-20 rounded-[1.5rem] shrink-0 ml-4" />
                                <div className="flex-1 py-4 space-y-2">
                                    <div className="h-6 w-3/4 bg-muted/20 rounded-lg" />
                                    <div className="h-4 w-1/2 bg-muted/20 rounded-lg" />
                                </div>
                            </div>
                        ) : upcomingSession ? (
                            <div className="bg-card/50 border border-border rounded-[2rem] p-1 flex items-center pr-2 relative overflow-hidden group">
                                <div className="bg-muted/50 w-20 h-20 rounded-[1.5rem] flex flex-col items-center justify-center text-center shrink-0 ml-4 relative z-10">
                                    <span className="text-primary font-bold text-xl leading-none">
                                        {new Date(upcomingSession.start_time).getDate()}
                                    </span>
                                    <span className="text-muted-foreground text-xs font-medium uppercase mt-1">
                                        {new Date(upcomingSession.start_time).toLocaleDateString('en-US', { month: 'short' })}
                                    </span>
                                </div>
                                <div className="py-4 relative z-10">
                                    <h3 className="font-bold text-lg text-foreground mb-1">{upcomingSession.title}</h3>
                                    <p className="text-muted-foreground text-sm">
                                        {new Date(upcomingSession.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} • סטודיו ראשי
                                    </p>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            </div>
                        ) : (
                            <Link href="/book" className="block">
                                <div className="bg-card/30 border border-dashed border-border rounded-[2rem] p-8 text-center transition-colors hover:bg-card/40">
                                    <div className="mx-auto w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mb-3">
                                        <Activity className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-muted-foreground text-sm font-medium">לא נרשמת לאימונים קרובים</p>
                                    <span className="text-primary text-sm font-bold mt-2 inline-block hover:underline">
                                        זה הזמן להירשם →
                                    </span>
                                </div>
                            </Link>
                        )}
                    </div>


                </div>
            </div>

            {/* Floating Navigation */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50">
                <div className="bg-card/80 backdrop-blur-xl border border-white/10 dark:border-white/10 rounded-full p-2 flex justify-between items-center shadow-2xl shadow-black/20">
                    <NavIcon href="/" icon={Home} isActive={true} />

                    <Link href="/book">
                        <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center -mt-8 shadow-lg shadow-primary/30 border-[4px] border-background cursor-pointer hover:scale-105 transition-transform relative z-10">
                            <Plus className="w-8 h-8 text-black" />
                        </div>
                    </Link>

                    <NavIcon href="/book" icon={Calendar} />
                </div>
            </div>
        </div>
    );
}

function NavIcon({ href, icon: Icon, isActive }: { href: string; icon: any; isActive?: boolean }) {
    return (
        <Link href={href} className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon className="w-5 h-5" />
        </Link>
    );
}
