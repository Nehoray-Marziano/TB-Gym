"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, Sparkles, Ticket } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getRelativeTimeHebrew } from "@/lib/utils";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";

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

    const [loadedClass, setNextClass] = useState<UpcomingSession | null>(null);
    const [classError, setClassError] = useState(false);
    const [isClassLoading, setClassLoading] = useState(true);
    const nextClass = previewNextClass !== undefined ? previewNextClass : loadedClass;
    const classLoading = previewNextClass === undefined && isClassLoading;

    useEffect(() => {
        if (previewNextClass !== undefined) {
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
                    setNextClass(previous && new Date(previous.start_time) > new Date() ? previous : null);
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
            setClassError(Boolean(error));
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
        void load().catch(() => {
            if (!active) return;
            setClassError(true);
            setClassLoading(false);
        });
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
        <div className="relative h-dvh max-h-dvh overflow-hidden bg-[#eceee0] bg-[radial-gradient(ellipse_120%_70%_at_50%_-10%,#faf9f2_0%,#e8ebdc_55%,#dfe2ce_100%)] text-[var(--studio-ink)] selection:bg-[var(--studio-brand)]/20">
            {/* Ambient atmospheric lighting */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-24 inset-x-0 h-96 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(139,142,111,0.22)_0%,transparent_70%)]"
            />

            <main className="relative mx-auto flex h-full max-w-md flex-col justify-between px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-[max(1.5rem,calc(env(safe-area-inset-top)+0.75rem))] sm:px-5">
                {/* 1. Header: Studio Brand Emblem & Date / Admin Badge */}
                <header className="flex shrink-0 items-center justify-between gap-3 pt-1 pb-1">
                    <Link
                        href="/dashboard"
                        className="group flex items-center transition-transform active:scale-95"
                        aria-label="סטודיו טליה - תזונה • אימונים"
                    >
                        {/* High-contrast crisp studio logo emblem - proud & prominent */}
                        <img
                            src="/studio_logo_crisp.svg"
                            alt="סטודיו טליה - תזונה • אימונים"
                            className="h-14 sm:h-16 w-auto text-[#142217] object-contain drop-shadow-[0_2px_8px_rgba(20,32,22,0.16)] transition-transform group-hover:scale-[1.02]"
                        />
                    </Link>

                    <div className="flex items-center gap-2">
                        {profile?.role === "administrator" && (
                            <Link
                                href="/admin"
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--studio-deep)] px-3 py-1.5 text-xs font-bold text-[var(--studio-deep-contrast)] shadow-sm transition-transform active:scale-95"
                            >
                                <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-[var(--studio-coral-text)]" />
                                <span>ניהול</span>
                            </Link>
                        )}
                        <div className="flex items-center gap-1.5 rounded-full border border-[#8b9978] bg-white px-3 py-1.5 text-xs font-bold text-[#142217] shadow-[0_2px_6px_rgba(20,32,22,0.06)] whitespace-nowrap shrink-0">
                            <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-[#1e2e1c]" strokeWidth={2.4} />
                            <span>{today}</span>
                        </div>
                    </div>
                </header>

                {/* 2. Personal Greeting with Harmonious Terracotta Sun & 100% Uncropped Botanical Art */}
                <div className="flex shrink-0 items-center justify-between gap-3">
                    {/* Greeting text on right (RTL start) */}
                    <div className="min-w-0 flex-1">
                        <p className="mb-1 text-xs sm:text-sm font-semibold tracking-wide text-[#283824]">
                            ✦ {greeting} · {nextClass ? "טוב לראות אותך" : "איזה כיף שבאת"}
                        </p>
                        <h1 className="break-words font-bold leading-[1.08] tracking-[-0.03em] text-[#142217]">
                            <span className="block text-lg sm:text-xl font-semibold text-[#142217]/85">
                                {loading ? "שלום לך" : "היי,"}
                            </span>
                            {!loading && (
                                <span className="mt-0.5 block text-[clamp(2.1rem,8.5vw,2.9rem)] font-bold text-[#142217]">
                                    {firstName}<span className="text-[#c37a61]">.</span>
                                </span>
                            )}
                        </h1>
                    </div>

                    {/* Botanical Art Vignette on left (RTL end) - fully contained, uncropped, zero header collision */}
                    <div
                        aria-hidden="true"
                        className="relative flex h-28 w-28 sm:h-32 sm:w-32 shrink-0 items-center justify-center select-none pointer-events-none"
                    >
                        {/* Terracotta sun disk */}
                        <div className="absolute h-18 w-18 sm:h-20 sm:w-20 rounded-full bg-[#c37a61]/75 shadow-sm" />
                        {/* Terracotta outer accent circle */}
                        <div className="absolute h-24 w-24 sm:h-28 sm:w-28 rounded-full border-1.5 border-[#c37a61]/45" />
                        {/* Complete botanical branch - contained naturally, 100% uncropped */}
                        <img
                            src="/user_leaves_branch_dark.png"
                            alt=""
                            className="relative z-10 h-full w-full object-contain drop-shadow-[0_2px_4px_rgba(20,32,22,0.15)]"
                        />
                    </div>
                </div>

                {/* 3. Hero Workout Stage: Contextual, Asymmetric Studio Squircle */}
                <section
                    aria-labelledby="next-class"
                    aria-busy={classLoading}
                    className="relative isolate shrink-0 overflow-hidden rounded-[28px_28px_14px_28px] border-2 border-[var(--studio-brand)]/40 bg-gradient-to-br from-[#1c2c1f] via-[#142217] to-[#0c140e] p-5 sm:p-6 text-white shadow-[0_16px_36px_-12px_rgba(12,22,14,0.7)]"
                >
                    {/* Atmospheric corner glow & botanical leaf artwork inside card */}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -left-20 -top-32 h-72 w-72 rounded-full border border-white/10 bg-[radial-gradient(circle,var(--studio-brand),transparent_70%)] opacity-35"
                    />
                    <img
                        src="/user_leaves_branch.png"
                        alt=""
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-14 -left-10 h-56 w-auto origin-bottom-left rotate-[-12deg] object-contain opacity-30 drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
                    />

                    {/* Card Top Label */}
                    <div className="relative flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/40 px-3.5 py-1 text-[11px] font-bold text-[#eef2dc] backdrop-blur-md">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${nextClass ? "bg-[#e5a38b]" : "bg-[#d8e0b5]"}`} />
                                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${nextClass ? "bg-[#e5a38b]" : "bg-[#d8e0b5]"}`} />
                            </span>
                            <h2 id="next-class" className="text-[11px] font-bold text-white">
                                {nextClass ? "האימון הבא שלך" : "האימון הבא שלך בסטודיו"}
                            </h2>
                        </div>

                        {nextClass && (
                            <span className="text-xs font-bold text-[#d8e0b5]">
                                {getRelativeTimeHebrew(nextClass.start_time)}
                            </span>
                        )}
                    </div>

                    <div className="relative flex flex-col pt-3.5">
                        {classLoading ? (
                            <div className="flex min-h-[7rem] items-center justify-center" role="status">
                                <p className="text-sm font-semibold text-white animate-pulse">טוענים את האימון הבא…</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex-1">
                                    {classError ? (
                                        <p role="status" className="text-base font-semibold leading-relaxed text-white">
                                            לא הצלחנו לעדכן את האימון הבא.
                                        </p>
                                    ) : nextClass ? (
                                        <div className="flex flex-col-reverse items-start gap-3 min-[380px]:flex-row">
                                            <div className="min-w-0 flex-1">
                                                <h3 dir="auto" className="break-words text-[clamp(1.4rem,5.5vw,1.85rem)] font-bold leading-tight text-white drop-shadow-sm">
                                                    {nextClass.title}
                                                </h3>
                                                <time dateTime={nextClass.start_time} className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/95">
                                                    <span className="font-bold text-white">{format(nextClass.start_time, { weekday: "long" })}</span>
                                                    <span aria-hidden="true" className="text-white/60">·</span>
                                                    <span dir="ltr" className="inline-flex items-center gap-1 font-bold text-white">
                                                        <Clock3 aria-hidden="true" className="h-4 w-4 text-[#d8e0b5]" strokeWidth={2.4} />
                                                        <span>{format(nextClass.start_time, { hour: "2-digit", minute: "2-digit" })}</span>
                                                    </span>
                                                    <span className="sr-only">{format(nextClass.start_time, { day: "numeric", month: "long" })}</span>
                                                </time>
                                            </div>
                                            <div
                                                aria-hidden="true"
                                                className="flex shrink-0 items-center gap-2 text-center text-[#d8e0b5] min-[380px]:block min-[380px]:border-r min-[380px]:border-white/20 min-[380px]:pr-3.5"
                                            >
                                                <span className="block text-3xl font-bold leading-none tracking-tight tabular-nums text-white min-[380px]:text-[3rem]">
                                                    {format(nextClass.start_time, { day: "2-digit" })}
                                                </span>
                                                <span className="block text-xs font-bold text-[#d8e0b5] min-[380px]:mt-1">
                                                    {format(nextClass.start_time, { month: "long" })}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            <p className="text-[clamp(1.6rem,6.8vw,2.15rem)] font-bold leading-[1.12] tracking-tight text-white">
                                                קצת זמן<br />
                                                <span className="text-[#d8e0b5]">בשבילך.</span>
                                            </p>
                                            <p className="text-xs sm:text-sm font-medium leading-relaxed text-[#f4f6ea]">
                                                לוח האימונים פתוח לשריון מקום. בואי נבחר את השעה המושלמת עבורך.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {nextClass || classError ? (
                                    <Link
                                        href="/my-bookings"
                                        className="mt-4 flex min-h-10 items-center justify-between gap-3 rounded-xl border-t border-white/20 pt-2.5 text-sm font-bold text-white transition-colors hover:text-[#d8e0b5] active:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d8e0b5]"
                                    >
                                        <span>לפרטי האימון וביטולים</span>
                                        <span className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-[#d8e0b5] text-[#142016] shadow-sm transition-transform hover:-translate-x-1">
                                            <ArrowLeft aria-hidden="true" className="h-4 w-4" strokeWidth={2.4} />
                                        </span>
                                    </Link>
                                ) : (
                                    <Link
                                        href="/book"
                                        className="mt-4 flex min-h-[3.15rem] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#dbe5b8] via-[#cbd3aa] to-[#bed09e] px-4 py-2.5 text-sm font-bold text-[#111c13] shadow-[0_10px_24px_-6px_rgba(203,211,170,0.65),0_0_0_1px_rgba(255,255,255,0.4)] transition-all hover:brightness-105 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#cbd3aa]"
                                    >
                                        <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2.4} />
                                        <span>למערכת השעות ושריון מקום</span>
                                        <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2.4} />
                                    </Link>
                                )}
                            </>
                        )}
                    </div>
                </section>

                {/* 4. Member Status & Balance Row - Single compact, high-contrast, non-wrapping row */}
                <div className="flex shrink-0 items-center justify-between gap-3 rounded-[22px] border-2 border-[#8b9978] bg-white px-4 py-3.5 sm:px-4.5 sm:py-4 shadow-[0_6px_20px_-8px_rgba(20,32,22,0.1)]">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#142217] text-[#d8e0b5] shadow-sm">
                            <Ticket aria-hidden="true" className="h-4.5 w-4.5 text-[#d8e0b5]" strokeWidth={2.4} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-baseline gap-1.5">
                                <span
                                    className="text-2xl font-bold leading-none tabular-nums text-[#142217]"
                                    aria-busy={loading}
                                >
                                    {loading ? "–" : tickets}
                                </span>
                                <span className="truncate text-xs sm:text-sm font-bold text-[#142217]">
                                    {tickets === 1 ? "אימון זמין ביתרה" : "אימונים זמינים"}
                                </span>
                            </div>
                            <p className="mt-0.5 truncate text-[11px] sm:text-xs font-semibold text-[#283824]">
                                {subscription?.is_active
                                    ? subscription.tier_display_name
                                    : tickets > 0
                                    ? "כרטיסייה פעילה"
                                    : "לרכישת כרטיסייה או מנוי"}
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/subscription"
                        className="inline-flex shrink-0 min-h-9 items-center gap-1.5 rounded-xl border-2 border-[#142217] bg-[#f2f4e8] px-3 py-1.5 text-xs font-bold text-[#142217] shadow-sm transition-all hover:bg-[#142217] hover:text-white active:bg-[#142217] active:text-white"
                    >
                        <span>{tickets > 0 ? "המנוי שלי" : "רכישת מנוי"}</span>
                        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
                    </Link>
                </div>
            </main>
        </div>
    );
}
