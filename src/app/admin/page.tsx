"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Ticket, UsersRound, type LucideIcon } from "lucide-react";
import StudioLogo from "@/components/StudioLogo";
import { getSupabaseClient } from "@/lib/supabaseClient";

type StudioStats = {
    activeUsers: number;
    sessionsToday: number;
    openBookings: number;
};

export default function AdminDashboardPage() {
    const supabase = getSupabaseClient();
    const [stats, setStats] = useState<StudioStats>({ activeUsers: 0, sessionsToday: 0, openBookings: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const fetchStats = async () => {
            const today = new Date().toISOString().split("T")[0];
            const [users, sessions, bookings] = await Promise.all([
                supabase.from("profiles").select("*", { count: "exact", head: true }),
                supabase.from("gym_sessions").select("*", { count: "exact", head: true })
                    .gte("start_time", `${today}T00:00:00`).lte("start_time", `${today}T23:59:59`),
                supabase.from("bookings").select("*", { count: "exact", head: true }),
            ]);

            if (!active) return;
            setStats({
                activeUsers: users.count || 0,
                sessionsToday: sessions.count || 0,
                openBookings: bookings.count || 0,
            });
            setIsLoading(false);
        };
        fetchStats();
        return () => { active = false; };
    }, [supabase]);

    return (
        <div className="space-y-9">
            <header className="border-b border-white/15 pb-7">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <StudioLogo className="h-9 w-9 bg-[#dce780]" />
                        <span className="border-s border-white/20 ps-3 text-xs font-bold leading-tight">סטודיו<br />טליה</span>
                    </div>
                    <span className="rounded-full border border-[#dce780]/25 px-3 py-1.5 text-[11px] font-bold text-[#dce780]">אזור הניהול</span>
                </div>
                <p className="mt-10 flex items-center gap-2 text-xs font-bold text-[#aebbad]"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#dce780]" />הסטודיו שלך</p>
                <h1 className="mt-4 max-w-[18rem] text-[clamp(2.7rem,11vw,4.1rem)] font-bold leading-[1.02] tracking-tight">טליה, הכול<br /><span className="text-[#dce780]">מול העיניים.</span></h1>
                <p className="mt-5 text-sm leading-relaxed text-[#aebbad]">האימונים, המתאמנות וההרשמות — תמונת מצב אחת, ואז ממשיכים לנהל.</p>
            </header>

            <section aria-labelledby="overview-heading">
                <div className="mb-4 flex items-center justify-between">
                    <h2 id="overview-heading" className="text-lg font-bold">תמונת מצב</h2>
                    <span className="text-xs text-[#aebbad]">מה קורה בסטודיו</span>
                </div>

                <div className="relative overflow-hidden rounded-[2rem] bg-[#dce780] p-6 text-[#1b251c]">
                    <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-28 h-64 w-64 rounded-full border-[32px] border-[#1b251c]/10" />
                    <div className="relative flex items-start justify-between">
                        <span className="flex items-center gap-2 text-sm font-bold"><CalendarDays aria-hidden="true" className="h-5 w-5" />אימונים היום</span>
                        <span className="text-xs font-medium">ביומן הסטודיו</span>
                    </div>
                    <p className="relative mt-7 text-[5.5rem] font-bold leading-none tabular-nums" aria-label={isLoading ? "טוענים" : `${stats.sessionsToday} אימונים היום`}>{isLoading ? "—" : stats.sessionsToday}</p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                    <StatCard icon={UsersRound} label="משתמשות במערכת" value={isLoading ? "—" : stats.activeUsers} />
                    <StatCard icon={Ticket} label="סך ההרשמות" value={isLoading ? "—" : stats.openBookings} />
                </div>
            </section>

            <section aria-labelledby="next-heading">
                <div className="mb-4 border-b border-white/15 pb-3">
                    <h2 id="next-heading" className="text-lg font-bold">ממשיכים מכאן</h2>
                </div>
                <div className="space-y-3">
                    <AdminLink href="/admin/schedule" icon={CalendarDays} title="יומן האימונים" description="אימונים, שעות ומקומות פנויים" />
                    <AdminLink href="/admin/trainees" icon={UsersRound} title="המתאמנות שלך" description="פרטים, כרטיסיות ויתרות" />
                </div>
            </section>
        </div>
    );
}

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | string }) {
    return (
        <div className="min-h-40 rounded-[1.5rem] border border-white/10 bg-[#202c21] p-5">
            <Icon aria-hidden="true" className="h-5 w-5 text-[#dce780]" />
            <p className="mt-5 text-[2.5rem] font-bold leading-none tabular-nums">{value}</p>
            <p className="mt-2 text-xs leading-snug text-[#aebbad]">{label}</p>
        </div>
    );
}

function AdminLink({ href, icon: Icon, title, description }: { href: string; icon: LucideIcon; title: string; description: string }) {
    return (
        <Link href={href} className="flex min-h-24 items-center gap-4 rounded-[1.5rem] border border-white/10 bg-[#202c21] p-4 transition-colors active:bg-[#2b392c]">
            <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#dce780]/15 text-[#dce780]"><Icon aria-hidden="true" className="h-6 w-6" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{title}</span><span className="mt-1 block text-xs text-[#aebbad]">{description}</span></span>
            <ArrowLeft aria-hidden="true" className="h-5 w-5 shrink-0 text-[#dce780]" />
        </Link>
    );
}
