"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, Ticket } from "lucide-react";
import { loadUpcomingSession, type GymSnapshot, type UpcomingSession } from "@/lib/gym-data";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getRelativeTimeHebrew } from "@/lib/utils";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";
import StudioLogo from "@/components/StudioLogo";

export type { UpcomingSession } from "@/lib/gym-data";

const format = (date: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("he-IL", { ...options, timeZone: "Asia/Jerusalem" }).format(new Date(date));

function getDayGreeting() {
    const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Jerusalem" }).format(new Date()));
    if (hour >= 5 && hour < 12) return "בוקר טוב";
    if (hour >= 12 && hour < 17) return "צהריים טובים";
    if (hour >= 17 && hour < 21) return "ערב טוב";
    return "לילה טוב";
}

function EmptyWorkoutCopy() {
    return <div className="space-y-1">
        <p className="studio-home-empty-title font-bold leading-[1.12] tracking-tight text-white">
            קצת זמן<br /><span className="text-[#d8e0b5]">בשבילך.</span>
        </p>
        <p className="studio-home-empty-description font-medium leading-relaxed text-[#f4f6ea]">
            לוח האימונים פתוח לשריון מקום. בואי נבחר את השעה המושלמת עבורך.
        </p>
    </div>;
}

export type TraineeDashboardProps = {
    userId: string;
    initialData?: GymSnapshot;
    initialUpcoming?: { session: UpcomingSession | null; error: boolean };
    previewNextClass?: UpcomingSession | null;
    previewTickets?: number;
    previewProfile?: { full_name?: string; role?: string };
    previewLoading?: boolean;
};

export default function TraineeDashboard({
    userId,
    initialData,
    initialUpcoming,
    previewNextClass,
    previewTickets,
    previewProfile,
    previewLoading = false,
}: TraineeDashboardProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { profile: storeProfile, tickets: storeTickets, subscription: storeSubscription, loading: storeLoading, error: storeError, hasData, refreshData, hydrateData } = useGymStore();
    const [hydrated, setHydrated] = useState(false);
    const hasCurrentData = hasData && storeProfile?.id === userId;
    const hadDataAtMount = useRef(hasCurrentData);
    const serverData = !hasCurrentData && !hydrated ? initialData : undefined;

    const profile = previewProfile ?? (serverData ? serverData.profile : storeProfile);
    const tickets = previewTickets ?? serverData?.tickets ?? storeTickets;
    const subscription = serverData ? serverData.subscription : storeSubscription;
    const loading = previewLoading || (previewTickets !== undefined || serverData ? false : storeLoading);
    const dataError = previewTickets === undefined && !serverData && storeError;

    const [loadedClass, setNextClass] = useState<UpcomingSession | null>(initialUpcoming?.session ?? null);
    const [classError, setClassError] = useState(initialUpcoming?.error ?? false);
    const [isClassLoading, setClassLoading] = useState(initialUpcoming === undefined);
    const nextClass = previewNextClass !== undefined ? previewNextClass : loadedClass;
    const classLoading = previewLoading || (previewNextClass === undefined && isClassLoading);

    useEffect(() => {
        if (previewTickets !== undefined || !userId) return;
        let active = true;
        // Back navigation may reuse an older prefetched server payload. Keep
        // the current store (including completed bookings/refunds) on return.
        if (initialData && !hadDataAtMount.current) hydrateData(initialData);
        queueMicrotask(() => {
            if (!active) return;
            if (initialData) {
                setHydrated(true);
            }
            if (!initialData || hadDataAtMount.current) {
                void refreshData(false, userId);
            }
        });
        return () => { active = false; };
    }, [initialData, hydrateData, refreshData, userId, previewTickets]);

    useEffect(() => {
        if (previewNextClass !== undefined) {
            return;
        }

        let active = true;
        let requestVersion = 0;
        if (initialUpcoming) {
            queueMicrotask(() => {
                if (!active) return;
                setNextClass(initialUpcoming.session);
                setClassError(initialUpcoming.error);
                setClassLoading(false);
            });
        }

        const load = async (version: number) => {
            const supabase = getSupabaseClient();
            if (!supabase) throw new Error("Supabase is unavailable");
            const upcoming = await loadUpcomingSession(supabase, userId);
            if (!active || version !== requestVersion) return;
            setClassError(false);
            setNextClass(upcoming);
            setClassLoading(false);
        };
        const refresh = () => {
            const version = ++requestVersion;
            void load(version).catch(() => {
                if (!active || version !== requestVersion) return;
                setClassError(true);
                setClassLoading(false);
            });
        };
        const resume = () => {
            if (document.visibilityState !== "visible") return;
            void refreshData(false, userId);
            refresh();
        };
        if (!initialUpcoming || hadDataAtMount.current) refresh();
        document.addEventListener("visibilitychange", resume);
        window.addEventListener("online", resume);
        return () => {
            active = false;
            document.removeEventListener("visibilitychange", resume);
            window.removeEventListener("online", resume);
        };
    }, [userId, refreshData, previewNextClass, initialUpcoming]);

    useEffect(() => {
        if (loading || dataError || !userId || previewTickets !== undefined) return;
        const key = `talia_tickets_count_${userId}`;
        try {
            const previous = sessionStorage.getItem(key);
            if (previous !== null && tickets > Number(previous)) {
                toast({ title: "נוספו לך אימונים ליתרה", type: "success" });
            }
            sessionStorage.setItem(key, String(tickets));
        } catch {
            // Storage can be disabled; it must never interrupt the home screen.
        }
    }, [tickets, loading, dataError, toast, userId, previewTickets]);

    useEffect(() => {
        if (!userId || previewTickets !== undefined) return;
        router.prefetch("/book");
        router.prefetch("/profile");
        router.prefetch("/subscription");
        router.prefetch("/my-bookings");
        if (profile?.role === "administrator") router.prefetch("/admin");
    }, [router, profile?.role, userId, previewTickets]);

    const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "אלופה";
    const greeting = getDayGreeting();

    return (
        <div data-home-ready={hydrated} className="studio-home relative h-full w-full bg-[#eceee0] bg-[radial-gradient(ellipse_120%_70%_at_50%_-10%,#faf9f2_0%,#e8ebdc_55%,#dfe2ce_100%)] text-[var(--studio-ink)] selection:bg-[var(--studio-brand)]/20">
            {/* Ambient atmospheric lighting */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-24 inset-x-0 h-96 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(139,142,111,0.22)_0%,transparent_70%)]"
            />

            <main className="studio-home-main relative mx-auto">
                {/* 1 & 2: Header + Personal Greeting grouped cohesively */}
                <div className="studio-home-heading flex flex-col">
                    {/* Header: Centered TB Brand Mark (acts as ניהול button when logged in as administrator) */}
                    <header className="flex shrink-0 items-center justify-center pt-0.5">
                        {profile?.role === "administrator" ? (
                            <Link
                                href="/admin"
                                className="group inline-flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--studio-ink)] cursor-pointer"
                                aria-label="ניהול"
                                title="ניהול"
                            >
                                <StudioLogo
                                    tight
                                    className="studio-home-emblem shrink-0 bg-[var(--studio-ink)] transition-transform group-hover:scale-[1.03]"
                                />
                            </Link>
                        ) : (
                            <div className="inline-flex items-center justify-center select-none" aria-label="סטודיו טליה">
                                <StudioLogo
                                    tight
                                    className="studio-home-emblem shrink-0 bg-[var(--studio-ink)]"
                                />
                            </div>
                        )}
                    </header>

                    {/* Personal Greeting with Harmonious Terracotta Sun & 100% Uncropped Botanical Art */}
                    <div className="studio-home-greeting flex items-center justify-between gap-2.5">
                        {/* Greeting text on right (RTL start) */}
                        <div className="min-w-0 flex-1">
                            <p className="studio-home-eyebrow mb-0.5 font-semibold tracking-wide text-[#283824]">
                                ✦ {greeting} · {nextClass ? "טוב לראות אותך" : "איזה כיף שבאת"}
                            </p>
                            <h1 className="break-words font-bold leading-[1.08] tracking-[-0.03em] text-[#142217]">
                                <span className="studio-home-hello block font-semibold text-[#142217]/85">
                                    היי,
                                </span>
                                <span aria-busy={loading} data-long-name={firstName.length > 10 ? "" : undefined} className="studio-home-name mt-0.5 block font-bold text-[#142217]">
                                    {loading ? <span className="studio-home-name-placeholder" aria-hidden="true" /> : <>{firstName}<span className="text-[#c37a61]">.</span></>}
                                    {loading && <span className="sr-only">טוענים את הפרטים שלך…</span>}
                                </span>
                            </h1>
                        </div>

                        {/* Botanical Art Vignette on left (RTL end) - fully contained, uncropped, zero header collision */}
                        <div
                            aria-hidden="true"
                            className="studio-home-botanical relative flex shrink-0 items-center justify-center select-none pointer-events-none"
                        >
                            {/* Terracotta sun disk */}
                            <div className="absolute h-13 w-13 sm:h-15 sm:w-15 rounded-full bg-[#c37a61]/75 shadow-sm" />
                            {/* Terracotta outer accent circle */}
                            <div className="absolute h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20 rounded-full border-[1.5px] border-[#c37a61]/45" />
                            {/* Complete botanical branch - contained naturally, 100% uncropped */}
                            <img
                                src="/user_leaves_branch_dark.png"
                                alt=""
                                className="relative z-10 h-full w-full object-contain drop-shadow-[0_2px_4px_rgba(20,32,22,0.15)]"
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Hero Workout Stage: Contextual, Asymmetric Studio Squircle */}
                <section
                    aria-labelledby="next-class"
                    aria-busy={classLoading}
                    className="studio-home-workout relative isolate flex flex-col justify-between overflow-hidden rounded-[22px_22px_12px_22px] border-2 border-[var(--studio-brand)]/40 bg-gradient-to-br from-[#1c2c1f] via-[#142217] to-[#0c140e] text-white shadow-[0_12px_28px_-10px_rgba(12,22,14,0.6)]"
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
                        <div className="studio-home-workout-label inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/40 px-2.5 py-1 font-bold text-[#eef2dc] backdrop-blur-md">
                            <span className="relative flex h-2 w-2">
                                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${nextClass ? "bg-[#e5a38b]" : "bg-[#d8e0b5]"}`} />
                                <span className={`relative inline-flex h-2 w-2 rounded-full ${nextClass ? "bg-[#e5a38b]" : "bg-[#d8e0b5]"}`} />
                            </span>
                            <h2 id="next-class" className="font-bold text-white">
                                {nextClass ? "האימון הבא שלך" : "האימון הבא שלך בסטודיו"}
                            </h2>
                        </div>

                        {nextClass && (
                            <span role={classError ? "status" : undefined} className="text-xs font-bold text-[#d8e0b5]">
                                {classError ? "העדכון לא זמין" : getRelativeTimeHebrew(nextClass.start_time, "Asia/Jerusalem")}
                            </span>
                        )}
                    </div>

                    <div className="studio-home-workout-content relative">
                        {/* The same empty-state geometry sizes loading and booked content. */}
                        <div aria-hidden="true" className="studio-home-workout-reserve">
                            <EmptyWorkoutCopy />
                            <span className="studio-home-workout-action flex items-center justify-center gap-2 px-4 py-2 font-bold">
                                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                                <span>למערכת השעות ושריון מקום</span>
                                <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                            </span>
                        </div>
                        <div className="studio-home-workout-body">
                        {classLoading ? (
                            <div className="flex min-h-[5.5rem] items-center justify-center" role="status">
                                <p className="text-sm font-semibold text-white animate-pulse">טוענים את האימון הבא…</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex-1">
                                    {classError && !nextClass ? (
                                        <p role="status" className="text-sm font-semibold leading-relaxed text-white">
                                            לא הצלחנו לעדכן את האימון הבא.
                                        </p>
                                    ) : nextClass ? (
                                        <div className="flex flex-col-reverse items-start gap-2.5 min-[380px]:flex-row">
                                            <div className="min-w-0 flex-1">
                                                <h3 dir="auto" className="studio-home-workout-title break-words font-bold leading-tight text-white drop-shadow-sm">
                                                    {nextClass.title}
                                                </h3>
                                                <time dateTime={nextClass.start_time} className="studio-home-workout-time mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-white/95">
                                                    <span className="font-bold text-white">{format(nextClass.start_time, { weekday: "long" })}</span>
                                                    <span aria-hidden="true" className="text-white/60">·</span>
                                                    <span dir="ltr" className="inline-flex items-center gap-1 font-bold text-white">
                                                        <Clock3 aria-hidden="true" className="h-3.5 w-3.5 text-[#d8e0b5]" strokeWidth={2.4} />
                                                        <span>{format(nextClass.start_time, { hour: "2-digit", minute: "2-digit" })}</span>
                                                    </span>
                                                    <span className="studio-home-session-date-summary sr-only">{format(nextClass.start_time, { day: "numeric", month: "long" })}</span>
                                                </time>
                                            </div>
                                            <div
                                                aria-hidden="true"
                                                className="studio-home-session-date flex shrink-0 items-center gap-2 text-center text-[#d8e0b5] min-[380px]:block min-[380px]:border-r min-[380px]:border-white/20 min-[380px]:pr-3"
                                            >
                                                <span className="studio-home-workout-day block font-bold leading-none tracking-tight tabular-nums text-white">
                                                    {format(nextClass.start_time, { day: "2-digit" })}
                                                </span>
                                                <span className="block text-[11px] font-bold text-[#d8e0b5] min-[380px]:mt-0.5">
                                                    {format(nextClass.start_time, { month: "long" })}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <EmptyWorkoutCopy />
                                    )}
                                </div>

                                {nextClass || classError ? (
                                    <Link
                                        href="/my-bookings"
                                        className="studio-home-workout-action flex items-center justify-between gap-3 rounded-xl border-t border-white/20 font-bold text-white transition-colors hover:text-[#d8e0b5] active:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d8e0b5]"
                                    >
                                        <span>לפרטי האימון וביטולים</span>
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#d8e0b5] text-[#142016] shadow-sm transition-transform hover:-translate-x-1">
                                            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
                                        </span>
                                    </Link>
                                ) : (
                                    <Link
                                        href="/book"
                                        className="studio-home-workout-action flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#dbe5b8] via-[#cbd3aa] to-[#bed09e] px-4 py-2 font-bold text-[#111c13] shadow-[0_8px_20px_-6px_rgba(203,211,170,0.6)] transition-all hover:brightness-105 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#cbd3aa]"
                                    >
                                        <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
                                        <span>למערכת השעות ושריון מקום</span>
                                        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
                                    </Link>
                                )}
                            </>
                        )}
                        </div>
                    </div>
                </section>

                {/* 4. Member Status & Balance Row - Single compact, high-contrast, non-wrapping row */}
                <div className="studio-home-balance flex items-center justify-between gap-3 rounded-[18px] border-2 border-[#8b9978] bg-white shadow-[0_4px_16px_-6px_rgba(20,32,22,0.08)]">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className="studio-home-ticket-icon flex shrink-0 items-center justify-center rounded-lg bg-[#142217] text-[#d8e0b5] shadow-sm">
                            <Ticket aria-hidden="true" className="h-4 w-4 text-[#d8e0b5]" strokeWidth={2.4} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-baseline gap-1.5">
                                <span
                                    className="studio-home-ticket-count font-bold leading-none tabular-nums text-[#142217]"
                                    aria-busy={loading}
                                >
                                    {loading || (dataError && !hasData) ? "–" : tickets}
                                </span>
                                <span className="studio-home-ticket-label font-bold text-[#142217]">
                                    {tickets === 1 ? "אימון זמין ביתרה" : "אימונים זמינים"}
                                </span>
                            </div>
                            <p role={dataError ? "status" : undefined} title={subscription?.tier_display_name} className="studio-home-ticket-description mt-0.5 font-semibold text-[#283824]">
                                {loading ? "טוענים את היתרה…" : dataError ? "היתרה לא עודכנה" : subscription?.is_active
                                    ? subscription.tier_display_name
                                    : tickets > 0
                                    ? "כרטיסייה פעילה"
                                    : "לרכישת כרטיסייה או מנוי"}
                            </p>
                        </div>
                    </div>

                    {dataError ? <button type="button" onClick={() => void refreshData(true, userId)} className="studio-home-membership studio-home-retry rounded-lg border-2 border-[#142217] px-2.5 py-1 font-bold">רענון</button> : <Link
                        href="/subscription"
                        className="studio-home-membership inline-flex shrink-0 items-center gap-1 rounded-lg border-2 border-[#142217] bg-[#f2f4e8] px-2.5 py-1 font-bold text-[#142217] shadow-sm transition-all hover:bg-[#142217] hover:text-white active:bg-[#142217] active:text-white"
                    >
                        <span>{loading ? "פרטי מנוי" : tickets > 0 ? "המנוי שלי" : "רכישת מנוי"}</span>
                        <ArrowLeft aria-hidden="true" className="h-3 w-3" strokeWidth={2.4} />
                    </Link>}
                </div>
            </main>
        </div>
    );
}
