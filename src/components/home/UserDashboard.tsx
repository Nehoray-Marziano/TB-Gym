"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock3, Ticket } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getRelativeTimeHebrew } from "@/lib/utils";
import { useGymStore } from "@/providers/GymStoreProvider";
import StudioLogo from "@/components/StudioLogo";
import BottomNav from "@/components/BottomNav";
import NotificationPermissionModal from "@/components/NotificationPermissionModal";
import { useToast } from "@/components/ui/use-toast";

type UpcomingSession = {
    id: string;
    title: string;
    start_time: string;
};

function greetingForHour(hour: number) {
    if (hour < 12) return "בוקר טוב";
    if (hour < 18) return "צהריים טובים";
    return "ערב טוב";
}

function formatDate(date: string, options: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat("he-IL", options).format(new Date(date));
}

export default function UserDashboard({ userId }: { userId: string }) {
    const router = useRouter();
    const { toast } = useToast();
    const { profile, tickets, subscription, loading, refreshData, toggleDevMode } = useGymStore();
    const [upcomingSession, setUpcomingSession] = useState<UpcomingSession | null>(null);
    const [loadingSession, setLoadingSession] = useState(true);
    const [debugClicks, setDebugClicks] = useState(0);
    const reduceMotion = useReducedMotion();

    useEffect(() => {
        refreshData(false, userId);

        try {
            const cached = localStorage.getItem("talia_upcoming");
            if (cached) {
                setUpcomingSession(JSON.parse(cached));
                setLoadingSession(false);
            }
        } catch {
            localStorage.removeItem("talia_upcoming");
        }

        const fetchUpcoming = async () => {
            const supabase = getSupabaseClient();
            const { data: myBookings } = await supabase
                .from("bookings")
                .select("session:gym_sessions(*)")
                .eq("user_id", userId)
                .eq("status", "confirmed")
                .gte("session.start_time", new Date().toISOString());

            if (myBookings?.length) {
                const futureBookings = (myBookings as unknown as { session: UpcomingSession | null }[])
                    .map((booking) => booking.session)
                    .filter((session): session is UpcomingSession => Boolean(session && new Date(session.start_time) > new Date()))
                    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
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
    }, [userId, refreshData]);

    useEffect(() => {
        if (loading) return;
        const previous = localStorage.getItem("talia_tickets_count");
        const current = tickets || 0;

        if (previous !== null && current > Number(previous)) {
            toast({
                title: "קיבלת כרטיסים חדשים! 🎉",
                description: "הכרטיסים נוספו לחשבון שלך בהצלחה.",
                type: "success",
            });
            if (!reduceMotion) {
                import("canvas-confetti").then(({ default: confetti }) => {
                    confetti({ particleCount: 90, spread: 65, origin: { y: 0.65 }, colors: ["#dce780", "#8c9070", "#ffffff"] });
                });
            }
        }
        localStorage.setItem("talia_tickets_count", String(current));
    }, [tickets, loading, toast, reduceMotion]);

    useEffect(() => {
        router.prefetch("/subscription");
        router.prefetch("/book");
        router.prefetch("/profile");
        if (profile?.role === "administrator") router.prefetch("/admin/schedule");
    }, [router, profile?.role]);

    const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "אלופה";
    const greeting = greetingForHour(new Date().getHours());

    if (loading) {
        return (
            <main className="min-h-dvh bg-background px-6 pt-8" aria-busy="true">
                <div className="mx-auto max-w-lg animate-pulse space-y-6">
                    <div className="h-10 w-24 rounded-full bg-muted/40" />
                    <div className="h-24 w-3/4 rounded-2xl bg-muted/40" />
                    <div className="h-64 rounded-[2rem] bg-muted/40" />
                    <div className="h-48 rounded-[2rem] bg-muted/40" />
                </div>
            </main>
        );
    }

    return (
        <div className="min-h-dvh overflow-x-hidden bg-[var(--studio-canvas)] text-[var(--studio-ink)]">
            <main className="mx-auto max-w-lg pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
                <section className="relative isolate overflow-hidden bg-[var(--studio-deep)] px-5 pb-24 pt-4 text-[var(--studio-deep-contrast)] sm:px-7">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#e9f2ce_1px,transparent_1px),linear-gradient(90deg,#e9f2ce_1px,transparent_1px)] [background-size:28px_28px]" />
                    <StudioLogo className="pointer-events-none absolute -bottom-8 -left-12 h-64 w-64 bg-[var(--studio-accent-bg)]/10" />
                    <div className="relative flex items-center justify-between border-b border-white/20 pb-4">
                        <button
                            type="button"
                            aria-label="סטודיו טליה"
                            onClick={() => {
                                const count = debugClicks + 1;
                                if (count >= 10) {
                                    toggleDevMode(true);
                                    toast({ title: "מצב פיתוח הופעל", description: "כלי הבדיקה זמינים עכשיו.", type: "success" });
                                    setDebugClicks(0);
                                } else {
                                    setDebugClicks(count);
                                }
                            }}
                            className="flex min-h-11 items-center gap-2 text-start"
                        >
                            <StudioLogo className="h-8 w-8 bg-[var(--studio-accent-bg)]" />
                            <span className="border-s border-white/25 ps-2 text-xs font-bold leading-[1.1]">טליה<br />סטודיו</span>
                        </button>
                        {profile?.role === "administrator" && (
                            <Link href="/admin/schedule" className="flex min-h-11 items-center gap-2 rounded-full border border-white/25 px-4 text-xs font-bold text-[var(--studio-accent-text)] transition-colors active:bg-white/10">
                                ניהול סטודיו <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                            </Link>
                        )}
                    </div>

                    <motion.header initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="relative pb-3 pt-6">
                        <p className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--studio-accent-text)]"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--studio-coral-bg)]" />{greeting}</p>
                        <h1 className="max-w-full break-words text-[clamp(3rem,12vw,4.6rem)] font-bold leading-[0.98] tracking-[-0.055em]">
                            {firstName}<span className="text-[var(--studio-coral-text)]">.</span>
                        </h1>
                        <p className="mt-3 max-w-[18rem] text-sm leading-relaxed text-[#b8c7ae]">כל מה שצריך לאימון הבא שלך, במקום אחד.</p>
                    </motion.header>
                </section>

                <motion.div initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="relative z-10 -mt-20 px-5 sm:px-7">
                    <Link href="/subscription" prefetch className="group block rounded-[1.75rem] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#829044]">
                        <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-[var(--studio-accent-bg)] p-5 text-[var(--studio-ink)] shadow-[0_20px_50px_-30px_rgba(12,25,13,0.55)]">
                            <StudioLogo className="pointer-events-none absolute -bottom-16 -left-12 h-60 w-60 bg-[var(--studio-deep)]/10" />
                            <div className="relative flex items-start justify-between gap-3">
                                <p className="flex items-center gap-2 text-xs font-bold"><Ticket aria-hidden="true" className="h-4 w-4" />יתרת האימונים שלך</p>
                                <span className="text-[10px] font-bold">שלך / 01</span>
                            </div>
                            <div className="relative mt-2 flex items-end gap-4" aria-label={`${tickets || 0} אימונים זמינים`}>
                                <span className="text-[clamp(5rem,23vw,6.5rem)] font-bold leading-[0.82] tracking-[-0.1em] tabular-nums">{tickets || 0}</span>
                                <span className="pb-1 text-sm font-bold leading-tight">אימונים<br />זמינים</span>
                            </div>
                            <div className="relative mt-3 flex items-end justify-between gap-3 border-t border-[#162218]/25 pt-3">
                                <div className="min-w-0 text-xs leading-relaxed">
                                    {subscription?.is_active ? (
                                        <><span className="block font-bold">{subscription.tier_display_name}</span>בתוקף עד {formatDate(subscription.expires_at, { day: "numeric", month: "short" })}</>
                                    ) : "כאן מתחיל האימון הבא שלך"}
                                </div>
                                <span className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--studio-deep)] px-4 text-xs font-bold text-[var(--studio-deep-contrast)] transition-transform group-active:scale-95">
                                    {subscription?.is_active ? "עוד כרטיסים" : "בחירת מנוי"}<ArrowLeft aria-hidden="true" className="h-4 w-4" />
                                </span>
                            </div>
                        </section>
                    </Link>
                </motion.div>

                <motion.section initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.17, ease: [0.22, 1, 0.36, 1] }} className="mt-6 px-5 sm:px-7" aria-labelledby="next-workout-title">
                    <div className="mb-3 flex items-end justify-between gap-3 border-b border-[#162218]/25 pb-3">
                        <div>
                            <p className="mb-2 text-[10px] font-bold text-[var(--studio-subtle)]">האימון שלך / 02</p>
                            <h2 id="next-workout-title" className="text-[1.65rem] font-bold leading-tight tracking-tight">האימון הבא.</h2>
                        </div>
                        {upcomingSession && <Link href="/my-bookings" className="min-h-11 py-3 text-xs font-bold underline decoration-[#829044] underline-offset-4">האימונים שלי</Link>}
                    </div>

                    {loadingSession ? (
                        <div className="h-44 animate-pulse rounded-[1.75rem] bg-[var(--studio-deep)]/10" aria-busy="true" />
                    ) : upcomingSession ? (
                        <div className="overflow-hidden rounded-[1.75rem] border border-[#162218]/15 bg-[var(--studio-card)]">
                            <div className="flex gap-4 p-5">
                                <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-[1.25rem] bg-[var(--studio-deep)] text-[var(--studio-accent-text)]">
                                    <span className="text-3xl font-bold leading-none tabular-nums">{formatDate(upcomingSession.start_time, { day: "numeric" })}</span>
                                    <span className="mt-1 text-xs font-bold">{formatDate(upcomingSession.start_time, { month: "short" })}</span>
                                </div>
                                <div className="min-w-0 self-center">
                                    <h3 className="truncate text-lg font-bold">{upcomingSession.title}</h3>
                                    <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--studio-muted)]"><Clock3 aria-hidden="true" className="h-4 w-4" />{formatDate(upcomingSession.start_time, { hour: "2-digit", minute: "2-digit" })}</p>
                                    <p className="mt-1 text-xs text-[var(--studio-muted)]">{getRelativeTimeHebrew(upcomingSession.start_time)}</p>
                                </div>
                            </div>
                            <Link href="/book" className="flex min-h-12 items-center justify-between border-t border-[#162218]/15 px-5 text-sm font-bold transition-colors active:bg-[var(--studio-accent-bg)]/30">לכל האימונים <ArrowLeft aria-hidden="true" className="h-4 w-4" /></Link>
                        </div>
                    ) : (
                        <Link href="/book" className="group relative block overflow-hidden rounded-[1.75rem] bg-[var(--studio-card)] p-5 transition-transform active:scale-[0.99]">
                            <div aria-hidden="true" className="absolute -left-20 -top-24 h-56 w-56 rounded-full border-[22px] border-[#dce780]" />
                            <p className="relative text-xs font-bold text-[var(--studio-subtle)]">היומן שלך פתוח</p>
                            <p className="relative mt-4 max-w-[15rem] text-[1.4rem] font-bold leading-[1.1]">עדיין אין אימון ביומן.<br />בואי נבחר אחד.</p>
                            <span className="relative mt-4 flex min-h-11 items-center justify-between gap-2 border-t border-[#162218]/15 pt-3 text-sm font-bold">לצפייה בלוח האימונים <ArrowLeft aria-hidden="true" className="h-4 w-4 transition-transform group-active:-translate-x-1" /></span>
                        </Link>
                    )}
                </motion.section>
            </main>
            <BottomNav />
            <NotificationPermissionModal />
        </div>
    );
}
