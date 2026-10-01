"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";

export type UpcomingSession = { id: string; title: string; start_time: string };

const format = (date: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("he-IL", options).format(new Date(date));

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
    const { profile: storeProfile, tickets: storeTickets, loading: storeLoading, refreshData } = useGymStore();

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
    const today = new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

    return (
        <div className="min-h-dvh overflow-x-hidden bg-[var(--studio-canvas)] text-[var(--studio-ink)]">
            <main className="mx-auto max-w-lg px-5 pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
                <header className="flex min-h-11 items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--studio-deep)] p-1.5">
                            <img src="/studio_emblem_clean.png" alt="" width={24} height={24} className="h-full w-full object-contain" />
                        </div>
                        <span className="text-sm font-bold">סטודיו טליה</span>
                    </div>
                    {profile?.role === "administrator" && (
                        <Link href="/admin" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-[var(--studio-muted)] transition-colors hover:bg-[var(--studio-ink)]/5 active:bg-[var(--studio-ink)]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-brand)]">ניהול</Link>
                    )}
                </header>

                <div className="pb-7 pt-8">
                    <h1 className="break-words text-[clamp(2rem,8vw,2.75rem)] font-bold leading-tight tracking-tight">
                        {loading ? "שלום לך" : `היי, ${firstName}`}
                        <span className="text-[var(--studio-coral-text)]">.</span>
                    </h1>
                    <p className="mt-2 text-sm text-[var(--studio-muted)]">{today}</p>
                </div>

                <section aria-labelledby="next-class" aria-busy={classLoading} className="relative isolate overflow-hidden rounded-[26px] bg-[var(--studio-deep)] p-5 text-[var(--studio-deep-contrast)] shadow-[0_12px_30px_-18px_rgba(14,24,16,0.35)] sm:p-6">
                    <img src="/user_leaves_branch_sage.png" alt="" aria-hidden="true" className="pointer-events-none absolute -bottom-14 -left-10 h-56 w-auto rotate-[-12deg] object-contain opacity-10 mix-blend-screen" />
                    <h2 id="next-class" className="relative text-sm font-medium text-[var(--studio-accent-text)]">האימון הבא שלך</h2>
                    <div className="relative flex min-h-44 flex-col pt-5">
                        {classLoading ? (
                            <p role="status" className="flex flex-1 items-center text-sm">טוענים את האימון הבא…</p>
                        ) : (
                            <>
                                <div className="flex-1">
                                    {classError ? (
                                        <p role="status" className="text-lg leading-relaxed">לא הצלחנו לעדכן את האימון הבא.</p>
                                    ) : nextClass ? (
                                        <>
                                            <h3 dir="auto" className="break-words text-[clamp(1.6rem,6.2vw,2rem)] font-bold leading-tight">{nextClass.title}</h3>
                                            <time dateTime={nextClass.start_time} className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                                                <span>{format(nextClass.start_time, { weekday: "long", day: "numeric", month: "long" })}</span>
                                                <span aria-hidden="true">·</span>
                                                <span dir="ltr">{format(nextClass.start_time, { hour: "2-digit", minute: "2-digit" })}</span>
                                            </time>
                                        </>
                                    ) : (
                                        <p className="text-xl font-bold leading-relaxed">עוד לא קבעת את האימון הבא שלך.</p>
                                    )}
                                </div>
                                {nextClass || classError ? (
                                    <Link href="/my-bookings" className="mt-5 flex min-h-11 items-center justify-between gap-3 rounded-lg border-t border-white/15 pt-3 text-sm font-bold transition-colors hover:text-[var(--studio-accent-text)] active:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--studio-accent-text)]">
                                        האימונים שלי <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
                                    </Link>
                                ) : (
                                    <Link href="/book" className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--studio-accent-text)] px-4 py-3 text-sm font-bold text-[var(--studio-deep)] transition-opacity hover:opacity-90 active:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--studio-accent-text)]">
                                        למציאת אימון <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
                                    </Link>
                                )}
                            </>
                        )}
                    </div>
                </section>

                <div className="mt-3 flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 py-2 text-sm">
                    <p aria-busy={loading}>
                        <span className="font-bold tabular-nums">{loading ? "–" : tickets}</span>{" "}
                        <span className="text-[var(--studio-muted)]">אימונים ביתרה</span>
                    </p>
                    <Link href="/subscription" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-bold transition-colors hover:bg-[var(--studio-ink)]/5 active:bg-[var(--studio-ink)]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-brand)]">
                        המנוי שלי <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    </Link>
                </div>
            </main>
        </div>
    );
}
