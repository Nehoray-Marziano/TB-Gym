"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { Bell, Calendar as CalendarIcon, Clock, Trash2, Users, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { MuiTimePickerWrapper } from "@/components/ui/time-picker-mui";
import { Button } from "@/components/ui/button";
import { TraineeSelector, type Trainee } from "@/components/admin/trainee-selector";
import StudioLogo from "@/components/StudioLogo";

type Session = {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    max_capacity: number;
    current_bookings: number; // Use the count from our view
    bookings: [{ count: number }]; // Keep for backward compat
};

type Booking = {
    id: string;
    user_id: string;
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
    const reduceMotion = useReducedMotion();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

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
    const [isCreating, setIsCreating] = useState(false);

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
    const [selectedTrainees, setSelectedTrainees] = useState<Trainee[]>([]);
    const [showTraineeSelector, setShowTraineeSelector] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const fetchSessions = useCallback(async () => {
        const { data, error } = await supabase
            .from("gym_sessions_with_counts")
            .select("*, bookings(count)")
            .order("start_time", { ascending: true });

        if (error) console.error(error);
        else setSessions((data || []) as unknown as Session[]);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isCreating || !newSession.title.trim() || !newSession.date) return;

        setIsCreating(true);
        try {
            const [hours, minutes] = newSession.time.split(":").map(Number);
            const start = new Date(newSession.date);
            start.setHours(hours, minutes, 0, 0);
            const end = new Date(start.getTime() + 60 * 60 * 1000);

            const finalCapacity = isPrivateSession ? selectedTrainees.length : newSession.max_capacity;
            const { error } = await supabase.rpc("admin_create_session", {
                p_title: newSession.title,
                p_description: newSession.description,
                p_start_time: start.toISOString(),
                p_end_time: end.toISOString(),
                p_max_capacity: finalCapacity,
                p_user_ids: isPrivateSession ? selectedTrainees.map(t => t.id) : [],
            });
            if (error) throw error;

            setIsModalOpen(false);
            setNewSession({ title: "", description: "", date: undefined, time: "08:00", max_capacity: 10 });
            setIsPrivateSession(false);
            setSelectedTrainees([]);
            fetchSessions();
        } catch (err) {
            console.error(err);
            alert("לא הצלחנו לשמור את האימון. כדאי לנסות שוב.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteClick = (session: Session) => {
        const count = session.current_bookings || 0;
        setDeleteConfirmation({ isOpen: true, session, userCount: count });
    };

    const executeDeleteSession = async () => {
        if (!deleteConfirmation.session) return;
        setIsDeleting(true);

        try {
            const { data, error } = await supabase.rpc("admin_delete_session", {
                p_session_id: deleteConfirmation.session.id,
            });
            if (error) throw error;

            if (data?.user_ids?.length > 0) {
                try {
                    await fetch("/api/notifications", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            title: "אימון בוטל 😔",
                            message: `האימון "${deleteConfirmation.session.title}" בוטל על ידי הסטודיו. הזיכוי הוחזר לחשבונך.`,
                            targetUserIds: data.user_ids
                        })
                    });
                } catch (e) {
                    console.error("Failed to notify users about session deletion", e);
                }
            }

            fetchSessions();
        } catch (err) {
            console.error("Delete error:", err);
            alert("לא הצלחנו למחוק את האימון. כדאי לנסות שוב.");
        } finally {
            setIsDeleting(false);
            setDeleteConfirmation({ isOpen: false, session: null, userCount: 0 });
        }
    };

    const fetchBookings = async (sessionId: string) => {
        setLoadingBookings(true);
        console.log("DEBUG: Fetching bookings for session:", sessionId);
        const { data, error } = await supabase
            .from("bookings")
            .select(`id, status, created_at, user_id, users:profiles!user_id (id, full_name, email, phone)`)
            .eq("session_id", sessionId)
            .eq("status", "confirmed");
        console.log("DEBUG: Fetch result:", { data, error });

        if (error) {
            console.error(error);
            alert("שגיאה בטעינת נרשמות");
        } else {
            setSessionBookings((data || []) as unknown as Booking[]);
        }
        setLoadingBookings(false);
    };

    const handleCancelBooking = async (booking: Booking) => {
        if (!confirm("האם לבטל את ההרשמה ולזכות את המנויה?")) return;
        try {
            const { error } = await supabase.rpc("admin_cancel_booking", { p_booking_id: booking.id });
            if (error) throw error;

            // Notify User
            try {
                await fetch("/api/notifications", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: "הוסרת מהאימון",
                        message: `הוסרת מהאימון ${viewBookingsSession?.title || ""}. הזיכוי הוחזר לחשבונך.`,
                        targetUserIds: [booking.user_id]
                    })
                });
            } catch (e) {
                console.error("Failed to notify user removal", e);
            }

            if (viewBookingsSession) fetchBookings(viewBookingsSession.id);
            fetchSessions();
        } catch (err) {
            console.error("Cancel booking error:", err);
            alert("לא הצלחנו לבטל את ההרשמה. כדאי לנסות שוב.");
        }
    };

    // Filter sessions by date
    const now = new Date();
    const upcomingSessions = sessions.filter(s => new Date(s.start_time) >= now);
    const pastSessions = sessions.filter(s => new Date(s.start_time) < now).sort((a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
    const displayedSessions = activeTab === 'upcoming' ? upcomingSessions : pastSessions;

    return (
        <div className="space-y-7 text-[#f6f6ed]">
            {/* Header */}
            <header className="relative isolate overflow-hidden border-b border-white/15 pb-7">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(#e9f2ce_1px,transparent_1px),linear-gradient(90deg,#e9f2ce_1px,transparent_1px)] [background-size:28px_28px]" />
                <StudioLogo className="pointer-events-none absolute -bottom-12 -left-14 h-56 w-56 bg-[#dce780]/10" />
                <div className="mb-8 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-bold text-[#dce780]"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#dce780]" />ניהול הסטודיו</span>
                    <span className="text-xs text-[#aebbad]">יומן האימונים</span>
                </div>
                <motion.div initial={reduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="relative">
                    <h1 className="text-[clamp(3.3rem,13vw,5rem)] font-bold leading-[0.92] tracking-[-0.055em]">האימונים<br /><span className="text-[#dce780]">שלך.</span></h1>
                    <p className="mt-5 text-sm leading-relaxed text-[#aebbad]">יוצרים אימונים, רואים מי נרשמה ושומרים על הלוח מסודר.</p>
                </motion.div>
                <div className="relative mt-7 flex flex-col gap-3">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex min-h-14 w-full items-center justify-between rounded-full bg-[#dce780] px-5 text-sm font-bold text-[#1b251c] transition-colors active:bg-[#e9f19e]"
                    >
                        <span>אימון חדש</span>
                        <Plus aria-hidden="true" className="h-5 w-5" />
                    </button>
                    <button
                        onClick={async () => {
                            if (confirm("לשלוח התראה לכל המתאמנות שהלוז מוכן?")) {
                                try {
                                    const res = await fetch("/api/notifications", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            title: "מערכת שעות חדשה! 📅",
                                            message: "הלוז לשבוע הבא התעדכן. היכנסי לשריין מקום!",
                                            targetRole: "trainee"
                                        })
                                    });
                                    await res.json();
                                    alert("ההודעה נשלחה בהצלחה!");
                                } catch {
                                    alert("שגיאה בשליחה");
                                }
                            }
                        }}
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-white/15 text-xs font-bold text-[#f6f6ed] transition-colors active:bg-white/10"
                    >
                        <Bell aria-hidden="true" className="h-4 w-4" />להודיע למתאמנות שהלוח עודכן
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="grid grid-cols-2 gap-2 rounded-[1.25rem] border border-white/10 bg-[#202c21] p-1.5">
                <button
                    onClick={() => setActiveTab('upcoming')}
                    aria-pressed={activeTab === 'upcoming'}
                    className={cn(
                        "flex min-h-12 items-center justify-center gap-2 rounded-[0.9rem] px-2 text-xs font-bold transition-colors",
                        activeTab === 'upcoming' ? "bg-[#dce780] text-[#1b251c]" : "text-[#aebbad]"
                    )}
                >
                    אימונים קרובים
                    <span className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] tabular-nums",
                        activeTab === 'upcoming' ? "bg-[#1b251c]/10" : "bg-white/10"
                    )}>
                        {upcomingSessions.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('past')}
                    aria-pressed={activeTab === 'past'}
                    className={cn(
                        "flex min-h-12 items-center justify-center gap-2 rounded-[0.9rem] px-2 text-xs font-bold transition-colors",
                        activeTab === 'past' ? "bg-[#dce780] text-[#1b251c]" : "text-[#aebbad]"
                    )}
                >
                    אימונים שעברו
                    <span className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] tabular-nums",
                        activeTab === 'past' ? "bg-[#1b251c]/10" : "bg-white/10"
                    )}>
                        {pastSessions.length}
                    </span>

                </button>
            </div>

            {loading ? (
                <div aria-label="טוענים אימונים" className="space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="h-48 animate-pulse rounded-[1.75rem] bg-[#202c21]" />
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    <AnimatePresence mode="wait">
                        {displayedSessions.map((session, index) => {
                            const count = session.current_bookings || 0;
                            const fillPercent = Math.min((count / session.max_capacity) * 100, 100);
                            const isFull = count >= session.max_capacity;

                            return (
                                <motion.div
                                    key={session.id}
                                    initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -12 }} transition={{ delay: Math.min(index * 0.06, 0.24), duration: 0.4 }}
                                    className="rounded-[1.75rem] bg-[#f1f0e8] p-5 text-[#162218]"
                                >
                                    {/* Top Metadata */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="text-xl font-bold leading-tight">{session.title}</h3>
                                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#5d6958]">
                                                <span className="flex min-h-8 items-center gap-1.5 rounded-full bg-[#e9eadc] px-3">
                                                    <CalendarIcon aria-hidden="true" className="h-3.5 w-3.5 text-[#68794f]" />
                                                    {new Date(session.start_time).toLocaleDateString("he-IL", { day: 'numeric', month: 'numeric' })}
                                                </span>
                                                <span className="flex min-h-8 items-center gap-1.5 rounded-full bg-[#e9eadc] px-3">
                                                    <Clock aria-hidden="true" className="h-3.5 w-3.5 text-[#68794f]" />
                                                    {new Date(session.start_time).toLocaleTimeString("he-IL", { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            aria-label={`מחיקת ${session.title}`}
                                            onClick={() => handleDeleteClick(session)}
                                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#162218]/15 text-[#8b3e36] transition-colors active:bg-[#a53d35]/10"
                                        >
                                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mt-6">
                                        <div className="mb-2 flex items-baseline justify-between text-xs">
                                            <span dir="ltr" className={isFull ? "font-bold tabular-nums text-[#a53d35]" : "font-bold tabular-nums text-[#4e652c]"}>
                                                {count} / {session.max_capacity}
                                            </span>
                                            <span className="text-[#5d6958]">{isFull ? "האימון מלא" : "מקומות תפוסים"}</span>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#162218]/10">
                                            <div
                                                style={{ width: `${fillPercent}%` }}
                                                className={`h-full rounded-full ${isFull ? "bg-[#a53d35]" : "bg-[#829044]"}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setViewBookingsSession(session);
                                            fetchBookings(session.id);
                                        }}
                                        className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#162218] text-sm font-bold text-[#dce780] transition-colors active:bg-[#334436]"
                                    >
                                        <Users aria-hidden="true" className="h-4 w-4 text-[#dce780]" />
                                        ניהול נרשמות
                                    </button>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Empty State */}
            {!loading && displayedSessions.length === 0 && (
                <div className="rounded-[1.75rem] border border-dashed border-white/15 bg-[#202c21]/50 px-6 py-12 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dce780]/15 text-[#dce780]"><CalendarIcon aria-hidden="true" className="h-7 w-7" /></span>
                    <h3 className="mt-5 text-lg font-bold">
                        {activeTab === 'upcoming' ? 'אין אימונים קרובים כרגע' : 'אין אימונים קודמים'}
                    </h3>
                    <p className="mx-auto mt-2 max-w-56 text-sm leading-relaxed text-[#aebbad]">
                        {activeTab === 'upcoming'
                            ? 'כדי להתחיל, הוסיפי אימון חדש ללוח.'
                            : 'כאן יופיעו אימונים שכבר התקיימו.'}
                    </p>
                </div>
            )}

            {/* CREATE MODAL */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end justify-center">
                        <div
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-[#071009]/80"
                        />
                        <motion.div
                            initial={reduceMotion ? false : { y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="create-session-title"
                            className="relative z-10 max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-[#f1f0e8] px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-7 text-[#1b251c]"
                        >
                            <button type="button" onClick={() => setIsModalOpen(false)} aria-label="סגירה" className="absolute left-5 top-6 flex h-11 w-11 items-center justify-center rounded-full border border-[#1b251c]/15">
                                <X aria-hidden="true" className="h-5 w-5" />
                            </button>

                            <p className="text-xs font-bold text-[#5c6d2e]">יומן האימונים</p>
                            <h2 id="create-session-title" className="mb-7 mt-2 text-[2rem] font-bold leading-tight">אימון חדש.</h2>

                            <form onSubmit={handleCreate} className="space-y-5">
                                <div className="space-y-2">
                                    <label htmlFor="new-session-title" className="text-xs font-bold">שם האימון</label>
                                    <input
                                        id="new-session-title"
                                        type="text"
                                        value={newSession.title}
                                        onChange={e => setNewSession({ ...newSession, title: e.target.value })}
                                        className="min-h-14 w-full rounded-2xl border border-[#1b251c]/20 bg-white px-4 text-base font-bold outline-none focus:border-[#829044]"
                                        placeholder="למשל, אימון כוח"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold">תאריך</span>
                                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                            <PopoverTrigger asChild>
                                                <Button variant={"outline"} className="h-14 w-full justify-between rounded-2xl border-[#1b251c]/20 bg-white px-3 text-sm font-medium text-[#1b251c] hover:bg-white hover:text-[#1b251c]">
                                                    {newSession.date ? format(newSession.date, "dd/MM/yyyy") : <span className="text-[#5d6958]">בחירת תאריך</span>}
                                                    <CalendarIcon aria-hidden="true" className="h-4 w-4 text-[#5d6958]" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent side="top" sideOffset={8} className="z-[70] max-h-[42dvh] w-auto overflow-y-auto border-[#1b251c]/20 bg-[#f1f0e8] p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={newSession.date}
                                                    onSelect={(d) => {
                                                        if (d) {
                                                            setNewSession({ ...newSession, date: d });
                                                            setIsCalendarOpen(false);
                                                        }
                                                    }}
                                                    initialFocus
                                                    className="rounded-xl border border-[#1b251c]/15"
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold">שעה</span>
                                        <MuiTimePickerWrapper
                                            value={newSession.time}
                                            onChange={(t: string) => setNewSession({ ...newSession, time: t })}
                                        />
                                    </div>
                                </div>


                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#dfe4d0] p-1">
                                        <button
                                            type="button"
                                            onClick={() => setIsPrivateSession(false)}
                                            aria-pressed={!isPrivateSession}
                                            className={cn("min-h-12 rounded-xl px-1 text-xs font-bold transition-colors", !isPrivateSession ? "bg-[#1b251c] text-white" : "text-[#5d6958]")}
                                        >
                                            הרשמה פתוחה
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsPrivateSession(true)}
                                            aria-pressed={isPrivateSession}
                                            className={cn("min-h-12 rounded-xl px-1 text-xs font-bold transition-colors", isPrivateSession ? "bg-[#1b251c] text-white" : "text-[#5d6958]")}
                                        >
                                            בחירת מתאמנות
                                        </button>
                                    </div>

                                    {!isPrivateSession ? (
                                        <div className="space-y-2">
                                            <span className="text-xs font-bold">מספר מקומות</span>
                                            <div className="flex min-h-14 items-center gap-4 rounded-2xl border border-[#1b251c]/20 bg-white p-2 ps-4">
                                                <div className="flex-1 text-lg font-bold tabular-nums">{newSession.max_capacity}</div>
                                                <div className="flex gap-2">
                                                    <button type="button" aria-label="הפחתת מקום" onClick={() => setNewSession(p => ({ ...p, max_capacity: Math.max(1, p.max_capacity - 1) }))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8ebdf] text-lg font-bold">−</button>
                                                    <button type="button" aria-label="הוספת מקום" onClick={() => setNewSession(p => ({ ...p, max_capacity: p.max_capacity + 1 }))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dce780] text-lg font-bold">+</button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold">מוזמנות ({selectedTrainees.length})</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowTraineeSelector(true)}
                                                    className="text-xs font-bold text-[#5c6d2e] underline underline-offset-4"
                                                >
                                                    {selectedTrainees.length > 0 ? "עריכה" : "בחירה"}
                                                </button>
                                            </div>
                                            {selectedTrainees.length === 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowTraineeSelector(true)}
                                                    className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#1b251c]/25 bg-white p-4"
                                                >
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dfe6bd]">
                                                        <Users aria-hidden="true" className="h-5 w-5" />
                                                    </div>
                                                    <span className="text-sm font-bold">בחירת מתאמנות לאימון</span>
                                                </button>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {selectedTrainees.map(t => (
                                                        <div key={t.id} className="flex items-center gap-2 rounded-xl border border-[#1b251c]/10 bg-white p-2">
                                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dce780] text-xs font-bold">
                                                                {t.full_name?.[0]}
                                                            </div>
                                                            <span className="truncate text-sm font-medium">{t.full_name}</span>
                                                        </div>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowTraineeSelector(true)}
                                                        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#1b251c]/25 bg-white p-2 text-xs font-bold text-[#5c6d2e]"
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
                                    disabled={isCreating || !newSession.title || !newSession.date || (isPrivateSession && selectedTrainees.length === 0)}
                                    className="mt-4 min-h-14 w-full rounded-full bg-[#1b251c] px-5 text-sm font-bold text-white disabled:opacity-50"
                                >
                                    פרסום אימון
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
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

            {/* View Bookings Modal */}
            <AnimatePresence>
                {viewBookingsSession && (
                    <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end justify-center">
                        <div
                            onClick={() => setViewBookingsSession(null)}
                            className="absolute inset-0 bg-[#071009]/80"
                        />
                        <motion.div
                            initial={reduceMotion ? false : { y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="session-bookings-title"
                            className="relative z-10 flex max-h-[94dvh] w-full max-w-lg flex-col rounded-t-[2rem] bg-[#f1f0e8] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-7 text-[#1b251c]"
                        >
                            <div className="mb-6 shrink-0">
                                <p className="text-xs font-bold text-[#5c6d2e]">{viewBookingsSession.title}</p>
                                <h2 id="session-bookings-title" className="mt-2 text-[2rem] font-bold leading-tight">מי נרשמה?</h2>
                            </div>

                            <div className="flex-1 space-y-3 overflow-y-auto">
                                {loadingBookings ? (
                                    <div className="flex justify-center p-8"><div aria-label="טוענים נרשמות" className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b251c] border-t-transparent" /></div>
                                ) : sessionBookings.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-[#1b251c]/20 bg-white px-4 py-10 text-center text-sm text-[#5d6958]">
                                        עדיין אין נרשמות לאימון הזה.
                                    </div>
                                ) : (
                                    sessionBookings.map(booking => (
                                        <div key={booking.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#1b251c]/10 bg-white p-4">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dfe6bd] text-sm font-bold">{booking.users?.full_name?.[0] || "?"}</div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-bold">{booking.users?.full_name || "ללא שם"}</p>
                                                    <p className="mt-1 text-xs text-[#5d6958]" dir="ltr">{booking.users?.phone}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleCancelBooking(booking)}
                                                className="min-h-11 shrink-0 rounded-full border border-[#a53d35]/20 px-3 text-xs font-bold text-[#a53d35]"
                                            >
                                                ביטול הרשמה
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <button type="button" onClick={() => setViewBookingsSession(null)} className="mt-6 min-h-12 w-full rounded-full bg-[#1b251c] px-5 text-sm font-bold text-white">
                                סגירה
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirmation.isOpen && (
                    <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-end justify-center">
                        <div
                            onClick={() => setDeleteConfirmation({ isOpen: false, session: null, userCount: 0 })}
                            className="absolute inset-0 bg-[#071009]/80"
                        />
                        <motion.div
                            initial={reduceMotion ? false : { y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            role="alertdialog"
                            aria-modal="true"
                            aria-labelledby="delete-session-title"
                            className="relative z-10 max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-[#f1f0e8] px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-7 text-[#1b251c]"
                        >
                            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#a53d35]/10 text-[#a53d35]"><Trash2 aria-hidden="true" className="h-6 w-6" /></span>
                            <h2 id="delete-session-title" className="mt-5 text-[2rem] font-bold leading-tight">למחוק את האימון?</h2>
                            <p className="mb-7 mt-3 text-sm leading-relaxed text-[#5d6958]">
                                {deleteConfirmation.userCount > 0
                                    ? `${deleteConfirmation.userCount} נרשמות יקבלו את הזיכוי שלהן בחזרה. אי אפשר לבטל את המחיקה.`
                                    : "האימון יוסר מהלוח. אי אפשר לבטל את המחיקה."}
                            </p>

                            <div className="space-y-2">
                                <button
                                    onClick={executeDeleteSession}
                                    disabled={isDeleting}
                                    className="min-h-14 w-full rounded-full bg-[#a53d35] px-5 text-sm font-bold text-white disabled:opacity-50"
                                >
                                    {isDeleting ? "מוחקים..." : "כן, למחוק את האימון"}
                                </button>
                                <button
                                    onClick={() => setDeleteConfirmation({ isOpen: false, session: null, userCount: 0 })}
                                    className="min-h-12 w-full text-sm font-bold text-[#5d6958]"
                                >
                                    להשאיר את האימון
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

