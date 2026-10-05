"use client";

import { useState, useRef } from "react";
import { X, Calendar as CalendarIcon, Users } from "lucide-react";
import { format } from "date-fns";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { StudioModal } from "@/components/ui/StudioModal";
import { AdminBusyLabel, AdminError } from "@/components/admin/AdminFeedback";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MuiTimePickerWrapper } from "@/components/ui/time-picker-mui";
import { CopyableInput } from "@/components/ui/copyable-field";
import { CopyButton } from "@/components/ui/copy-button";
import { TraineeSelector, type Trainee } from "@/components/admin/trainee-selector";
import { useToast } from "@/components/ui/use-toast";
import { getAdminMutationRequestId, completeAdminMutationIntent } from "@/lib/adminMutationIntent";
import { cn } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";

interface QuickSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSessionCreated: () => void;
}

const COMMON_TITLES = [
    "פילאטיס מכשירים",
    "אימון כוח וחיטוב",
    "אימון פונקציונלי",
    "אימון ליבה ומתיחות",
];

export default function QuickSessionModal({
    isOpen,
    onClose,
    onSessionCreated,
}: QuickSessionModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <QuickSessionSheet
                    onClose={onClose}
                    onSessionCreated={onSessionCreated}
                />
            )}
        </AnimatePresence>
    );
}

