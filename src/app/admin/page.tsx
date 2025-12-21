"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

export default function AdminDashboardPage() {
    const supabase = createClient();
    const [stats, setStats] = useState({
        activeUsers: 0,
        sessionsToday: 0,
        openBookings: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            // 1. Total Users
            const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

            // 2. Sessions Today
            const today = new Date().toISOString().split('T')[0];
            const { count: sessionsCount } = await supabase
                .from('gym_sessions')
                .select('*', { count: 'exact', head: true })
                .gte('start_time', `${today}T00:00:00`)
                .lte('start_time', `${today}T23:59:59`);

            // 3. Total Bookings (Example metric)
            const { count: bookingsCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true });

            setStats({
                activeUsers: usersCount || 0,
                sessionsToday: sessionsCount || 0,
                openBookings: bookingsCount || 0
            });
        };
        fetchStats();
    }, []);

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-white mb-2">סקירה כללית</h1>
                <p className="text-neutral-400">ברוכה הבאה למערכת הניהול.</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-3xl text-center md:text-right">
                    <h3 className="text-neutral-400 text-sm mb-2">מתאמנות רשומות</h3>
                    <p className="text-3xl font-bold text-white">{stats.activeUsers}</p>
                </div>
                <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-3xl text-center md:text-right">
                    <h3 className="text-neutral-400 text-sm mb-2">אימונים היום</h3>
                    <p className="text-3xl font-bold text-primary">{stats.sessionsToday}</p>
                </div>
                <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-3xl text-center md:text-right">
                    <h3 className="text-neutral-400 text-sm mb-2">סך הזמנות</h3>
                    <p className="text-3xl font-bold text-white">{stats.openBookings}</p>
                </div>
            </div>

            {/* Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <a href="/admin/schedule" className="block group">
                    <div className="bg-neutral-900/50 border border-neutral-800 hover:border-primary/50 p-8 rounded-3xl transition-all hover:bg-neutral-800/80">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-3xl group-hover:scale-110 transition-transform">
                            📅
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">ניהול מערכת שעות</h2>
                        <p className="text-neutral-400">הוסיפי אימונים חדשים, עכני שעות וצפי בנרשמות.</p>
                        <div className="mt-6 flex items-center text-primary font-bold text-sm">
                            <span className="underline">מעבר ליומן</span>
                            <span className="mr-2 transform group-hover:-translate-x-1 transition-transform">←</span>
                        </div>
                    </div>
                </a>

                <a href="/admin/trainees" className="block group">
                    <div className="bg-neutral-900/50 border border-neutral-800 hover:border-primary/50 p-8 rounded-3xl transition-all hover:bg-neutral-800/80">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 text-3xl group-hover:scale-110 transition-transform">
                            👥
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">ניהול מתאמנות</h2>
                        <p className="text-neutral-400">צפי בכל המשתמשות, עכני יתרות כרטיסייה ופרטים אישיים.</p>
                        <div className="mt-6 flex items-center text-blue-400 font-bold text-sm">
                            <span className="underline">לרשימת המתאמנות</span>
                            <span className="mr-2 transform group-hover:-translate-x-1 transition-transform">←</span>
                        </div>
                    </div>
                </a>
            </div>

            <div className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-2xl text-center text-sm text-neutral-500">
                הנתונים מתעדכנים בזמן אמת
            </div>
        </div>
    );
}
