"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAdminMutationRequestId, completeAdminMutationIntent } from "@/lib/adminMutationIntent";
import { AnimatePresence } from "framer-motion";
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
import { CopyableInput } from "@/components/ui/copyable-field";
import { CopyButton } from "@/components/ui/copy-button";
import { Button } from "@/components/ui/button";
import { TraineeSelector, type Trainee } from "@/components/admin/trainee-selector";
import StudioLogo from "@/components/StudioLogo";
import { useToast } from "@/components/ui/use-toast";
import { StudioModal } from "@/components/ui/StudioModal";
import { AdminBusyLabel, AdminError, AdminLoading } from "@/components/admin/AdminFeedback";

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
    const { toast } = useToast();

    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [sessionsError, setSessionsError] = useState<string | null>(null);
    const [bookingsError, setBookingsError] = useState<string | null>(null);
    const [createError, setCreateError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [notifyError, setNotifyError] = useState<string | null>(null);
    const [cancelError, setCancelError] = useState<string | null>(null);
    const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const sessionsRequest = useRef(0);
    const bookingsRequest = useRef(0);
    const mutationLock = useRef(false);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
    const [listLimit, setListLimit] = useState(24);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [notifyConfirmOpen, setNotifyConfirmOpen] = useState(false);
    const [notifySending, setNotifySending] = useState(false);

    const notifyTrainees = async () => {
        if (mutationLock.current) return;
        mutationLock.current = true;
        setNotifySending(true);
        setNotifyError(null);
        try {
            const response = await fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: "לוח האימונים התעדכן",
                    message: "האימונים החדשים כבר בלוח. בואי לבחור לך מקום.",
                    targetRole: "trainee"
                }),
            });
            if (!response.ok) throw new Error(`Notification failed: ${response.status}`);
            setNotifyConfirmOpen(false);
            toast({ title: "העדכון נשלח למתאמנות", type: "success" });
        } catch (error) {
            console.error(error);
            setNotifyError("לא הצלחנו לשלוח את העדכון. נסי שוב בעוד רגע.");
        } finally {
            mutationLock.current = false;
            setNotifySending(false);
        }
    };

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
        const request = ++sessionsRequest.current;
        setSessionsError(null);
        try {
            const { data, error } = await supabase
                .from("gym_sessions_with_counts").select("*, bookings(count)").order("start_time", { ascending: true });
            if (request !== sessionsRequest.current) return;
            if (error) throw error;
            setSessions((data || []) as unknown as Session[]);
        } catch {
            if (request === sessionsRequest.current) setSessionsError("לא הצלחנו לטעון את האימונים. נסי שוב.");
        } finally {
            if (request === sessionsRequest.current) setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        const sessionCounter = sessionsRequest;
        const bookingsCounter = bookingsRequest;
        void fetchSessions();
        return () => { sessionCounter.current++; bookingsCounter.current++; };
    }, [fetchSessions]);

    const closeCreate = () => { setIsCalendarOpen(false); setShowTraineeSelector(false); setIsModalOpen(false); };
    const closeBookings = () => { bookingsRequest.current++; setViewBookingsSession(null); };
    const closeDelete = () => setDeleteConfirmation({ isOpen: false, session: null, userCount: 0 });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mutationLock.current) return;
        if (!newSession.title.trim() || !newSession.date || (isPrivateSession && !selectedTrainees.length)) {
            setCreateError("יש להזין שם ותאריך ולבחור מתאמנות לאימון למוזמנות.");
            document.getElementById("new-session-title")?.focus();
            return;
        }
        mutationLock.current = true;
        setCreateError(null);
        setIsCreating(true);
        try {
            const [hours, minutes] = newSession.time.split(":").map(Number);
            const start = new Date(newSession.date);
            start.setHours(hours, minutes, 0, 0);
            const end = new Date(start.getTime() + 60 * 60 * 1000);

            const finalCapacity = isPrivateSession ? selectedTrainees.length : newSession.max_capacity;
            const actorId = (await supabase.auth.getSession()).data.session?.user.id;
            if (!actorId) throw new Error("Authentication required");
            const payload = {
                p_title: newSession.title,
                p_description: newSession.description,
                p_start_time: start.toISOString(),
                p_end_time: end.toISOString(),
                p_max_capacity: finalCapacity,
                p_user_ids: isPrivateSession ? selectedTrainees.map(t => t.id).sort() : [],
            };
            const requestId = await getAdminMutationRequestId("create_session", actorId, payload);
            const { data, error } = await supabase.rpc("admin_create_session_once", { ...payload, p_request_id: requestId });
            if (error) throw error;
            if (!data?.success) throw new Error(data?.message || "Lesson creation failed");
            completeAdminMutationIntent("create_session", actorId, requestId);

            closeCreate();
            setActiveTab("upcoming");
            toast({ title: "האימון פורסם בהצלחה", type: "success" });
            setNewSession({ title: "", description: "", date: undefined, time: "08:00", max_capacity: 10 });
            setIsPrivateSession(false);
            setSelectedTrainees([]);
            fetchSessions();
        } catch (err) {
            console.error(err);
            setCreateError("לא הצלחנו לאשר שהאימון נשמר. נסי שוב עם אותם פרטים; ניסיון חוזר לא יפרסם אותו פעמיים.");
        } finally {
            mutationLock.current = false;
            setIsCreating(false);
        }
    };

    const handleDeleteClick = (session: Session) => {
        setDeleteError(null);
        const count = session.current_bookings || 0;
        setDeleteConfirmation({ isOpen: true, session, userCount: count });
    };

    const executeDeleteSession = async () => {
        if (!deleteConfirmation.session || mutationLock.current) return;
        mutationLock.current = true;
        setDeleteError(null);
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

            setSessions(previous => previous.filter(session => session.id !== deleteConfirmation.session?.id));
            closeDelete();
            toast({ title: "האימון נמחק", type: "success" });
            void fetchSessions();
        } catch (err) {
            console.error("Delete error:", err);
            setDeleteError("לא הצלחנו למחוק את האימון. נסי שוב בעוד רגע.");
        } finally {
            mutationLock.current = false;
            setIsDeleting(false);
        }
    };

    const fetchBookings = async (sessionId: string) => {
        const request = ++bookingsRequest.current;
        setLoadingBookings(true);
        setBookingsError(null);
        setSessionBookings([]);
        try {
            const { data, error } = await supabase.from("bookings")
                .select("id, status, created_at, user_id, users:profiles!user_id (id, full_name, email, phone)")
                .eq("session_id", sessionId).eq("status", "confirmed");
            if (request !== bookingsRequest.current) return;
            if (error) throw error;
            setSessionBookings((data || []) as unknown as Booking[]);
        } catch {
            if (request === bookingsRequest.current) setBookingsError("לא הצלחנו לטעון את הנרשמות. נסי שוב.");
        } finally {
            if (request === bookingsRequest.current) setLoadingBookings(false);
        }
    };

    const handleCancelBooking = async (booking: Booking) => {
        if (mutationLock.current) return;
        mutationLock.current = true;
        setIsCancelling(true);
        setCancelError(null);
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

            setSessionBookings(previous => previous.filter(item => item.id !== booking.id));
            setCancelTarget(null);
            toast({ title: "ההרשמה בוטלה והזיכוי הוחזר", type: "success" });
            if (viewBookingsSession) void fetchBookings(viewBookingsSession.id);
            fetchSessions();
        } catch (err) {
            console.error("Cancel booking error:", err);
            setCancelError("לא הצלחנו לבטל את ההרשמה. נסי שוב בעוד רגע.");
        } finally {
            mutationLock.current = false;
            setIsCancelling(false);
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
        <div className="space-y-4 text-[var(--studio-deep-contrast)]">
            {/* Header */}
            <header className="flex items-center gap-3 border-b border-white/15 pb-4">
                <StudioLogo className="h-10 w-10 shrink-0 bg-[var(--studio-accent-bg)]" />
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-[var(--studio-accent-text)]">ניהול הסטודיו</p>
                    <h1 className="text-[1.9rem] font-bold leading-tight tracking-tight">יומן האימונים</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        data-modal-fallback
                        onClick={() => setIsModalOpen(true)}
                        aria-label="אימון חדש"
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--studio-accent-bg)] text-[var(--studio-ink)] transition-transform active:scale-95"
                    >
                        <Plus aria-hidden="true" className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        aria-label="להודיע למתאמנות שהלוח עודכן"
                        onClick={() => { setNotifyError(null); setNotifyConfirmOpen(true); }}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-[var(--studio-accent-text)] transition-colors active:bg-white/10"
                    >
                        <Bell aria-hidden="true" className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="grid grid-cols-2 gap-1 rounded-[1.1rem] border border-white/10 bg-[var(--admin-surface)] p-1">
                <button
                    onClick={() => { setActiveTab('upcoming'); setListLimit(24); }}
                    aria-pressed={activeTab === 'upcoming'}
                    className={cn(
                        "flex min-h-11 items-center justify-center gap-2 rounded-[0.85rem] px-2 text-xs font-bold transition-colors",
                        activeTab === 'upcoming' ? "bg-[var(--studio-accent-bg)] text-[var(--studio-ink)]" : "text-[var(--admin-muted)]"
                    )}
                >
                    אימונים קרובים
                    <span className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] tabular-nums",
                        activeTab === 'upcoming' ? "bg-[var(--studio-deep)]/10" : "bg-white/10"
                    )}>
                        {loading ? "—" : upcomingSessions.length}
                    </span>
                </button>
                <button
                    onClick={() => { setActiveTab('past'); setListLimit(24); }}
                    aria-pressed={activeTab === 'past'}
                    className={cn(
                        "flex min-h-11 items-center justify-center gap-2 rounded-[0.85rem] px-2 text-xs font-bold transition-colors",
                        activeTab === 'past' ? "bg-[var(--studio-accent-bg)] text-[var(--studio-ink)]" : "text-[var(--admin-muted)]"
                    )}
                >
                    אימונים שעברו
                    <span className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] tabular-nums",
                        activeTab === 'past' ? "bg-[var(--studio-deep)]/10" : "bg-white/10"
                    )}>
                        {loading ? "—" : pastSessions.length}
                    </span>

                </button>
            </div>

            {loading ? (
                <AdminLoading label="טוענים אימונים..." />
            ) : (
                <div key={activeTab} className="studio-admin-list space-y-3">
                        {displayedSessions.slice(0, listLimit).map((session) => {
                            const count = session.current_bookings || 0;
                            const fillPercent = Math.min((count / session.max_capacity) * 100, 100);
                            const isFull = count >= session.max_capacity;

                            return (
                                <div
                                    key={session.id}
                                    className="studio-admin-card rounded-[1.35rem] bg-[var(--studio-sheet)] p-4 text-[var(--studio-ink)]"
                                >
                                    {/* Top Metadata */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="break-words text-lg font-bold leading-tight">{session.title}</h3>
                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--studio-muted)]">
                                                <span className="flex items-center gap-1.5">
                                                    <CalendarIcon aria-hidden="true" className="h-3.5 w-3.5 text-[var(--studio-subtle)]" />
                                                    {new Date(session.start_time).toLocaleDateString("he-IL", { day: 'numeric', month: 'numeric', timeZone: "Asia/Jerusalem" })}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock aria-hidden="true" className="h-3.5 w-3.5 text-[var(--studio-subtle)]" />
                                                    {new Date(session.start_time).toLocaleTimeString("he-IL", { hour: '2-digit', minute: '2-digit', timeZone: "Asia/Jerusalem" })}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            aria-label={`מחיקת ${session.title}`}
                                            onClick={() => handleDeleteClick(session)}
                                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#162218]/15 text-[var(--studio-danger)] transition-colors active:bg-[var(--studio-danger)]/10"
                                        >
                                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mt-3">
                                        <div className="mb-2 flex items-baseline justify-between text-xs">
                                            <span dir="ltr" className={isFull ? "font-bold tabular-nums text-[var(--studio-danger)]" : "font-bold tabular-nums text-[var(--studio-subtle)]"}>
                                                {count} / {session.max_capacity}
                                            </span>
                                            <span className="text-[var(--studio-muted)]">{isFull ? "האימון מלא" : "מקומות תפוסים"}</span>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--studio-deep)]/10">
                                            <div
                                                style={{ transform: `scaleX(${fillPercent / 100})` }}
                                                className={`studio-admin-capacity h-full rounded-full ${isFull ? "bg-[var(--studio-danger)]" : "bg-[var(--studio-subtle)]"}`}
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
                                        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--studio-deep)] text-xs font-bold text-[var(--studio-accent-text)] transition-colors active:bg-[#334436]"
                                    >
                                        <Users aria-hidden="true" className="h-4 w-4 text-[var(--studio-accent-text)]" />
                                        ניהול נרשמות
                                    </button>
                                </div>
                            )
                        })}
                </div>
            )}

            {sessionsError && <AdminError message={sessionsError} onRetry={() => void fetchSessions()} />}
            {!loading && !sessionsError && displayedSessions.length > listLimit && <button type="button" onClick={() => setListLimit(value => value + 24)} className="min-h-12 w-full rounded-full border border-white/20 text-sm font-bold">הצגת אימונים נוספים ({displayedSessions.length - listLimit})</button>}

            {/* Empty State */}
            {!loading && !sessionsError && displayedSessions.length === 0 && (
                <div className="rounded-[1.75rem] border border-dashed border-white/15 bg-[var(--admin-surface)]/50 px-6 py-12 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--studio-accent-bg)]/15 text-[var(--studio-accent-text)]"><CalendarIcon aria-hidden="true" className="h-7 w-7" /></span>
                    <h3 className="mt-5 text-lg font-bold">
                        {activeTab === 'upcoming' ? 'אין אימונים קרובים כרגע' : 'אין אימונים קודמים'}
                    </h3>
                    <p className="mx-auto mt-2 max-w-56 text-sm leading-relaxed text-[var(--admin-muted)]">
                        {activeTab === 'upcoming'
                            ? 'כדי להתחיל, הוסיפי אימון חדש ללוח.'
                            : 'כאן יופיעו אימונים שכבר התקיימו.'}
                    </p>
                </div>
            )}


            <AnimatePresence>
                {notifyConfirmOpen && <StudioModal variant="admin" titleId="notify-title" descriptionId="notify-description" busy={notifySending} onClose={() => setNotifyConfirmOpen(false)} actions={
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" data-modal-cancel disabled={notifySending} onClick={() => setNotifyConfirmOpen(false)} className="studio-admin-action" data-emphasis="outline">לא עכשיו</button>
                        <button type="button" disabled={notifySending} onClick={notifyTrainees} className="studio-admin-action" aria-busy={notifySending}><AdminBusyLabel busy={notifySending} idle="שלחי עדכון" pending="שולחות..." /></button>
                    </div>
                }>
                    <p className="text-xs font-bold text-[var(--studio-subtle)]">עדכון לוח האימונים</p>
                    <h2 id="notify-title" className="mt-2 text-[1.7rem] font-bold leading-tight">לשלוח התראה למתאמנות?</h2>
                    <p id="notify-description" className="mt-3 text-sm leading-relaxed text-[var(--studio-muted)]">נשלח עדכון שהלוח החדש מוכן ושאפשר להירשם.</p>
                    {notifyError && <div className="mt-4"><AdminError message={notifyError} /></div>}
                </StudioModal>}
            </AnimatePresence>

            <AnimatePresence>
                {isModalOpen && <StudioModal variant="admin" titleId="create-session-title" busy={isCreating} onClose={closeCreate} actions={
                    <button type="submit" form="create-session-form" disabled={isCreating || !newSession.title.trim() || !newSession.date || (isPrivateSession && selectedTrainees.length === 0)} className="studio-admin-action" aria-busy={isCreating}>
                        <AdminBusyLabel busy={isCreating} idle="פרסום אימון" pending="מפרסמים..." />
                    </button>
                } header={<>
                    <button type="button" data-modal-cancel disabled={isCreating} onClick={closeCreate} aria-label="סגירת אימון חדש" className="studio-admin-modal-close"><X aria-hidden="true" className="h-5 w-5" /></button>
                    <div className="studio-admin-modal-heading">
                        <p className="text-xs font-bold text-[var(--studio-subtle)]">יומן האימונים</p>
                        <h2 id="create-session-title" className="mt-2 text-[2rem] font-bold leading-tight">אימון חדש.</h2>
                    </div>
                </>}>
                            <form id="create-session-form" noValidate onSubmit={handleCreate} className="space-y-5">
                                <fieldset disabled={isCreating} className="min-w-0 space-y-5 border-0 p-0">
                                <div className="space-y-2">
                                    <label htmlFor="new-session-title" className="text-xs font-bold">שם האימון</label>
                                    <CopyableInput copyLabel="העתקת שם האימון"
                                        id="new-session-title"
                                        type="text"
                                        value={newSession.title}
                                        onChange={e => setNewSession({ ...newSession, title: e.target.value })}
                                        className="min-h-14 w-full rounded-2xl border border-[#1b251c]/20 bg-[var(--studio-card)] px-4 text-base font-bold outline-none focus:border-[var(--studio-accent-text)]"
                                        required aria-invalid={!!createError && !newSession.title.trim()} aria-describedby={createError ? "create-session-error" : undefined} placeholder="למשל, אימון כוח"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="text-xs font-bold">תאריך</span>
                                            <CopyButton label="העתקת תאריך האימון" value={newSession.date ? format(newSession.date, "dd/MM/yyyy") : ""} disabled={!newSession.date} />
                                        </div>
                                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                            <PopoverTrigger asChild>
                                                <Button type="button" onClick={() => setIsCalendarOpen(true)} aria-label="בחירת תאריך האימון" variant={"outline"} className="h-14 w-full justify-between rounded-2xl border-[#1b251c]/20 bg-[var(--studio-card)] px-3 text-sm font-medium text-[var(--studio-ink)] hover:bg-[var(--studio-card)] hover:text-[var(--studio-ink)]">
                                                    {newSession.date ? format(newSession.date, "dd/MM/yyyy") : <span className="text-[var(--studio-muted)]">בחירת תאריך</span>}
                                                    <CalendarIcon aria-hidden="true" className="h-4 w-4 text-[var(--studio-muted)]" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent side="top" sideOffset={8} className="studio-admin-calendar w-auto border-[#1b251c]/20 p-0" align="start">
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
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="text-xs font-bold">שעה</span>
                                            <CopyButton label="העתקת שעת האימון" value={newSession.time} disabled={!newSession.time} />
                                        </div>
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
                                            className={cn("min-h-12 rounded-xl px-1 text-xs font-bold transition-colors", !isPrivateSession ? "bg-[var(--studio-deep)] text-white" : "text-[var(--studio-muted)]")}
                                        >
                                            הרשמה פתוחה
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsPrivateSession(true)}
                                            aria-pressed={isPrivateSession}
                                            className={cn("min-h-12 rounded-xl px-1 text-xs font-bold transition-colors", isPrivateSession ? "bg-[var(--studio-deep)] text-white" : "text-[var(--studio-muted)]")}
                                        >
                                            בחירת מתאמנות
                                        </button>
                                    </div>

                                    {!isPrivateSession ? (
                                        <div className="space-y-2">
                                            <span className="text-xs font-bold">מספר מקומות</span>
                                            <div className="flex min-h-14 items-center gap-4 rounded-2xl border border-[#1b251c]/20 bg-[var(--studio-card)] p-2 ps-4">
                                                <div className="flex-1 text-lg font-bold tabular-nums">{newSession.max_capacity}</div>
                                                <div className="flex gap-2">
                                                    <button type="button" disabled={newSession.max_capacity <= 1} aria-label="הפחתת מקום" onClick={() => setNewSession(p => ({ ...p, max_capacity: Math.max(1, p.max_capacity - 1) }))} className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8ebdf] text-lg font-bold">−</button>
                                                    <button type="button" aria-label="הוספת מקום" onClick={() => setNewSession(p => ({ ...p, max_capacity: p.max_capacity + 1 }))} className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--studio-accent-bg)] text-lg font-bold">+</button>
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
                                                    className="text-xs font-bold text-[var(--studio-subtle)] underline underline-offset-4"
                                                >
                                                    {selectedTrainees.length > 0 ? "עריכה" : "בחירה"}
                                                </button>
                                            </div>
                                            {selectedTrainees.length === 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowTraineeSelector(true)}
                                                    className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#1b251c]/25 bg-[var(--studio-card)] p-4"
                                                >
                                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#dfe6bd]">
                                                        <Users aria-hidden="true" className="h-5 w-5" />
                                                    </div>
                                                    <span className="text-sm font-bold">בחירת מתאמנות לאימון</span>
                                                </button>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {selectedTrainees.map(t => (
                                                        <div key={t.id} className="flex items-center gap-2 rounded-xl border border-[#1b251c]/10 bg-[var(--studio-card)] p-2">
                                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--studio-accent-bg)] text-xs font-bold">
                                                                {t.full_name?.[0]}
                                                            </div>
                                                            <span className="truncate text-sm font-medium">{t.full_name}</span>
                                                        </div>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowTraineeSelector(true)}
                                                        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#1b251c]/25 bg-[var(--studio-card)] p-2 text-xs font-bold text-[var(--studio-subtle)]"
                                                    >
                                                        + עריכה
                                                    </button>
                                                </div>
                                            )}

                                            {/* Chips Preview - could be added here if needed, but the button text/count is decent for now */}
                                        </div>
                                    )}
                                </div>

                                </fieldset>
                                {createError && <div id="create-session-error"><AdminError message={createError} /></div>}
                            </form>
                </StudioModal>}
            </AnimatePresence>

            <AnimatePresence>
                {showTraineeSelector && <TraineeSelector selectedTrainees={selectedTrainees} onSelect={setSelectedTrainees} onClose={() => setShowTraineeSelector(false)} />}
            </AnimatePresence>

            <AnimatePresence>
                {viewBookingsSession && <StudioModal variant="admin" titleId="session-bookings-title" descriptionId="session-bookings-description" busy={isCancelling} onClose={closeBookings} actions={
                    <button type="button" data-modal-cancel disabled={isCancelling} onClick={closeBookings} className="studio-admin-action">סגירה</button>
                }>
                    <div className="mb-6">
                        <p id="session-bookings-description" className="text-xs font-bold text-[var(--studio-subtle)]">{viewBookingsSession.title}</p>
                        <h2 id="session-bookings-title" className="mt-2 text-[2rem] font-bold leading-tight">מי נרשמה?</h2>
                    </div>
                    <div className="space-y-3">
                        {loadingBookings ? <AdminLoading label="טוענים נרשמות..." /> : bookingsError ? <AdminError message={bookingsError} onRetry={() => void fetchBookings(viewBookingsSession.id)} /> : sessionBookings.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-[#1b251c]/20 bg-[var(--studio-card)] px-4 py-10 text-center text-sm text-[var(--studio-muted)]">עדיין אין נרשמות לאימון הזה.</div>
                        ) : sessionBookings.map(booking => (
                            <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1b251c]/10 bg-[var(--studio-card)] p-4">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--studio-neutral-bg)] text-sm font-bold">{booking.users?.full_name?.[0] || "?"}</div>
                                    <div className="min-w-0"><p dir="auto" className="break-words text-sm font-bold">{booking.users?.full_name || "ללא שם"}</p><p className="mt-1 text-xs text-[var(--studio-muted)]" dir="ltr">{booking.users?.phone}</p></div>
                                </div>
                                <button type="button" onClick={() => { setCancelError(null); setCancelTarget(booking); }} aria-label={`ביטול ההרשמה של ${booking.users?.full_name || "המתאמנת"}`} className="min-h-11 shrink-0 rounded-full border border-[var(--studio-danger)]/20 px-3 text-xs font-bold text-[var(--studio-danger)]">ביטול הרשמה</button>
                            </div>
                        ))}
                    </div>
                </StudioModal>}
            </AnimatePresence>

            <AnimatePresence>
                {cancelTarget && <StudioModal variant="admin" role="alertdialog" titleId="cancel-booking-title" descriptionId="cancel-booking-description" busy={isCancelling} onClose={() => setCancelTarget(null)} actions={<>
                    <button type="button" disabled={isCancelling} onClick={() => void handleCancelBooking(cancelTarget)} className="studio-admin-action" data-intent="danger" aria-busy={isCancelling}><AdminBusyLabel busy={isCancelling} idle="ביטול הרשמה והחזרת זיכוי" pending="מבטלים..." /></button>
                    <button type="button" data-modal-cancel disabled={isCancelling} onClick={() => setCancelTarget(null)} className="studio-admin-action" data-emphasis="outline">להשאיר את ההרשמה</button>
                </>}>
                    <h2 id="cancel-booking-title" className="text-[1.7rem] font-bold leading-tight">לבטל את ההרשמה?</h2>
                    <p id="cancel-booking-description" className="mt-3 text-sm leading-relaxed text-[var(--studio-muted)]">ההרשמה של {cancelTarget.users?.full_name || "המתאמנת"} לאימון ״{viewBookingsSession?.title}״ תבוטל, והזיכוי יוחזר לחשבונה.</p>
                    {cancelError && <div className="mt-4"><AdminError message={cancelError} /></div>}
                </StudioModal>}
            </AnimatePresence>

            <AnimatePresence>
                {deleteConfirmation.isOpen && <StudioModal variant="admin" role="alertdialog" titleId="delete-session-title" descriptionId="delete-session-description" busy={isDeleting} onClose={closeDelete} actions={<>
                    <button type="button" disabled={isDeleting} onClick={executeDeleteSession} className="studio-admin-action" data-intent="danger" aria-busy={isDeleting}><AdminBusyLabel busy={isDeleting} idle="כן, למחוק את האימון" pending="מוחקים..." /></button>
                    <button type="button" data-modal-cancel disabled={isDeleting} onClick={closeDelete} className="studio-admin-action" data-emphasis="outline">להשאיר את האימון</button>
                </>}>
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--studio-danger)]/10 text-[var(--studio-danger)]"><Trash2 aria-hidden="true" className="h-6 w-6" /></span>
                    <h2 id="delete-session-title" className="mt-5 text-[2rem] font-bold leading-tight">למחוק את האימון?</h2>
                    <p className="mt-3 break-words text-sm font-bold">״{deleteConfirmation.session?.title}״</p>
                    <p id="delete-session-description" className="mt-3 text-sm leading-relaxed text-[var(--studio-muted)]">{deleteConfirmation.userCount > 0 ? `${deleteConfirmation.userCount} נרשמות יקבלו את הזיכוי שלהן בחזרה. אי אפשר לבטל את המחיקה.` : "האימון יוסר מהלוח. אי אפשר לבטל את המחיקה."}</p>
                    {deleteError && <div className="mt-4"><AdminError message={deleteError} /></div>}
                </StudioModal>}
            </AnimatePresence>
        </div>
    );
}

