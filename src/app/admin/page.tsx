"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, UsersRound } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import StudioLogo from "@/components/StudioLogo";

type Overview = { today: number; upcoming: number; trainees: number };

export default function AdminDashboardPage() {
    const supabase = getSupabaseClient();
    const [overview, setOverview] = useState<Overview | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let active = true;
        const load = async () => {
            const now = new Date();
            const start = new Date(now);
            start.setHours(0, 0, 0, 0);
            const end = new Date(now);
            end.setHours(23, 59, 59, 999);
            const [trainees, today, upcoming] = await Promise.all([
                supabase.from("profiles").select("id", { count: "exact", head: true }).neq("role", "administrator"),
                supabase.from("gym_sessions").select("id", { count: "exact", head: true }).gte("start_time", start.toISOString()).lte("start_time", end.toISOString()),
                supabase.from("gym_sessions").select("id", { count: "exact", head: true }).gte("start_time", now.toISOString()),
            ]);
            if (!active) return;
            if (trainees.error || today.error || upcoming.error) {
                setError(true);
                return;
            }
            setOverview({ trainees: trainees.count || 0, today: today.count || 0, upcoming: upcoming.count || 0 });
        };
        void load();
        return () => { active = false; };
    }, [supabase]);

    return (
        <div className="text-[var(--studio-deep-contrast)]">
            <header className="flex items-center gap-3">
                <StudioLogo className="h-10 w-10 shrink-0 bg-[var(--studio-accent-bg)]" />
                <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[var(--studio-accent-text)]">סטודיו טליה</p>
                    <h1 className="text-[1.9rem] font-bold leading-tight tracking-tight">תמונת מצב<span className="text-[var(--studio-coral-text)]">.</span></h1>
                </div>
            </header>

            <section aria-label="הפעילות בסטודיו" className="mt-6">
                <div className="relative isolate overflow-hidden rounded-[1.65rem] bg-[var(--studio-accent-bg)] p-5 text-[var(--studio-ink)]">
                    <StudioLogo className="pointer-events-none absolute -bottom-14 -left-10 h-52 w-52 bg-[var(--studio-deep)]/10" />
                    <div className="relative flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold">אימונים היום</p>
                            <p className="mt-3 text-[4.5rem] font-bold leading-none tabular-nums" aria-busy={!overview && !error}>{overview?.today ?? "—"}</p>
                        </div>
                        <CalendarDays aria-hidden="true" className="h-6 w-6" />
                    </div>
                    <Link href="/admin/schedule" className="relative mt-3 flex min-h-11 items-center justify-between border-t border-[var(--studio-ink)]/20 pt-2 text-xs font-bold">ללוח האימונים <ArrowLeft aria-hidden="true" className="h-4 w-4" /></Link>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-[1.35rem] border border-white/10 bg-[#202c21] p-4">
                        <p className="text-xs text-[#aebbad]">אימונים קרובים</p>
                        <p className="mt-3 text-[2.4rem] font-bold leading-none tabular-nums text-[var(--studio-accent-text)]">{overview?.upcoming ?? "—"}</p>
                    </div>
                    <div className="rounded-[1.35rem] border border-white/10 bg-[#202c21] p-4">
                        <p className="text-xs text-[#aebbad]">מתאמנות</p>
                        <p className="mt-3 text-[2.4rem] font-bold leading-none tabular-nums text-[var(--studio-accent-text)]">{overview?.trainees ?? "—"}</p>
                    </div>
                </div>
                {error && <p role="alert" className="mt-3 text-xs text-[var(--studio-coral-text)]">לא הצלחנו לטעון את הנתונים כרגע.</p>}
            </section>

            <nav aria-label="פעולות ניהול" className="mt-7 space-y-2">
                <Link href="/admin/schedule" className="flex min-h-14 items-center gap-3 rounded-[1.2rem] border border-white/10 bg-[#202c21] px-4 text-sm font-bold transition-colors active:bg-[#2b392c]"><CalendarDays aria-hidden="true" className="h-5 w-5 text-[var(--studio-accent-text)]" /><span className="flex-1">יומן האימונים</span><ArrowLeft aria-hidden="true" className="h-4 w-4" /></Link>
                <Link href="/admin/trainees" className="flex min-h-14 items-center gap-3 rounded-[1.2rem] border border-white/10 bg-[#202c21] px-4 text-sm font-bold transition-colors active:bg-[#2b392c]"><UsersRound aria-hidden="true" className="h-5 w-5 text-[var(--studio-accent-text)]" /><span className="flex-1">המתאמנות</span><ArrowLeft aria-hidden="true" className="h-4 w-4" /></Link>
            </nav>
        </div>
    );
}
