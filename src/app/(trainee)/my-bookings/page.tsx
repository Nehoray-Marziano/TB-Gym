"use client";

import { bookingMessage } from "@/lib/bookingMessage";

import { useEffect, useState, useCallback, useRef } from "react";
import { sessionCache } from "@/lib/sessionStorage";
import { useCurrentTime } from "@/hooks/useCurrentTime";
import { sendNotificationRequest } from "@/lib/notificationRequest";
import { StudioModal } from "@/components/ui/StudioModal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Clock3, X } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getRelativeTimeHebrew } from "@/lib/utils";
import StudioLogo from "@/components/StudioLogo";
import { useTraineeUserId } from "@/components/TraineeIdentity";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";

type BookedSession = {
    id: string;
    title: string;
    start_time: string;
};

type BookingRow = {
    id: string;
    status: string;
    session: BookedSession | BookedSession[] | null;
};

type Booking = Omit<BookingRow, "session"> & { session: BookedSession };

function formatDate(date: string, options: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat("he-IL", options).format(new Date(date));
}

export default function MyBookingsPage() {
    const now = useCurrentTime();
    const router = useRouter();
    const userId = useTraineeUserId();
    const { toast } = useToast();
    const { cancelBooking: globalCancel, refreshData } = useGymStore();

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const readVersion = useRef(0);
    const cancelLock = useRef(false);
    const [sessionToCancel, setSessionToCancel] = useState<BookedSession | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        let active = true;
        queueMicrotask(() => {
            if (active) setMounted(true);
        });
        return () => {
            active = false;
        };
    }, []);

    const fetchBookings = useCallback(async () => {
        const version = ++readVersion.current;
        try {
            const supabase = getSupabaseClient();
            const { data: myBookings, error } = await supabase
                .from("bookings")
                .select("id, status, created_at, session:gym_sessions(*)")
                .eq("user_id", userId)
                .in("status", ["confirmed", "pending"])
                .order("created_at", { ascending: false })
                .abortSignal(AbortSignal.timeout(10_000));

            if (error) throw error;
            if (version !== readVersion.current) return;

            if (myBookings) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const upcoming = (myBookings as unknown as BookingRow[])
                    .map((booking) => ({
                        ...booking,
                        session: Array.isArray(booking.session) ? booking.session[0] : booking.session
                    }))
                    .filter((booking): booking is Booking =>
                        Boolean(booking.session && new Date(booking.session.start_time) >= today)
                    )
                    .sort(
                        (a, b) => new Date(a.session.start_time).getTime() - new Date(b.session.start_time).getTime()
                    );

                setBookings(upcoming);
            }
            setLoadError(false);
        } catch (error) {
            console.error("Could not load bookings", error);
            if (version === readVersion.current) setLoadError(true);
        } finally {
            if (version === readVersion.current) setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        let active = true;
        queueMicrotask(() => {
            if (active) void fetchBookings();
        });
        const refresh = () => {
            if (document.visibilityState === "visible") void fetchBookings();
        };
        document.addEventListener("visibilitychange", refresh);
        window.addEventListener("online", refresh);
        return () => {
            active = false;
            readVersion.current += 1;
            document.removeEventListener("visibilitychange", refresh);
            window.removeEventListener("online", refresh);
        };
    }, [fetchBookings]);

    const confirmCancel = async () => {
        if (!sessionToCancel || cancelLock.current) return;
        cancelLock.current = true;
        readVersion.current += 1;
        setIsCancelling(true);

        const targetId = sessionToCancel.id;
        const targetTitle = sessionToCancel.title;
        const prevBookings = [...bookings];

        // Optimistic removal
        setBookings((curr) => curr.filter((b) => b.session.id !== targetId));

        try {
            const result = await globalCancel(targetId);

            if (result.success) {
                sessionCache.removeItem(`talia_upcoming_${userId}`);
                if (navigator.vibrate) navigator.vibrate(15);
                toast({ title: "האימון בוטל", description: "הכרטיסייה הוחזרה לחשבונך", type: "success" });
                void refreshData(true);
                void fetchBookings();

                void sendNotificationRequest("/api/notifications", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: "ביטול אימון",
                        message: `מתאמנת ביטלה את ההרשמה לאימון ${targetTitle}`,
                        targetRole: "administrator"
                    })
                }).catch((err) => console.error("Cancellation notification error:", err));
                setSessionToCancel(null);
            } else {
                setBookings(prevBookings);
                toast({ title: "לא ניתן לבטל", description: bookingMessage(result.message), type: "error" });
                setSessionToCancel(null);
            }
        } catch {
            setBookings(prevBookings);
            toast({ title: "לא ניתן לבטל", description: "משהו השתבש בתהליך. נסי שוב בעוד רגע.", type: "error" });
            setSessionToCancel(null);
        } finally {
            cancelLock.current = false;
            setIsCancelling(false);
        }
    };

    return (
        <div
            data-member-scroll
            className="h-full w-full overflow-y-auto overscroll-contain bg-[var(--studio-canvas)] text-[var(--studio-ink)]"
        >
            <main className="mx-auto max-w-lg pb-[calc(8rem+env(safe-area-inset-bottom))]">
                <header className="relative flex items-center gap-3 bg-[var(--studio-accent-bg)] px-5 py-5">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        aria-label="חזרה"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--studio-ink)]/20"
                    >
                        <ChevronRight aria-hidden="true" className="h-5 w-5" />
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-[var(--studio-subtle)]">היומן שלך</p>
                        <h1 className="text-[2rem] font-bold leading-tight tracking-tight">
                            האימונים שלי<span className="text-[var(--studio-coral-ink)]">.</span>
                        </h1>
                    </div>
                    {!loading && !loadError && <span className="text-xs font-bold">{bookings.length}</span>}
                </header>

                <div className="px-5 pt-4">
                    {loadError && (
                        <div
                            role="alert"
                            className="mb-4 rounded-2xl border border-[var(--studio-danger)]/30 p-4 text-sm"
                        >
                            <p>לא הצלחנו לעדכן את האימונים. בדקי את החיבור ונסי שוב.</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setLoading(true);
                                    void fetchBookings();
                                }}
                                className="studio-tap-feedback mt-3 min-h-11 rounded-full bg-[var(--studio-deep)] px-5 font-bold text-[var(--studio-deep-contrast)]"
                            >
                                ניסיון נוסף
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="space-y-3" aria-busy="true">
                            {[1, 2, 3].map((item) => (
                                <div
                                    key={item}
                                    className="h-40 animate-pulse rounded-[1.75rem] bg-[var(--studio-card)]"
                                />
                            ))}
                        </div>
                    ) : bookings.length > 0 ? (
                        <div className="space-y-3">
                            {bookings.map((booking) => (
                                <article
                                    key={booking.id}
                                    className="overflow-hidden rounded-[1.35rem] border border-[var(--studio-ink)]/10 bg-[var(--studio-card)]"
                                >
                                    <div className="flex gap-3 p-3.5">
                                        <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-[1.1rem] bg-[var(--studio-deep)] text-[var(--studio-accent-text)]">
                                            <span className="text-[1.85rem] font-bold leading-none tabular-nums">
                                                {formatDate(booking.session.start_time, { day: "numeric" })}
                                            </span>
                                            <span className="mt-1 text-xs font-bold">
                                                {formatDate(booking.session.start_time, { month: "short" })}
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1 self-center">
                                            <h3 className="break-words text-lg font-bold leading-snug">
                                                {booking.session.title}
                                            </h3>
                                            <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--studio-muted)]">
                                                <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0" />
                                                {formatDate(booking.session.start_time, {
                                                    weekday: "long",
                                                    hour: "2-digit",
                                                    minute: "2-digit"
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex min-h-11 items-center justify-between gap-3 border-t border-[#162218]/10 px-4 py-2 text-xs font-bold">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={
                                                    booking.status === "pending"
                                                        ? "text-[var(--studio-warning-ink)]"
                                                        : "text-[var(--studio-subtle)]"
                                                }
                                            >
                                                {booking.status === "pending" ? "ממתין לאישור" : "המקום שלך שמור"}
                                            </span>
                                            <span className="text-[var(--studio-muted)] font-normal">
                                                · {getRelativeTimeHebrew(booking.session.start_time)}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSessionToCancel(booking.session)}
                                            className="studio-tap-feedback flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-[var(--studio-danger)]/30 bg-[var(--studio-danger)]/10 px-3 text-[11px] font-bold text-[var(--studio-danger)] active:bg-[var(--studio-danger)]/20"
                                            aria-label={`ביטול הרשמה לאימון ${booking.session.title}`}
                                        >
                                            <X aria-hidden="true" className="h-3.5 w-3.5" />
                                            <span>ביטול הרשמה</span>
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : !loadError ? (
                        <div className="relative overflow-hidden rounded-[1.75rem] bg-[var(--studio-deep)] px-6 py-8 text-[var(--studio-deep-contrast)]">
                            <StudioLogo className="pointer-events-none absolute -bottom-12 -left-10 h-52 w-52 bg-[var(--studio-accent-bg)]/15" />
                            <p className="relative mb-9 text-xs font-bold text-[var(--studio-accent-text)]">
                                יש מקום בשבילך
                            </p>
                            <h3 className="relative mb-3 max-w-[15rem] text-[1.7rem] font-bold leading-tight">
                                היומן מחכה לאימון הראשון שלך.
                            </h3>
                            <p className="relative max-w-[17rem] text-sm leading-relaxed text-[#b8c7ae]">
                                בחרי אימון, והמקום שלך יופיע כאן.
                            </p>
                            <Link
                                href="/book"
                                className="relative mt-8 flex min-h-12 items-center justify-between rounded-full bg-[var(--studio-accent-bg)] px-5 text-sm font-bold text-[var(--studio-ink)] transition-colors active:bg-[#e8f29a]"
                            >
                                בואי לבחור אימון <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                            </Link>
                        </div>
                    ) : null}
                </div>
            </main>

            {/* Centered Accessibility-Compliant Confirmation Dialog: Cancellation Modal */}
            <AnimatePresence>
                {mounted && sessionToCancel && (
                    <StudioModal
                        titleId="cancel-booking-title-my"
                        descriptionId="cancel-booking-policy-my"
                        variant="confirmation"
                        busy={isCancelling}
                        onClose={() => setSessionToCancel(null)}
                        actions={
                            <>
                                <button
                                    type="button"
                                    onClick={confirmCancel}
                                    disabled={isCancelling}
                                    className="studio-tap-feedback flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--studio-danger)] px-4 text-sm font-bold text-white shadow-lg shadow-[#a53d35]/30 hover:bg-[#8f322b] active:brightness-95 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-danger)]"
                                >
                                    {isCancelling ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            <span>מבטלים את ההרשמה...</span>
                                        </>
                                    ) : (
                                        <span>כן, לבטל את ההרשמה</span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    data-modal-cancel
                                    onClick={() => setSessionToCancel(null)}
                                    disabled={isCancelling}
                                    className="studio-tap-feedback flex min-h-[46px] w-full items-center justify-center rounded-2xl border border-[var(--studio-ink)]/15 bg-white px-4 text-xs font-bold text-[var(--studio-ink)] shadow-sm hover:bg-[var(--studio-neutral-bg)]/50 active:bg-[var(--studio-ink)]/5 disabled:opacity-50"
                                >
                                    להישאר רשומה (חזרה)
                                </button>
                            </>
                        }
                    >
                        <button
                            type="button"
                            onClick={() => !isCancelling && setSessionToCancel(null)}
                            disabled={isCancelling}
                            className="studio-tap-feedback absolute top-4 left-4 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--studio-ink)]/10 bg-white/80 text-[var(--studio-muted)] hover:text-[var(--studio-ink)]"
                            aria-label="סגירה"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--studio-danger)]/12 text-[var(--studio-danger)] mb-3">
                            <X aria-hidden="true" className="h-7 w-7" />
                        </div>

                        <div className="text-center">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--studio-danger)]">
                                ביטול הרשמה
                            </p>
                            <h2 id="cancel-booking-title-my" className="mt-1 text-xl font-bold leading-tight">
                                לבטל את ההרשמה?
                            </h2>
                        </div>

                        {/* Session Detail Card */}
                        <div className="mt-4 rounded-2xl bg-[var(--studio-deep)] p-4 text-[var(--studio-deep-contrast)] text-center shadow-inner">
                            <span className="text-[11px] font-bold text-[var(--studio-accent-text)]">
                                האימון שיתפנה
                            </span>
                            <h3 className="mt-1 text-lg font-bold leading-tight">{sessionToCancel.title}</h3>
                            <p className="mt-2 text-xs text-[#cbd3aa] flex items-center justify-center gap-1.5">
                                <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                                <span>
                                    {formatDate(sessionToCancel.start_time, {
                                        weekday: "long",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                    })}
                                </span>
                            </p>
                        </div>

                        {/* Dynamic Policy / 10-Hour Context */}
                        <div id="cancel-booking-policy-my">
                            {(() => {
                                const msUntil = new Date(sessionToCancel.start_time).getTime() - now;
                                const hoursUntil = msUntil / (1000 * 60 * 60);
                                if (hoursUntil < 10 && hoursUntil > 0) {
                                    return (
                                        <div className="mt-3.5 rounded-xl bg-[var(--studio-warning-bg)]/90 border border-[var(--studio-warning-ink)]/15 p-3 text-xs text-[var(--studio-warning-ink)] text-center leading-relaxed">
                                            <p className="font-bold">לתשומת לבך:</p>
                                            <p className="mt-0.5">
                                                האימון מתקיים בעוד פחות מ-10 שעות. לפי מדיניות הסטודיו, ביטול ללא חיוב
                                                מתאפשר עד 10 שעות לפני תחילת האימון.
                                            </p>
                                        </div>
                                    );
                                }
                                return (
                                    <p className="mt-3.5 text-center text-xs leading-relaxed text-[var(--studio-muted)]">
                                        המקום שלך יתפנה למתאמנת אחרת, והכרטיסייה תוחזר מיידית לחשבונך.
                                    </p>
                                );
                            })()}
                        </div>
                    </StudioModal>
                )}
            </AnimatePresence>
        </div>
    );
}
