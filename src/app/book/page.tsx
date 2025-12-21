"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, MapPin, ChevronRight, Check } from "lucide-react";
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
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingId, setBookingId] = useState<string | null>(null);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push("/auth/login");
            return;
        }

        const { data: sessionData, error } = await supabase
            .from("gym_sessions")
            .select("*")
            .gte("start_time", new Date().toISOString())
            .order("start_time", { ascending: true });

        if (error) {
            console.error("Error fetching sessions:", error);
            setLoading(false);
            return;
        }

        const { data: myBookings } = await supabase
            .from("bookings")
            .select("session_id, status")
            .eq("user_id", user.id)
            .in("session_id", sessionData.map(s => s.id));

        const sessionsWithStatus = sessionData.map(session => {
            const isRegistered = myBookings?.some(b => b.session_id === session.id && b.status === 'confirmed');
            return {
                ...session,
                isRegistered,
                current_bookings: 0
            };
        });

        setSessions(sessionsWithStatus);
        setLoading(false);
    };

    const handleBook = async (sessionId: string) => {
        setBookingId(sessionId);
        const { data, error } = await supabase.rpc("book_session", { session_id: sessionId });

        if (error) {
            toast({ title: "שגיאה", description: error.message, type: "error" });
        } else if (data && !data.success) {
            toast({ title: "לא ניתן להירשם", description: data.message, type: "error" });
        } else {
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, isRegistered: true } : s));
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

                            return (
                                <motion.div
                                    key={session.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`relative p-5 rounded-[2rem] border transition-all overflow-hidden group
                                        ${session.isRegistered
                                            ? "bg-primary/5 border-primary/30"
                                            : "bg-card/60 border-border hover:border-primary/20"
                                        }`}
                                >
                                    <div className="flex gap-5">
                                        {/* Date Box */}
                                        <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl shrink-0 backdrop-blur-sm
                                            ${session.isRegistered ? "bg-primary text-black" : "bg-muted/20 text-foreground"}`}>
                                            <span className="text-xl font-black leading-none">{date.day}</span>
                                            <span className="text-xs font-bold uppercase opacity-80">{date.month}</span>
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-lg font-bold mb-1 text-foreground">{session.title}</h3>
                                                {session.isRegistered && <Check className="w-5 h-5 text-primary" />}
                                            </div>

                                            <div className="flex flex-col gap-1 text-sm text-muted-foreground font-medium my-2">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3 h-3" />
                                                    {date.weekday}, {date.time}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3 h-3" />
                                                    סטודיו ראשי
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        onClick={() => !session.isRegistered && handleBook(session.id)}
                                        disabled={bookingId === session.id || isFull || session.isRegistered}
                                        className={`w-full mt-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
                                            ${session.isRegistered
                                                ? "bg-primary/10 text-primary cursor-default"
                                                : isFull
                                                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                                                    : "bg-foreground text-background hover:bg-primary hover:text-black hover:scale-[1.02] shadow-lg active:scale-95"
                                            }`}
                                    >
                                        {session.isRegistered ? "נרשמת לאימון זה" : bookingId === session.id ? "מבצע רישום..." : "שרייני מקום"}
                                    </button>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
