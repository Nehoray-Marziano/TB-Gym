"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, MapPin, ChevronRight, Check, CalendarPlus, X, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Mock Data
const MOCK_SESSIONS = [
    {
        id: "1",
        title: "FULL Session Test",
        description: "This session is full.",
        start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        end_time: new Date(Date.now() + 90000000).toISOString(),
        max_capacity: 10,
        current_bookings: 10, // FULL
        isRegistered: false,
    },
    {
        id: "2",
        title: "Registered Session (Calendar Test)",
        description: "You are registered.",
        start_time: new Date(Date.now() + 172800000).toISOString(), // +2 days
        end_time: new Date(Date.now() + 176400000).toISOString(),
        max_capacity: 10,
        current_bookings: 5,
        isRegistered: true,
    },
    {
        id: "3",
        title: "Cancellation Test (Late)",
        description: "Starts in 1 hour (Too late to cancel).",
        start_time: new Date(Date.now() + 3600000).toISOString(), // +1 hour
        end_time: new Date(Date.now() + 7200000).toISOString(),
        max_capacity: 10,
        current_bookings: 8,
        isRegistered: true,
    },
    {
        id: "4",
        title: "Cancellation Test (OK)",
        description: "Starts in 20 hours (Can cancel).",
        start_time: new Date(Date.now() + 72000000).toISOString(), // +20 hours
        end_time: new Date(Date.now() + 75600000).toISOString(),
        max_capacity: 10,
        current_bookings: 8,
        isRegistered: true,
    }
];

export default function TestFeaturesPage() {
    const { toast } = useToast();
    const [bookingId, setBookingId] = useState<string | null>(null);
    const [sessions, setSessions] = useState(MOCK_SESSIONS);

    // Mock Actions
    const handleBook = async (sessionId: string) => {
        setBookingId(sessionId);
        setTimeout(() => {
            toast({ title: "Mock Booking Success", description: "You booked it!", type: "success" });
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, isRegistered: true } : s));
            setBookingId(null);
        }, 1000);
    };

    const cancelBooking = async (sessionId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        const hoursUntilStart = (new Date(session!.start_time).getTime() - Date.now()) / (1000 * 60 * 60);

        if (hoursUntilStart < 10) {
            return { success: false, message: "Too late to cancel (less than 10 hours notice)" };
        }
        return { success: true, message: "Cancelled successfully" };
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
        <div className="min-h-screen bg-background text-foreground p-6 pb-32 font-sans dir-rtl">
            <h1 className="text-3xl font-bold mb-8">Feature Verification Page</h1>

            <div className="space-y-4">
                {sessions.map((session) => {
                    const date = formatDate(session.start_time);
                    const isFull = (session.current_bookings || 0) >= session.max_capacity;

                    const addToCalendar = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        alert("Calendar .ics download triggered for: " + session.title);
                    };

                    const handleCancel = async (e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (!confirm("Are you sure?")) return;

                        const result = await cancelBooking(session.id);
                        if (result.success) {
                            toast({ title: "Canceled", description: result.message, type: "success" });
                            setSessions(prev => prev.map(s => s.id === session.id ? { ...s, isRegistered: false } : s));
                        } else {
                            toast({ title: "Cancellation Failed", description: result.message, type: "error" });
                        }
                    };

                    return (
                        <div key={session.id} className={`relative p-5 rounded-[2rem] border transition-all overflow-hidden group ${session.isRegistered ? "bg-primary/5 border-primary/30" : isFull ? "bg-muted/30 border-border opacity-70 grayscale-[0.5]" : "bg-card/60 border-border"}`}>
                            <div className="flex gap-5">
                                <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl shrink-0 backdrop-blur-sm ${session.isRegistered ? "bg-primary text-black" : isFull ? "bg-muted text-muted-foreground" : "bg-muted/20 text-foreground"}`}>
                                    <span className="text-xl font-black leading-none">{date.day}</span>
                                    <span className="text-xs font-bold uppercase opacity-80">{date.month}</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-lg font-bold mb-1 text-foreground flex items-center gap-2">
                                            {session.title}
                                            {isFull && !session.isRegistered && (
                                                <span className="text-[10px] font-black bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20">FULL</span>
                                            )}
                                        </h3>
                                        {session.isRegistered && (
                                            <div className="flex gap-2">
                                                <button onClick={addToCalendar} className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                                                    <CalendarPlus className="w-4 h-4" />
                                                </button>
                                                <button onClick={handleCancel} className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-red-500 hover:border-red-500 transition-colors">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1 text-sm text-muted-foreground font-medium my-2">
                                        <div className="flex items-center gap-2"><Clock className="w-3 h-3" /> {date.weekday}, {date.time}</div>
                                        <p>{session.description}</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => !session.isRegistered && !isFull && handleBook(session.id)}
                                disabled={bookingId === session.id || (isFull && !session.isRegistered) || session.isRegistered}
                                className={`w-full mt-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${session.isRegistered ? "bg-green-500/10 text-green-600 cursor-default" : isFull ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-foreground text-background"}`}
                            >
                                {session.isRegistered ? "Registered" : isFull ? "Session Full" : "Book Now"}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
