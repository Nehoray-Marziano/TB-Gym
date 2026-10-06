"use client";

/**
 * Admin Daily Operational Dashboard
 * Focused on real-time workout status, quick operational modals, and daily timeline.
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import {
    Plus,
    Ticket,
    Bell,
    Users,
    Clock,
    ChevronLeft,
    Sparkles,
    CheckCircle2,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import StudioLogo from "@/components/StudioLogo";
import StudioBotanical from "@/components/StudioBotanical";
import { AdminError, AdminLoading } from "@/components/admin/AdminFeedback";
import QuickRosterModal, { type SessionSummary } from "@/components/admin/QuickRosterModal";
import QuickGrantModal, { type TraineeBalance } from "@/components/admin/QuickGrantModal";
import QuickSessionModal from "@/components/admin/QuickSessionModal";
import QuickBroadcastModal from "@/components/admin/QuickBroadcastModal";

type RawSession = {
    id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    max_capacity: number;
    current_bookings: number;
};

export default function AdminDashboardPage() {
    const supabase = getSupabaseClient();

    // Data states
    const [sessions, setSessions] = useState<RawSession[]>([]);
    const [trainees, setTrainees] = useState<TraineeBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);

    // Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isGrantOpen, setIsGrantOpen] = useState(false);
    const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
    const [selectedRosterSession, setSelectedRosterSession] = useState<SessionSummary | null>(null);

    const loadDashboardData = useCallback(async () => {
        setError(false);
        try {
            const now = new Date();
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);

            const [sessionsRes, traineesRes] = await Promise.all([
                supabase
                    .from("gym_sessions_with_counts")
                    .select("id, title, description, start_time, end_time, max_capacity, current_bookings")
                    .gte("start_time", startOfDay.toISOString())
                    .order("start_time", { ascending: true }),
                supabase.rpc("admin_list_trainees"),
            ]);

            if (sessionsRes.error || traineesRes.error) {
                console.error("Dashboard load error", sessionsRes.error, traineesRes.error);
                setError(true);
                return;
            }

            setSessions((sessionsRes.data || []) as RawSession[]);
            setTrainees((traineesRes.data || []) as TraineeBalance[]);
        } catch (err) {
            console.error("Dashboard exception", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        void loadDashboardData();
    }, [loadDashboardData, attempt]);

    // Sessions breakdown computed against current time
    const {
        todaySessions,
        nextSessionToday,
        isNextSessionActive,
        otherSessionsToday,
        firstFutureSession,
    } = useMemo(() => {
        const currentTime = new Date();
        const endOfDay = new Date(currentTime);
        endOfDay.setHours(23, 59, 59, 999);

        const today = sessions.filter((s) => new Date(s.start_time) <= endOfDay);
        const next = today.find((s) => new Date(s.end_time) > currentTime) || null;
        let isActive = false;
        if (next) {
            const start = new Date(next.start_time);
            const end = new Date(next.end_time);
            isActive = currentTime >= start && currentTime <= end;
        }
        const others = next
            ? today.filter((s) => s.id !== next.id && new Date(s.start_time) > currentTime)
            : [];
        const future = sessions.find((s) => new Date(s.start_time) > currentTime) || null;

        return {
            todaySessions: today,
            nextSessionToday: next,
            isNextSessionActive: isActive,
            otherSessionsToday: others,
            firstFutureSession: future,
        };
    }, [sessions]);

    // Vitals metrics
    const totalTodayCapacity = todaySessions.reduce((acc, s) => acc + s.max_capacity, 0);
    const totalTodayBooked = todaySessions.reduce((acc, s) => acc + (s.current_bookings || 0), 0);
    const todayOccupancyPercent =
        totalTodayCapacity > 0 ? Math.round((totalTodayBooked / totalTodayCapacity) * 100) : 0;
    const upcomingSessionsCount = useMemo(() => {
        const currentTime = new Date();
        return sessions.filter((s) => new Date(s.start_time) > currentTime).length;
    }, [sessions]);

    const formatHour = (iso: string) => {
        return new Date(iso).toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Jerusalem",
        });
    };

    const formatDateHebrew = (iso: string) => {
        return new Date(iso).toLocaleDateString("he-IL", {
            weekday: "long",
            day: "numeric",
            month: "numeric",
            timeZone: "Asia/Jerusalem",
        });
    };

    return (
        <div className="space-y-6 text-[var(--studio-deep-contrast)]">
            {/* Header: Studio Brand & Daily Cockpit Status */}
            <header className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <StudioLogo tight className="h-10 w-10 shrink-0 bg-[var(--studio-accent-bg)]" />
                    <div>
                        <p className="text-[11px] font-bold tracking-wide text-[var(--studio-accent-text)]">
                            סטודיו טליה
                        </p>
                        <h1 className="text-[1.85rem] font-bold leading-none tracking-tight">
                            חדר בקרה יומי<span className="text-[var(--studio-coral-text)]">.</span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-[var(--studio-deep-contrast)]/90">סטודיו פעיל</span>
                </div>
            </header>

            {loading ? (
                <div className="py-12">
                    <AdminLoading label="טוענים את נתוני הסטודיו להיום..." />
                </div>
            ) : error ? (
                <AdminError
                    message="לא הצלחנו לטעון את נתוני הדשבורד כרגע."
                    onRetry={() => setAttempt((v) => v + 1)}
                />
            ) : (
                <>
                    {/* 1. HERO STAGE: Today's Active / Next Workout */}
                    <section aria-label="האימון הבא היום">
                        {nextSessionToday ? (
                            <div className="relative isolate overflow-hidden rounded-[2rem_1.2rem_2rem_1.2rem] bg-gradient-to-br from-[#8b8e6f] via-[#7d8063] to-[#6a6c52] p-5 text-[var(--studio-ink)] shadow-xl">
                                <StudioBotanical className="studio-botanical-drift pointer-events-none absolute -bottom-14 -left-20 h-48 w-80 text-[var(--studio-deep)]/25" />

                                {/* Top Badges */}
                                <div className="relative flex items-center justify-between gap-2">
                                    <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--studio-deep)]/15 px-3 py-1 text-xs font-bold">
                                        <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-[var(--studio-deep)]" />
                                        <span>{isNextSessionActive ? "אימון פעיל כעת" : "האימון הבא היום"}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs font-bold text-[var(--studio-deep)]/80">
                                        <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                                        <span>
                                            {formatHour(nextSessionToday.start_time)} - {formatHour(nextSessionToday.end_time)}
                                        </span>
                                    </div>
                                </div>

                                {/* Class Title */}
                                <div className="relative mt-3 min-w-0">
                                    <h2
                                        className="truncate text-2xl font-bold tracking-tight text-[var(--studio-deep)]"
                                        title={nextSessionToday.title}
                                    >
                                        {nextSessionToday.title}
                                    </h2>
                                    {nextSessionToday.description && (
                                        <p className="mt-0.5 line-clamp-1 text-xs font-medium text-[var(--studio-deep)]/75">
                                            {nextSessionToday.description}
                                        </p>
                                    )}
                                </div>

                                {/* Occupancy Bar */}
                                <div className="relative mt-4 rounded-xl bg-[var(--studio-deep)]/10 p-3 backdrop-blur-xs">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="text-[var(--studio-deep)]/80">רשומות לאימון</span>
                                        <span className="tabular-nums text-[var(--studio-deep)]">
                                            {nextSessionToday.current_bookings || 0} / {nextSessionToday.max_capacity} מקומות
                                        </span>
                                    </div>
                                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--studio-deep)]/15">
                                        <div
                                            style={{
                                                width: `${Math.min(
                                                    ((nextSessionToday.current_bookings || 0) / nextSessionToday.max_capacity) * 100,
                                                    100
                                                )}%`,
                                            }}
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                (nextSessionToday.current_bookings || 0) >= nextSessionToday.max_capacity
                                                    ? "bg-[#a53d35]"
                                                    : "bg-[var(--studio-deep)]"
                                            }`}
                                        />
                                    </div>
                                </div>

                                {/* Quick Action Button inside Hero */}
                                <div className="relative mt-4 flex items-center justify-between gap-3 border-t border-[var(--studio-deep)]/15 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRosterSession(nextSessionToday)}
                                        className="flex min-h-10 items-center gap-2 rounded-xl bg-[var(--studio-deep)] px-3.5 text-xs font-bold text-[var(--studio-deep-contrast)] shadow-sm transition-transform active:scale-95"
                                    >
                                        <Users aria-hidden="true" className="h-4 w-4" />
                                        <span>רשימת מתאמנות ({nextSessionToday.current_bookings || 0})</span>
                                    </button>

                                    <span className="text-[11px] font-semibold text-[var(--studio-deep)]/70">
                                        {nextSessionToday.max_capacity - (nextSessionToday.current_bookings || 0) > 0
                                            ? `נותרו ${nextSessionToday.max_capacity - (nextSessionToday.current_bookings || 0)} מקומות`
                                            : "תפוסה מלאה"}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="relative isolate overflow-hidden rounded-[2rem_1.2rem_2rem_1.2rem] border border-white/10 bg-[var(--admin-surface)] p-5 text-[var(--studio-deep-contrast)]">
                                <StudioBotanical className="pointer-events-none absolute -bottom-10 -left-16 h-40 w-64 text-white/5" />
                                <div className="flex items-center gap-2 text-xs font-bold text-[var(--studio-accent-text)]">
                                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                                    <span>האימונים להיום הסתיימו</span>
                                </div>
                                <h2 className="mt-2 text-xl font-bold leading-tight">
                                    המשך יום נעים, טליה ✦
                                </h2>
                                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                                    {firstFutureSession ? (
                                        <>
                                            האימון הבא:{" "}
                                            <span className="font-bold text-[var(--studio-deep-contrast)]">
                                                {formatDateHebrew(firstFutureSession.start_time)} ב-
                                                {formatHour(firstFutureSession.start_time)} ({firstFutureSession.title})
                                            </span>
                                        </>
                                    ) : (
                                        "אין אימונים מתוזמנים נוספים בלוח כרגע."
                                    )}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(true)}
                                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--studio-accent-bg)] px-3.5 text-xs font-bold text-[var(--studio-ink)] transition-transform active:scale-95"
                                >
                                    <Plus aria-hidden="true" className="h-4 w-4" />
                                    <span>פתיחת אימון חדש</span>
                                </button>
                            </div>
                        )}
                    </section>

                    {/* 2. RAPID IN-PLACE ACTIONS (Open Modals Directly - NOT Navigation Links!) */}
                    <section aria-label="פעולות תפעול מהירות">
                        <div className="grid grid-cols-3 gap-2.5">
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(true)}
                                className="group flex min-h-[4.75rem] flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-[var(--admin-surface)] p-2 text-center transition-all hover:border-[var(--studio-accent-bg)]/40 hover:bg-white/5 active:scale-95"
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--studio-accent-bg)]/20 text-[var(--studio-accent-text)] transition-transform group-hover:scale-110">
                                    <Plus aria-hidden="true" className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-bold text-[var(--studio-deep-contrast)]">אימון חדש</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsGrantOpen(true)}
                                className="group flex min-h-[4.75rem] flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-[var(--admin-surface)] p-2 text-center transition-all hover:border-[var(--studio-accent-bg)]/40 hover:bg-white/5 active:scale-95"
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#c37a61]/20 text-[var(--studio-coral-text)] transition-transform group-hover:scale-110">
                                    <Ticket aria-hidden="true" className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-bold text-[var(--studio-deep-contrast)]">טעינת כרטיס</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsBroadcastOpen(true)}
                                className="group flex min-h-[4.75rem] flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-[var(--admin-surface)] p-2 text-center transition-all hover:border-[var(--studio-accent-bg)]/40 hover:bg-white/5 active:scale-95"
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300 transition-transform group-hover:scale-110">
                                    <Bell aria-hidden="true" className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-bold text-[var(--studio-deep-contrast)]">שידור הודעה</span>
                            </button>
                        </div>
                    </section>

                    {/* 3. TODAY'S SCHEDULE TIMELINE (Remaining Sessions) */}
                    {otherSessionsToday.length > 0 && (
                        <section aria-label="ציר הזמן של שאר היום">
                            <div className="mb-2.5 flex items-center justify-between">
                                <h3 className="text-xs font-bold text-[var(--admin-muted)]">
                                    עוד היום בסטודיו ({otherSessionsToday.length})
                                </h3>
                                <span className="text-[11px] text-[var(--admin-muted)]">לחצי לצפייה ברשומות</span>
                            </div>

                            <div className="space-y-2">
                                {otherSessionsToday.map((session) => {
                                    const isFull = (session.current_bookings || 0) >= session.max_capacity;
                                    return (
                                        <button
                                            key={session.id}
                                            type="button"
                                            onClick={() => setSelectedRosterSession(session)}
                                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[var(--admin-surface)] p-3 text-right transition-all hover:bg-white/5 active:scale-[0.99]"
                                        >
                                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                                <div className="flex h-10 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-white/5 font-mono text-xs font-bold text-[var(--studio-accent-text)]">
                                                    {formatHour(session.start_time)}
                                                </div>
                                                <div className="min-w-0 flex-1 overflow-hidden">
                                                    <p
                                                        className="truncate text-sm font-bold text-[var(--studio-deep-contrast)]"
                                                        title={session.title}
                                                    >
                                                        {session.title}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                                                        {formatHour(session.start_time)} - {formatHour(session.end_time)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-2">
                                                <span
                                                    className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                                                        isFull
                                                            ? "bg-[var(--studio-danger)]/20 text-red-300"
                                                            : "bg-white/10 text-[var(--studio-deep-contrast)]"
                                                    }`}
                                                >
                                                    {session.current_bookings || 0} / {session.max_capacity}
                                                </span>
                                                <ChevronLeft aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--admin-muted)]" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* 4. STUDIO PULSE VITALS */}
                    <section aria-label="מדדי דופק הסטודיו">
                        <div className="grid grid-cols-3 gap-2.5">
                            <div className="rounded-2xl border border-white/10 bg-[var(--admin-surface)] p-3.5">
                                <p className="text-[11px] font-semibold text-[var(--admin-muted)]">תפוסה היום</p>
                                <p className="mt-1.5 text-xl font-bold tabular-nums text-[var(--studio-accent-text)]">
                                    {todayOccupancyPercent}%
                                </p>
                                <p className="mt-0.5 text-[10px] text-[var(--admin-muted)]">
                                    {totalTodayBooked}/{totalTodayCapacity} מתאמנות
                                </p>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-[var(--admin-surface)] p-3.5">
                                <p className="text-[11px] font-semibold text-[var(--admin-muted)]">מתאמנות בסטודיו</p>
                                <p className="mt-1.5 text-xl font-bold tabular-nums text-[var(--studio-accent-text)]">
                                    {trainees.length}
                                </p>
                                <p className="mt-0.5 text-[10px] text-[var(--admin-muted)]">
                                    קהילה פעילה
                                </p>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-[var(--admin-surface)] p-3.5">
                                <p className="text-[11px] font-semibold text-[var(--admin-muted)]">אימונים השבוע</p>
                                <p className="mt-1.5 text-xl font-bold tabular-nums text-[var(--studio-accent-text)]">
                                    {upcomingSessionsCount}
                                </p>
                                <p className="mt-0.5 text-[10px] text-[var(--admin-muted)]">
                                    קרובים בלוח
                                </p>
                            </div>
                        </div>
                    </section>
                </>
            )}

            {/* MODALS: Rapid Micro-Actions */}
            <QuickSessionModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSessionCreated={() => {
                    void loadDashboardData();
                }}
            />

            <QuickGrantModal
                isOpen={isGrantOpen}
                onClose={() => setIsGrantOpen(false)}
                onGranted={() => {
                    void loadDashboardData();
                }}
            />

            <QuickBroadcastModal
                isOpen={isBroadcastOpen}
                onClose={() => setIsBroadcastOpen(false)}
            />

            <QuickRosterModal
                isOpen={!!selectedRosterSession}
                session={selectedRosterSession}
                onClose={() => setSelectedRosterSession(null)}
                onRosterChanged={() => {
                    void loadDashboardData();
                }}
            />
        </div>
    );
}
