"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

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
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingId, setBookingId] = useState<string | null>(null);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        // 0. Get User (needed to check our own bookings)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push("/auth/login");
            return;
        }

        // 1. Get upcoming sessions
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

        // 2. Fetch MY bookings (RLS ensures we only see ours)
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
                current_bookings: 0 // Placeholder until we add public counts view
            };
        });

        setSessions(sessionsWithStatus);
        setLoading(false);
    };

    const handleBook = async (sessionId: string) => {
        setBookingId(sessionId);

        const { data, error } = await supabase.rpc("book_session", { session_id: sessionId });

        if (error) {
            alert("שגיאה בהזמנה: " + error.message);
        } else if (data && !data.success) {
            alert("נכשל: " + data.message);
        } else {
            // Success - Optimistic Update
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, isRegistered: true } : s));
            alert("ההרשמה בוצעה בהצלחה! 🎉");
        }

        setBookingId(null);
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat("he-IL", {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-6 pb-24">
            <header className="flex items-center justify-between mb-8 mt-4">
                <button onClick={() => router.back()} className="text-2xl p-2 bg-neutral-900 rounded-full hover:bg-neutral-800 transition-colors">
                    ⬅️
                </button>
                <h1 className="text-2xl font-bold text-white">לוח שיעורים</h1>
                <div className="w-10"></div>
            </header>

            {loading ? (
                <div className="text-center text-neutral-500 mt-20">טוען שיעורים...</div>
            ) : sessions.length === 0 ? (
                <div className="text-center bg-neutral-900/50 p-10 rounded-3xl border border-neutral-800">
                    <p className="text-xl mb-2">אין שיעורים קרובים 🧘‍♀️</p>
                    <p className="text-neutral-500 text-sm">חזרי להתעדכן מאוחר יותר</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <AnimatePresence>
                        {sessions.map((session, index) => {
                            const isFull = (session.current_bookings || 0) >= session.max_capacity;

                            return (
                                <motion.div
                                    key={session.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`relative bg-neutral-900 border p-5 rounded-3xl flex flex-col gap-3 shadow-lg transition-all
                                        ${session.isRegistered ? "border-primary/50 bg-[#1A1C19]" : "border-neutral-800"}`}
                                >
                                    {session.isRegistered && (
                                        <div className="absolute top-4 left-4 bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                            <span>✓</span> רשומה
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{session.title}</h3>
                                            <p className="text-neutral-400 text-sm mt-1 flex items-center gap-1">
                                                <span>🗓️</span> {formatDate(session.start_time)}
                                            </p>
                                        </div>
                                    </div>

                                    {session.description && (
                                        <p className="text-neutral-500 text-sm line-clamp-2 mt-1">{session.description}</p>
                                    )}

                                    <div className="mt-2">
                                        <button
                                            onClick={() => !session.isRegistered && handleBook(session.id)}
                                            disabled={bookingId === session.id || isFull || session.isRegistered}
                                            className={`w-full py-4 rounded-xl font-bold transition-all shadow-md
                                                ${session.isRegistered
                                                    ? "bg-neutral-800 text-primary border border-neutral-700 cursor-default"
                                                    : isFull
                                                        ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                                        : "bg-primary text-black hover:bg-[#8B9A76] hover:scale-[1.02]"
                                                }`}
                                        >
                                            {session.isRegistered
                                                ? "רשומה לאימון ✅"
                                                : bookingId === session.id
                                                    ? "מבצע רישום..."
                                                    : isFull
                                                        ? "רשימת המתנה"
                                                        : "הירשמי לאימון"
                                            }
                                        </button>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
