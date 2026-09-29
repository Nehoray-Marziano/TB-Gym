"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, Ticket } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getRelativeTimeHebrew } from "@/lib/utils";
import { useGymStore } from "@/providers/GymStoreProvider";
import StudioLogo from "@/components/StudioLogo";
import StudioBotanical from "@/components/StudioBotanical";
import NotificationPermissionModal from "@/components/NotificationPermissionModal";
import { useToast } from "@/components/ui/use-toast";

type UpcomingSession = { id: string; title: string; start_time: string };

const format = (date: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("he-IL", options).format(new Date(date));

export default function TraineeDashboard({ userId }: { userId: string }) {
    const router = useRouter();
    const { toast } = useToast();
    const { profile, tickets, subscription, loading, refreshData, toggleDevMode } = useGymStore();
    const [nextClass, setNextClass] = useState<UpcomingSession | null>(null);
    const [classLoading, setClassLoading] = useState(true);
    const [logoTaps, setLogoTaps] = useState(0);

    useEffect(() => {
        void refreshData(false, userId);
        let active = true;
        const cacheKey = `talia_upcoming_${userId}`;
        try {
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                const previous = JSON.parse(cached) as UpcomingSession | null;
                queueMicrotask(() => {
                    if (!active) return;
                    setNextClass(previous);
                    setClassLoading(false);
                });
            }
        } catch {
            sessionStorage.removeItem(cacheKey);
        }

        const load = async () => {
            const { data, error } = await getSupabaseClient()
                .from("bookings")
                .select("session:gym_sessions(id,title,start_time)")
                .eq("user_id", userId)
                .eq("status", "confirmed");
            if (!active) return;
            if (!error && data) {
                const upcoming = (data as unknown as { session: UpcomingSession | null }[])
                    .map(({ session }) => session)
                    .filter((session): session is UpcomingSession => Boolean(session && new Date(session.start_time) > new Date()))
                    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0] ?? null;
                setNextClass(upcoming);
                sessionStorage.setItem(cacheKey, JSON.stringify(upcoming));
            }
            setClassLoading(false);
        };
        void load();
        return () => { active = false; };
    }, [userId, refreshData]);

    useEffect(() => {
        if (loading) return;
        const key = `talia_tickets_count_${userId}`;
        const previous = sessionStorage.getItem(key);
        if (previous !== null && tickets > Number(previous)) {
            toast({ title: "נוספו לך אימונים ליתרה", type: "success" });
        }
        sessionStorage.setItem(key, String(tickets));
    }, [tickets, loading, toast, userId]);

    useEffect(() => {
        router.prefetch("/book");
        router.prefetch("/profile");
        router.prefetch("/subscription");
        if (profile?.role === "administrator") router.prefetch("/admin");
    }, [router, profile?.role]);

    const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "אלופה";
    const today = new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

    return (
        <div className="min-h-dvh bg-[var(--studio-canvas)] text-[var(--studio-ink)]">
            <main className="mx-auto max-w-lg px-5 pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
                <header className="flex min-h-11 items-center justify-between gap-3">
                    <button
                        type="button"
                        aria-label="סטודיו טליה"
                        onClick={() => {
                            if (logoTaps === 9) {
                                toggleDevMode(true);
                                toast({ title: "מצב פיתוח הופעל", type: "success" });
                                setLogoTaps(0);
                            } else setLogoTaps(logoTaps + 1);
                        }}
                        className="flex items-center gap-2.5"
                    >
                        <StudioLogo className="h-9 w-9 bg-[var(--studio-deep)]" />
                        <span className="text-start text-[11px] font-bold leading-[1.05] tracking-tight">טליה<br />סטודיו</span>
                    </button>
                    <span className="text-xs font-medium text-[var(--studio-muted)]">{today}</span>
                </header>

                <div className="mb-5 mt-7 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--studio-subtle)]">טוב לראות אותך שוב</p>
                        <h1 className="mt-1 truncate text-[clamp(2.6rem,11vw,3.6rem)] font-bold leading-[1.05] tracking-[-0.06em]">{loading ? "בוקר טוב" : `היי, ${firstName}`}<span className="text-[var(--studio-coral-text)]">.</span></h1>
                    </div>
                    {profile?.role === "administrator" && <Link href="/admin" className="mb-1 shrink-0 rounded-full border border-[var(--studio-ink)]/20 px-3 py-2 text-[11px] font-bold">ניהול</Link>}
                </div>

                <section aria-labelledby="next-class" className="relative isolate overflow-hidden rounded-[2.4rem_1.4rem_2.4rem_1.4rem] bg-[var(--studio-deep)] text-[var(--studio-deep-contrast)] shadow-[0_22px_48px_-30px_rgba(12,25,13,0.4)]">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_8%_80%,var(--studio-accent-bg)_0%,transparent_55%)] opacity-[0.12]" />
                    <StudioBotanical sun={false} className="studio-botanical-drift pointer-events-none absolute -bottom-8 -left-20 h-52 w-80 text-[var(--studio-accent-text)]/20" />
                    <div className="relative px-5 pb-5 pt-5">
                        <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2 text-[11px] font-bold text-[var(--studio-accent-text)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--studio-coral-bg)]" />האימון הבא שלך</span>
                            <CalendarDays aria-hidden="true" className="h-4 w-4 text-[var(--studio-accent-text)]" />
                        </div>
                        {classLoading ? (
                            <div className="mt-8 h-24 animate-pulse rounded-xl bg-white/10" aria-busy="true" />
                        ) : nextClass ? (
                            <div className="mt-7 flex items-end justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-[var(--studio-coral-text)]">{format(nextClass.start_time, { weekday: "long" })}</p>
                                    <h2 id="next-class" className="mt-1 break-words text-[clamp(1.8rem,8vw,2.5rem)] font-bold leading-[1.05] tracking-tight">{nextClass.title}</h2>
                                    <p className="mt-3 flex items-center gap-1.5 text-sm text-[var(--studio-deep-contrast)]/80"><Clock3 aria-hidden="true" className="h-4 w-4" />{format(nextClass.start_time, { hour: "2-digit", minute: "2-digit" })} · {getRelativeTimeHebrew(nextClass.start_time)}</p>
                                </div>
                                <div className="shrink-0 text-center text-[var(--studio-accent-text)]">
                                    <span className="block text-[3.5rem] font-bold leading-none tabular-nums">{format(nextClass.start_time, { day: "numeric" })}</span>
                                    <span className="text-xs font-bold">{format(nextClass.start_time, { month: "short" })}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-7">
                                <h2 id="next-class" className="max-w-[15rem] text-[2.2rem] font-bold leading-[1.05] tracking-tight">יש מקום<br /><span className="text-[var(--studio-accent-text)]">לאימון הבא.</span></h2>
                                <p className="mt-3 text-sm text-[var(--studio-deep-contrast)]/75">בואי נמצא לך שעה שמתאימה.</p>
                            </div>
                        )}
                    </div>
                    <Link href={nextClass ? "/my-bookings" : "/book"} className="relative flex min-h-14 items-center justify-between border-t border-white/15 px-5 text-sm font-bold transition-colors active:bg-white/10">
                        {nextClass ? "האימונים שלי" : "למציאת אימון"}<ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    </Link>
                </section>

                <Link href="/subscription" className="mt-4 flex min-h-[6.5rem] items-center gap-4 overflow-hidden rounded-[1.8rem_1rem_1.8rem_1rem] bg-[var(--studio-accent-bg)] px-5 text-[var(--studio-ink)] transition-transform active:scale-[0.99]">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--studio-deep)] text-[var(--studio-accent-text)]"><Ticket aria-hidden="true" className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold">יתרת האימונים</p>
                        <p className="mt-0.5 truncate text-[11px] text-[var(--studio-ink)]/75">{subscription?.is_active ? subscription.tier_display_name : "לצפייה במנויים"}</p>
                    </div>
                    <span className="text-[3rem] font-bold leading-none tabular-nums tracking-tight" aria-label={`${tickets} אימונים זמינים`}>{loading ? "–" : tickets}</span>
                </Link>

                <Link href="/book" className="mt-4 flex min-h-12 items-center justify-between border-b border-[var(--studio-ink)]/15 text-sm font-bold">
                    ללוח האימונים <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                </Link>
            </main>
            <NotificationPermissionModal />
        </div>
    );
}