function QuickSessionSheet({
    onClose,
    onSessionCreated,
}: {
    onClose: () => void;
    onSessionCreated: () => void;
}) {
    const supabase = getSupabaseClient();
    const { toast } = useToast();

    const [title, setTitle] = useState("");
    const [date, setDate] = useState<Date | undefined>(() => new Date());
    const [time, setTime] = useState("08:00");
    const [maxCapacity, setMaxCapacity] = useState(10);
    const [isPrivate, setIsPrivate] = useState(false);
    const [selectedTrainees, setSelectedTrainees] = useState<Trainee[]>([]);
    const [showTraineeSelector, setShowTraineeSelector] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mutationLock = useRef(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mutationLock.current) return;

        if (!title.trim() || !date || (isPrivate && selectedTrainees.length === 0)) {
            setError("יש להזין שם אימון ותאריך ולבחור מתאמנות אם האימון פרטי.");
            return;
        }

        mutationLock.current = true;
        setIsCreating(true);
        setError(null);

        try {
            const [hours, minutes] = time.split(":").map(Number);
            const start = new Date(date);
            start.setHours(hours, minutes, 0, 0);
            const end = new Date(start.getTime() + 60 * 60 * 1000);

            const finalCapacity = isPrivate ? selectedTrainees.length : maxCapacity;
            const actorId = (await supabase.auth.getSession()).data.session?.user.id;
            if (!actorId) throw new Error("אימות נדרש");

            const payload = {
                p_title: title.trim(),
                p_description: "",
                p_start_time: start.toISOString(),
                p_end_time: end.toISOString(),
                p_max_capacity: finalCapacity,
                p_user_ids: isPrivate ? selectedTrainees.map((t) => t.id).sort() : [],
            };

            const requestId = await getAdminMutationRequestId("create_session", actorId, payload);
            const { data, error: rpcError } = await supabase.rpc("admin_create_session_once", {
                ...payload,
                p_request_id: requestId,
            });

            if (rpcError) throw rpcError;
            if (!data?.success) throw new Error(data?.message || "Failed to create session");

            completeAdminMutationIntent("create_session", actorId, requestId);

            toast({ title: "האימון נוסף בהצלחה ללוח", type: "success" });
            onSessionCreated();
            onClose();
        } catch (err) {
            console.error(err);
            setError("לא הצלחנו לפתוח את האימון כרגע. נסי שוב.");
        } finally {
            mutationLock.current = false;
            setIsCreating(false);
        }
    };

    return (
        <>
            <StudioModal
                variant="admin"
                titleId="quick-session-title"
                descriptionId="quick-session-description"
                busy={isCreating}
                onClose={onClose}
                actions={
                    <button
                        type="submit"
                        form="quick-session-form"
                        disabled={isCreating || !title.trim() || !date || (isPrivate && selectedTrainees.length === 0)}
                        className="studio-admin-action w-full"
                        aria-busy={isCreating}
                    >
                        <AdminBusyLabel busy={isCreating} idle="פרסום אימון" pending="מפרסמים..." />
                    </button>
                }
                header={
                    <>
                        <button
                            type="button"
                            data-modal-cancel
                            disabled={isCreating}
                            onClick={onClose}
                            aria-label="סגירת אימון חדש"
                            className="studio-admin-modal-close"
                        >
                            <X aria-hidden="true" className="h-5 w-5" />
                        </button>
                        <div className="studio-admin-modal-heading">
                            <p id="quick-session-description" className="text-xs font-bold text-[var(--studio-subtle)]">
                                יצירה מהירה של אימון
                            </p>
                            <h2 id="quick-session-title" className="mt-1.5 text-[1.8rem] font-bold leading-tight">
                                אימון חדש.
                            </h2>
                        </div>
                    </>
                }
            >
                <form id="quick-session-form" onSubmit={handleCreate} className="space-y-4">
                    {/* Session Title */}
                    <div className="space-y-2">
                        <label htmlFor="quick-title" className="block text-xs font-bold text-[var(--studio-ink)]">
                            שם האימון
                        </label>
                        <CopyableInput
                            id="quick-title"
                            copyLabel="העתקת שם האימון"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="לדוגמה: פילאטיס מכשירים"
                            required
                            className="min-h-12 w-full rounded-2xl border border-[#1b251c]/20 bg-[var(--studio-card)] px-4 text-sm font-bold outline-none"
                        />
                        {/* Title Suggestions */}
                        <div className="flex flex-wrap gap-1.5">
                            {COMMON_TITLES.map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setTitle(t)}
                                    className="rounded-lg border border-[#1b251c]/15 bg-[var(--studio-sheet)] px-2.5 py-1 text-[11px] font-semibold text-[var(--studio-ink)] transition-colors hover:bg-[var(--studio-accent-bg)]/20"
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[var(--studio-ink)]">תאריך</span>
                                <CopyButton
                                    label="העתקת תאריך"
                                    value={date ? format(date, "dd/MM/yyyy") : ""}
                                    disabled={!date}
                                />
                            </div>
                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-12 w-full justify-between rounded-2xl border-[#1b251c]/20 bg-[var(--studio-card)] px-3 text-xs font-bold text-[var(--studio-ink)]"
                                    >
                                        {date ? format(date, "dd/MM/yyyy") : "בחירת תאריך"}
                                        <CalendarIcon aria-hidden="true" className="h-4 w-4 text-[var(--studio-muted)]" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    side="top"
                                    sideOffset={8}
                                    className="studio-admin-calendar w-auto border-[#1b251c]/20 p-0"
                                    align="start"
                                >
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={(d) => {
                                            if (d) {
                                                setDate(d);
                                                setIsCalendarOpen(false);
                                            }
                                        }}
                                        initialFocus
                                        className="rounded-xl border border-[#1b251c]/15"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[var(--studio-ink)]">שעה</span>
                                <CopyButton label="העתקת שעה" value={time} disabled={!time} />
                            </div>
                            <MuiTimePickerWrapper value={time} onChange={(t) => setTime(t)} />
                        </div>
                    </div>

                    {/* Public or Private */}
                    <div className="space-y-3 pt-1">
                        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#dfe4d0] p-1">
                            <button
                                type="button"
                                onClick={() => setIsPrivate(false)}
                                aria-pressed={!isPrivate}
                                className={cn(
                                    "min-h-11 rounded-xl text-xs font-bold transition-colors",
                                    !isPrivate ? "bg-[var(--studio-deep)] text-white" : "text-[var(--studio-muted)]"
                                )}
                            >
                                הרשמה פתוחה
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPrivate(true)}
                                aria-pressed={isPrivate}
                                className={cn(
                                    "min-h-11 rounded-xl text-xs font-bold transition-colors",
                                    isPrivate ? "bg-[var(--studio-deep)] text-white" : "text-[var(--studio-muted)]"
                                )}
                            >
                                לקבוצה סגורה
                            </button>
                        </div>

                        {!isPrivate ? (
                            <div className="flex items-center justify-between rounded-2xl border border-[#1b251c]/20 bg-[var(--studio-card)] p-3">
                                <div>
                                    <span className="block text-xs font-bold text-[var(--studio-ink)]">מקסימום מתאמנות</span>
                                    <span className="text-[11px] text-[var(--studio-muted)]">מקומות פנויים להרשמה</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        disabled={maxCapacity <= 1}
                                        onClick={() => setMaxCapacity((c) => Math.max(1, c - 1))}
                                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8ebdf] text-base font-bold disabled:opacity-40"
                                    >
                                        −
                                    </button>
                                    <span className="min-w-6 text-center text-lg font-bold tabular-nums">
                                        {maxCapacity}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setMaxCapacity((c) => c + 1)}
                                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--studio-accent-bg)] text-base font-bold text-[var(--studio-ink)]"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold">מוזמנות ({selectedTrainees.length})</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowTraineeSelector(true)}
                                        className="text-xs font-bold text-[var(--studio-subtle)] underline"
                                    >
                                        {selectedTrainees.length > 0 ? "שינוי בחירה" : "בחירת מתאמנות"}
                                    </button>
                                </div>
                                {selectedTrainees.length === 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowTraineeSelector(true)}
                                        className="flex min-h-20 w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[#1b251c]/25 bg-[var(--studio-card)] p-3"
                                    >
                                        <Users aria-hidden="true" className="h-5 w-5 opacity-50" />
                                        <span className="text-xs font-bold">לחצי לבחירת מתאמנות לאימון זה</span>
                                    </button>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                        {selectedTrainees.map((t) => (
                                            <span
                                                key={t.id}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#1b251c]/15 bg-[var(--studio-card)] px-2.5 py-1 text-xs font-bold"
                                            >
                                                {t.full_name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {error && <AdminError message={error} />}
                </form>
            </StudioModal>

            <AnimatePresence>
                {showTraineeSelector && (
                    <TraineeSelector
                        selectedTrainees={selectedTrainees}
                        onSelect={setSelectedTrainees}
                        onClose={() => setShowTraineeSelector(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
