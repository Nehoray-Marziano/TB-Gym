"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useGymStore, type Session } from "@/providers/GymStoreProvider";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
    CalendarDays,
    CalendarPlus,
    Clock3,
    X,
    ArrowLeft,
    Check,
    Ticket,
    RotateCw,
    AlertCircle,
    Info,
    Flame
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import StudioBotanical from "@/components/StudioBotanical";
import StudioLogo from "@/components/StudioLogo";
import { useTraineeUserId } from "@/components/TraineeIdentity";
import confetti from "canvas-confetti";
import Link from "next/link";
import "@/app/(trainee)/book/book.css";

function bookingMessage(message: string | undefined) {
    const translations: Record<string, string> = {
        "Authentication required": "כדי להירשם, יש להתחבר מחדש.",
        "Session not found": "האימון כבר אינו זמין בלוח.",
        "Session has already started": "האימון כבר החל.",
        "Too late to cancel": "ניתן לבטל ללא חיוב עד 10 שעות לפני האימון.",
        "Booking not found": "לא נמצאה הרשמה פעילה לאימון זה.",
        "No tickets available": "אין לך כרטיסיות זמינות להרשמה.",
        "User already booked": "את כבר רשומה לאימון הזה.",
        "Session is full": "האימון מלא, לא נותרו מקומות פנויים.",
    };
    if (message && translations[message]) return translations[message];
    if (message && /^[\u0590-\u05FF\s!?.]+$/.test(message)) return message;
    return "משהו השתבש בתהליך. נסי שוב בעוד רגע.";
}

const HEBREW_DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function getDayKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export type BookingExperienceProps = {
    userId?: string;
    previewSessions?: Session[];
    previewTickets?: number;
    previewSubscription?: { is_active: boolean } | null;
    previewLoading?: boolean;
};

