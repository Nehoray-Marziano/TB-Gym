"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Calendar, User, Home, CreditCard, Plus, ArrowRight, Activity, Zap, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UserDashboard({ user }: { user: any }) {
    const supabase = createClient();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [credits, setCredits] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [upcomingSession, setUpcomingSession] = useState<any>(null);

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

            // 3. Fetch Next Session
            const { data: allBookings } = await supabase
                .from("bookings")
                .select("*, session:gym_sessions(*)")
                .eq("user_id", user.id)
                .eq("status", "confirmed");

            if (allBookings) {
                const future = allBookings
                    .map((b: any) => b.session)
                    .filter((s: any) => new Date(s.start_time) > new Date())
                    .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

                if (future.length > 0) setUpcomingSession(future[0]);
            }

            setLoading(false);
        };

        fetchData();
    }, [user, supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
            <div className="w-10 h-10 border-4 border-[#E2F163] border-t-transparent rounded-full animate-spin" />
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
        <div className="min-h-screen bg-[#0A0A0A] text-neutral-100 pb-32 overflow-x-hidden selection:bg-[#E2F163] selection:text-black font-sans">
            {/* Background Ambient Light */}
            <div className="fixed top-0 right-0 w-[300px] h-[300px] bg-[#E2F163]/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="fixed bottom-0 left-0 w-[200px] h-[200px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="p-6 max-w-md mx-auto relative z-10">
                {/* Header */}
                <header className="flex justify-between items-start mb-8">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <p className="text-neutral-400 text-sm font-medium mb-1">{greeting},</p>
                        <h1 className="text-4xl font-black text-white tracking-tight">
                            {firstName} <span className="inline-block animate-wave origin-bottom-right">👋</span>
                        </h1>
                    </motion.div>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => router.push('/profile')}
                        className="w-12 h-12 bg-neutral-900 border border-white/10 rounded-full flex items-center justify-center overflow-hidden"
                    >
                        <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center text-lg font-bold">
                            {firstName[0]}
                        </div>
                    </motion.button>
                </header>

                {/* Stats / Credit Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8"
                >
                    <div className="bg-gradient-to-br from-[#E2F163] to-[#d4e450] rounded-[2rem] p-6 text-black shadow-[0_10px_40px_rgba(226,241,99,0.2)] relative overflow-hidden group">
                        <div className="absolute right-[-20%] top-[-20%] w-40 h-40 bg-white/20 blur-3xl rounded-full" />

                        <div className="relative z-10 flex justify-between items-start mb-12">
                            <div>
                                <p className="font-bold text-black/60 text-sm mb-1 uppercase tracking-wider">היתרה שלך</p>
                                <h2 className="text-5xl font-black tracking-tighter counter-value">
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
                </motion.div>

                {/* Next Workout */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8"
                >
                    <div className="flex justify-between items-end mb-4 px-1">
                        <h2 className="text-xl font-bold text-white">האימון הבא</h2>
                        {upcomingSession && <Link href="/schedule" className="text-[#E2F163] text-xs font-bold hover:underline">לכל האימונים</Link>}
                    </div>

                    {upcomingSession ? (
                        <div className="bg-neutral-900/50 border border-white/5 rounded-[2rem] p-1 flex items-center pr-2 relative overflow-hidden group">
                            <div className="bg-neutral-800 w-20 h-20 rounded-[1.5rem] flex flex-col items-center justify-center text-center shrink-0 ml-4 relative z-10">
                                <span className="text-[#E2F163] font-bold text-xl leading-none">
                                    {new Date(upcomingSession.start_time).getDate()}
                                </span>
                                <span className="text-neutral-400 text-xs font-medium uppercase mt-1">
                                    {new Date(upcomingSession.start_time).toLocaleDateString('en-US', { month: 'short' })}
                                </span>
                            </div>
                            <div className="py-4 relative z-10">
                                <h3 className="font-bold text-lg text-white mb-1">{upcomingSession.title}</h3>
                                <p className="text-neutral-400 text-sm">
                                    {new Date(upcomingSession.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} • סטודיו ראשי
                                </p>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </div>
                    ) : (
                        <div className="bg-neutral-900/30 border border-dashed border-neutral-800 rounded-[2rem] p-8 text-center"
                            onClick={() => router.push('/book')}
                        >
                            <div className="mx-auto w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center mb-3">
                                <Activity className="w-6 h-6 text-neutral-500" />
                            </div>
                            <p className="text-neutral-400 text-sm font-medium">לא נרשמת לאימונים קרובים</p>
                            <Link href="/book" className="text-[#E2F163] text-sm font-bold mt-2 inline-block hover:underline">
                                זה הזמן להירשם →
                            </Link>
                        </div>
                    )}
                </motion.div>

                {/* Quick Actions Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <h2 className="text-xl font-bold text-white mb-4 px-1">פעולות מהירות</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/book" className="group">
                            <div className="bg-neutral-900/50 border border-white/5 hover:border-[#E2F163]/30 p-5 rounded-[2rem] h-32 flex flex-col justify-between transition-all hover:bg-neutral-900/80">
                                <div className="w-10 h-10 bg-[#E2F163]/10 rounded-full flex items-center justify-center text-[#E2F163] group-hover:scale-110 transition-transform">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div className="text-right">
                                    <h3 className="text-white font-bold">מערכת שעות</h3>
                                    <p className="text-neutral-500 text-xs mt-1">שרייני מקום</p>
                                </div>
                            </div>
                        </Link>

                        <button className="group text-right">
                            <div className="bg-neutral-900/50 border border-white/5 hover:border-blue-500/30 p-5 rounded-[2rem] h-32 flex flex-col justify-between transition-all hover:bg-neutral-900/80 w-full">
                                <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold">מחירון</h3>
                                    <p className="text-neutral-500 text-xs mt-1">רכישת כרטיסייה</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Floating Navigation */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50">
                <div className="bg-[#131512]/80 backdrop-blur-xl border border-white/10 rounded-full p-2 flex justify-between items-center shadow-2xl shadow-black/50">
                    <NavIcon href="/" icon={Home} isActive />
                    <NavIcon href="/book" icon={Calendar} />
                    <div className="w-12 h-12 bg-[#E2F163] rounded-full flex items-center justify-center -mt-8 shadow-lg shadow-[#E2F163]/30 border-[4px] border-[#0A0A0A] cursor-pointer hover:scale-105 transition-transform" onClick={() => router.push('/book')}>
                        <Plus className="w-6 h-6 text-black" />
                    </div>
                    <NavIcon href="/profile" icon={User} />
                    <button onClick={handleLogout} className="w-12 h-12 flex items-center justify-center text-neutral-500 hover:text-red-400 transition-colors rounded-full">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function NavIcon({ href, icon: Icon, isActive }: { href: string; icon: any; isActive?: boolean }) {
    return (
        <Link href={href} className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${isActive ? "text-[#E2F163] bg-white/5" : "text-neutral-500 hover:text-white"}`}>
            <Icon className="w-5 h-5" />
        </Link>
    );
}
