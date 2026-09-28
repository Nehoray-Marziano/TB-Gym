"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, CalendarDays, Clock3, Ticket } from "lucide-react";
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

export default function UserDashboard({ user }: { user: User }) {
    const router = useRouter();
    const { toast } = useToast();
    const { profile, tickets, subscription, loading, refreshData, toggleDevMode } = useGymStore();
    const [upcomingSession, setUpcomingSession] = useState<UpcomingSession | null>(null);
    const [loadingSession, setLoadingSession] = useState(true);
    const [debugClicks, setDebugClicks] = useState(0);

    useEffect(() => {
        refreshData(false, user.id);

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
                .eq("user_id", user.id)
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
    }, [user.id, refreshData]);

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
            import("canvas-confetti").then(({ default: confetti }) => {
                confetti({ particleCount: 90, spread: 65, origin: { y: 0.65 }, colors: ["#dce780", "#8c9070", "#ffffff"] });
            });
        }
        localStorage.setItem("talia_tickets_count", String(current));
    }, [tickets, loading, toast]);

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
        <div className="min-h-dvh overflow-x-hidden bg-background text-foreground">
            <main className="mx-auto max-w-lg px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-7">
                <div className="mb-11 flex items-center justify-between border-b border-border/70 pb-4">
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
                        <StudioLogo className="h-8 w-8" />
                        <span className="border-s border-border ps-2 text-xs font-bold leading-[1.1]">טליה<br />סטודיו</span>
                    </button>
                    {profile?.role === "administrator" && (
                        <Link href="/admin/schedule" className="flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-xs font-bold transition-colors active:bg-muted/40">
                            ניהול סטודיו <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                        </Link>
                    )}
                </div>

                <header className="mb-9">
                    <p className="mb-2 text-sm font-medium text-muted-foreground">{greeting}</p>
                    <h1 className="max-w-full break-words text-[clamp(2.9rem,12vw,4.25rem)] font-bold leading-[1.02] tracking-tight">
                        {firstName}<span className="text-primary">.</span>
                    </h1>
                    <p className="mt-3 max-w-[18rem] text-sm leading-relaxed text-muted-foreground">כל מה שצריך לאימון הבא שלך, במקום אחד.</p>
                </header>

                <Link href="/subscription" prefetch className="group block rounded-[2rem] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
                    <section className="relative isolate min-h-[258px] overflow-hidden rounded-[2rem] bg-[#1b251c] px-6 py-6 text-[#f6f6ed] shadow-[0_18px_44px_-30px_rgba(12,25,13,0.7)]">
                        <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 -left-28 h-72 w-72 rounded-full border-[38px] border-[#dce780]/10" />
                        <div aria-hidden="true" className="pointer-events-none absolute -left-5 top-8 h-36 w-36 rounded-full border border-[#dce780]/20" />
                        <div className="relative flex items-start justify-between">
                            <div>
                                <div className="mb-1 flex items-center gap-2 text-xs font-medium text-[#cbd4c5]">
                                    <Ticket aria-hidden="true" className="h-4 w-4" />
                                    יתרת האימונים שלך
                                </div>
                                <div className="flex items-end gap-2" aria-label={`${tickets || 0} אימונים זמינים`}>
                                    <span className="text-[6.4rem] font-bold leading-none tracking-[-0.08em] tabular-nums">{tickets || 0}</span>
                                    <span className="pb-3 text-sm text-[#cbd4c5]">אימונים<br />זמינים</span>
                                </div>
                            </div>
                            <span className="pt-1 text-[10px] font-bold text-[#dce780]">האזור שלי / 01</span>
                        </div>
                        <div className="relative mt-3 flex items-end justify-between gap-3 border-t border-white/15 pt-4">
                            <div className="min-w-0 text-xs leading-relaxed text-[#cbd4c5]">
                                {subscription?.is_active ? (
                                    <><span className="block font-bold text-white">{subscription.tier_display_name}</span>בתוקף עד {formatDate(subscription.expires_at, { day: "numeric", month: "short" })}</>
                                ) : "כאן מתחיל האימון הבא שלך"}
                            </div>
                            <span className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[#dce780] px-4 text-xs font-bold text-[#1b251c] transition-transform group-active:scale-95">
                                {subscription?.is_active ? "עוד כרטיסים" : "בחירת מנוי"}<ArrowLeft aria-hidden="true" className="h-4 w-4" />
                            </span>
                        </div>
                    </section>
                </Link>

                <section className="mt-11" aria-labelledby="next-workout-title">
                    <div className="mb-4 flex items-end justify-between gap-3">
                        <div>
                            <p className="mb-1 text-[10px] font-bold text-muted-foreground">בקרוב / 02</p>
                            <h2 id="next-workout-title" className="text-[1.7rem] font-bold leading-tight">האימון הבא</h2>
                        </div>
                        {upcomingSession && <Link href="/my-bookings" className="min-h-11 py-3 text-xs font-bold text-foreground underline decoration-primary underline-offset-4">האימונים שלי</Link>}
                    </div>

                    {loadingSession ? (
                        <div className="h-44 animate-pulse rounded-[1.75rem] bg-muted/40" aria-busy="true" />
                    ) : upcomingSession ? (
                        <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card">
                            <div className="flex gap-4 p-5">
                                <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-[1.25rem] bg-primary text-primary-foreground">
                                    <span className="text-3xl font-bold leading-none tabular-nums">{formatDate(upcomingSession.start_time, { day: "numeric" })}</span>
                                    <span className="mt-1 text-xs font-bold">{formatDate(upcomingSession.start_time, { month: "short" })}</span>
                                </div>
                                <div className="min-w-0 self-center">
                                    <h3 className="truncate text-lg font-bold">{upcomingSession.title}</h3>
                                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Clock3 aria-hidden="true" className="h-4 w-4" />{formatDate(upcomingSession.start_time, { hour: "2-digit", minute: "2-digit" })}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{getRelativeTimeHebrew(upcomingSession.start_time)}</p>
                                </div>
                            </div>
                            <Link href="/book" className="flex min-h-12 items-center justify-between border-t border-border px-5 text-sm font-bold transition-colors active:bg-muted/40">לכל האימונים <ArrowLeft aria-hidden="true" className="h-4 w-4" /></Link>
                        </div>
                    ) : (
                        <Link href="/book" className="group block rounded-[1.75rem] border border-border bg-card p-6 transition-colors active:bg-muted/30">
                            <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary"><CalendarDays aria-hidden="true" className="h-6 w-6" /></div>
                            <p className="max-w-[15rem] text-xl font-bold leading-snug">עדיין אין אימון ביומן.<br />בואי נבחר אחד.</p>
                            <span className="mt-6 flex min-h-11 items-center gap-2 text-sm font-bold text-foreground">לצפייה בלוח האימונים <ArrowLeft aria-hidden="true" className="h-4 w-4 transition-transform group-active:-translate-x-1" /></span>
                        </Link>
                    )}
                </section>
            </main>
            <BottomNav />
            <NotificationPermissionModal />
        </div>
    );
}
