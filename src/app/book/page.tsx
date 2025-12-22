"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGymStore, type Session } from "@/providers/GymStoreProvider";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, MapPin, ChevronRight, Check, CalendarPlus, X, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function BookingPage() {
    const supabase = createClient();
    const router = useRouter();
    const { toast } = useToast();

    // Using Cached Data!
    // Using Cached Data!
    const { loading: globalLoading, refreshData, cancelBooking: globalCancel } = useGymStore();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingId, setBookingId] = useState<string | null>(null);

    const fetchSessions = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Parallel Fetch: Sessions & My Bookings
            const [sessionRes, bookingsRes] = await Promise.all([
                supabase.from("gym_sessions_with_counts").select("*").gte("start_time", new Date().toISOString()).order("start_time", { ascending: true }),
                supabase.from("bookings").select("session_id").eq("user_id", user.id).eq("status", "confirmed")
            ]);

            const sessionData = sessionRes.data;
            const myBookings = bookingsRes.data;

            if (sessionData) {
                const registeredIds = new Set(myBookings?.map(b => b.session_id));
                const sessionsWithStatus = sessionData.map(session => ({
                    ...session,
                    isRegistered: registeredIds.has(session.id),
                }));
                setSessions(sessionsWithStatus);
            }
        } catch (error) {
            console.error("Error fetching sessions:", error);
            toast({ title: "שגיאה בטעינת אימונים", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);


    const handleBook = async (sessionId: string) => {
        setBookingId(sessionId);
        const { data, error } = await supabase.rpc("book_session", { session_id: sessionId });

        if (error) {
            toast({ title: "שגיאה", description: error.message, type: "error" });
        } else if (data && !data.success) {
            toast({ title: "לא ניתן להירשם", description: data.message, type: "error" });
        } else {
            await refreshData(); // Update global credits
            await fetchSessions(); // Update local list
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

    // State for confirmation modal
    const [sessionToCancel, setSessionToCancel] = useState<Session | null>(null);

    const confirmCancel = async () => {
        if (!sessionToCancel) return;

        // Optimistic UI Update
        const prevSessions = [...sessions];
        setSessions(curr => curr.map(s => s.id === sessionToCancel.id ? { ...s, isRegistered: false, current_bookings: Math.max(0, s.current_bookings - 1) } : s));

        const result = await globalCancel(sessionToCancel.id); // Call global to update credits

        if (result.success) {
            toast({ title: "האימון בוטל", description: "הזיכוי הוחזר לחשבונך", type: "success" });
            fetchSessions(); // Re-verify with server
        } else {
            setSessions(prevSessions); // Revert
            toast({ title: "לא ניתן לבטל", description: result.message, type: "error" });
        }
        setSessionToCancel(null);
    };

    return (
        <div className="min-h-[100dvh] bg-background text-foreground p-6 pb-32 font-sans selection:bg-primary selection:text-black">
            {/* Background Ambient Light */}
            <div className="fixed top-[-10%] right-[-10%] w-[300px] h-[300px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Header */}
            <header className="flex items-center gap-4 mb-8 sticky top-0 z-30 bg-background/80 backdrop-blur-md py-4 -mx-6 px-6">
                <button onClick={() => router.back()} className="w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center hover:bg-muted/10 transition-colors">
                    <ChevronRight className="w-5 h-5 text-foreground" />
                </button>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">הירשמי לאימון 📅</h1>
            </header>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="p-5 rounded-[2rem] border border-border bg-card/40 h-40 animate-pulse flex gap-5">
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
                <div className="text-center py-20 px-6 bg-card/40 rounded-3xl border border-dashed border-border">
                    <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-bold text-foreground">אין אימונים השבוע</p>
                    <p className="text-muted-foreground text-sm mt-1">חזרי להתעדכן ביום ראשון!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <AnimatePresence>
                        {sessions.map((session, index) => {
                            const date = formatDate(session.start_time);
                            // DEBUG: Check values
                            console.log(`Session ${session.title}: Bookings=${session.current_bookings} (${typeof session.current_bookings}), Max=${session.max_capacity} (${typeof session.max_capacity})`);

                            const isFull = (session.current_bookings || 0) >= session.max_capacity;

                            // Calendar Event Generator
                            const addToCalendar = (e: React.MouseEvent) => {
                                e.stopPropagation();

                                const title = `אימון ${session.title} - Talia Gym`;
                                const location = "סטודיו טליה";
                                const description = session.description || "אימון בסטודיו טליה";
                                const start = new Date(session.start_time);
                                const end = new Date(session.end_time);

                                // 1. Check if iOS
                                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

                                if (isIOS) {
                                    // iOS: Download .ics file
                                    const startStr = start.toISOString().replace(/-|:|\.\d+/g, "");
                                    const endStr = end.toISOString().replace(/-|:|\.\d+/g, "");

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
                                    // Android / Desktop: Open Google Calendar
                                    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, "");
                                    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatDate(start)}/${formatDate(end)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;
                                    window.open(url, '_blank');
                                }
                            };

                            const handleCancelClick = (e: React.MouseEvent) => {
                                e.stopPropagation();
                                setSessionToCancel(session);
                            };

                            return (
                                <div
                                    key={session.id}
                                    className={`relative p-5 rounded-[2rem] border transition-all overflow-hidden group
                                        ${session.isRegistered
                                            ? "bg-primary/5 border-primary/30"
                                            : isFull
                                                ? "bg-muted/30 border-border opacity-70 grayscale-[0.5]" // Dimmed if full
                                                : "bg-card/60 border-border hover:border-primary/20"
                                        }`}
                                >
                                    <div className="flex gap-5">
                                        {/* Date Box */}
                                        <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl shrink-0 backdrop-blur-sm
                                            ${session.isRegistered
                                                ? "bg-primary text-black"
                                                : isFull
                                                    ? "bg-muted text-muted-foreground"
                                                    : "bg-muted/20 text-foreground"}`}>
                                            <span className="text-xl font-bold leading-none">{date.day}</span>
                                            <span className="text-xs font-bold uppercase opacity-80">{date.month}</span>
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-lg font-bold mb-1 text-foreground flex items-center gap-2">
                                                    {session.title}
                                                    {isFull && !session.isRegistered && (
                                                        <span className="text-[10px] font-bold bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20">
                                                            מלא
                                                        </span>
                                                    )}
                                                </h3>
                                                {session.isRegistered && (
                                                    <div className="flex gap-3 relative z-50 pointer-events-auto">
                                                        <button
                                                            onClick={addToCalendar}
                                                            className="w-10 h-10 rounded-full bg-black text-[#E2F163] flex items-center justify-center hover:scale-110 shadow-md transition-all cursor-pointer"
                                                            title="הוספה ליומן"
                                                        >
                                                            <CalendarPlus className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={handleCancelClick}
                                                            className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 hover:scale-110 shadow-md transition-all cursor-pointer"
                                                            title="ביטול הרשמה"
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
                                                    סטודיו ראשי
                                                    {/* Capacity Indicator for visual consistency */}
                                                    <span className="mx-1">•</span>
                                                    <span>{session.current_bookings || 0}/{session.max_capacity} רשומים</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        onClick={() => !session.isRegistered && !isFull && handleBook(session.id)}
                                        disabled={bookingId === session.id || (isFull && !session.isRegistered) || session.isRegistered}
                                        className={`w-full mt-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
                                            ${session.isRegistered
                                                ? "bg-green-100 text-green-700 cursor-default border border-green-200"
                                                : isFull
                                                    ? "bg-muted text-muted-foreground cursor-not-allowed border border-transparent"
                                                    : "bg-black text-white hover:bg-primary hover:text-black hover:scale-[1.02] shadow-lg active:scale-95"
                                            }`}
                                    >
                                        {session.isRegistered
                                            ? <><Check className="w-4 h-4" /> נרשמת לאימון זה</>
                                            : bookingId === session.id
                                                ? "מבצע רישום..."
                                                : isFull
                                                    ? "האימון מלא"
                                                    : "שרייני מקום"}
                                    </button>
                                </div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Custom Confirmation Modal */}
            <AnimatePresence>
                {sessionToCancel && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSessionToCancel(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ translateY: "100%", opacity: 0 }}
                            animate={{ translateY: "0%", opacity: 1 }}
                            exit={{ translateY: "100%", opacity: 0 }}
                            className="relative w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-2xl overflow-hidden"
                        >
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-2">
                                    <AlertCircle className="w-8 h-8 text-red-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-foreground">ביטול אימון?</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    האם את בטוחה שברצונך לבטל את הרישום לאימון
                                    <span className="font-bold text-foreground block mt-1">"{sessionToCancel.title}"?</span>
                                </p>

                                <div className="grid grid-cols-2 gap-3 w-full mt-4">
                                    <button
                                        onClick={() => setSessionToCancel(null)}
                                        className="py-3 rounded-xl font-bold text-foreground bg-muted hover:bg-muted/80 transition-colors"
                                    >
                                        חזרה
                                    </button>
                                    <button
                                        onClick={confirmCancel}
                                        className="py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20 transition-all active:scale-95"
                                    >
                                        כן, לבטל
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
