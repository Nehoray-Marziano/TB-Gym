"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { sendNotificationRequest } from "@/lib/notificationRequest";
import { X, Phone, MessageCircle, UserX, Clock, Users } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { StudioModal } from "@/components/ui/StudioModal";
import { AdminBusyLabel, AdminError, AdminLoading } from "@/components/admin/AdminFeedback";
import { useToast } from "@/components/ui/use-toast";
import { AnimatePresence } from "framer-motion";

export type SessionSummary = {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    max_capacity: number;
    current_bookings: number;
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
    } | null;
};

interface QuickRosterModalProps {
    isOpen: boolean;
    session: SessionSummary | null;
    onClose: () => void;
    onRosterChanged?: () => void;
}

export default function QuickRosterModal({ isOpen, session, onClose, onRosterChanged }: QuickRosterModalProps) {
    return (
        <AnimatePresence>
            {isOpen && session && (
                <QuickRosterSheet
                    session={session}
                    onClose={onClose}
                    onRosterChanged={onRosterChanged}
                />
            )}
        </AnimatePresence>
    );
}

function QuickRosterSheet({
    session,
    onClose,
    onRosterChanged,
}: {
    session: SessionSummary;
    onClose: () => void;
    onRosterChanged?: () => void;
}) {
    const supabase = getSupabaseClient();
    const { toast } = useToast();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);
    const requestId = useRef(0);

    const loadBookings = useCallback(async () => {
        const req = ++requestId.current;
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchErr } = await supabase
                .from("bookings")
                .select("id, status, created_at, user_id, users:profiles!user_id (id, full_name, email, phone)")
                .eq("session_id", session.id)
                .eq("status", "confirmed");
            if (req !== requestId.current) return;
            if (fetchErr) throw fetchErr;
            setBookings((data || []) as unknown as Booking[]);
        } catch {
            if (req === requestId.current) {
                setError("לא הצלחנו לטעון את רשימת הנרשמות. נסי שוב בעוד רגע.");
            }
        } finally {
            if (req === requestId.current) setLoading(false);
        }
    }, [supabase, session.id]);

    useEffect(() => {
        void loadBookings();
    }, [loadBookings]);

    const handleConfirmCancel = async () => {
        if (!cancellingBooking || isCancelling) return;
        setIsCancelling(true);
        setCancelError(null);
        try {
            const { error: cancelErr } = await supabase.rpc("admin_cancel_booking", {
                p_booking_id: cancellingBooking.id,
            });
            if (cancelErr) throw cancelErr;

            // Notify user
            void sendNotificationRequest("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: "הוסרת מהאימון",
                    message: `הוסרת מהאימון "${session.title}". הזיכוי הוחזר לחשבונך.`,
                    targetUserIds: [cancellingBooking.user_id],
                }),
            }).catch(error => {
                console.error(error);
                toast({ title: "ההרשמה בוטלה, אבל לא נשלחה התראה", type: "error" });
            });

            toast({ title: "ההרשמה בוטלה והזיכוי הוחזר למתאמנת", type: "success" });
            setCancellingBooking(null);
            await loadBookings();
            onRosterChanged?.();
        } catch {
            setCancelError("לא הצלחנו לבטל את ההרשמה כרגע. נסי שוב.");
        } finally {
            setIsCancelling(false);
        }
    };

    const formatWhatsAppUrl = (phone?: string, name?: string) => {
        if (!phone) return "#";
        const clean = phone.replace(/\D/g, "").replace(/^0/, "972");
        const greeting = encodeURIComponent(`היי ${name || ""}, לגבי האימון "${session.title}" היום בסטודיו טליה...`);
        return `https://wa.me/${clean}?text=${greeting}`;
    };

    const startTimeFormatted = new Date(session.start_time).toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jerusalem",
    });

    return (
        <>
            <StudioModal
                variant="admin"
                titleId="quick-roster-title"
                descriptionId="quick-roster-description"
                busy={isCancelling}
                onClose={onClose}
                actions={
                    <button
                        type="button"
                        data-modal-cancel
                        onClick={onClose}
                        className="studio-admin-action w-full"
                    >
                        סגירה
                    </button>
                }
                header={
                    <>
                        <button
                            type="button"
                            data-modal-cancel
                            disabled={isCancelling}
                            onClick={onClose}
                            aria-label="סגירת רשימת הנרשמות"
                            className="studio-admin-modal-close"
                        >
                            <X aria-hidden="true" className="h-5 w-5" />
                        </button>
                        <div className="studio-admin-modal-heading">
                            <div className="flex items-center gap-2 text-xs font-bold text-[var(--studio-subtle)]">
                                <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                                <span>{startTimeFormatted}</span>
                                <span>•</span>
                                <span>{bookings.length} / {session.max_capacity} רשומות</span>
                            </div>
                            <h2 id="quick-roster-title" className="mt-1.5 text-[1.8rem] font-bold leading-tight">
                                {session.title}
                            </h2>
                        </div>
                    </>
                }
            >
                <div className="space-y-3 pb-2">
                    {loading ? (
                        <AdminLoading label="טוענים נרשמות..." />
                    ) : error ? (
                        <AdminError message={error} onRetry={() => void loadBookings()} />
                    ) : bookings.length === 0 ? (
                        <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-[#1b251c]/20 bg-[var(--studio-card)] p-6 text-center text-sm text-[var(--studio-muted)]">
                            <Users aria-hidden="true" className="mb-2 h-7 w-7 opacity-40" />
                            <p className="font-bold">אין עדיין נרשמות לאימון זה</p>
                            <p className="mt-1 text-xs text-[var(--studio-muted)]/80">
                                מתאמנות יכולות לשריין מקום דרך לוח האימונים
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {bookings.map((booking) => {
                                const user = booking.users;
                                const name = user?.full_name || "מתאמנת ללא שם";
                                const phone = user?.phone || "";
                                const initial = name.trim()[0] || "?";

                                return (
                                    <div
                                        key={booking.id}
                                        className="flex items-center justify-between gap-3 rounded-2xl border border-[#1b251c]/10 bg-[var(--studio-card)] p-3.5 transition-all"
                                    >
                                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--studio-accent-bg)]/20 font-bold text-[var(--studio-ink)]">
                                                {initial}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-bold text-[var(--studio-ink)]">
                                                    {name}
                                                </p>
                                                {phone && (
                                                    <p className="mt-0.5 text-xs text-[var(--studio-muted)]" dir="ltr">
                                                        {phone}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {phone && (
                                                <>
                                                    <a
                                                        href={formatWhatsAppUrl(phone, name)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        aria-label={`שליחת וואטסאפ ל-${name}`}
                                                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#128C7E] transition-transform active:scale-95"
                                                        title="וואטסאפ"
                                                    >
                                                        <MessageCircle aria-hidden="true" className="h-4 w-4" />
                                                    </a>
                                                    <a
                                                        href={`tel:${phone}`}
                                                        aria-label={`התקשרות ל-${name}`}
                                                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--studio-neutral-bg)] text-[var(--studio-ink)] transition-transform active:scale-95"
                                                        title="התקשרות"
                                                    >
                                                        <Phone aria-hidden="true" className="h-4 w-4" />
                                                    </a>
                                                </>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setCancellingBooking(booking)}
                                                aria-label={`ביטול הרשמה של ${name}`}
                                                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--studio-danger)]/10 text-[var(--studio-danger)] transition-transform active:scale-95"
                                                title="ביטול הרשמה"
                                            >
                                                <UserX aria-hidden="true" className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </StudioModal>

            {/* Confirmation Dialog for cancelling a booking */}
            <AnimatePresence>
                {cancellingBooking && (
                    <StudioModal
                        variant="admin"
                        role="alertdialog"
                        titleId="cancel-booking-quick-title"
                        descriptionId="cancel-booking-quick-description"
                        busy={isCancelling}
                        onClose={() => setCancellingBooking(null)}
                        actions={
                            <>
                                <button
                                    type="button"
                                    disabled={isCancelling}
                                    onClick={handleConfirmCancel}
                                    className="studio-admin-action"
                                    data-intent="danger"
                                    aria-busy={isCancelling}
                                >
                                    <AdminBusyLabel
                                        busy={isCancelling}
                                        idle="ביטול הרשמה והחזרת זיכוי"
                                        pending="מבטלים..."
                                    />
                                </button>
                                <button
                                    type="button"
                                    data-modal-cancel
                                    disabled={isCancelling}
                                    onClick={() => setCancellingBooking(null)}
                                    className="studio-admin-action"
                                    data-emphasis="outline"
                                >
                                    השארת ההרשמה
                                </button>
                            </>
                        }
                    >
                        <h2 id="cancel-booking-quick-title" className="text-[1.6rem] font-bold leading-tight">
                            לבטל את ההרשמה?
                        </h2>
                        <p
                            id="cancel-booking-quick-description"
                            className="mt-3 text-sm leading-relaxed text-[var(--studio-muted)]"
                        >
                            ההרשמה של {cancellingBooking.users?.full_name || "המתאמנת"} לאימון &quot;{session.title}&quot; תבוטל
                            והכרטיסייה תוחזר לחשבונה באופן מיידי.
                        </p>
                        {cancelError && (
                            <div className="mt-4">
                                <AdminError message={cancelError} />
                            </div>
                        )}
                    </StudioModal>
                )}
            </AnimatePresence>
        </>
    );
}
