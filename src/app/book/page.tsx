"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useGymStore, type Session } from "@/providers/GymStoreProvider";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Clock, MapPin, ChevronRight, Check, CalendarPlus, X, AlertCircle, Sparkles } from "lucide-react";
import { getRelativeTimeHebrew } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import gsap from "gsap";

export default function BookingPage() {
    const supabase = getSupabaseClient();
    const router = useRouter();
    const { toast } = useToast();

    const { refreshData, cancelBooking: globalCancel } = useGymStore();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingId, setBookingId] = useState<string | null>(null);
    const [isAnimated, setIsAnimated] = useState(false);

    // GSAP Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const sessionsRef = useRef<HTMLDivElement>(null);

    const fetchSessions = async () => {
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
                const sessionsWithStatus = sessionData.map((session: any) => ({
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
    };

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
    }, []);

    // GSAP Entrance Animations - runs once after initial data load
    useEffect(() => {
        if (loading || isAnimated || sessions.length === 0) return;

        // Small delay to ensure DOM is fully painted and stable
        const timeoutId = setTimeout(() => {
            if (!sessionsRef.current) return;

            const cards = sessionsRef.current.querySelectorAll('.session-card');
            if (cards.length === 0) return;

            // Animate cards in with stagger
            gsap.fromTo(cards,
                {
                    opacity: 0,
                    y: 20
                },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.25, // Faster (was 0.35)
                    stagger: 0.04, // Faster stagger (was 0.05)
                    ease: "power2.out",
                    onComplete: () => setIsAnimated(true)
                }
            );
        }, 100); // 100ms delay for DOM stability

        return () => clearTimeout(timeoutId);
    }, [loading, isAnimated, sessions.length]);

    const handleBook = async (sessionId: string) => {
        setBookingId(sessionId);

        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(10);

        const { data, error } = await supabase.rpc("book_session", { session_id: sessionId });

        if (error) {
            toast({ title: "שגיאה", description: error.message, type: "error" });
        } else if (data && !data.success) {
            toast({ title: "לא ניתן להירשם", description: data.message, type: "error" });
        } else {
            // Success animation
            if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
            await refreshData();
            await fetchSessions();
            toast({ title: "נרשמת בהצלחה! 🎉", description: "נתראה באימון", type: "success" });
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
        } else {
            setSessions(prevSessions);
            toast({ title: "לא ניתן לבטל", description: result.message, type: "error" });
        }
        setSessionToCancel(null);
    };

    return (
        <div ref={containerRef} className="min-h-[100dvh] bg-background text-foreground p-6 pb-32 font-sans">
            {/* Ambient background */}
            <div className="fixed top-0 left-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="fixed bottom-1/4 right-0 w-[200px] h-[200px] bg-primary/3 rounded-full blur-[80px] pointer-events-none" />

            {/* Header */}
            <header className="flex items-center gap-4 mb-8 sticky top-0 z-30 bg-background/80 backdrop-blur-xl py-4 -mx-6 px-6 border-b border-border/50">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center active:scale-95 transition-all hover:border-primary/50 hover:bg-card/80"
                >
                    <ChevronRight className="w-5 h-5 text-foreground" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        הירשמי לאימון
                        <span className="text-2xl">📅</span>
                    </h1>
                    <p className="text-xs text-muted-foreground font-medium">{sessions.length} אימונים זמינים</p>
                </div>
            </header>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="p-5 rounded-[2rem] border border-border bg-card/40 h-44 flex gap-5 shimmer-skeleton" style={{ animationDelay: `${i * 0.1}s` }}>
                            <div className="w-16 h-16 bg-muted/20 rounded-2xl shrink-0" />
                            <div className="flex-1 space-y-3">
                                <div className="h-6 w-3/4 bg-muted/20 rounded-lg" />
                                <div className="h-4 w-1/2 bg-muted/20 rounded-lg" />
                                <div className="h-10 w-full bg-muted/20 rounded-xl mt-4" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : sessions.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-20 px-6 bg-card/40 rounded-3xl border border-dashed border-border"
                >
                    <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <p className="text-xl font-bold text-foreground mb-2">אין אימונים השבוע</p>
                    <p className="text-muted-foreground text-sm">חזרי להתעדכן ביום ראשון! 🌟</p>
                </motion.div>
            ) : (
                <div ref={sessionsRef} className="space-y-4">
                    {sessions.map((session, index) => {
                        const date = formatDate(session.start_time);
                        const isFull = (session.current_bookings || 0) >= session.max_capacity;
                        const spotsLeft = session.max_capacity - (session.current_bookings || 0);
                        const isAlmostFull = spotsLeft <= 2 && spotsLeft > 0;

                        const addToCalendar = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (navigator.vibrate) navigator.vibrate(10);

                            const title = `אימון ${session.title} - Talia Gym`;
                            const location = "סטודיו טליה";
                            const description = session.description || "אימון בסטודיו טליה";
                            const start = new Date(session.start_time);
                            const end = new Date(session.end_time);

                            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

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
                                link.setAttribute('download', 'workout.ics');
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
                            <div
                                key={session.id}
                                style={{ opacity: isAnimated ? 1 : 0 }}
                                className={`session-card group relative p-5 rounded-[2rem] border transition-all duration-300
                                    ${session.isRegistered
                                        ? "bg-primary/5 border-primary/30 hover:border-primary/50"
                                        : isFull
                                            ? "bg-muted/30 border-border opacity-70"
                                            : "bg-card/60 border-border hover:border-primary/30 hover:bg-card/80"
                                    }`}
                            >
                                {/* Almost full badge */}
                                {isAlmostFull && !session.isRegistered && (
                                    <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg animate-pulse">
                                        <Sparkles className="w-3 h-3" />
                                        נשארו {spotsLeft} מקומות!
                                    </div>
                                )}

                                <div className="flex gap-5">
                                    <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl shrink-0 transition-all
                                        ${session.isRegistered
                                            ? "bg-primary text-black shadow-lg shadow-primary/30"
                                            : isFull
                                                ? "bg-muted text-muted-foreground"
                                                : "bg-muted/20 text-foreground group-hover:bg-primary/20"}`}>
                                        <span className="text-xl font-bold leading-none">{date.day}</span>
                                        <span className="text-xs font-bold uppercase opacity-80">{date.month}</span>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-lg font-bold mb-1 text-foreground flex items-center gap-2 group-hover:text-primary transition-colors">
                                                {session.title}
                                                {isFull && !session.isRegistered && (
                                                    <span className="text-[10px] font-bold bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20">
                                                        מלא
                                                    </span>
                                                )}
                                            </h3>
                                            {session.isRegistered && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={addToCalendar}
                                                        className="w-10 h-10 rounded-full bg-black text-[#E2F163] flex items-center justify-center shadow-md active:scale-95 transition-transform hover:shadow-lg"
                                                    >
                                                        <CalendarPlus className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={handleCancelClick}
                                                        className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shadow-md active:scale-95 transition-transform hover:bg-red-200"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-1 text-sm text-muted-foreground font-medium my-2">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3 h-3" />
                                                {date.weekday}, {date.time}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-3 h-3" />
                                                {getRelativeTimeHebrew(session.start_time)} • {session.current_bookings || 0}/{session.max_capacity} מוזמנים
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => !session.isRegistered && !isFull && handleBook(session.id)}
                                    disabled={bookingId === session.id || (isFull && !session.isRegistered) || session.isRegistered}
                                    className={`w-full mt-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all
                                        ${session.isRegistered
                                            ? "bg-green-100 text-green-700 border border-green-200"
                                            : isFull
                                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                                : "bg-black text-white shadow-lg hover:shadow-xl hover:bg-neutral-800 active:scale-[0.98]"
                                        }`}
                                >
                                    {session.isRegistered
                                        ? <><Check className="w-4 h-4" /> נרשמת לאימון זה</>
                                        : bookingId === session.id
                                            ? <span className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                מבצע רישום...
                                            </span>
                                            : isFull
                                                ? "האימון מלא"
                                                : "שרייני מקום →"}
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Confirmation Modal */}
            <AnimatePresence>
                {sessionToCancel && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSessionToCancel(null)}
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ translateY: "100%", opacity: 0 }}
                            animate={{ translateY: "0%", opacity: 1 }}
                            exit={{ translateY: "100%", opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-2xl"
                        >
                            <div className="flex flex-col items-center text-center gap-4">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", delay: 0.1 }}
                                    className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-2"
                                >
                                    <AlertCircle className="w-8 h-8 text-red-600" />
                                </motion.div>
                                <h3 className="text-2xl font-bold text-foreground">ביטול אימון?</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    האם את בטוחה שברצונך לבטל את הרישום לאימון
                                    <span className="font-bold text-foreground block mt-1">"{sessionToCancel.title}"?</span>
                                </p>

                                <div className="grid grid-cols-2 gap-3 w-full mt-4">
                                    <button
                                        onClick={() => setSessionToCancel(null)}
                                        className="py-3 rounded-xl font-bold text-foreground bg-muted active:scale-95 transition-transform hover:bg-muted/80"
                                    >
                                        חזרה
                                    </button>
                                    <button
                                        onClick={confirmCancel}
                                        className="py-3 rounded-xl font-bold text-white bg-red-600 shadow-lg active:scale-95 transition-transform hover:bg-red-700"
                                    >
                                        כן, לבטל
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Shimmer styles */}
            <style jsx>{`
                .shimmer-skeleton {
                    position: relative;
                    overflow: hidden;
                }
                .shimmer-skeleton::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(255, 255, 255, 0.05),
                        transparent
                    );
                    animation: shimmer 1.5s infinite;
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}
