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
        <div className="relative isolate min-h-dvh overflow-x-hidden bg-[var(--studio-canvas)] text-[var(--studio-ink)]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(ellipse_at_15%_20%,var(--studio-accent-bg),transparent_65%)] opacity-15" />
            <main className="mx-auto max-w-lg px-5 pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
                <header className="flex min-h-11 items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--studio-deep)] p-1.5 shadow-sm">
                            <img src="/studio_emblem_clean.png" alt="" width={24} height={24} className="h-full w-full object-contain" />
                        </div>
                        <div>
                            <span className="block text-sm font-bold">סטודיו טליה</span>
                            <span className="mt-0.5 block text-[11px] text-[var(--studio-muted)]">תזונה · אימונים</span>
                        </div>
                    </div>
                    {profile?.role === "administrator" && (
                        <Link href="/admin" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-[var(--studio-muted)] transition-colors hover:bg-[var(--studio-ink)]/5 active:bg-[var(--studio-ink)]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-brand)]">ניהול</Link>
                    )}
                </header>

                <div className="relative isolate flex min-h-52 items-center py-8 sm:min-h-60 [@media(max-height:700px)]:min-h-44 [@media(max-height:700px)]:py-5">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-[42%] overflow-hidden">
                        <div className="absolute left-5 top-8 h-20 w-20 rounded-full bg-[var(--studio-coral-bg)]/65 sm:h-24 sm:w-24" />
                        <div className="absolute left-2 top-5 h-26 w-26 rounded-full border border-[var(--studio-coral-bg)]/30 sm:h-30 sm:w-30" />
                        <img src="/user_leaves_branch_sage.png" alt="" className="absolute -bottom-9 left-0 h-56 w-auto max-w-none -rotate-12 object-contain opacity-75" />
                    </div>
                    <div className="w-[70%]">
                        <p className="mb-3 text-xs font-medium text-[var(--studio-muted)]">{today}</p>
                        <h1 className="break-words font-bold leading-[1.08] tracking-[-0.045em]">
                            <span className="block text-2xl">{loading ? "שלום לך" : "היי,"}</span>
                            {!loading && <span className="mt-1 block text-[clamp(2.8rem,12vw,4.5rem)]">{firstName}<span className="text-[var(--studio-coral-ink)]">.</span></span>}
                        </h1>
                    </div>
                </div>

                <section aria-labelledby="next-class" aria-busy={classLoading} className="relative isolate overflow-hidden rounded-[30px_30px_10px_30px] border border-[var(--studio-brand)]/25 bg-[var(--studio-deep)] p-6 text-[var(--studio-deep-contrast)] shadow-[0_18px_40px_-22px_rgba(14,24,16,0.5)] sm:p-7">
                    <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-32 h-72 w-72 rounded-full border border-[var(--studio-accent-text)]/10 bg-[radial-gradient(circle,var(--studio-brand),transparent_70%)] opacity-30" />
                    <h2 id="next-class" className="relative flex items-center gap-2 text-xs font-bold text-[var(--studio-accent-text)]"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--studio-coral-text)]" />האימון הבא שלך</h2>
                    <div className="relative flex min-h-48 flex-col pt-6">
                        {classLoading ? (
                            <p role="status" className="flex flex-1 items-center text-sm">טוענים את האימון הבא…</p>
                        ) : (
                            <>
                                <div className="flex-1">
                                    {classError ? (
                                        <p role="status" className="text-lg leading-relaxed">לא הצלחנו לעדכן את האימון הבא.</p>
                                    ) : nextClass ? (
                                        <div className="flex flex-col-reverse items-start gap-4 min-[380px]:flex-row">
                                            <div className="min-w-0 flex-1">
                                                <h3 dir="auto" className="break-words text-[clamp(1.6rem,6.2vw,2rem)] font-bold leading-tight">{nextClass.title}</h3>
                                                <time dateTime={nextClass.start_time} className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                                                    <span>{format(nextClass.start_time, { weekday: "long" })}</span>
                                                    <span aria-hidden="true">·</span>
                                                    <span dir="ltr">{format(nextClass.start_time, { hour: "2-digit", minute: "2-digit" })}</span>
                                                    <span className="sr-only">{format(nextClass.start_time, { day: "numeric", month: "long" })}</span>
                                                </time>
                                            </div>
                                            <div aria-hidden="true" className="flex shrink-0 items-center gap-2 text-center text-[var(--studio-accent-text)] min-[380px]:block min-[380px]:border-r min-[380px]:border-[var(--studio-accent-text)]/25 min-[380px]:pr-4">
                                                <span className="block text-3xl leading-none tracking-tight tabular-nums min-[380px]:text-[3.3rem]">{format(nextClass.start_time, { day: "2-digit" })}</span>
                                                <span className="block text-xs min-[380px]:mt-2">{format(nextClass.start_time, { month: "long" })}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-[clamp(1.8rem,8vw,2.5rem)] font-bold leading-[1.15] tracking-tight">קצת זמן<br /><span className="text-[var(--studio-accent-text)]">בשבילך.</span></p>
                                            <p className="mt-3 text-sm text-[var(--studio-deep-contrast)]/85">עדיין אין לך אימון קרוב ביומן.</p>
                                        </>
                                    )}
                                </div>
                                {nextClass || classError ? (
                                    <Link href="/my-bookings" className="mt-5 flex min-h-11 items-center justify-between gap-3 rounded-lg border-t border-white/15 pt-3 text-sm font-bold transition-colors hover:text-[var(--studio-accent-text)] active:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--studio-accent-text)]">
                                        האימונים שלי <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--studio-accent-text)] text-[var(--studio-deep)]"><ArrowLeft aria-hidden="true" className="h-4 w-4" /></span>
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

                <div className="mt-5 flex min-h-24 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-[var(--studio-brand)]/25 px-1 pb-5 pt-1 text-sm">
                    <p aria-busy={loading} className="flex items-center gap-3">
                        <span className="text-[2.8rem] leading-none tracking-tight tabular-nums">{loading ? "–" : tickets}</span>
                        <span className="text-xs leading-relaxed text-[var(--studio-muted)]">אימונים<br />ביתרה שלך</span>
                    </p>
                    <Link href="/subscription" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-bold transition-colors hover:bg-[var(--studio-ink)]/5 active:bg-[var(--studio-ink)]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-brand)]">
                        המנוי שלי <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    </Link>
                </div>
            </main>
        </div>
    );
}
