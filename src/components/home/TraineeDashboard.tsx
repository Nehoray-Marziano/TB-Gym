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
        <div className="relative min-h-dvh overflow-x-hidden bg-[#eceee0] bg-[radial-gradient(ellipse_120%_70%_at_50%_-10%,#faf9f2_0%,#e8ebdc_55%,#dfe2ce_100%)] text-[var(--studio-ink)] selection:bg-[var(--studio-brand)]/20">
            {/* Ambient atmospheric lighting */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-24 inset-x-0 h-96 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(139,142,111,0.22)_0%,transparent_70%)]"
            />

            <main className="relative mx-auto max-w-lg px-4 sm:px-6 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] space-y-4 sm:space-y-4.5">
                {/* Header: Studio Brand Emblem & Date / Admin Badge */}
                <header className="flex min-h-[4.25rem] items-center justify-between gap-3 pt-0.5">
                    <Link
                        href="/dashboard"
                        className="group flex items-center transition-transform active:scale-95"
                        aria-label="סטודיו טליה - תזונה • אימונים"
                    >
                        {/* High-contrast studio emblem */}
                        <img
                            src="/studio_emblem_dark.png"
                            alt="סטודיו טליה - תזונה • אימונים"
                            className="h-16 sm:h-[4.5rem] w-auto object-contain drop-shadow-[0_2px_8px_rgba(20,32,22,0.1)] transition-transform group-hover:scale-[1.02]"
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
                        <div className="flex items-center gap-1.5 rounded-full border border-[#cbd2bc] bg-white/95 px-3 py-1.5 text-[11px] sm:text-xs font-bold text-[var(--studio-ink)] shadow-[0_2px_6px_rgba(20,32,22,0.05)] backdrop-blur-md whitespace-nowrap shrink-0">
                            <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-[var(--studio-brand)]" />
                            <span>{today}</span>
                        </div>
                    </div>
                </header>

                {/* Personal Greeting with Terracotta Sun & High-Contrast Botanical Art */}
                <div className="relative isolate flex min-h-36 sm:min-h-44 items-center py-2 sm:py-3">
                    {/* Terracotta sun circles & botanical watermark */}
                    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-[42%] overflow-hidden select-none">
                        <div className="absolute left-5 top-4 h-16 w-16 rounded-full bg-[var(--studio-coral-bg)]/60 sm:h-20 sm:w-20" />
                        <div className="absolute left-2 top-2 h-22 w-22 rounded-full border border-[var(--studio-coral-bg)]/35 sm:h-26 sm:w-26" />
                        {/* High-contrast botanical branch */}
                        <img
                            src="/user_leaves_branch_dark.png"
                            alt=""
                            className="absolute -bottom-8 left-0 h-48 w-auto max-w-none -rotate-12 object-contain opacity-85 mix-blend-multiply drop-shadow-sm"
                        />
                    </div>

                    <div className="w-[74%]">
                        <p className="mb-1 text-xs font-bold tracking-wide text-[var(--studio-subtle)]">
                            ✦ {greeting} · {nextClass ? "טוב לראות אותך" : "איזה כיף שבאת"}
                        </p>
                        <h1 className="break-words font-bold leading-[1.08] tracking-[-0.04em] text-[var(--studio-ink)]">
                            <span className="block text-xl sm:text-2xl">{loading ? "שלום לך" : "היי,"}</span>
                            {!loading && (
                                <span className="mt-0.5 block text-[clamp(2.4rem,10vw,3.6rem)]">
                                    {firstName}<span className="text-[var(--studio-coral-ink)]">.</span>
                                </span>
                            )}
                        </h1>
                    </div>
                </div>

                {/* Hero Workout Stage: Contextual, Asymmetric Studio Squircle */}
                <section
                    aria-labelledby="next-class"
                    aria-busy={classLoading}
                    className="relative isolate overflow-hidden rounded-[30px_30px_10px_30px] border border-[var(--studio-brand)]/25 bg-gradient-to-br from-[#1c2c1f] via-[#142217] to-[#0c140e] p-5 sm:p-6 text-[var(--studio-deep-contrast)] shadow-[0_20px_44px_-16px_rgba(12,22,14,0.6)]"
                >
                    {/* Atmospheric corner glow & botanical leaf artwork inside card */}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -left-20 -top-32 h-72 w-72 rounded-full border border-[var(--studio-accent-text)]/10 bg-[radial-gradient(circle,var(--studio-brand),transparent_70%)] opacity-35"
                    />
                    <img
                        src="/user_leaves_branch.png"
                        alt=""
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-14 -left-10 h-56 w-auto origin-bottom-left rotate-[-12deg] object-contain opacity-25 drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
                    />

                    {/* Card Top Label */}
                    <div className="relative flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold text-[var(--studio-accent-text)] backdrop-blur-md">
                            <span className="relative flex h-2 w-2">
                                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${nextClass ? "bg-[var(--studio-coral-bg)]" : "bg-[var(--studio-accent-text)]"}`} />
                                <span className={`relative inline-flex h-2 w-2 rounded-full ${nextClass ? "bg-[var(--studio-coral-bg)]" : "bg-[var(--studio-accent-text)]"}`} />
                            </span>
                            <h2 id="next-class" className="text-[11px] font-bold">
                                {nextClass ? "האימון הבא שלך" : "האימון הבא שלך בסטודיו"}
                            </h2>
                        </div>

                        {nextClass && (
                            <span className="text-[11px] font-semibold text-[var(--studio-accent-text)]/90">
                                {getRelativeTimeHebrew(nextClass.start_time)}
                            </span>
                        )}
                    </div>

                    <div className="relative flex min-h-40 flex-col pt-4">
                        {classLoading ? (
                            <div className="flex flex-1 items-center justify-center" role="status">
                                <p className="text-sm font-medium text-white/80 animate-pulse">טוענים את האימון הבא…</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex-1">
                                    {classError ? (
                                        <p role="status" className="text-base leading-relaxed text-white">
                                            לא הצלחנו לעדכן את האימון הבא.
                                        </p>
                                    ) : nextClass ? (
                                        <div className="flex flex-col-reverse items-start gap-3.5 min-[380px]:flex-row">
                                            <div className="min-w-0 flex-1">
                                                <h3 dir="auto" className="break-words text-[clamp(1.5rem,5.8vw,1.95rem)] font-bold leading-tight text-white drop-shadow-sm">
                                                    {nextClass.title}
                                                </h3>
                                                <time dateTime={nextClass.start_time} className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--studio-deep-contrast)]/90">
                                                    <span className="font-bold text-white">{format(nextClass.start_time, { weekday: "long" })}</span>
                                                    <span aria-hidden="true">·</span>
                                                    <span dir="ltr" className="inline-flex items-center gap-1 font-bold text-white">
                                                        <Clock3 aria-hidden="true" className="h-3.5 w-3.5 text-[var(--studio-accent-text)]" />
                                                        <span>{format(nextClass.start_time, { hour: "2-digit", minute: "2-digit" })}</span>
                                                    </span>
                                                    <span className="sr-only">{format(nextClass.start_time, { day: "numeric", month: "long" })}</span>
                                                </time>
                                            </div>
                                            <div
                                                aria-hidden="true"
                                                className="flex shrink-0 items-center gap-2 text-center text-[var(--studio-accent-text)] min-[380px]:block min-[380px]:border-r min-[380px]:border-[var(--studio-accent-text)]/25 min-[380px]:pr-3.5"
                                            >
                                                <span className="block text-3xl font-bold leading-none tracking-tight tabular-nums min-[380px]:text-[3.1rem]">
                                                    {format(nextClass.start_time, { day: "2-digit" })}
                                                </span>
                                                <span className="block text-xs font-bold min-[380px]:mt-1.5">
                                                    {format(nextClass.start_time, { month: "long" })}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            <p className="text-[clamp(1.65rem,6.8vw,2.15rem)] font-bold leading-[1.14] tracking-tight text-white">
                                                קצת זמן<br />
                                                <span className="text-[var(--studio-accent-text)]">בשבילך.</span>
                                            </p>
                                            <p className="text-xs sm:text-sm leading-relaxed text-[var(--studio-deep-contrast)]/85">
                                                לוח האימונים פתוח לשריון מקום. בואי נבחר את השעה המושלמת עבורך.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {nextClass || classError ? (
                                    <Link
                                        href="/my-bookings"
                                        className="mt-5 flex min-h-11 items-center justify-between gap-3 rounded-xl border-t border-white/15 pt-3 text-sm font-bold text-white transition-colors hover:text-[var(--studio-accent-text)] active:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--studio-accent-text)]"
                                    >
                                        <span>לפרטי האימון וביטולים</span>
                                        <span className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-[var(--studio-accent-text)] text-[var(--studio-deep)] transition-transform hover:-translate-x-1">
                                            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                                        </span>
                                    </Link>
                                ) : (
                                    <Link
                                        href="/book"
                                        className="mt-5 flex min-h-[3.15rem] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d9e2b8] via-[#cbd3aa] to-[#bcc89a] px-4 py-2.5 text-sm font-bold text-[#142016] shadow-[0_12px_28px_-6px_rgba(203,211,170,0.55),0_0_0_1px_rgba(255,255,255,0.35)] transition-all hover:brightness-105 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--studio-accent-text)]"
                                    >
                                        <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />
                                        <span>למערכת השעות ושריון מקום</span>
                                        <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
                                    </Link>
                                )}
                            </>
                        )}
                    </div>
                </section>

                {/* Member Status & Balance Row (Serene, uncluttered, distinct) */}
                <div className="flex min-h-[4.5rem] flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[22px] border border-[#ced5be] bg-white/80 p-3.5 sm:p-4.5 shadow-[0_8px_24px_-10px_rgba(20,32,22,0.06)] backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--studio-deep)] text-[var(--studio-accent-text)] shadow-sm">
                            <Ticket aria-hidden="true" className="h-4.5 w-4.5 text-[#d8e0b5]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span
                                    className="text-2xl font-bold leading-none tabular-nums text-[var(--studio-ink)]"
                                    aria-busy={loading}
                                >
                                    {loading ? "–" : tickets}
                                </span>
                                <span className="text-xs font-bold text-[var(--studio-ink)]">
                                    {tickets === 1 ? "אימון זמין ביתרה" : "אימונים זמינים ביתרה"}
                                </span>
                            </div>
                            <p className="mt-0.5 text-[11px] font-medium text-[var(--studio-muted)]">
                                {subscription?.is_active
                                    ? subscription.tier_display_name
                                    : tickets > 0
                                    ? "כרטיסיית אימונים תקפה"
                                    : "לרכישת כרטיסייה או מנוי חודשי"}
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/subscription"
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[var(--studio-ink)]/5 px-3 py-1.5 text-xs font-bold text-[var(--studio-ink)] transition-colors hover:bg-[var(--studio-brand)] hover:text-white active:bg-[var(--studio-brand)]"
                    >
                        <span>{tickets > 0 ? "המנוי שלי" : "רכישת מנוי"}</span>
                        <ArrowLeft aria-hidden="true" className="h-3 w-3" />
                    </Link>
                </div>
            </main>
        </div>
    );
}
