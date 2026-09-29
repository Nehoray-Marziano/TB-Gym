"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGymStore, type Session } from "@/providers/GymStoreProvider";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Clock3, ChevronRight, CalendarPlus, X } from "lucide-react";
import { getRelativeTimeHebrew } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import StudioLogo from "@/components/StudioLogo";

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
    const router = useRouter();
    const { toast } = useToast();

    const { refreshData, cancelBooking: globalCancel } = useGymStore();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingId, setBookingId] = useState<string | null>(null);
    const reduceMotion = useReducedMotion();

    const fetchSessions = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const [sessionRes, bookingsRes] = await Promise.all([
                supabase.from("gym_sessions_with_counts").select("*").gte("start_time", new Date().toISOString()).order("start_time", { ascending: true }),
                supabase.from("bookings").select("session_id").eq("user_id", user.id).eq("status", "confirmed")
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
                localStorage.setItem("talia_sessions", JSON.stringify(sessionsWithStatus));
            }
        } catch (error) {
            console.error("Error fetching sessions:", error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        const cached = localStorage.getItem("talia_sessions");
        if (cached) {
            setSessions(JSON.parse(cached));
            setLoading(false);
        }
        fetchSessions();

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                fetchSessions();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [fetchSessions]);


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
            await refreshData();
            await fetchSessions();
            toast({ title: "נרשמת בהצלחה! 🎉", description: "נתראה באימון", type: "success" });

            // Notify trainer about new booking
            try {
                const session = sessions.find(s => s.id === sessionId);
                await fetch("/api/notifications", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: "הרשמה חדשה! 🎉",
                        message: `מתאמנת נרשמה לאימון ${session?.title || ""}`,
                        targetRole: "administrator"
                    })
                });
            } catch (e) {
                console.log("Notification error:", e);
            }
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
            toast({ title: "האימון בוטל", description: "הזיכוי הוחזר לחשבונך", type: "success" });
            fetchSessions();

            // Notify Trainer about cancellation
            try {
                await fetch("/api/notifications", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: "ביטול אימון",
                        message: `מתאמנת ביטלה את ההרשמה לאימון ${sessionToCancel.title}`,
                        targetRole: "administrator"
                    })
                });
            } catch (e) {
                console.error("Cancellation notification failed", e);
            }
        } else {
            setSessions(prevSessions);
            toast({ title: "לא ניתן לבטל", description: bookingMessage(result.message), type: "error" });
        }
        setSessionToCancel(null);
    };

    return (
        <div className="min-h-dvh overflow-x-hidden bg-[#e9eadc] text-[#162218]">
            <div className="mx-auto max-w-lg pb-[calc(3rem+env(safe-area-inset-bottom))]">
                <header className="relative isolate overflow-hidden bg-[#162218] px-5 pb-20 pt-5 text-[#f6f6ed] sm:px-7">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#e9f2ce_1px,transparent_1px),linear-gradient(90deg,#e9f2ce_1px,transparent_1px)] [background-size:28px_28px]" />
                    <StudioLogo className="pointer-events-none absolute -bottom-8 -left-14 h-56 w-56 bg-[#dce780]/10" />
                    <button
                        type="button"
                        onClick={() => router.back()}
                        aria-label="חזרה"
                        className="relative mb-11 flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/25 text-[#dce780] transition-colors active:bg-white/10"
                    >
                        <ChevronRight aria-hidden="true" className="h-5 w-5" />
                    </button>
                    <motion.div initial={reduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="relative">
                        <p className="mb-4 flex items-center gap-2 text-xs font-bold text-[#dce780]"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#f28c69]" />האימונים בסטודיו</p>
                        <h1 className="max-w-[20rem] text-[clamp(3.2rem,14vw,5rem)] font-bold leading-[0.95] tracking-[-0.055em]">איזה אימון<br /><span className="text-[#dce780]">מתאים לך</span><span className="text-[#f28c69]">?</span></h1>
                        <p className="mt-5 max-w-[18rem] text-sm leading-relaxed text-[#b8c7ae]">בחרי אימון, ואנחנו נשמור לך מקום.</p>
                    </motion.div>
                </header>

                <div className="relative -mt-8 rounded-t-[2rem] bg-[#e9eadc] px-5 pt-8 sm:px-7">
                    <div className="mb-5 border-b border-[#162218]/25 pb-4">
                        <div className="flex items-center justify-between gap-3 text-[10px] font-bold text-[#68794f]"><p>לוח האימונים / 01</p>{!loading && <span>{sessions.length} {sessions.length === 1 ? "אימון" : "אימונים"}</span>}</div>
                        <h2 className="mt-2 text-[1.65rem] font-bold leading-tight">האימונים הקרובים.</h2>
                    </div>

                {loading ? (
                    <div className="space-y-3" aria-busy="true">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-52 animate-pulse rounded-[1.75rem] bg-[#f6f6ed] p-5">
                                <div className="mb-5 h-5 w-24 rounded-full bg-muted/40" />
                                <div className="mb-3 h-7 w-2/3 rounded-lg bg-muted/40" />
                                <div className="h-4 w-1/2 rounded-lg bg-muted/40" />
                            </div>
                        ))}
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="relative overflow-hidden rounded-[1.75rem] bg-[#162218] px-6 py-8 text-[#f6f6ed]">
                        <StudioLogo className="pointer-events-none absolute -bottom-12 -left-10 h-52 w-52 bg-[#dce780]/15" />
                        <p className="relative mb-9 text-xs font-bold text-[#dce780]">היומן עוד שקט</p>
                        <h3 className="relative mb-3 max-w-[15rem] text-[1.7rem] font-bold leading-tight">אין כרגע אימונים קרובים.</h3>
                        <p className="relative max-w-[17rem] text-sm leading-relaxed text-[#b8c7ae]">כשהלו״ז יתעדכן, תוכלי לבחור כאן את האימון הבא שלך.</p>
                    </div>
                ) : (
                    <motion.div initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="space-y-3">
                    {sessions.map((session) => {
                        const date = formatDate(session.start_time);
                        const isFull = (session.current_bookings || 0) >= session.max_capacity;
                        const spotsLeft = session.max_capacity - (session.current_bookings || 0);
                        const isAlmostFull = spotsLeft <= 2 && spotsLeft > 0;
                        const occupancy = session.max_capacity > 0 ? Math.min(100, Math.max(0, ((session.current_bookings || 0) / session.max_capacity) * 100)) : 0;

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
                            <article key={session.id} className={`overflow-hidden rounded-[1.75rem] border bg-[#f6f6ed] ${session.isRegistered ? "border-[#829044]" : "border-[#162218]/10"}`}>
                                <div className="p-5">
                                    <div className="mb-5 flex items-start justify-between gap-3">
                                        <div className={`flex h-[4.5rem] w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-[1.1rem] ${session.isRegistered ? "bg-[#dce780] text-[#162218]" : "bg-[#162218] text-[#dce780]"}`}>
                                            <span className="text-[1.85rem] font-bold leading-none tabular-nums">{date.day}</span>
                                            <span className="mt-1 text-xs font-bold">{date.month}</span>
                                        </div>
                                        <span className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${session.isRegistered ? "bg-[#dce780] text-[#162218]" : isFull ? "bg-[#e1e3db] text-[#596252]" : isAlmostFull ? "bg-[#f4e6cd] text-[#754d16]" : "bg-[#e8ecd5] text-[#4e652c]"}`}>
                                            {session.isRegistered ? "המקום שלך שמור" : isFull ? "האימון מלא" : isAlmostFull ? `נשארו ${spotsLeft} מקומות` : "אפשר להירשם"}
                                        </span>
                                    </div>

                                    <h3 className="mb-2 break-words text-[1.55rem] font-bold leading-snug">{session.title}</h3>
                                    <p className="flex items-center gap-2 text-sm font-medium text-[#5d6958]">
                                        <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0" />
                                        {date.weekday} · {date.time}
                                    </p>
                                    <p className="mt-3 text-xs text-[#5d6958]">{getRelativeTimeHebrew(session.start_time)} · {session.current_bookings || 0} מתוך {session.max_capacity} מקומות תפוסים</p>
                                    <div role="meter" aria-label={`תפוסה באימון ${session.title}`} aria-valuemin={0} aria-valuemax={session.max_capacity} aria-valuenow={session.current_bookings || 0} className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#162218]/10"><span className="block h-full rounded-full bg-[#829044]" style={{ width: `${occupancy}%` }} /></div>
                                </div>

                                {session.isRegistered ? (
                                    <div className="flex border-t border-[#162218]/10">
                                        <button type="button" onClick={addToCalendar} className="flex min-h-12 flex-1 items-center justify-center gap-2 px-2 text-xs font-bold transition-colors active:bg-[#dce780]/30">
                                            <CalendarPlus aria-hidden="true" className="h-4 w-4" /> הוספה ליומן
                                        </button>
                                        <div className="w-px bg-[#162218]/10" />
                                        <button type="button" onClick={handleCancelClick} className="flex min-h-12 flex-1 items-center justify-center gap-2 px-2 text-xs font-bold text-[#a53d35] transition-colors active:bg-[#a53d35]/10">
                                            <X aria-hidden="true" className="h-4 w-4" /> ביטול הרשמה
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => !isFull && handleBook(session.id)}
                                        disabled={bookingId === session.id || isFull}
                                        className={`flex min-h-14 w-full items-center justify-between border-t px-5 text-sm font-bold transition-colors ${isFull ? "border-[#162218]/10 bg-[#e1e3db] text-[#596252]" : "border-[#dce780] bg-[#dce780] text-[#162218] active:bg-[#e8f29a]"}`}
                                    >
                                        {bookingId === session.id ? "רושמים אותך..." : isFull ? "האימון מלא" : "שמרי לי מקום"}
                                        {!isFull && (bookingId === session.id ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <ArrowLeft aria-hidden="true" className="h-4 w-4" />)}
                                    </button>
                                )}
                            </article>
                        )
                    })}
                    </motion.div>
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
                            className="relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-[#f1f0e8] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-7 text-[#162218]"
                        >
                            <button type="button" onClick={() => setSessionToCancel(null)} aria-label="סגירה" className="absolute left-5 top-6 flex h-11 w-11 items-center justify-center rounded-full border border-[#162218]/15"><X aria-hidden="true" className="h-5 w-5" /></button>
                            <p className="mb-2 text-xs font-bold text-[#8b3e36]">ההרשמה שלך</p>
                            <h3 id="cancel-booking-title" className="max-w-[16rem] text-[2rem] font-bold leading-tight">לבטל את ההרשמה?</h3>
                            <div className="mt-7 rounded-[1.5rem] bg-[#162218] p-5 text-[#f6f6ed]">
                                <p className="text-xs font-bold text-[#dce780]">האימון שיתפנה</p>
                                <p className="mt-2 break-words text-xl font-bold">{sessionToCancel.title}</p>
                            </div>
                            <p className="mt-5 text-sm leading-relaxed text-[#5d6958]">המקום שלך יתפנה, והאימון יוחזר ליתרה שלך.</p>
                            <div className="mt-7 grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setSessionToCancel(null)} className="min-h-12 rounded-full bg-[#162218] px-3 text-sm font-bold text-[#f6f6ed] transition-colors active:bg-[#334436]">להישאר רשומה</button>
                                <button type="button" onClick={confirmCancel} className="min-h-12 rounded-full border border-[#a53d35]/40 px-3 text-sm font-bold text-[#a53d35] transition-colors active:bg-[#a53d35]/10">כן, לבטל</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
