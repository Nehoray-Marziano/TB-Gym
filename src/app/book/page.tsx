"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGymStore } from "@/providers/GymStoreProvider";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, MapPin, ChevronRight, Check, CalendarPlus, X, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type Session = {
    id: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    max_capacity: number;
    current_bookings?: number;
    isRegistered?: boolean;
};

export default function BookingPage() {
    const supabase = createClient();
    const router = useRouter();
    const { toast } = useToast();

    // Using Cached Data!
    const { sessions, loading, refreshData, cancelBooking } = useGymStore(); // <-- NEW (No waiting for fetch!)
    const [bookingId, setBookingId] = useState<string | null>(null);

    // No useEffect needed for fetching! Data is already here.


    const handleBook = async (sessionId: string) => {
        setBookingId(sessionId);
        const { data, error } = await supabase.rpc("book_session", { session_id: sessionId });

        if (error) {
            toast({ title: "שגיאה", description: error.message, type: "error" });
        } else if (data && !data.success) {
            toast({ title: "לא ניתן להירשם", description: data.message, type: "error" });
        } else {
            await refreshData(); // Refresh global store to update credits & registration status everywhere
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

    return (
        <div className="min-h-screen bg-background text-foreground p-6 pb-32 font-sans selection:bg-primary selection:text-black">
            {/* Background Ambient Light */}
            <div className="fixed top-[-10%] right-[-10%] w-[300px] h-[300px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Header */}
            <header className="flex items-center gap-4 mb-8 sticky top-0 z-30 bg-background/80 backdrop-blur-md py-4 -mx-6 px-6">
                <button onClick={() => router.back()} className="w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center hover:bg-muted/10 transition-colors">
                    <ChevronRight className="w-5 h-5 text-foreground" />
                </button>
                <h1 className="text-2xl font-black tracking-tight text-foreground">הירשמי לאימון 📅</h1>
            </header>

            {loading ? (
                <div className="flex justify-center mt-20">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
                            const isFull = (session.current_bookings || 0) >= session.max_capacity;

                            // Calendar Event Generator
                            const addToCalendar = (e: React.MouseEvent) => {
                                e.stopPropagation();
                                const start = new Date(session.start_time).toISOString().replace(/-|:|\.\d+/g, "");
                                const end = new Date(session.end_time).toISOString().replace(/-|:|\.\d+/g, "");
                                const title = encodeURIComponent(`אימון ${session.title} - Talia Gym`);
                                const location = encodeURIComponent("סטודיו טליה");
                                const details = encodeURIComponent(session.description || "אימון בסטודיו טליה");

                                const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:אימון ${session.title} - Talia Gym
DESCRIPTION:${session.description || ""}
LOCATION:סטודיו טליה
END:VEVENT
END:VCALENDAR`;

                                const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
                                const link = document.createElement('a');
                                link.href = window.URL.createObjectURL(blob);
                                link.setAttribute('download', `workout-${session.id}.ics`);
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            };

                            const handleCancel = async (e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (!confirm("האם את בטוחה שברצונך לבטל את האימון?")) return;

                                const result = await cancelBooking(session.id);
                                if (result.success) {
                                    toast({ title: "האימון בוטל", description: "הזיכוי הוחזר לחשבונך", type: "success" });
                                } else {
                                    toast({ title: "לא ניתן לבטל", description: result.message, type: "error" });
                                }
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
                                            <span className="text-xl font-black leading-none">{date.day}</span>
                                            <span className="text-xs font-bold uppercase opacity-80">{date.month}</span>
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-lg font-bold mb-1 text-foreground flex items-center gap-2">
                                                    {session.title}
                                                    <span className="text-[10px] font-black bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20">
                                                        מלא
                                                    </span>
                                                </h3>
                                                {session.isRegistered && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={addToCalendar}
                                                            className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                                                            title="הוספה ליומן"
                                                        >
                                                            <CalendarPlus className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={handleCancel}
                                                            className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-red-500 hover:border-red-500 transition-colors"
                                                            title="ביטול הרשמה"
                                                        >
                                                            <X className="w-4 h-4" />
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
                                                ? "bg-green-500/10 text-green-600 cursor-default border border-green-500/20"
                                                : isFull
                                                    ? "bg-muted text-muted-foreground cursor-not-allowed border border-transparent"
                                                    : "bg-foreground text-background hover:bg-primary hover:text-black hover:scale-[1.02] shadow-lg active:scale-95"
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
        </div>
    );
}
