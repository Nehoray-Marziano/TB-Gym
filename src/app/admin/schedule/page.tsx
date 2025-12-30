"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, Trash2, Users, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { MuiTimePickerWrapper } from "@/components/ui/time-picker-mui";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { TraineeSelector, type Trainee } from "@/components/admin/trainee-selector";

type Session = {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    max_capacity: number;
    bookings: [{ count: number }];
};

type Booking = {
    id: string;
    status: string;
    created_at: string;
    users: {
        id: string;
        full_name: string;
        email: string;
        phone: string;
    }
};

export default function AdminSchedulePage() {
    const supabase = getSupabaseClient();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);

    // View Bookings State
    const [viewBookingsSession, setViewBookingsSession] = useState<Session | null>(null);
    const [sessionBookings, setSessionBookings] = useState<Booking[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(false);

    // Deletion State
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        session: Session | null;
        userCount: number;
    }>({ isOpen: false, session: null, userCount: 0 });
    const [isDeleting, setIsDeleting] = useState(false);

    // Form State
    const [newSession, setNewSession] = useState<{
        title: string;
        description: string;
        date: Date | undefined;
        time: string;
        max_capacity: number;
    }>({
        title: "",
        description: "",
        date: undefined,
        time: "08:00",
        max_capacity: 10,
    });

    // Private Session State
    const [isPrivateSession, setIsPrivateSession] = useState(false);
    // @ts-ignore
    const [selectedTrainees, setSelectedTrainees] = useState<Trainee[]>([]);
    const [showTraineeSelector, setShowTraineeSelector] = useState(false);

    const fetchSessions = async () => {
        const { data, error } = await supabase
            .from("gym_sessions")
            .select("*, bookings(count)")
            .order("start_time", { ascending: true });

        if (error) console.error(error);
        // @ts-ignore
        else setSessions(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    // ... (rest of code)

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        // Validation handled by button state, but redundant check is safe
        if (!newSession.title || !newSession.date) return;

        try {
            const [hours, minutes] = newSession.time.split(":").map(Number);
            const start = new Date(newSession.date);
            start.setHours(hours, minutes, 0, 0);
            const end = new Date(start.getTime() + 60 * 60 * 1000);

            // Determine capacity: if private, capacity equals invited count
            const finalCapacity = isPrivateSession ? selectedTrainees.length : newSession.max_capacity;

            // 1. Create Session
            const { data: sessionData, error } = await supabase.from("gym_sessions").insert({
                title: newSession.title,
                description: newSession.description,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                max_capacity: finalCapacity
            }).select("id").single();

            if (error) throw error;
            const newSessionId = sessionData.id;

            // 2. If Private, Invite Trainees
            if (isPrivateSession && selectedTrainees.length > 0) {
                const bookingsToInsert = selectedTrainees.map(t => ({
                    session_id: newSessionId,
                    user_id: t.id,
                    status: 'confirmed'
                }));

                const { error: bookingError } = await supabase.from("bookings").insert(bookingsToInsert);
                if (bookingError) console.error("Auto-booking error:", bookingError);

                for (const t of selectedTrainees) {
                    const { data: credit } = await supabase.from("user_credits").select("balance").eq("user_id", t.id).single();
                    if (credit && credit.balance > 0) {
                        await supabase.from("user_credits").update({ balance: credit.balance - 1 }).eq("user_id", t.id);
                    }
                }
            }

            setIsModalOpen(false);
            setNewSession({ title: "", description: "", date: undefined, time: "08:00", max_capacity: 10 });
            setIsPrivateSession(false);
            setSelectedTrainees([]);
            fetchSessions();
        } catch (err: any) {
            console.error(err);
            alert("שגיאה בשמירה: " + err.message);
        }
    };

    const handleDeleteClick = (session: Session) => {
        const count = session.bookings[0]?.count || 0;
        setDeleteConfirmation({ isOpen: true, session, userCount: count });
    };

    const executeDeleteSession = async () => {
        if (!deleteConfirmation.session) return;
        setIsDeleting(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
            if (profile?.role !== 'administrator') {
                alert(`שגיאה: למשתמש זה (${profile?.role}) אין הרשאות מחיקה. נדרש 'administrator'.`);
                setIsDeleting(false);
                setDeleteConfirmation({ isOpen: false, session: null, userCount: 0 });
                return;
            }
        }

        try {
            // 1. Refund Loop
            const { data: bookings } = await supabase
                .from("bookings")
                .select("user_id")
                .eq("session_id", deleteConfirmation.session.id)
                .eq("status", "confirmed");

            if (bookings && bookings.length > 0) {
                for (const booking of bookings) {
                    const { data: credit } = await supabase.from("user_credits").select("balance").eq("user_id", booking.user_id).single();
                    if (credit) {
                        await supabase.from("user_credits").update({ balance: credit.balance + 1 }).eq("user_id", booking.user_id);
                    }
                }
            }

            // 2. Delete Bookings
            const { error: bookingsError, count: deletedCount } = await supabase
                .from("bookings")
                .delete({ count: 'exact' })
                .eq("session_id", deleteConfirmation.session.id);

            if (bookingsError) throw new Error("Booking delete failed: " + bookingsError.message);

            const expectedToDelete = bookings?.length || 0;
            if (expectedToDelete > 0 && (deletedCount === null || deletedCount === 0)) {
                throw new Error("Critical: Admin cannot delete user bookings. RLS Policy required.");
            }

            // 3. Delete Session
            const { error } = await supabase.from("gym_sessions").delete().eq("id", deleteConfirmation.session.id);
            if (error) throw error;

            // Success feedback
            fetchSessions();
        } catch (err: any) {
            console.error("Delete error:", err);
            alert("שגיאה במחיקה: " + err.message);
        } finally {
            setIsDeleting(false);
            setDeleteConfirmation({ isOpen: false, session: null, userCount: 0 });
        }
    };

    const fetchBookings = async (sessionId: string) => {
        setLoadingBookings(true);
        const { data, error } = await supabase
            .from("bookings")
            .select(`id, status, created_at, user_id, users:profiles!user_id (id, full_name, email, phone)`)
            .eq("session_id", sessionId)
            .eq("status", "confirmed");

        if (error) {
            console.error(error);
            alert("שגיאה בטעינת נרשמות");
        } else {
            // @ts-ignore
            setSessionBookings(data || []);
        }
        setLoadingBookings(false);
    };

    const handleCancelBooking = async (booking: Booking & { user_id: string }) => {
        if (!confirm("האם לבטל את ההרשמה ולזכות את המנויה?")) return;
        try {
            const { data: credit } = await supabase.from("user_credits").select("balance").eq("user_id", booking.user_id).single();
            if (credit) {
                await supabase.from("user_credits").update({ balance: credit.balance + 1 }).eq("user_id", booking.user_id);
            }
            const { error } = await supabase.from("bookings").delete().eq("id", booking.id);
            if (error) throw error;
            if (viewBookingsSession) fetchBookings(viewBookingsSession.id);
            fetchSessions();
        } catch (err: any) {
            alert("שגיאה בביטול: " + err.message);
        }
    };

    return (
        <div className="pb-24 font-sans text-neutral-100">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">ניהול מערכת שעות</h1>
                    <p className="text-neutral-400 font-medium">צרי ועכני אימונים לקהילה שלך</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsModalOpen(true)}
                    className="group bg-[#E2F163] text-black px-6 py-3 rounded-2xl font-bold shadow-[0_0_30px_rgba(226,241,99,0.3)] flex items-center gap-2 hover:shadow-[0_0_40px_rgba(226,241,99,0.5)] transition-all"
                >
                    <div className="bg-black/10 rounded-full p-1 group-hover:bg-black/20 transition-colors">
                        <Plus className="w-5 h-5" />
                    </div>
                    <span>אימון חדש</span>
                </motion.button>
            </header>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-neutral-900/40 border border-neutral-800 p-6 rounded-[2rem] h-[200px] animate-pulse relative">
                            <div className="flex justify-between items-start mb-6">
                                <div className="space-y-2">
                                    <div className="h-8 w-32 bg-neutral-800 rounded-lg" />
                                    <div className="flex gap-2">
                                        <div className="h-6 w-20 bg-neutral-800 rounded-lg" />
                                        <div className="h-6 w-16 bg-neutral-800 rounded-lg" />
                                    </div>
                                </div>
                                <div className="w-10 h-10 bg-neutral-800 rounded-full" />
                            </div>
                            <div className="space-y-2 mt-8">
                                <div className="flex justify-between">
                                    <div className="h-4 w-20 bg-neutral-800 rounded" />
                                    <div className="h-4 w-10 bg-neutral-800 rounded" />
                                </div>
                                <div className="h-2 w-full bg-neutral-800 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {sessions.map((session, index) => {
                            const count = session.bookings[0]?.count || 0;
                            const fillPercent = Math.min((count / session.max_capacity) * 100, 100);
                            const isFull = count >= session.max_capacity;

                            return (
                                <motion.div
                                    key={session.id}
                                    layout
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.4, delay: index * 0.05, type: "spring" }}
                                    className="group relative bg-neutral-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-[2rem] overflow-hidden hover:bg-neutral-900/60 hover:border-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                                >
                                    {/* Glass reflection effect */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                    {/* Top Metadata */}
                                    <div className="flex justify-between items-start mb-6 relative z-10">
                                        <div>
                                            <h3 className="text-2xl font-bold text-white mb-2 leading-none">{session.title}</h3>
                                            <div className="flex items-center gap-4 text-sm font-medium text-neutral-400">
                                                <div className="flex items-center gap-1.5 bg-neutral-800/50 px-2.5 py-1 rounded-lg">
                                                    <CalendarIcon className="w-4 h-4 text-[#E2F163]" />
                                                    {new Date(session.start_time).toLocaleDateString("he-IL", { day: 'numeric', month: 'numeric' })}
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-neutral-800/50 px-2.5 py-1 rounded-lg">
                                                    <Clock className="w-4 h-4 text-[#E2F163]" />
                                                    {new Date(session.start_time).toLocaleTimeString("he-IL", { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteClick(session)}
                                            className="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-800/50 text-neutral-500 hover:bg-red-500/20 hover:text-red-500 transition-all active:scale-95"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="relative z-10 mb-6">
                                        <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-wide">
                                            <span className={isFull ? "text-red-400" : "text-[#E2F163]"}>
                                                {isFull ? "NO SEATS" : `${count} REGISTERED`}
                                            </span>
                                            <span className="text-neutral-600">{session.max_capacity} MAX</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-neutral-800/80 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${fillPercent}%` }}
                                                className={`h-full rounded-full shadow-[0_0_10px_currentColor] ${isFull ? "bg-red-500 text-red-500" : "bg-[#E2F163] text-[#E2F163]"}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        onClick={() => {
                                            setViewBookingsSession(session);
                                            fetchBookings(session.id);
                                        }}
                                        className="w-full py-3 bg-white/5 border border-white/5 hover:bg-white/10 text-neutral-200 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 group-hover:border-white/10"
                                    >
                                        <Users className="w-4 h-4 opacity-50" />
                                        ניהול נרשמות
                                    </button>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Empty State */}
            {!loading && sessions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 text-center opacity-60">
                    <div className="w-24 h-24 bg-neutral-800 rounded-full flex items-center justify-center text-4xl mb-6 grayscale">🧘‍♀️</div>
                    <h3 className="text-xl font-bold text-white mb-2">אין אימונים השבוע</h3>
                    <p className="text-neutral-500">הלוח ריק, זה הזמן להוסיף קצת אנרגיה!</p>
                </div>
            )}

            {/* CREATE MODAL */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ scale: 0.95, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 20, opacity: 0 }}
                            className="bg-[#1A1C19] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-lg relative z-10 shadow-2xl"
                        >
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 left-6 p-2 bg-neutral-800/50 rounded-full hover:bg-neutral-700 transition-colors">
                                <X className="w-5 h-5 text-neutral-400" />
                            </button>

                            <h2 className="text-3xl font-bold text-white mb-8 text-center tracking-tight">אימון חדש 🔥</h2>

                            <form onSubmit={handleCreate} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest mr-1">שם השיעור</label>
                                    <input
                                        type="text"
                                        value={newSession.title}
                                        onChange={e => setNewSession({ ...newSession, title: e.target.value })}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#E2F163] focus:ring-1 focus:ring-[#E2F163]/50 transition-all font-bold text-lg"
                                        placeholder="לדוגמה: פונקציונלי חזק"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest mr-1">תאריך</label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant={"outline"} className="w-full h-14 rounded-2xl bg-neutral-900 border-neutral-800 text-white hover:bg-neutral-800 hover:text-white justify-between px-4 text-base font-medium">
                                                    {newSession.date ? format(newSession.date, "dd/MM/yyyy") : <span className="text-neutral-500">בחרי תאריך</span>}
                                                    <CalendarIcon className="h-4 w-4 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 border-neutral-800 bg-[#1A1C19]" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={newSession.date}
                                                    onSelect={(d) => d && setNewSession({ ...newSession, date: d })}
                                                    initialFocus
                                                    className="rounded-xl border border-neutral-800"
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest mr-1">שעה</label>
                                        <MuiTimePickerWrapper
                                            value={newSession.time}
                                            onChange={(t: string) => setNewSession({ ...newSession, time: t })}
                                        />
                                    </div>
                                </div>


                                <div className="space-y-4">
                                    <div className="bg-neutral-900 border border-neutral-800 p-1.5 rounded-2xl flex relative overflow-hidden">
                                        {/* Toggle Background Animation */}
                                        <motion.div
                                            initial={false}
                                            animate={{ x: isPrivateSession ? "0%" : "100%" }}
                                            className="absolute w-1/2 h-full top-0 left-0 p-1.5"
                                        >
                                            <div className="w-full h-full bg-[#E2F163] rounded-xl shadow-lg" />
                                        </motion.div>

                                        <button
                                            type="button"
                                            onClick={() => setIsPrivateSession(false)}
                                            className={cn("flex-1 py-3 text-sm font-bold rounded-xl relative z-10 transition-colors", !isPrivateSession ? "text-black" : "text-neutral-500 hover:text-white")}
                                        >
                                            הרשמה פתוחה
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsPrivateSession(true)}
                                            className={cn("flex-1 py-3 text-sm font-bold rounded-xl relative z-10 transition-colors", isPrivateSession ? "text-black" : "text-neutral-500 hover:text-white")}
                                        >
                                            בחירת מתאמנות
                                        </button>
                                    </div>

                                    {!isPrivateSession ? (
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest mr-1">מקסימום נרשמות</label>
                                            <div className="flex items-center gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-2 pl-4">
                                                <div className="flex-1 text-right mr-2 font-bold text-white text-lg">{newSession.max_capacity}</div>
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={() => setNewSession(p => ({ ...p, max_capacity: Math.max(1, p.max_capacity - 1) }))} className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center font-bold transition-colors">-</button>
                                                    <button type="button" onClick={() => setNewSession(p => ({ ...p, max_capacity: p.max_capacity + 1 }))} className="w-10 h-10 rounded-xl bg-[#E2F163] text-black hover:bg-[#d4e450] flex items-center justify-center font-bold transition-colors">+</button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest mr-1">מוזמנות ({selectedTrainees.length})</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowTraineeSelector(true)}
                                                    className="text-[#E2F163] text-xs font-bold hover:underline"
                                                >
                                                    {selectedTrainees.length > 0 ? "עריכה" : "בחירה"}
                                                </button>
                                            </div>
                                            {selectedTrainees.length === 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowTraineeSelector(true)}
                                                    className="w-full bg-neutral-900 border border-dashed border-neutral-700 hover:border-[#E2F163] hover:bg-neutral-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all group"
                                                >
                                                    <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center group-hover:bg-[#E2F163] transition-colors">
                                                        <Users className="w-5 h-5 text-neutral-400 group-hover:text-black" />
                                                    </div>
                                                    <span className="text-sm font-bold text-neutral-400 group-hover:text-white">לחצי להוספת מתאמנות</span>
                                                </button>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {selectedTrainees.map(t => (
                                                        <div key={t.id} className="bg-neutral-800 rounded-xl p-2 flex items-center gap-2 border border-white/5">
                                                            <div className="w-8 h-8 rounded-full bg-[#E2F163] text-black flex items-center justify-center font-bold text-xs shrink-0">
                                                                {t.full_name?.[0]}
                                                            </div>
                                                            <span className="text-sm text-white font-medium truncate">{t.full_name}</span>
                                                        </div>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowTraineeSelector(true)}
                                                        className="bg-neutral-900 border border-dashed border-neutral-700 rounded-xl p-2 flex items-center justify-center gap-2 text-neutral-400 hover:text-[#E2F163] hover:border-[#E2F163] transition-all text-xs font-bold"
                                                    >
                                                        + עריכה
                                                    </button>
                                                </div>
                                            )}

                                            {/* Chips Preview - could be added here if needed, but the button text/count is decent for now */}
                                        </div>
                                    )}
                                </div>

                                <button
                                    disabled={!newSession.title || !newSession.date || (isPrivateSession && selectedTrainees.length === 0)}
                                    className="w-full py-4 rounded-2xl font-bold bg-[#E2F163] text-black text-lg hover:shadow-[0_0_30px_rgba(226,241,99,0.4)] hover:scale-[1.02] transition-all active:scale-95 mt-4 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                                >
                                    פרסום אימון
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Trainee Selector Modal */}
            <AnimatePresence>
                {showTraineeSelector && (
                    <TraineeSelector
                        selectedTrainees={selectedTrainees}
                        onSelect={setSelectedTrainees}
                        onClose={() => setShowTraineeSelector(false)}
                    />
                )}
            </AnimatePresence>

            {/* View Bookings Modal - Glass Style */}
            <AnimatePresence>
                {viewBookingsSession && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setViewBookingsSession(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ scale: 0.95, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 20, opacity: 0 }}
                            className="bg-[#1A1C19] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-lg relative z-10 shadow-2xl max-h-[80vh] flex flex-col"
                        >
                            <div className="text-center mb-6 shrink-0">
                                <h2 className="text-2xl font-bold text-white mb-1">רשימת משתתפות</h2>
                                <p className="text-neutral-500 font-medium text-sm">{viewBookingsSession.title}</p>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                {loadingBookings ? (
                                    <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-[#E2F163] border-t-transparent rounded-full animate-spin" /></div>
                                ) : sessionBookings.length === 0 ? (
                                    <div className="text-center py-10 text-neutral-500 bg-neutral-900/50 rounded-2xl border border-dashed border-neutral-800">
                                        אף אחת לא נרשמה עדיין 🦗
                                    </div>
                                ) : (
                                    sessionBookings.map(booking => (
                                        <div key={booking.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex justify-between items-center group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center text-lg">👩‍</div>
                                                <div>
                                                    <p className="font-bold text-white text-sm">{booking.users?.full_name || "ללא שם"}</p>
                                                    <p className="text-xs text-neutral-500 font-mono">{booking.users?.phone}</p>
                                                </div>
                                            </div>
                                            <button
                                                // @ts-ignore
                                                onClick={() => handleCancelBooking(booking)}
                                                className="text-xs font-bold text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 px-3 py-2 rounded-lg transition-colors"
                                            >
                                                ביטול
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <button onClick={() => setViewBookingsSession(null)} className="mt-6 w-full py-3 bg-neutral-900 text-neutral-400 hover:text-white rounded-xl font-bold transition-colors">
                                סגירה
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal - Glass Style */}
            <AnimatePresence>
                {deleteConfirmation.isOpen && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setDeleteConfirmation({ isOpen: false, session: null, userCount: 0 })}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#1A1C19] border border-red-500/20 p-8 rounded-[2.5rem] w-full max-w-sm relative z-10 shadow-[0_0_50px_rgba(239,68,68,0.1)] text-center"
                        >
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl animate-pulse">⚠️</div>
                            <h2 className="text-2xl font-bold text-white mb-2">מחיקת אימון</h2>
                            <p className="text-neutral-400 mb-8 text-sm leading-relaxed">
                                {deleteConfirmation.userCount > 0
                                    ? `ישנן ${deleteConfirmation.userCount} נרשמות. המחיקה תזכה אותן אוטומטית.`
                                    : "האם את בטוחה? פעולה זו אינה הפיכה."}
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={executeDeleteSession}
                                    disabled={isDeleting}
                                    className="w-full py-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                                >
                                    {isDeleting ? "מוחק..." : "כן, למחוק"}
                                </button>
                                <button
                                    onClick={() => setDeleteConfirmation({ isOpen: false, session: null, userCount: 0 })}
                                    className="w-full py-4 text-neutral-500 hover:text-white font-bold transition-colors"
                                >
                                    ביטול
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