export default function BookingExperience({
    userId: propUserId,
    previewSessions,
    previewTickets,
    previewSubscription,
    previewLoading,
}: BookingExperienceProps = {}) {
    const supabase = getSupabaseClient();
    const contextUserId = useTraineeUserId(propUserId || "00000000-0000-0000-0000-000000000000");
    const userId = propUserId || contextUserId;
    const { toast } = useToast();
    const reduceMotion = useReducedMotion();

    const { tickets: storeTickets, subscription: storeSubscription, refreshData, cancelBooking: globalCancel } = useGymStore();
    const tickets = previewTickets !== undefined ? previewTickets : storeTickets;
    const subscription = previewSubscription !== undefined ? previewSubscription : storeSubscription;

    const [sessions, setSessions] = useState<Session[]>(previewSessions ?? []);
    const [loading, setLoading] = useState(previewLoading !== undefined ? previewLoading : previewSessions === undefined);
    const [refreshing, setRefreshing] = useState(false);
    const [bookingId, setBookingId] = useState<string | null>(null);
    const [loadError, setLoadError] = useState(false);

    // Filter states
    const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<"all" | "available" | "registered">("all");

    // Modal states
    const [sessionForBooking, setSessionForBooking] = useState<Session | null>(null);
    const [sessionToCancel, setSessionToCancel] = useState<Session | null>(null);

    // Confetti celebration helper
    const triggerCelebration = useCallback(() => {
        if (reduceMotion) return;
        try {
            confetti({
                particleCount: 55,
                spread: 70,
                origin: { y: 0.8 },
                colors: ["#8b8e6f", "#cbd3aa", "#c37a61", "#f6f6ed", "#162218"],
                disableForReducedMotion: true,
            });
        } catch {
            // fallback gracefully
        }
    }, [reduceMotion]);

    const fetchSessions = useCallback(async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true);
        try {
            const [sessionRes, bookingsRes] = await Promise.all([
                supabase
                    .from("gym_sessions_with_counts")
                    .select("*")
                    .gte("start_time", new Date().toISOString())
                    .order("start_time", { ascending: true }),
                supabase
                    .from("bookings")
                    .select("session_id")
                    .eq("user_id", userId)
                    .eq("status", "confirmed")
            ]);

            if (sessionRes.error || bookingsRes.error) {
                throw sessionRes.error || bookingsRes.error;
            }

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
                setLoadError(false);
            }
        } catch (error) {
            console.error("Error fetching sessions:", error);
            setLoadError(true);
        } finally {
            setLoading(false);
            if (isManualRefresh) {
                setTimeout(() => setRefreshing(false), 450);
            }
        }
    }, [supabase, userId]);

    // Initial load and visibility sync
    useEffect(() => {
        if (previewSessions !== undefined) {
            setSessions(previewSessions);
            setLoading(previewLoading !== undefined ? previewLoading : false);
            return;
        }

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
            if (document.visibilityState === "visible") {
                fetchSessions();
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, [previewSessions, previewLoading, fetchSessions, userId]);

    // Generate upcoming 14 days calendar strip
    const daysList = useMemo(() => {
        const list = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 14; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const key = getDayKey(date);

            const daySessions = sessions.filter(s => getDayKey(new Date(s.start_time)) === key);
            const hasRegistered = daySessions.some(s => s.isRegistered);

            list.push({
                date,
                key,
                dayNumber: date.getDate(),
                dayLetter: HEBREW_DAYS[date.getDay()],
                monthShort: new Intl.DateTimeFormat("he-IL", { month: "numeric" }).format(date),
                isToday: i === 0,
                isTomorrow: i === 1,
                sessionsCount: daySessions.length,
                hasRegistered,
            });
        }
        return list;
    }, [sessions]);

    // Date formatting helper
    const formatSessionInfo = (isoStart: string, isoEnd: string) => {
        const start = new Date(isoStart);
        const end = new Date(isoEnd);
        const todayKey = getDayKey(new Date());
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowKey = getDayKey(tomorrow);
        const sessionKey = getDayKey(start);

        let relativeDay = "";
        if (sessionKey === todayKey) relativeDay = "היום";
        else if (sessionKey === tomorrowKey) relativeDay = "מחר";
        else relativeDay = new Intl.DateTimeFormat("he-IL", { weekday: "long" }).format(start);

        const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));

        return {
            day: start.getDate(),
            month: new Intl.DateTimeFormat("he-IL", { month: "short" }).format(start),
            weekday: new Intl.DateTimeFormat("he-IL", { weekday: "long" }).format(start),
            relativeDay,
            startTime: new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit" }).format(start),
            endTime: new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit" }).format(end),
            durationMinutes,
            dateKey: sessionKey,
        };
    };

    // Filtered sessions computation
    const filteredSessions = useMemo(() => {
        return sessions.filter((session) => {
            // Date filter
            if (selectedDateKey) {
                const sessionDateKey = getDayKey(new Date(session.start_time));
                if (sessionDateKey !== selectedDateKey) return false;
            }

            // Status filter
            if (filterStatus === "registered") {
                return Boolean(session.isRegistered);
            }
            if (filterStatus === "available") {
                const isFull = (session.current_bookings || 0) >= session.max_capacity;
                return !session.isRegistered && !isFull;
            }

            return true;
        });
    }, [sessions, selectedDateKey, filterStatus]);

    const myBookingsCount = useMemo(() => {
        return sessions.filter(s => s.isRegistered).length;
    }, [sessions]);

    // Booking action handler
    const handleBook = async (sessionId: string) => {
        setBookingId(sessionId);
        if (navigator.vibrate) navigator.vibrate(12);

        const { data, error } = await supabase.rpc("book_session", { p_session_id: sessionId });

        if (error) {
            toast({ title: "לא הצלחנו לרשום אותך", description: bookingMessage(error.message), type: "error" });
        } else if (data && !data.success) {
            toast({ title: "לא ניתן להירשם", description: bookingMessage(data.message), type: "error" });
        } else {
            // Haptic success celebration
            if (navigator.vibrate) navigator.vibrate([15, 60, 20]);
            triggerCelebration();

            sessionStorage.removeItem(`talia_upcoming_${userId}`);
            toast({ title: "נרשמת בהצלחה! 🎉", description: "המקום שלך שמור. נתראה באימון!", type: "success" });

            setSessions(current =>
                current.map(session =>
                    session.id === sessionId
                        ? { ...session, isRegistered: true, current_bookings: session.current_bookings + 1 }
                        : session
                )
            );

            void Promise.all([refreshData(true), fetchSessions()]);

            const targetSession = sessions.find(s => s.id === sessionId);
            void fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: "הרשמה חדשה! 🎉",
                    message: `מתאמנת נרשמה לאימון ${targetSession?.title || ""}`,
                    targetRole: "administrator"
                })
            }).catch(err => console.error("Notification error:", err));
        }
        setBookingId(null);
        setSessionForBooking(null);
    };

    // Cancellation action handler
    const confirmCancel = async () => {
        if (!sessionToCancel) return;

        const prevSessions = [...sessions];
        setSessions(curr =>
            curr.map(s =>
                s.id === sessionToCancel.id
                    ? { ...s, isRegistered: false, current_bookings: Math.max(0, s.current_bookings - 1) }
                    : s
            )
        );

        const result = await globalCancel(sessionToCancel.id);

        if (result.success) {
            sessionStorage.removeItem(`talia_upcoming_${userId}`);
            if (navigator.vibrate) navigator.vibrate(15);
            toast({ title: "האימון בוטל", description: "הכרטיסייה הוחזרה לחשבונך", type: "success" });
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
            }).catch(err => console.error("Cancellation notification error:", err));
        } else {
            setSessions(prevSessions);
            toast({ title: "לא ניתן לבטל", description: bookingMessage(result.message), type: "error" });
        }
        setSessionToCancel(null);
    };

    // Add to Calendar (iOS .ics or Google Calendar)
    const addToCalendar = (e: React.MouseEvent, session: Session) => {
        e.stopPropagation();
        if (navigator.vibrate) navigator.vibrate(10);

        const title = `אימון ${session.title} - סטודיו טליה`;
        const location = "סטודיו טליה, גבעת שמואל";
        const description = session.description || "אימון בסטודיו טליה";
        const start = new Date(session.start_time);
        const end = new Date(session.end_time);

        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);

        if (isIOS) {
            const startStr = start.toISOString().replace(/[-:]|\.\d{3}/g, "");
            const endStr = end.toISOString().replace(/[-:]|\.\d{3}/g, "");
            const icsContent = [
                "BEGIN:VCALENDAR",
                "VERSION:2.0",
                "PRODID:-//Talia Studio//Booking Calendar//HE",
                "CALSCALE:GREGORIAN",
                "BEGIN:VEVENT",
                `DTSTART:${startStr}`,
                `DTEND:${endStr}`,
                `SUMMARY:${title}`,
                `DESCRIPTION:${description}`,
                `LOCATION:${location}`,
                "STATUS:CONFIRMED",
                "END:VEVENT",
                "END:VCALENDAR"
            ].join("\r\n");

            const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
            const link = document.createElement("a");
            link.href = window.URL.createObjectURL(blob);
            link.setAttribute("download", `אימון-${session.title.replace(/\s+/g, "-")}.ics`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.setTimeout(() => window.URL.revokeObjectURL(link.href), 1000);
            toast({ title: "קובץ יומן הורד", description: "נפתח לשמירה ביומן ה-iOS שלך", type: "success" });
        } else {
            const formatDate = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, "");
            const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatDate(start)}/${formatDate(end)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;
            window.open(url, "_blank");
        }
    };

    return (
        <div className="studio-book-page relative h-full w-full overflow-y-auto overscroll-contain bg-[var(--studio-canvas)] text-[var(--studio-ink)] selection:bg-[var(--studio-brand)]/20">
            {/* Top Atmospheric Glow */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-12 inset-x-0 h-64 bg-[radial-gradient(ellipse_90%_50%_at_50%_0%,rgba(139,142,111,0.22)_0%,transparent_75%)]"
            />

            <div className="relative mx-auto flex min-h-full max-w-lg flex-col pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
                {/* 1. Sticky Glass PWA Mobile Header */}
                <header className="sticky top-0 z-30 border-b border-[var(--studio-ink)]/8 bg-[var(--studio-canvas)]/92 px-4.5 pb-3.5 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl shadow-[0_4px_16px_rgba(22,34,24,0.03)]">
                    <div className="flex items-center justify-between gap-3">
                        {/* Right side (RTL start): Studio Brand Identity */}
                        <div className="flex items-center gap-2.5">
                            <Link href="/dashboard" className="studio-tap-feedback flex shrink-0 items-center" aria-label="חזרה לבית">
                                <StudioLogo className="h-8.5 w-8.5 bg-[var(--studio-ink)] rounded-xl" />
                            </Link>
                            <div>
                                <p className="text-[10px] font-bold tracking-wider text-[var(--studio-brand)] uppercase">סטודיו טליה</p>
                                <h1 className="text-xl font-bold leading-tight tracking-tight text-[var(--studio-ink)]">לוח אימונים</h1>
                            </div>
                        </div>

                        {/* Left side (RTL end): Interactive Tickets Pill & Manual Refresh */}
                        <div className="flex items-center gap-2">
                            <Link
                                href="/subscription"
                                className="studio-tap-feedback flex items-center gap-1.5 rounded-full border border-[#8b9978]/60 bg-white/90 px-3 py-1.5 text-xs font-bold text-[#142217] shadow-[0_2px_8px_rgba(20,32,22,0.06)]"
                                aria-label="יתרת כרטיסיות ומנויים"
                            >
                                <Ticket aria-hidden="true" className="h-3.5 w-3.5 text-[var(--studio-coral-bg)]" />
                                <span>{tickets > 0 ? `${tickets} כרטיסיות` : subscription?.is_active ? "מנוי פעיל" : "רכישת כרטיסייה"}</span>
                            </Link>

                            <button
                                type="button"
                                onClick={() => void fetchSessions(true)}
                                disabled={refreshing}
                                className="studio-tap-feedback flex h-8.5 w-8.5 items-center justify-center rounded-full border border-[var(--studio-ink)]/10 bg-white/70 text-[var(--studio-ink)] shadow-sm active:bg-white"
                                aria-label="רענון לוח אימונים"
                            >
                                <RotateCw aria-hidden="true" className={`h-4 w-4 ${refreshing ? "animate-spin text-[var(--studio-coral-bg)]" : ""}`} />
                            </button>
                        </div>
                    </div>

                    {/* Subtitle */}
                    <div className="mt-2.5 flex items-center justify-between text-xs text-[var(--studio-muted)]">
                        <p className="font-medium">בחרי את השעה שלך · מקום פנוי מחכה לך</p>
                        {!loading && sessions.length > 0 && (
                            <span className="font-bold text-[var(--studio-subtle)]">{sessions.length} אימונים קרובים</span>
                        )}
                    </div>
                </header>

                <div className="px-4.5 pt-3">
                    {/* Error Notice */}
                    {loadError && (
                        <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[var(--studio-warning-bg)] p-3.5 text-xs font-medium text-[var(--studio-warning-ink)] shadow-sm">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 text-[var(--studio-warning-ink)]" />
                                <span>לא הצלחנו לעדכן את הלוח בזמן אמת.</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => void fetchSessions(true)}
                                className="studio-tap-feedback rounded-lg bg-[var(--studio-warning-ink)] px-2.5 py-1 text-xs font-bold text-white"
                            >
                                נסי שוב
                            </button>
                        </div>
                    )}

                    {/* 2. Horizontal Native Day Scroller (Weekly Calendar Strip) */}
                    <nav aria-label="בחירת יום בלוח" className="relative mb-3">
                        <div className="studio-day-strip flex items-center gap-2 overflow-x-auto py-1">
                            {/* "All Days" Pill */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (navigator.vibrate) navigator.vibrate(8);
                                    setSelectedDateKey(null);
                                }}
                                className={`studio-tap-feedback flex h-[4.2rem] min-w-[3.6rem] shrink-0 flex-col items-center justify-center rounded-[1.2rem] px-2 text-center transition-all ${
                                    selectedDateKey === null
                                        ? "bg-[var(--studio-deep)] text-[var(--studio-deep-contrast)] shadow-md shadow-[#162218]/15"
                                        : "border border-[var(--studio-ink)]/10 bg-[var(--studio-card)] text-[var(--studio-ink)]"
                                }`}
                            >
                                <span className="text-[11px] font-bold">הכל</span>
                                <span className="mt-1 text-sm font-bold">{sessions.length}</span>
                                <span className="text-[9px] opacity-70">אימונים</span>
                            </button>

                            {/* 14 Day Capsules */}
                            {daysList.map((day) => {
                                const isSelected = selectedDateKey === day.key;
                                return (
                                    <button
                                        key={day.key}
                                        type="button"
                                        onClick={() => {
                                            if (navigator.vibrate) navigator.vibrate(8);
                                            setSelectedDateKey(isSelected ? null : day.key);
                                        }}
                                        className={`studio-tap-feedback relative flex h-[4.2rem] min-w-[3.5rem] shrink-0 flex-col items-center justify-between rounded-[1.2rem] py-2 px-1 text-center transition-all ${
                                            isSelected
                                                ? "bg-[var(--studio-deep)] text-[var(--studio-deep-contrast)] shadow-md shadow-[#162218]/15"
                                                : day.sessionsCount > 0
                                                ? "border border-[var(--studio-ink)]/10 bg-[var(--studio-card)] text-[var(--studio-ink)]"
                                                : "border border-dashed border-[var(--studio-ink)]/8 bg-[var(--studio-neutral-bg)]/40 text-[var(--studio-muted)] opacity-60"
                                        }`}
                                    >
                                        <span className={`text-[10px] font-bold ${isSelected ? "text-[var(--studio-accent-text)]" : ""}`}>
                                            {day.isToday ? "היום" : day.dayLetter}
                                        </span>
                                        <span className="text-base font-bold tabular-nums leading-none">
                                            {day.dayNumber}
                                        </span>
                                        <div className="flex items-center justify-center gap-1">
                                            {day.hasRegistered ? (
                                                <span className="h-1.5 w-1.5 rounded-full bg-[var(--studio-accent-text)] ring-2 ring-[var(--studio-accent-bg)]/40" />
                                            ) : day.sessionsCount > 0 ? (
                                                <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-[var(--studio-coral-text)]" : "bg-[var(--studio-coral-bg)]"}`} />
                                            ) : (
                                                <span className="h-1 w-1 rounded-full bg-transparent" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </nav>

                    {/* 3. Segmented Filter Chips */}
                    <div className="mb-4 flex items-center justify-between gap-1.5 rounded-2xl bg-[var(--studio-neutral-bg)]/60 p-1 text-xs">
                        <button
                            type="button"
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(8);
                                setFilterStatus("all");
                            }}
                            className={`studio-tap-feedback-subtle flex-1 rounded-xl py-2 font-bold text-center transition-all ${
                                filterStatus === "all"
                                    ? "bg-white text-[var(--studio-ink)] shadow-sm"
                                    : "text-[var(--studio-muted)] hover:text-[var(--studio-ink)]"
                            }`}
                        >
                            כל האימונים
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(8);
                                setFilterStatus("available");
                            }}
                            className={`studio-tap-feedback-subtle flex-1 rounded-xl py-2 font-bold text-center transition-all ${
                                filterStatus === "available"
                                    ? "bg-white text-[var(--studio-ink)] shadow-sm"
                                    : "text-[var(--studio-muted)] hover:text-[var(--studio-ink)]"
                            }`}
                        >
                            פנויים להרשמה
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(8);
                                setFilterStatus("registered");
                            }}
                            className={`studio-tap-feedback-subtle flex-1 rounded-xl py-2 font-bold text-center transition-all ${
                                filterStatus === "registered"
                                    ? "bg-white text-[var(--studio-ink)] shadow-sm"
                                    : "text-[var(--studio-muted)] hover:text-[var(--studio-ink)]"
                            }`}
                        >
                            ההרשמות שלי {myBookingsCount > 0 ? `(${myBookingsCount})` : ""}
                        </button>
                    </div>

                    {/* 4. Sessions List */}
                    {loading ? (
                        <div className="space-y-3.5" aria-busy="true" aria-label="טוען אימונים">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-44 animate-pulse rounded-[1.75rem] border border-[var(--studio-ink)]/6 bg-[var(--studio-card)] p-4.5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="h-5 w-24 rounded-full bg-black/10" />
                                        <div className="h-5 w-20 rounded-full bg-black/10" />
                                    </div>
                                    <div className="h-6 w-3/4 rounded-lg bg-black/10 mb-2" />
                                    <div className="h-4 w-1/2 rounded-lg bg-black/10 mb-6" />
                                    <div className="h-11 w-full rounded-2xl bg-black/10" />
                                </div>
                            ))}
                        </div>
                    ) : sessions.length === 0 ? (
                        /* Global Empty State */
                        <div className="relative overflow-hidden rounded-[2rem] border border-[var(--studio-ink)]/10 bg-[var(--studio-deep)] px-6 py-9 text-[var(--studio-deep-contrast)] shadow-lg">
                            <StudioBotanical sun={false} className="studio-botanical-drift pointer-events-none absolute -bottom-16 -left-16 h-52 w-72 text-[var(--studio-accent-text)]/20" />
                            <p className="relative mb-2 text-xs font-bold text-[var(--studio-accent-text)]">היומן מתעדכן</p>
                            <h2 className="relative mb-3 text-2xl font-bold leading-tight">אין כרגע אימונים זמינים בלוח.</h2>
                            <p className="relative max-w-xs text-sm leading-relaxed text-[#cbd3aa]">
                                ברגע שייפתחו אימונים נוספים לשבוע הקרוב, תוכלי להירשם כאן בלחיצה.
                            </p>
                            <button
                                type="button"
                                onClick={() => void fetchSessions(true)}
                                className="studio-tap-feedback relative mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--studio-accent-text)] px-5 text-xs font-bold text-[var(--studio-ink)] shadow-md"
                            >
                                <RotateCw className="h-3.5 w-3.5" /> רענון לוח
                            </button>
                        </div>
                    ) : filteredSessions.length === 0 ? (
                        /* Filtered Empty State */
                        <div className="rounded-[1.75rem] border border-dashed border-[var(--studio-ink)]/15 bg-white/60 p-7 text-center">
                            <CalendarDays className="mx-auto h-8 w-8 text-[var(--studio-muted)] mb-3" />
                            <h3 className="text-base font-bold text-[var(--studio-ink)]">
                                {filterStatus === "registered"
                                    ? "אין לך הרשמות בסינון זה"
                                    : "לא נמצאו אימונים ביום או בסינון שנבחר"}
                            </h3>
                            <p className="mt-1 text-xs text-[var(--studio-muted)]">
                                {filterStatus === "registered"
                                    ? "בחרי אימון מתוך הלוח ושמרי לעצמך מקום."
                                    : "נסי לבחור יום אחר או להציג את כל אימוני השבוע."}
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    if (navigator.vibrate) navigator.vibrate(8);
                                    setSelectedDateKey(null);
                                    setFilterStatus("all");
                                }}
                                className="studio-tap-feedback mt-4 inline-flex min-h-10 items-center justify-center rounded-full bg-[var(--studio-deep)] px-4 text-xs font-bold text-[var(--studio-deep-contrast)]"
                            >
                                הצגת כל השבוע
                            </button>
                        </div>
                    ) : (
                        /* Cards List */
                        <div className="space-y-3.5">
                            {filteredSessions.map((session) => {
                                const info = formatSessionInfo(session.start_time, session.end_time);
                                const isFull = (session.current_bookings || 0) >= session.max_capacity;
                                const spotsLeft = Math.max(0, session.max_capacity - (session.current_bookings || 0));
                                const isAlmostFull = spotsLeft <= 2 && spotsLeft > 0;
                                const isBookingThis = bookingId === session.id;

                                return (
                                    <article
                                        key={session.id}
                                        className={`relative overflow-hidden rounded-[1.75rem] border transition-all ${
                                            session.isRegistered
                                                ? "border-[#203123] bg-gradient-to-br from-[#162218] via-[#1c2c1f] to-[#142016] text-[#f6f6ed] shadow-[0_8px_24px_rgba(22,34,24,0.14)]"
                                                : isFull
                                                ? "border-[var(--studio-ink)]/8 bg-[var(--studio-card)]/80 text-[var(--studio-ink)] opacity-75"
                                                : "border-[var(--studio-ink)]/10 bg-[var(--studio-card)] text-[var(--studio-ink)] shadow-[0_4px_16px_rgba(22,34,24,0.04)]"
                                        }`}
                                    >
                                        <div className="p-4.5">
                                            {/* Top Status Header */}
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                {/* Date & Relative Day Badge */}
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                                        session.isRegistered
                                                            ? "bg-[var(--studio-accent-bg)]/35 text-[var(--studio-accent-text)]"
                                                            : "bg-[var(--studio-neutral-bg)] text-[var(--studio-ink)]"
                                                    }`}>
                                                        {info.relativeDay} · {info.day} {info.month}
                                                    </span>
                                                    <span className={`text-[11px] font-medium ${session.isRegistered ? "text-[#cbd3aa]" : "text-[var(--studio-muted)]"}`}>
                                                        {info.durationMinutes} דק׳
                                                    </span>
                                                </div>

                                                {/* Spots / Registration Status Pill */}
                                                {session.isRegistered ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--studio-accent-text)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--studio-ink)] shadow-sm">
                                                        <Check className="h-3 w-3 stroke-[3]" />
                                                        המקום שלך שמור
                                                    </span>
                                                ) : isFull ? (
                                                    <span className="rounded-full bg-[var(--studio-neutral-bg)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--studio-muted)]">
                                                        האימון מלא
                                                    </span>
                                                ) : isAlmostFull ? (
                                                    <span className="studio-urgency-badge inline-flex items-center gap-1 rounded-full bg-[var(--studio-coral-bg)] px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                                                        <Flame className="h-3 w-3 fill-current" />
                                                        נותרו {spotsLeft} מקומות!
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full border border-[var(--studio-brand)]/40 bg-[var(--studio-brand)]/15 px-2.5 py-0.5 text-[11px] font-bold text-[var(--studio-brand)]">
                                                        נותרו {spotsLeft} מקומות
                                                    </span>
                                                )}
                                            </div>

                                            {/* Workout Identity & Clock Block */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-[1.2rem] font-bold leading-snug tracking-tight break-words">
                                                        {session.title}
                                                    </h3>
                                                    {session.description && (
                                                        <p className={`mt-1 text-xs line-clamp-2 leading-relaxed ${session.isRegistered ? "text-[#b8c7ae]" : "text-[var(--studio-muted)]"}`}>
                                                            {session.description}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Large Time Pill (Isolated LTR for correct numeric display) */}
                                                <div className={`shrink-0 rounded-2xl p-2.5 text-center ${
                                                    session.isRegistered
                                                        ? "bg-white/10 text-white"
                                                        : "bg-[var(--studio-deep)] text-[var(--studio-deep-contrast)]"
                                                }`}>
                                                    <div className="text-base font-bold tabular-nums leading-none" dir="ltr">
                                                        {info.startTime}
                                                    </div>
                                                    <div className="mt-1 text-[10px] font-medium opacity-80" dir="ltr">
                                                        {info.endTime}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Capacity Dots Indicator */}
                                            <div className="mt-3.5 flex items-center justify-between border-t border-black/5 pt-3 text-xs">
                                                <div className="flex items-center gap-1.5" aria-hidden="true">
                                                    {Array.from({ length: Math.min(10, session.max_capacity) }).map((_, idx) => {
                                                        const isFilled = idx < (session.current_bookings || 0);
                                                        return (
                                                            <span
                                                                key={idx}
                                                                className={`studio-capacity-dot ${
                                                                    session.isRegistered
                                                                        ? isFilled
                                                                            ? "bg-[var(--studio-accent-text)]"
                                                                            : "bg-white/20"
                                                                        : isFilled
                                                                        ? isAlmostFull
                                                                            ? "bg-[var(--studio-coral-bg)]"
                                                                            : "bg-[var(--studio-brand)]"
                                                                        : "bg-[var(--studio-ink)]/15"
                                                                }`}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                                <span className={`text-[11px] font-semibold tabular-nums ${session.isRegistered ? "text-[#cbd3aa]" : "text-[var(--studio-muted)]"}`}>
                                                    {session.current_bookings || 0} מתוך {session.max_capacity} מתאמנות
                                                </span>
                                            </div>
                                        </div>

                                        {/* Bottom Action Footer */}
                                        {session.isRegistered ? (
                                            <div className="flex border-t border-white/10 bg-white/[0.04]">
                                                <button
                                                    type="button"
                                                    onClick={(e) => addToCalendar(e, session)}
                                                    className="studio-tap-feedback flex min-h-12 flex-1 items-center justify-center gap-2 px-3 text-xs font-bold text-white transition-colors active:bg-white/10"
                                                >
                                                    <CalendarPlus aria-hidden="true" className="h-4 w-4 text-[var(--studio-accent-text)]" />
                                                    <span>הוספה ליומן</span>
                                                </button>
                                                <div className="w-px bg-white/10" />
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (navigator.vibrate) navigator.vibrate(10);
                                                        setSessionToCancel(session);
                                                    }}
                                                    className="studio-tap-feedback flex min-h-12 flex-1 items-center justify-center gap-2 px-3 text-xs font-bold text-[var(--studio-coral-text)] transition-colors active:bg-white/10"
                                                >
                                                    <X aria-hidden="true" className="h-4 w-4" />
                                                    <span>ביטול הרשמה</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="border-t border-[var(--studio-ink)]/8 bg-white/50 p-2.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (isFull || loadError || isBookingThis) return;
                                                        if (navigator.vibrate) navigator.vibrate(10);
                                                        setSessionForBooking(session);
                                                    }}
                                                    disabled={isFull || loadError || isBookingThis}
                                                    className={`studio-tap-feedback flex min-h-12 w-full items-center justify-between rounded-2xl px-4 text-xs font-bold transition-all ${
                                                        isFull
                                                            ? "bg-[var(--studio-neutral-bg)] text-[var(--studio-muted)] cursor-not-allowed"
                                                            : "bg-[var(--studio-deep)] text-[var(--studio-deep-contrast)] shadow-md shadow-[#162218]/15 active:bg-[#203123]"
                                                    }`}
                                                >
                                                    <span>
                                                        {isBookingThis
                                                            ? "רושמים אותך..."
                                                            : isFull
                                                            ? "האימון מלא"
                                                            : "שמרי לי מקום"}
                                                    </span>

                                                    {isBookingThis ? (
                                                        <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                    ) : !isFull ? (
                                                        <ArrowLeft aria-hidden="true" className="h-4 w-4 text-[var(--studio-accent-text)]" />
                                                    ) : null}
                                                </button>
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* 5. Native iOS/Android Bottom Sheet: Booking Confirmation Modal */}
            <AnimatePresence>
                {sessionForBooking && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSessionForBooking(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={reduceMotion ? false : { y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="book-modal-title"
                            className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[2.2rem] bg-[var(--studio-card)] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 text-[var(--studio-ink)] shadow-2xl"
                        >
                            {/* Grabber Notch */}
                            <div className="studio-sheet-notch mx-auto my-2" />

                            <div className="flex items-center justify-between pb-3 pt-2">
                                <div>
                                    <p className="text-[11px] font-bold text-[var(--studio-brand)]">סטודיו טליה</p>
                                    <h2 id="book-modal-title" className="text-xl font-bold">הרשמה לאימון</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSessionForBooking(null)}
                                    className="studio-tap-feedback flex h-9 w-9 items-center justify-center rounded-full border border-[var(--studio-ink)]/12 bg-white/70"
                                    aria-label="סגירה"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Session Detail Card */}
                            <div className="mt-3 rounded-2xl bg-[var(--studio-deep)] p-4 text-[var(--studio-deep-contrast)] shadow-inner">
                                <span className="text-[11px] font-bold text-[var(--studio-accent-text)]">
                                    {formatSessionInfo(sessionForBooking.start_time, sessionForBooking.end_time).relativeDay} ·{" "}
                                    {formatSessionInfo(sessionForBooking.start_time, sessionForBooking.end_time).weekday}
                                </span>
                                <h3 className="mt-1 text-lg font-bold leading-tight">{sessionForBooking.title}</h3>
                                <div className="mt-3 flex items-center justify-between text-xs text-[#cbd3aa]">
                                    <span className="flex items-center gap-1">
                                        <Clock3 className="h-3.5 w-3.5" />
                                        {formatSessionInfo(sessionForBooking.start_time, sessionForBooking.end_time).startTime} -{" "}
                                        {formatSessionInfo(sessionForBooking.start_time, sessionForBooking.end_time).endTime}
                                    </span>
                                    <span>מדריכה: טליה</span>
                                </div>
                            </div>

                            {/* Ticket Balance & Policy Notice */}
                            <div className="mt-4 space-y-2.5">
                                <div className="flex items-start gap-2.5 rounded-2xl bg-[var(--studio-neutral-bg)]/80 p-3 text-xs leading-relaxed">
                                    <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-[var(--studio-coral-bg)]" />
                                    <div>
                                        <p className="font-bold">ניצול כרטיסייה</p>
                                        <p className="text-[var(--studio-muted)]">
                                            {tickets > 0
                                                ? `יירד כרטיס 1 מיתרתך (יישארו לך ${tickets - 1} כרטיסיות).`
                                                : subscription?.is_active
                                                ? "האימון כלול במסגרת המנוי הפעיל שלך."
                                                : "אין לך כרטיסיות זמינות. תוכלי לרכוש כרטיסייה חדשה כעת."}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2.5 rounded-2xl bg-white p-3 text-xs leading-relaxed border border-[var(--studio-ink)]/8">
                                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--studio-brand)]" />
                                    <div>
                                        <p className="font-bold">מדיניות ביטולים הוגנת</p>
                                        <p className="text-[var(--studio-muted)]">
                                            ניתן לבטל ללא עלות עד 10 שעות לפני תחילת האימון, והכרטיסייה תוחזר ליתרתך.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-6 flex flex-col gap-2.5">
                                {tickets > 0 || subscription?.is_active ? (
                                    <button
                                        type="button"
                                        onClick={() => handleBook(sessionForBooking.id)}
                                        disabled={Boolean(bookingId)}
                                        className="studio-tap-feedback flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--studio-deep)] px-4 text-sm font-bold text-[var(--studio-deep-contrast)] shadow-lg shadow-[#162218]/20 active:bg-[#203123]"
                                    >
                                        {bookingId === sessionForBooking.id ? (
                                            <>
                                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                <span>רושמים אותך...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Check className="h-4 w-4 text-[var(--studio-accent-text)]" />
                                                <span>אישור והרשמה לאימון</span>
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <Link
                                        href="/subscription"
                                        className="studio-tap-feedback flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--studio-coral-bg)] px-4 text-sm font-bold text-white shadow-lg active:brightness-95"
                                    >
                                        <Ticket className="h-4 w-4" />
                                        <span>לרכישת כרטיסייה / מנוי</span>
                                    </Link>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setSessionForBooking(null)}
                                    className="studio-tap-feedback flex min-h-11 w-full items-center justify-center rounded-2xl border border-[var(--studio-ink)]/12 px-4 text-xs font-bold text-[var(--studio-muted)]"
                                >
                                    חזרה ללוח
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 6. Native iOS/Android Bottom Sheet: Cancellation Modal */}
            <AnimatePresence>
                {sessionToCancel && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSessionToCancel(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={reduceMotion ? false : { y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="cancel-booking-title"
                            className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[2.2rem] bg-[var(--studio-card)] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 text-[var(--studio-ink)] shadow-2xl"
                        >
                            {/* Grabber Notch */}
                            <div className="studio-sheet-notch mx-auto my-2" />

                            <div className="flex items-center justify-between pb-2 pt-2">
                                <div>
                                    <p className="text-[11px] font-bold text-[var(--studio-danger)]">ביטול הרשמה</p>
                                    <h2 id="cancel-booking-title" className="text-xl font-bold">לבטל את ההרשמה?</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSessionToCancel(null)}
                                    className="studio-tap-feedback flex h-9 w-9 items-center justify-center rounded-full border border-[var(--studio-ink)]/12 bg-white/70"
                                    aria-label="סגירה"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Session Detail Card */}
                            <div className="mt-3 rounded-2xl bg-[var(--studio-deep)] p-4 text-[var(--studio-deep-contrast)]">
                                <span className="text-[11px] font-bold text-[var(--studio-accent-text)]">
                                    האימון שיתפנה
                                </span>
                                <h3 className="mt-1 text-lg font-bold leading-tight">{sessionToCancel.title}</h3>
                                <p className="mt-2 text-xs text-[#cbd3aa]">
                                    {formatSessionInfo(sessionToCancel.start_time, sessionToCancel.end_time).weekday} ·{" "}
                                    {formatSessionInfo(sessionToCancel.start_time, sessionToCancel.end_time).startTime}
                                </p>
                            </div>

                            <p className="mt-4 text-xs leading-relaxed text-[var(--studio-muted)]">
                                המקום שלך יתפנה למתאמנת אחרת, והכרטיסייה תוחזר מיידית לחשבונך.
                            </p>

                            {/* Dual Buttons */}
                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSessionToCancel(null)}
                                    className="studio-tap-feedback flex min-h-12 items-center justify-center rounded-2xl bg-[var(--studio-deep)] px-3 text-xs font-bold text-[var(--studio-deep-contrast)] shadow-md"
                                >
                                    להישאר רשומה
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmCancel}
                                    className="studio-tap-feedback flex min-h-12 items-center justify-center rounded-2xl border border-[var(--studio-danger)]/30 bg-[var(--studio-danger)]/10 px-3 text-xs font-bold text-[var(--studio-danger)] active:bg-[var(--studio-danger)]/20"
                                >
                                    כן, לבטל
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
