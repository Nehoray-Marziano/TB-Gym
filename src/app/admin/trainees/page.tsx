"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useCallback, useEffect, useRef, useState } from "react";
import { User, Ticket } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import TicketUpdateModal from "@/components/admin/TicketUpdateModal";
import StudioLogo from "@/components/StudioLogo";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { AdminError, AdminLoading } from "@/components/admin/AdminFeedback";
import { CopyButton } from "@/components/ui/copy-button";
import { getAdminMutationRequestId, completeAdminMutationIntent } from "@/lib/adminMutationIntent";

type Profile = {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    role: string;
};

type Trainee = Profile & {
    tickets: number;
};

export default function AdminTraineesPage() {
    const supabase = getSupabaseClient();
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [limit, setLimit] = useState(24);
    const requestId = useRef(0);
    const updateLock = useRef(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [grantingTickets, setGrantingTickets] = useState<string | null>(null);
    const [selectedTraineeForUpdate, setSelectedTraineeForUpdate] = useState<Trainee | null>(null);
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const { toast } = useToast();

    const fetchTrainees = useCallback(async () => {
        const request = ++requestId.current;
        setFetchError(null);
        try {
            const { data, error } = await supabase.rpc("admin_list_trainees");
            if (error) throw error;
            if (!Array.isArray(data)) throw new Error("Trainee balances unavailable");
            if (request !== requestId.current) return;
            setTrainees(data as Trainee[]);
        } catch {
            if (request === requestId.current) setFetchError("לא הצלחנו לטעון את המתאמנות והיתרות. נסי שוב.");
        } finally {
            if (request === requestId.current) setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        const counter = requestId;
        void fetchTrainees();
        return () => { counter.current++; };
    }, [fetchTrainees]);

    const handleGrantTickets = async (userId: string, quantity: number) => {
        if (updateLock.current) return;
        updateLock.current = true;
        requestId.current++;
        setGrantingTickets(userId);
        try {
            const actorId = (await supabase.auth.getSession()).data.session?.user.id;
            if (!actorId) throw new Error("Authentication required");
            const payload = {
                p_user_id: userId,
                p_quantity: quantity,
            };
            const requestId = await getAdminMutationRequestId("grant_tickets", actorId, payload);
            const { data, error } = await supabase.rpc("admin_grant_tickets_once", { ...payload, p_request_id: requestId });

            if (error) throw error;
            if (!data?.success) throw new Error(data?.message || "Ticket update failed");

            completeAdminMutationIntent("grant_tickets", actorId, requestId);
            // A replay or another admin's simultaneous change makes local
            // balance + quantity unreliable. Reload the persisted balance.
            await fetchTrainees();
            toast({ title: "הכרטיסים עודכנו בהצלחה", type: "success" });
            setIsTicketModalOpen(false);
            void fetch('/api/notifications/grant-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, amount: quantity })
            }).then(response => {
                if (!response.ok) throw new Error(`Notification failed: ${response.status}`);
            }).catch(error => {
                console.error(error);
                toast({ title: "היתרה עודכנה, אבל לא נשלחה התראה", type: "error" });
            });
        } catch (err: unknown) {
            console.error(err);
            throw err;
        } finally {
            updateLock.current = false;
            setGrantingTickets(null);
        }
    };

    const filteredTrainees = trainees.filter(t =>
        (t.full_name && t.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.email && t.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.phone && t.phone.includes(searchTerm))
    );

    return (
        <div className="space-y-4 text-[var(--studio-deep-contrast)]">
            {/* Header */}
            <header className="border-b border-white/15 pb-4">
                <div className="flex items-center gap-3">
                    <StudioLogo className="h-10 w-10 shrink-0 bg-[var(--studio-accent-bg)]" />
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-[var(--studio-accent-text)]">ניהול הסטודיו</p>
                        <h1 className="text-[1.9rem] font-bold leading-tight tracking-tight">המתאמנות</h1>
                    </div>
                    {!loading && <span className="text-sm font-bold tabular-nums text-[var(--studio-accent-text)]">{trainees.length}</span>}
                </div>

                <div className="mt-4"><AdminSearch dark value={searchTerm} onChange={value => { setSearchTerm(value); setLimit(24); }} /></div>
            </header>

            {loading ? (
                <AdminLoading label="טוענים מתאמנות..." />
            ) : (
                <div className="space-y-3">
                    {filteredTrainees.slice(0, limit).map((trainee) => (
                        <article
                            key={trainee.id}
                            className="studio-admin-card rounded-[1.35rem] bg-[var(--studio-sheet)] p-4 text-[var(--studio-ink)]"
                        >
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--studio-coral-bg)] text-lg font-bold text-[var(--studio-ink)]">
                                    {trainee.full_name ? trainee.full_name[0] : <User aria-hidden="true" className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex min-w-0 items-center gap-1">
                                        <h2 className="min-w-0 flex-1 break-words text-lg font-bold">{trainee.full_name || "ללא שם"}</h2>
                                        <CopyButton label="העתקת שם המתאמנת" value={trainee.full_name || ""} disabled={!trainee.full_name} />
                                    </div>
                                    <div className="flex min-w-0 items-center gap-1">
                                        <p dir="ltr" className="min-w-0 flex-1 break-all text-right text-xs text-[var(--studio-muted)]">{trainee.phone || "לא הוזן נייד"}</p>
                                        <CopyButton label="העתקת מספר הנייד של המתאמנת" value={trainee.phone || ""} disabled={!trainee.phone} />
                                    </div>
                                    <div className="flex min-w-0 items-center gap-1">
                                        <p dir="ltr" className="min-w-0 flex-1 break-all text-right text-xs text-[var(--studio-muted)]">{trainee.email || "לא הוזן מייל"}</p>
                                        <CopyButton label="העתקת כתובת המייל של המתאמנת" value={trainee.email || ""} disabled={!trainee.email} />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#162218]/15 pt-3">
                                <div>
                                    <p className="text-xs text-[var(--studio-muted)]">יתרת אימונים</p>
                                    <p className="mt-0.5 flex items-center gap-2 text-2xl font-bold tabular-nums"><Ticket aria-hidden="true" className="h-4 w-4 text-[var(--studio-subtle)]" />{trainee.tickets}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setSelectedTraineeForUpdate(trainee); setIsTicketModalOpen(true); }}
                                    className="min-h-11 shrink-0 rounded-full bg-[var(--studio-accent-bg)] px-4 text-xs font-bold text-[var(--studio-ink)] transition-colors active:bg-[#e9f19e]"
                                >
                                    עדכון יתרה
                                </button>
                            </div>
                        </article>
                    ))}

                    {!fetchError && filteredTrainees.length === 0 && (
                        <div className="rounded-[1.75rem] border border-dashed border-white/15 bg-[var(--admin-surface)]/50 px-5 py-12 text-center text-sm text-[var(--admin-muted)]">
                            {searchTerm ? "לא נמצאו מתאמנות שמתאימות לחיפוש." : "אין מתאמנות להצגה כרגע."}
                        </div>
                    )}
                </div>
            )}

            {fetchError && <AdminError message={fetchError} onRetry={() => void fetchTrainees()} />}
            {!loading && !fetchError && filteredTrainees.length > limit && <button type="button" onClick={() => setLimit(value => value + 24)} className="min-h-12 w-full rounded-full border border-white/20 text-sm font-bold">הצגת מתאמנות נוספות ({filteredTrainees.length - limit})</button>}

            {/* Ticket Update Modal */}
            <TicketUpdateModal
                isOpen={isTicketModalOpen}
                onClose={() => setIsTicketModalOpen(false)}
                onConfirm={async (amount) => { if (selectedTraineeForUpdate) await handleGrantTickets(selectedTraineeForUpdate.id, amount); }}
                traineeName={selectedTraineeForUpdate?.full_name ?? ""}
                currentBalance={selectedTraineeForUpdate?.tickets ?? 0}
                isUpdating={!!selectedTraineeForUpdate && grantingTickets === selectedTraineeForUpdate.id}
            />
        </div>
    );
}
