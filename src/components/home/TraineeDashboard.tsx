"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, Sparkles, Ticket } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getRelativeTimeHebrew } from "@/lib/utils";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";
import InstallAppButton from "@/components/profile/InstallAppButton";

export type UpcomingSession = { id: string; title: string; start_time: string };

const format = (date: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("he-IL", options).format(new Date(date));

function getDayGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "בוקר טוב";
    if (hour >= 12 && hour < 17) return "צהריים טובים";
    if (hour >= 17 && hour < 21) return "ערב טוב";
    return "לילה טוב";
}

export type TraineeDashboardProps = {
    userId: string;
    previewNextClass?: UpcomingSession | null;
    previewTickets?: number;
    previewProfile?: { full_name?: string; role?: string };
};

export default function TraineeDashboard({
    userId,
    previewNextClass,
    previewTickets,
    previewProfile,
}: TraineeDashboardProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { profile: storeProfile, tickets: storeTickets, subscription, loading: storeLoading, refreshData } = useGymStore();

    const profile = previewProfile ?? storeProfile;
    const tickets = previewTickets !== undefined ? previewTickets : storeTickets;
    const loading = previewTickets !== undefined ? false : storeLoading;

    const [nextClass, setNextClass] = useState<UpcomingSession | null>(previewNextClass ?? null);
    const [classLoading, setClassLoading] = useState(previewNextClass === undefined);

    useEffect(() => {
        if (previewNextClass !== undefined) {
            setNextClass(previewNextClass);
            setClassLoading(false);
            return;
        }

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
    }, [userId, refreshData, previewNextClass]);

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
        router.prefetch("/my-bookings");
        if (profile?.role === "administrator") router.prefetch("/admin");
    }, [router, profile?.role]);

    const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "אלופה";
    const greeting = getDayGreeting();
    const today = new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

    return (
        <div className="relative min-h-dvh overflow-x-hidden bg-[#eceee0] bg-[radial-gradient(ellipse_120%_70%_at_50%_-10%,#faf9f2_0%,#e8ebdc_55%,#dfe2ce_100%)] text-[var(--studio-ink)] selection:bg-[var(--studio-brand)]/20">
            {/* High-contrast botanical branch drifting on the page background */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 top-6 h-[560px] w-auto max-w-none overflow-hidden select-none"
            >
                {/* Dark botanical branch for light theme with high contrast */}
                <img
                    src="/user_leaves_branch_dark.png"
                    alt=""
                    className="h-[560px] w-auto object-contain opacity-30 rotate-[15deg] mix-blend-multiply drop-shadow-sm dark:hidden"
                />
                {/* White botanical branch for dark theme */}
                <img
                    src="/user_leaves_branch.png"
                    alt=""
                    className="h-[560px] w-auto object-contain opacity-18 rotate-[15deg] mix-blend-screen hidden dark:block"
                />
            </div>

            {/* Subtle atmospheric ambient glow at top */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-24 inset-x-0 h-96 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(139,142,111,0.28)_0%,transparent_70%)]"
            />

            <main className="relative mx-auto max-w-lg px-4 sm:px-5 pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] space-y-4 sm:space-y-4.5">
                {/* Header: Prominent Brand Logo & High-Contrast Date Badge */}
                <header className="flex min-h-[4.75rem] items-center justify-between gap-3 pt-0.5">
                    <Link
                        href="/dashboard"
                        className="group flex items-center transition-transform active:scale-95"
                        aria-label="סטודיו טליה - תזונה • אימונים"
                    >
                        {/* High-res dark studio emblem with crisp readable text for light theme */}
                        <img
                            src="/studio_emblem_dark.png"
                            alt="סטודיו טליה - תזונה • אימונים"
                            className="h-[4.75rem] sm:h-20 w-auto object-contain drop-shadow-[0_2px_10px_rgba(20,32,22,0.12)] transition-transform group-hover:scale-[1.03] dark:hidden"
                        />
                        {/* High-res white studio emblem for dark theme */}
                        <img
                            src="/studio_emblem_clean.png"
                            alt="סטודיו טליה - תזונה • אימונים"
                            className="h-[4.75rem] sm:h-20 w-auto object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-[1.03] hidden dark:block"
                        />
                    </Link>

                    <div className="flex items-center gap-1.5 rounded-full border border-[#cbd2bc] bg-white/95 px-3 py-1.5 text-[11px] sm:text-xs font-bold text-[var(--studio-ink)] shadow-[0_2px_8px_rgba(20,32,22,0.06)] backdrop-blur-md whitespace-nowrap shrink-0">
                        <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-[var(--studio-brand)]" />
                        <span>{today}</span>
                    </div>
                </header>

                {/* Greeting & Headline */}
                <div className="pt-0.5 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-bold tracking-wide text-[var(--studio-subtle)]">
                            ✦ {greeting} · טוב לראות אותך
                        </p>
                        <h1 className="mt-1 truncate text-[clamp(2.3rem,9vw,3.1rem)] font-bold leading-[1.08] tracking-[-0.04em] text-[var(--studio-ink)]">
                            {loading ? "שלום לך" : `היי, ${firstName}`}
                            <span className="text-[var(--studio-coral-text)]">.</span>
                        </h1>
                    </div>
                    {profile?.role === "administrator" && (
                        <Link
                            href="/admin"
                            className="mb-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--studio-deep)] px-3.5 py-1.5 text-xs font-bold text-[var(--studio-deep-contrast)] shadow-md transition-transform active:scale-95"
                        >
                            <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-[var(--studio-coral-text)]" />
                            <span>ניהול</span>
                        </Link>
                    )}
                </div>

                {/* Hero Card: Upcoming Workout (Deep Luxury Dark Canvas) */}
                <section
                    aria-labelledby="next-class"
                    className="group relative isolate overflow-hidden rounded-[26px] border border-white/15 bg-gradient-to-br from-[#1c2c1f] via-[#152217] to-[#0c140e] p-5 sm:p-6 text-[var(--studio-deep-contrast)] shadow-[0_22px_48px_-16px_rgba(12,22,14,0.65)] transition-all"
                >
                    {/* Atmospheric glow and high-contrast white botanical watermark */}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--studio-accent-bg)]/20 blur-2xl"
                    />
                    <img
                        src="/user_leaves_branch.png"
                        alt=""
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-14 -left-10 h-56 w-auto origin-bottom-left rotate-[-12deg] object-contain opacity-35 drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
                    />

                    {/* Card Top Pill */}
                    <div className="relative flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold text-[var(--studio-accent-text)] backdrop-blur-md">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--studio-coral-bg)] opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--studio-coral-bg)]" />
                            </span>
                            <span>{nextClass ? "האימון הבא שלך" : "האימון הבא"}</span>
                        </div>
                        <Link
                            href="/my-bookings"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--studio-accent-text)] hover:text-white transition-colors"
                        >
                            <span>כל האימונים</span>
                            <ArrowLeft aria-hidden="true" className="h-3 w-3" />
                        </Link>
                    </div>

                    {/* Card Main Body */}
                    {classLoading ? (
                        <div className="mt-5 h-24 animate-pulse rounded-2xl border border-white/5 bg-white/5" aria-busy="true" />
                    ) : nextClass ? (
                        <div className="relative mt-4">
                            <div className="flex items-start justify-between gap-3.5">
                                <div className="min-w-0 flex-1">
                                    <span className="inline-block text-xs font-bold text-[var(--studio-coral-text)]">
                                        {format(nextClass.start_time, { weekday: "long" })}
                                    </span>
                                    <h2
                                        id="next-class"
                                        dir="auto"
                                        className="mt-1 text-[clamp(1.65rem,6.2vw,2.15rem)] font-bold leading-tight tracking-tight text-white drop-shadow-sm"
                                    >
                                        {nextClass.title}
                                    </h2>
                                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--studio-deep-contrast)]/90">
                                        <span className="inline-flex items-center gap-1.5 font-bold text-white" dir="ltr">
                                            <Clock3 aria-hidden="true" className="h-4 w-4 text-[var(--studio-accent-text)]" />
                                            <span>{format(nextClass.start_time, { hour: "2-digit", minute: "2-digit" })}</span>
                                        </span>
                                        <span className="text-white/30">·</span>
                                        <span className="inline-flex items-center rounded-md border border-[var(--studio-accent-text)]/20 bg-[var(--studio-accent-text)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--studio-accent-text)]">
                                            {getRelativeTimeHebrew(nextClass.start_time)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex min-w-[3.6rem] shrink-0 flex-col items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-b from-white/20 to-white/5 px-3 py-2 text-center shadow-lg backdrop-blur-md">
                                    <span className="block text-3xl font-bold leading-none tracking-tight text-white tabular-nums">
                                        {format(nextClass.start_time, { day: "numeric" })}
                                    </span>
                                    <span className="mt-1 text-[11px] font-bold text-[var(--studio-accent-text)]">
                                        {format(nextClass.start_time, { month: "short" })}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-5 border-t border-white/15 pt-3.5">
                                <Link
                                    href="/my-bookings"
                                    className="flex items-center justify-between text-sm font-bold text-white transition-opacity hover:opacity-90 active:opacity-75"
                                >
                                    <span>לצפייה בפרטי האימון וביטולים</span>
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 transition-transform group-hover:-translate-x-1">
                                        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                                    </div>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="relative mt-4 space-y-3.5">
                            <div>
                                <h2 id="next-class" className="text-[clamp(1.55rem,5.8vw,1.95rem)] font-bold leading-[1.14] tracking-tight text-white">
                                    יש מקום פנוי<br />
                                    <span className="text-[var(--studio-accent-text)]">לאימון הבא שלך.</span>
                                </h2>
                                <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[var(--studio-deep-contrast)]/80">
                                    בואי נשריין לך שעה שמתאימה בלוח האימונים השבועי.
                                </p>
                            </div>

                            <div className="pt-1">
                                <Link
                                    href="/book"
                                    className="group/btn relative flex min-h-[3.25rem] w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#d9e2b8] via-[#cbd3aa] to-[#bcc89a] px-5 py-3 text-sm font-bold text-[#142016] shadow-[0_12px_28px_-6px_rgba(203,211,170,0.55),0_0_0_1px_rgba(255,255,255,0.35)] transition-all hover:brightness-105 active:scale-[0.98]"
                                >
                                    <span>למציאת אימון ושריון מקום</span>
                                    <ArrowLeft aria-hidden="true" className="h-4 w-4 transition-transform group-hover/btn:-translate-x-1" />
                                </Link>
                            </div>
                        </div>
                    )}
                </section>

                {/* Membership & Ticket Balance Tile (Crisp High-Contrast VIP Card) */}
                <Link
                    href="/subscription"
                    className="group relative flex items-center justify-between overflow-hidden rounded-[24px] border border-[#ced5be] bg-gradient-to-l from-white via-white to-[#f7f8f0] p-4.5 sm:p-5 shadow-[0_12px_32px_-12px_rgba(20,32,22,0.1),0_2px_6px_rgba(20,32,22,0.04)] transition-all hover:border-[var(--studio-brand)]/40 hover:shadow-[0_16px_36px_-12px_rgba(20,32,22,0.16)] active:scale-[0.99]"
                >
                    {/* Sage decorative accent strip */}
                    <div aria-hidden="true" className="absolute right-0 inset-y-0 w-1.5 bg-gradient-to-b from-[var(--studio-brand)] to-[#a4a984]" />

                    <div className="flex min-w-0 items-center gap-3.5 pr-1">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1e2d21] to-[#121c14] text-[var(--studio-accent-text)] shadow-md transition-transform group-hover:scale-105">
                            <Ticket aria-hidden="true" className="h-6 w-6 text-[#d8e0b5]" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-[var(--studio-ink)]">יתרת אימונים</p>
                                <span className="rounded-full bg-[var(--studio-brand)]/15 border border-[var(--studio-brand)]/25 px-2 py-0.5 text-[10px] font-bold text-[var(--studio-brand)]">
                                    {subscription?.is_active ? "מנוי פעיל" : "לצפייה במנויים"}
                                </span>
                            </div>
                            <p className="mt-0.5 truncate text-xs font-medium text-[var(--studio-muted)]">
                                {subscription?.is_active ? subscription.tier_display_name : "לרכישת כרטיסייה או מנוי חודשי"}
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                        <div className="text-center">
                            <span
                                className="block text-[2.5rem] font-bold leading-none tabular-nums text-[var(--studio-ink)] tracking-tight"
                                aria-label={`${tickets} אימונים זמינים`}
                            >
                                {loading ? "–" : tickets}
                            </span>
                            <span className="block text-[10px] font-bold text-[var(--studio-muted)]">אימונים</span>
                        </div>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--studio-ink)]/5 text-[var(--studio-muted)] transition-transform group-hover:-translate-x-1 group-hover:bg-[var(--studio-brand)] group-hover:text-white">
                            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                        </div>
                    </div>
                </Link>

                {/* Quick Actions Grid (Vibrant Boutique Tiles) */}
                <div className="grid grid-cols-2 gap-3">
                    <Link
                        href="/book"
                        className="group relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-[#ced5be] bg-white p-4 shadow-[0_10px_28px_-10px_rgba(20,32,22,0.08),0_2px_6px_rgba(20,32,22,0.04)] transition-all hover:border-[var(--studio-brand)]/40 hover:shadow-[0_14px_32px_-10px_rgba(20,32,22,0.14)] active:scale-[0.98]"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#243427] to-[#152018] text-[#d8e0b5] shadow-sm transition-transform group-hover:scale-105">
                                <CalendarDays aria-hidden="true" className="h-5 w-5" />
                            </div>
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--studio-ink)]/5 text-[var(--studio-muted)] transition-transform group-hover:-translate-x-1 group-hover:bg-[var(--studio-brand)] group-hover:text-white">
                                <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="mt-3.5">
                            <span className="block text-sm font-bold text-[var(--studio-ink)]">לוח אימונים</span>
                            <span className="mt-0.5 block text-[11px] font-medium text-[var(--studio-muted)]">שריון מקום לשבוע הקרוב</span>
                        </div>
                    </Link>

                    <Link
                        href="/my-bookings"
                        className="group relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-[#ced5be] bg-white p-4 shadow-[0_10px_28px_-10px_rgba(20,32,22,0.08),0_2px_6px_rgba(20,32,22,0.04)] transition-all hover:border-[var(--studio-coral-bg)]/40 hover:shadow-[0_14px_32px_-10px_rgba(20,32,22,0.14)] active:scale-[0.98]"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#c37a61] to-[#9d5842] text-white shadow-sm transition-transform group-hover:scale-105">
                                <Clock3 aria-hidden="true" className="h-5 w-5" />
                            </div>
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--studio-ink)]/5 text-[var(--studio-muted)] transition-transform group-hover:-translate-x-1 group-hover:bg-[var(--studio-coral-bg)] group-hover:text-white">
                                <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="mt-3.5">
                            <span className="block text-sm font-bold text-[var(--studio-ink)]">האימונים שלי</span>
                            <span className="mt-0.5 block text-[11px] font-medium text-[var(--studio-muted)]">מעקב הרשמות וביטולים</span>
                        </div>
                    </Link>
                </div>

                {/* App Installation Nudge */}
                <InstallAppButton home />
            </main>
        </div>
    );
}
