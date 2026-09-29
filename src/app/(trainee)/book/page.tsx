"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useCallback, useEffect, useState } from "react";
import { useGymStore, type Session } from "@/providers/GymStoreProvider";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Clock3, CalendarPlus, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import StudioBotanical from "@/components/StudioBotanical";
import { useTraineeUserId } from "@/components/TraineeIdentity";

function bookingMessage(message: string | undefined) {
    const translations: Record<string, string> = {
        "Authentication required": "כדי להירשם, צריך להתחבר מחדש.",
        "Session not found": "האימון כבר לא זמין.",
        "Session has already started": "האימון כבר התחיל.",
        "Too late to cancel": "אפשר לבטל עד 10 שעות לפני האימון.",
        "Booking not found": "לא מצאנו הרשמה פעילה לאימון הזה.",
    };
    if (message && translations[message]) return translations[message];
    if (message && /^[\u0590-\u05FF\s!?.]+$/.test(message)) return message;
    return "משהו השתבש. נסי שוב בעוד רגע.";
}

export default function BookingPage() {
    const supabase = getSupabaseClient();
    const userId = useTraineeUserId();
    const { toast } = useToast();

    const { refreshData, cancelBooking: globalCancel } = useGymStore();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingId, setBookingId] = useState<string | null>(null);
    const reduceMotion = useReducedMotion();

    const fetchSessions = useCallback(async () => {
        try {
            const [sessionRes, bookingsRes] = await Promise.all([
                supabase.from("gym_sessions_with_counts").select("*").gte("start_time", new Date().toISOString()).order("start_time", { ascending: true }),
                supabase.from("bookings").select("session_id").eq("user_id", userId).eq("status", "confirmed")
            ]);

            const sessionData = sessionRes.data;
            const myBookings = bookingsRes.data;

            if (sessionData) {
                const registeredIds = new Set(myBookings?.map((b: { session_id: string }) => b.session_id));
                const sessionsWithStatus = sessionData.map((session: Session) => ({
                    ...session,
                    isRegistered: registeredIds.has(session.id),
                }));
                setSessions(sessionsWithStatus);
                sessionStorage.setItem(`talia_sessions_${userId}`, JSON.stringify(sessionsWithStatus));
            }
        } catch (error) {
            console.error("Error fetching sessions:", error);
        } finally {
            setLoading(false);
        }
    }, [supabase, userId]);

    useEffect(() => {
        const cached = sessionStorage.getItem(`talia_sessions_${userId}`);
        if (cached) {
            try {
                setSessions(JSON.parse(cached));
                setLoading(false);
            } catch {
                sessionStorage.removeItem(`talia_sessions_${userId}`);
            }
        }
        fetchSessions();

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                fetchSessions();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [fetchSessions, userId]);


    const handleBook = async (sessionId: string) => {
        setBookingId(sessionId);

        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(10);

        const { data, error } = await supabase.rpc("book_session", { p_session_id: sessionId });

        if (error) {
            toast({ title: "לא הצלחנו לרשום אותך", description: bookingMessage(error.message), type: "error" });
        } else if (data && !data.success) {
            toast({ title: "לא ניתן להירשם", description: bookingMessage(data.message), type: "error" });
        } else {
            // Success animation
            if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
            sessionStorage.removeItem(`talia_upcoming_${userId}`);
            toast({ title: "נרשמת בהצלחה! 🎉", description: "נתראה באימון", type: "success" });
            setSessions(current => current.map(session => session.id === sessionId ? { ...session, isRegistered: true, current_bookings: session.current_bookings + 1 } : session));
            void Promise.all([refreshData(), fetchSessions()]);

            const session = sessions.find(s => s.id === sessionId);
            void fetch("/api/notifications", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: "הרשמה חדשה! 🎉",
                        message: `מתאמנת נרשמה לאימון ${session?.title || ""}`,
                        targetRole: "administrator"
                    })
                }).catch(error => console.error("Notification error:", error));
        }
        setBookingId(null);
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return {
            day: date.getDate(),
            month: new Intl.DateTimeFormat("he-IL", { month: "short" }).format(date),
            weekday: new Intl.DateTimeFormat("he-IL", { weekday: "long" }).format(date),
            time: new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit" }).format(date)
        };
    };

    const [sessionToCancel, setSessionToCancel] = useState<Session | null>(null);

    const confirmCancel = async () => {
        if (!sessionToCancel) return;

        const prevSessions = [...sessions];
        setSessions(curr => curr.map(s => s.id === sessionToCancel.id ? { ...s, isRegistered: false, current_bookings: Math.max(0, s.current_bookings - 1) } : s));

        const result = await globalCancel(sessionToCancel.id);

        if (result.success) {
            sessionStorage.removeItem(`talia_upcoming_${userId}`);
            toast({ title: "האימון בוטל", description: "הזיכוי הוחזר לחשבונך", type: "success" });
            fetchSessions();

            void refreshData(true);
            void fetch("/api/notifications", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: "ביטול אימון",
                        message: `מתאמנת ביטלה את ההרשמה לאימון ${sessionToCancel.title}`,
                        targetRole: "administrator"
                    })
                }).catch(error => console.error("Cancellation notification failed", error));
        } else {
            setSessions(prevSessions);
            toast({ title: "לא ניתן לבטל", description: bookingMessage(result.message), type: "error" });
        }
        setSessionToCancel(null);
    };

    return (
        <div className="min-h-dvh overflow-x-hidden bg-[var(--studio-canvas)] text-[var(--studio-ink)]">
            <div className="mx-auto max-w-lg pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
                <header className="relative isolate overflow-hidden rounded-b-[2rem] bg-[var(--studio-deep)] px-5 pb-6 pt-[max(1.1rem,env(safe-area-inset-top))] text-[var(--studio-deep-contrast)]">
                    <StudioBotanical sun={false} className="studio-botanical-drift pointer-events-none absolute -bottom-24 -left-20 h-48 w-72 text-[var(--studio-accent-text)]/25" />
                    <p className="relative text-[11px] font-bold text-[var(--studio-accent-text)]">סטודיו טליה / השבוע הקרוב</p>
                    <div className="relative mt-3 flex items-end justify-between gap-3">
                        <h1 className="text-[clamp(2.3rem,10vw,3.2rem)] font-bold leading-none tracking-[-0.06em]">בוחרות אימון<span className="text-[var(--studio-coral-text)]">.</span></h1>
                        {!loading && <span className="mb-1 shrink-0 text-xs font-bold text-[var(--studio-accent-text)]">{sessions.length} אימונים</span>}
                    </div>
                </header>

                <div className="px-5 pt-4">
                    <p className="mb-3 text-xs font-medium text-[var(--studio-muted)]">בחרי את השעה שלך. מקום פנוי מחכה לך.</p>

                {loading ? (
                    <div className="space-y-3" aria-busy="true">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-36 animate-pulse rounded-[1.25rem] bg-[var(--studio-card)] p-5">
                                <div className="mb-5 h-5 w-24 rounded-full bg-muted/40" />
                                <div className="mb-3 h-7 w-2/3 rounded-lg bg-muted/40" />
                                <div className="h-4 w-1/2 rounded-lg bg-muted/40" />
                            </div>
                        ))}
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="relative overflow-hidden rounded-[2rem_1.1rem_2rem_1.1rem] bg-[var(--studio-deep)] px-6 py-8 text-[var(--studio-deep-contrast)]">
                        <StudioBotanical sun={false} className="studio-botanical-drift pointer-events-none absolute -bottom-14 -left-20 h-48 w-72 text-[var(--studio-accent-text)]/25" />
                        <p className="relative mb-9 text-xs font-bold text-[var(--studio-accent-text)]">היומן עוד שקט</p>
                        <h3 className="relative mb-3 max-w-[15rem] text-[1.7rem] font-bold leading-tight">אין כרגע אימונים קרובים.</h3>
                        <p className="relative max-w-[17rem] text-sm leading-relaxed text-[#b8c7ae]">כשהלו״ז יתעדכן, תוכלי לבחור כאן את האימון הבא שלך.</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                    {sessions.map((session) => {
                        const date = formatDate(session.start_time);
                        const isFull = (session.current_bookings || 0) >= session.max_capacity;
                        const spotsLeft = session.max_capacity - (session.current_bookings || 0);
                        const isAlmostFull = spotsLeft <= 2 && spotsLeft > 0;

                        const addToCalendar = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (navigator.vibrate) navigator.vibrate(10);

                            const title = `אימון ${session.title} - סטודיו טליה`;
                            const location = "סטודיו טליה";
                            const description = session.description || "אימון בסטודיו טליה";
                            const start = new Date(session.start_time);
                            const end = new Date(session.end_time);

                            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);

                            if (isIOS) {
                                const startStr = start.toISOString().replace(/-|:|\.\\d+/g, "");
                                const endStr = end.toISOString().replace(/-|:|\.\\d+/g, "");
                                const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${startStr}
DTEND:${endStr}
SUMMARY:${title}
DESCRIPTION:${description}
LOCATION:${location}
END:VEVENT
END:VCALENDAR`;
                                const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
                                const link = document.createElement('a');
                                link.href = window.URL.createObjectURL(blob);
                                link.setAttribute('download', 'אימון-בסטודיו.ics');
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            } else {
                                const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\\d+/g, "");
                                const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatDate(start)}/${formatDate(end)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;
                                window.open(url, '_blank');
                            }
                        };

                        const handleCancelClick = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (navigator.vibrate) navigator.vibrate(10);
                            setSessionToCancel(session);
                        };

                        return (
                            <article key={session.id} className={`overflow-hidden rounded-[1.6rem_1rem_1.6rem_1rem] border bg-[var(--studio-card)] ${session.isRegistered ? "border-[var(--studio-accent-text)]" : "border-[var(--studio-ink)]/10"}`}>
                                <div className="flex gap-3 p-3.5">
                                    <div className={`flex h-[4.1rem] w-[3.7rem] shrink-0 flex-col items-center justify-center rounded-[0.9rem] ${session.isRegistered ? "bg-[var(--studio-accent-bg)] text-[var(--studio-ink)]" : "bg-[var(--studio-deep)] text-[var(--studio-accent-text)]"}`}>
                                        <span className="text-[1.6rem] font-bold leading-none tabular-nums">{date.day}</span>
                                        <span className="mt-0.5 text-[11px] font-bold">{date.month}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="min-w-0 break-words text-[1.05rem] font-bold leading-tight">{session.title}</h3>
                                        </div>
                                        <p className="mt-1 flex items-center gap-1 text-xs text-[var(--studio-muted)]"><Clock3 aria-hidden="true" className="h-3.5 w-3.5" />{date.weekday} · {date.time}</p>
                                        <p className={`mt-1 text-[11px] font-bold ${isAlmostFull && !session.isRegistered ? "text-[var(--studio-warning-ink)]" : "text-[var(--studio-subtle)]"}`}>{session.isRegistered ? "המקום שלך שמור" : isFull ? "האימון מלא" : isAlmostFull ? `נותרו ${spotsLeft} מקומות` : `${spotsLeft} מקומות פנויים`}</p>
                                    </div>
                                </div>

                                {session.isRegistered ? (
                                    <div className="flex border-t border-[#162218]/10">
                                        <button type="button" onClick={addToCalendar} className="flex min-h-12 flex-1 items-center justify-center gap-2 px-2 text-xs font-bold transition-colors active:bg-[var(--studio-accent-bg)]/30">
                                            <CalendarPlus aria-hidden="true" className="h-4 w-4" /> הוספה ליומן
                                        </button>
                                        <div className="w-px bg-[var(--studio-deep)]/10" />
                                        <button type="button" onClick={handleCancelClick} className="flex min-h-12 flex-1 items-center justify-center gap-2 px-2 text-xs font-bold text-[var(--studio-danger)] transition-colors active:bg-[var(--studio-danger)]/10">
                                            <X aria-hidden="true" className="h-4 w-4" /> ביטול הרשמה
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => !isFull && handleBook(session.id)}
                                        disabled={bookingId === session.id || isFull}
                                        className={`flex min-h-11 w-full items-center justify-between border-t px-4 text-xs font-bold transition-colors ${isFull ? "border-[var(--studio-ink)]/10 bg-[var(--studio-neutral-bg)] text-[var(--studio-muted)]" : "border-[var(--studio-ink)]/10 bg-[var(--studio-accent-bg)] text-[var(--studio-ink)] active:brightness-95"}`}
                                    >
                                        {bookingId === session.id ? "רושמים אותך..." : isFull ? "האימון מלא" : "שמרי לי מקום"}
                                        {!isFull && (bookingId === session.id ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <ArrowLeft aria-hidden="true" className="h-4 w-4" />)}
                                    </button>
                                )}
                            </article>
                        )
                    })}
                    </div>
                )}
                </div>
            </div>

            <AnimatePresence>
                {sessionToCancel && (
                    <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSessionToCancel(null)}
                            className="absolute inset-0 bg-[#111a12]/65"
                        />
                        <motion.div
                            initial={reduceMotion ? false : { y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="cancel-booking-title"
                            className="relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-[var(--studio-sheet)] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-7 text-[var(--studio-ink)]"
                        >
                            <button type="button" onClick={() => setSessionToCancel(null)} aria-label="סגירה" className="absolute left-5 top-6 flex h-11 w-11 items-center justify-center rounded-full border border-[#162218]/15"><X aria-hidden="true" className="h-5 w-5" /></button>
                            <p className="mb-2 text-xs font-bold text-[var(--studio-danger)]">ההרשמה שלך</p>
                            <h3 id="cancel-booking-title" className="max-w-[16rem] text-[2rem] font-bold leading-tight">לבטל את ההרשמה?</h3>
                            <div className="mt-7 rounded-[1.5rem] bg-[var(--studio-deep)] p-5 text-[var(--studio-deep-contrast)]">
                                <p className="text-xs font-bold text-[var(--studio-accent-text)]">האימון שיתפנה</p>
                                <p className="mt-2 break-words text-xl font-bold">{sessionToCancel.title}</p>
                            </div>
                            <p className="mt-5 text-sm leading-relaxed text-[var(--studio-muted)]">המקום שלך יתפנה, והאימון יוחזר ליתרה שלך.</p>
                            <div className="mt-7 grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setSessionToCancel(null)} className="min-h-12 rounded-full bg-[var(--studio-deep)] px-3 text-sm font-bold text-[var(--studio-deep-contrast)] transition-colors active:bg-[#334436]">להישאר רשומה</button>
                                <button type="button" onClick={confirmCancel} className="min-h-12 rounded-full border border-[var(--studio-danger)]/40 px-3 text-sm font-bold text-[var(--studio-danger)] transition-colors active:bg-[var(--studio-danger)]/10">כן, לבטל</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
