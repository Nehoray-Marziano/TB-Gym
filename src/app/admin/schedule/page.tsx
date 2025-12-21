"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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
    const supabase = createClient();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);

    // View Bookings State
    const [viewBookingsSession, setViewBookingsSession] = useState<Session | null>(null);
    const [sessionBookings, setSessionBookings] = useState<Booking[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(false);

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

    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        session: Session | null;
        userCount: number;
    }>({ isOpen: false, session: null, userCount: 0 });
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        const { data, error } = await supabase
            .from("gym_sessions")
            .select("*, bookings(count)")
            .order("start_time", { ascending: true });

        if (error) console.error(error);
        else setSessions(data as any);
        setLoading(false);
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
            console.log("Current User Role:", profile?.role);

            // Check for 'administrator' specifically
            if (profile?.role !== 'administrator') {
                alert(`שגיאה: למשתמש זה (${profile?.role}) אין הרשאות מחיקה. נדרש 'administrator'.`);
                setIsDeleting(false);
                setDeleteConfirmation({ isOpen: false, session: null, userCount: 0 });
                return;
            }
        }

        try {
            // 1. Fetch confimed bookings to refund
            const { data: bookings } = await supabase
                .from("bookings")
                .select("user_id")
                .eq("session_id", deleteConfirmation.session.id)
                .eq("status", "confirmed");

            // 2. Refund Loop
            if (bookings && bookings.length > 0) {
                // Process sequentially to be safe
                for (const booking of bookings) {
                    const { data: credit } = await supabase
                        .from("user_credits")
                        .select("balance")
                        .eq("user_id", booking.user_id)
                        .single();

                    if (credit) {
                        await supabase
                            .from("user_credits")
                            .update({ balance: credit.balance + 1 })
                            .eq("user_id", booking.user_id);
                    }
                }
            }

            // 2.5 Delete ALL bookings for this session (Foreign Key Cleanup)
            // Using count: 'exact' to verify we actually deleted them
            const { error: bookingsError, count: deletedCount } = await supabase
                .from("bookings")
                .delete({ count: 'exact' })
                .eq("session_id", deleteConfirmation.session.id);

            if (bookingsError) {
                console.error("Error deleting bookings:", bookingsError);
                throw new Error("Booking delete failed: " + bookingsError.message);
            }

            // RLS Check: If we found bookings but deleted none, RLS is blocking us
            const expectedToDelete = bookings?.length || 0;

            if (expectedToDelete > 0 && (deletedCount === null || deletedCount === 0)) {
                console.error("RLS BLOCKING: Found bookings but deleted 0.");
                throw new Error("Critical: Admin cannot delete user bookings. RLS Policy required.");
            }

            // 3. Delete Session
            const { error } = await supabase.from("gym_sessions").delete().eq("id", deleteConfirmation.session.id);

            if (error) throw error;

            alert(`האימון נמחק ו-${bookings?.length || 0} מתאמנות זוכו!`);
            fetchSessions();
        } catch (err: any) {
            console.error("Full delete error object:", err);
            alert("שגיאה במחיקה: " + (err.message || JSON.stringify(err)));
        } finally {
            setIsDeleting(false);
            setDeleteConfirmation({ isOpen: false, session: null, userCount: 0 });
        }
    };

    const fetchBookings = async (sessionId: string) => {
        setLoadingBookings(true);
        const { data, error } = await supabase
            .from("bookings")
            .select(`
                id,
                status,
                created_at,
                user_id,
                users:profiles!user_id (id, full_name, email, phone)
            `)
            .eq("session_id", sessionId)
            .eq("status", "confirmed");

        if (error) {
            console.error("Error fetching bookings:", error);
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
            // 1. Refund
            const { data: credit } = await supabase
                .from("user_credits")
                .select("balance")
                .eq("user_id", booking.user_id)
                .single();

            if (credit) {
                await supabase
                    .from("user_credits")
                    .update({ balance: credit.balance + 1 })
                    .eq("user_id", booking.user_id);
            }

            // 2. Delete Booking
            const { error } = await supabase.from("bookings").delete().eq("id", booking.id);

            if (error) throw error;

            alert("ההרשמה בוטלה והזיכוי בוצע! 💸");
            if (viewBookingsSession) fetchBookings(viewBookingsSession.id);
            fetchSessions(); // Update counts
        } catch (err: any) {
            alert("שגיאה בביטול: " + err.message);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Validation
        if (!newSession.title) {
            alert("אנא הזיני שם לאימון");
            return;
        }
        if (!newSession.date) {
            alert("אנא בחרי תאריך");
            return;
        }

        try {
            // Combine Date + Time
            const [hours, minutes] = newSession.time.split(":").map(Number);
            const start = new Date(newSession.date);
            start.setHours(hours, minutes, 0, 0);

            const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 Hour

            console.log("Creating session:", { title: newSession.title, start, end });

            const { data, error } = await supabase.from("gym_sessions").insert({
                title: newSession.title,
                description: newSession.description,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                max_capacity: newSession.max_capacity
            }).select();

            if (error) {
                console.error("Supabase Error:", error);
                alert(`שגיאה בשמירה: ${error.message}`);
                return;
            }

            // Success
            alert("האימון נוצר בהצלחה! ⚡");
            setIsModalOpen(false);
            setNewSession({ title: "", description: "", date: undefined, time: "08:00", max_capacity: 10 });
            fetchSessions();
        } catch (err) {
            console.error("Unexpected error:", err);
            alert("אירעה שגיאה בלתי צפויה");
        }
    };

    const incrementCapacity = () => setNewSession(prev => ({ ...prev, max_capacity: prev.max_capacity + 1 }));
    const decrementCapacity = () => setNewSession(prev => ({ ...prev, max_capacity: Math.max(1, prev.max_capacity - 1) }));

    const formatTime = (iso: string) => {
        return new Date(iso).toLocaleTimeString("he-IL", { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleDateString("he-IL", { weekday: 'long', day: 'numeric', month: 'long' });
    };

    return (
        <div className="pb-20">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">ניהול מערכת שעות</h1>
                    <p className="text-neutral-400 text-sm">צרי ועכני אימונים</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary text-black px-5 py-3 rounded-2xl font-bold shadow-[0_0_20px_rgba(156,169,134,0.3)] flex items-center gap-2"
                >
                    <span className="text-xl">+</span>
                    <span className="hidden sm:inline">אימון חדש</span>
                </motion.button>
            </header>

            {loading ? (
                <div className="flex justify-center mt-20 text-primary">טוען נתונים...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {sessions.map((session, index) => {
                            const count = session.bookings[0]?.count || 0;
                            const fillPercent = Math.min((count / session.max_capacity) * 100, 100);
                            const isFull = count >= session.max_capacity;

                            return (
                                <motion.div
                                    key={session.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-neutral-900/60 border border-neutral-800 p-6 rounded-3xl relative overflow-hidden group hover:border-primary/50 transition-colors"
                                >
                                    <div className="absolute -top-10 -left-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />

                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-1">{session.title}</h3>
                                            <p className="text-neutral-400 text-sm flex items-center gap-1">
                                                <span>🗓️</span> {formatDate(session.start_time)}
                                            </p>
                                            <p className="text-neutral-400 text-sm flex items-center gap-1 mt-1">
                                                <span>⏰</span> {formatTime(session.start_time)} - {formatTime(session.end_time)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteClick(session)}
                                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-500/10 text-neutral-500 hover:text-red-500 transition-colors"
                                        >
                                            🗑️
                                        </button>
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex justify-between text-xs mb-2 font-medium">
                                            <span className={isFull ? "text-red-400" : "text-primary"}>
                                                {isFull ? "מלא" : `${count} נרשמו`}
                                            </span>
                                            <span className="text-neutral-500">מתוך {session.max_capacity}</span>
                                        </div>
                                        <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${fillPercent}%` }}
                                                className={`h-full rounded-full ${isFull ? "bg-red-500" : "bg-primary"}`}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setViewBookingsSession(session);
                                            fetchBookings(session.id);
                                        }}
                                        className="w-full mt-4 py-2 bg-neutral-800 text-neutral-300 text-sm font-medium rounded-xl hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <span>📋</span> צפייה בנרשמות
                                    </button>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}

            {
                !loading && sessions.length === 0 && (
                    <div className="text-center py-20 bg-neutral-900/30 rounded-3xl border border-dashed border-neutral-800">
                        <span className="text-4xl block mb-4">🧘‍♀️</span>
                        <p className="text-lg text-neutral-400">אין אימונים עדיין</p>
                        <button onClick={() => setIsModalOpen(true)} className="text-primary mt-2 hover:underline">צרי את הראשון</button>
                    </div>
                )
            }

            {/* Create Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, y: 50, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 50, opacity: 0 }}
                            transition={{ type: "spring", damping: 20 }}
                            className="bg-[#131512] border border-neutral-700/50 p-8 rounded-[2rem] w-full max-w-md relative z-10 shadow-2xl"
                        >
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                                    💪
                                </div>
                                <h2 className="text-2xl font-bold text-white">אימון חדש</h2>
                                <p className="text-neutral-500 text-sm">הוסיפי אימון למערכת השעות</p>
                            </div>

                            <form onSubmit={handleCreate} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-neutral-400 mr-1">שם השיעור</label>
                                    <input
                                        type="text"
                                        value={newSession.title}
                                        onChange={e => setNewSession({ ...newSession, title: e.target.value })}
                                        placeholder="לדוגמה: פילאטיס מכשירים"
                                        className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-neutral-700 text-lg"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-neutral-400 mr-1">תיאור (אופציונלי)</label>
                                    <textarea
                                        value={newSession.description}
                                        onChange={e => setNewSession({ ...newSession, description: e.target.value })}
                                        placeholder="פירוט קצר על האימון..."
                                        className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-neutral-700 text-lg min-h-[100px] resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-neutral-400 mr-1">תאריך</label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal h-14 rounded-2xl bg-neutral-900/50 border-neutral-800 hover:bg-neutral-800 hover:text-white px-3 gap-2",
                                                        !newSession.date && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                                    {newSession.date ? format(newSession.date, "PPP", { locale: he }) : <span>בחר תאריך</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 z-[70]" align="start">
                                                <div dir="ltr">
                                                    <Calendar
                                                        mode="single"
                                                        selected={newSession.date}
                                                        onSelect={(d) => d && setNewSession({ ...newSession, date: d })}
                                                        initialFocus
                                                    />
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-neutral-400 mr-1">שעה</label>
                                        <Select
                                            value={newSession.time}
                                            onValueChange={(value) => setNewSession({ ...newSession, time: value })}
                                        >
                                            <SelectTrigger className="w-full h-14 bg-neutral-900/50 border-neutral-800 rounded-2xl text-lg px-4 text-white">
                                                <SelectValue placeholder="בחר שעה" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-60 bg-[#1A1C19] border-neutral-800 text-white">
                                                {Array.from({ length: 35 }).map((_, i) => {
                                                    const hour = Math.floor(i / 2) + 6;
                                                    const minute = i % 2 === 0 ? "00" : "30";
                                                    const timeStr = `${hour.toString().padStart(2, '0')}:${minute}`;
                                                    return (
                                                        <SelectItem key={timeStr} value={timeStr} className="text-lg py-3 focus:bg-neutral-800 focus:text-white cursor-pointer">
                                                            {timeStr}
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-neutral-400 mr-1">משתתפות</label>
                                    <div className="flex items-center justify-center gap-6 bg-neutral-900/50 border border-neutral-800 rounded-2xl p-2">
                                        <motion.button
                                            type="button"
                                            whileTap={{ scale: 0.9 }}
                                            onClick={decrementCapacity}
                                            className="w-12 h-12 flex items-center justify-center bg-neutral-800 rounded-xl text-white hover:bg-neutral-700 transition-colors text-2xl"
                                        >
                                            -
                                        </motion.button>

                                        <span className="text-3xl font-bold w-16 text-center">{newSession.max_capacity}</span>

                                        <motion.button
                                            type="button"
                                            whileTap={{ scale: 0.9 }}
                                            onClick={incrementCapacity}
                                            className="w-12 h-12 flex items-center justify-center bg-primary text-black rounded-xl hover:bg-[#8B9A76] transition-colors text-2xl font-bold"
                                        >
                                            +
                                        </motion.button>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-4 rounded-xl font-bold bg-neutral-900 text-neutral-400 hover:bg-neutral-800 border border-neutral-800 transition-colors"
                                    >
                                        ביטול
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-4 rounded-xl font-bold bg-primary text-black hover:bg-[#8B9A76] shadow-[0_4px_20px_rgba(156,169,134,0.3)] transition-all hover:scale-[1.02]"
                                    >
                                        שמירה ופרסום
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* View Bookings Modal */}
            <AnimatePresence>
                {
                    viewBookingsSession && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => setViewBookingsSession(null)}
                                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ scale: 0.9, y: 50, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.9, y: 50, opacity: 0 }}
                                className="bg-[#131512] border border-neutral-700/50 p-8 rounded-[2rem] w-full max-w-lg relative z-10 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
                            >
                                <div className="text-center mb-6 shrink-0">
                                    <h2 className="text-2xl font-bold text-white mb-1">רשימת משתתפות</h2>
                                    <p className="text-neutral-400 text-sm">{viewBookingsSession.title} · {formatDate(viewBookingsSession.start_time)}</p>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                    {loadingBookings ? (
                                        <div className="text-center py-10 text-neutral-500">טוען...</div>
                                    ) : sessionBookings.length === 0 ? (
                                        <div className="text-center py-10 text-neutral-500 bg-neutral-900/30 rounded-2xl border border-dashed border-neutral-800">
                                            אף אחת לא נרשמה עדיין 🦗
                                        </div>
                                    ) : (
                                        sessionBookings.map(booking => (
                                            <div key={booking.id} className="bg-neutral-900/50 border border-neutral-800 p-4 rounded-2xl flex justify-between items-center group hover:bg-neutral-900 transition-colors">
                                                <div>
                                                    <p className="font-bold text-white">{booking.users?.full_name || "ללא שם"}</p>
                                                    <p className="text-xs text-neutral-500">{booking.users?.email}</p>
                                                </div>
                                                <button
                                                    // @ts-ignore
                                                    onClick={() => handleCancelBooking(booking)}
                                                    className="text-neutral-500 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-all"
                                                    title="בטל הרשמה וזכה למנויה"
                                                >
                                                    ❌ ביטול
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="mt-6 pt-4 border-t border-neutral-800 shrink-0">
                                    <button
                                        onClick={() => setViewBookingsSession(null)}
                                        className="w-full py-3 bg-neutral-900 text-neutral-400 hover:text-white rounded-xl font-medium transition-colors"
                                    >
                                        סגירה
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
            </AnimatePresence>

            {/* DELETE SESSION CONFIRMATION MODAL */}
            <AnimatePresence>
                {deleteConfirmation.isOpen && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setDeleteConfirmation({ isOpen: false, session: null, userCount: 0 })}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#131512] border border-red-500/30 p-8 rounded-[2rem] w-full max-w-sm relative z-10 shadow-2xl text-center"
                        >
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                                ⚠️
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">מחיקת אימון</h2>
                            <p className="text-neutral-400 mb-6">
                                {deleteConfirmation.userCount > 0 ? (
                                    <>
                                        ישנן <span className="text-white font-bold">{deleteConfirmation.userCount}</span> רשומות לאימון זה.
                                        <br />
                                        מחיקת האימון תבטל את ההרשמות <br />
                                        <span className="text-green-400 font-bold">ותזכה את המתאמנות אוטומטית.</span>
                                    </>
                                ) : (
                                    "האם את בטוחה שברצונך למחוק את האימון?"
                                )}
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={executeDeleteSession}
                                    disabled={isDeleting}
                                    className="w-full py-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDeleting ? "מבצע מחיקה וזיכוי..." : "כן, למחוק ולזכות"}
                                </button>
                                <button
                                    disabled={isDeleting}
                                    onClick={() => setDeleteConfirmation({ isOpen: false, session: null, userCount: 0 })}
                                    className="w-full py-4 bg-transparent text-neutral-500 hover:text-white transition-colors"
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
