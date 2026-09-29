"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useCallback, useEffect, useState } from "react";
import { Search, User, Ticket } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import TicketUpdateModal from "@/components/admin/TicketUpdateModal";
import StudioLogo from "@/components/StudioLogo";

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
    const [searchTerm, setSearchTerm] = useState("");
    const [grantingTickets, setGrantingTickets] = useState<string | null>(null);
    const [selectedTraineeForUpdate, setSelectedTraineeForUpdate] = useState<Trainee | null>(null);
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const { toast } = useToast();

    const fetchTrainees = useCallback(async () => {
        try {
            const cutoff = new Date().toISOString();
            const [profilesRes, ticketsRes] = await Promise.all([
                supabase.from("profiles").select("id,full_name,email,phone,role").order("full_name", { ascending: true }),
                supabase.from("user_tickets").select("id,user_id").is("used_at", null).gt("expires_at", cutoff).order("user_id").order("id").range(0, 999),
            ]);
            if (profilesRes.error) throw profilesRes.error;
            const traineeProfiles = (profilesRes.data as Profile[]).filter((profile) => profile.role !== "administrator");
            const counts = new Map<string, number>();
            if (ticketsRes.error) {
                const fallback = await Promise.all(traineeProfiles.map((profile) => supabase.rpc("get_available_tickets", { p_user_id: profile.id })));
                fallback.forEach((result, index) => counts.set(traineeProfiles[index].id, result.data || 0));
            } else {
                let rows = ticketsRes.data || [];
                let offset = rows.length;
                while (rows.length > 0) {
                    rows.forEach(({ user_id }: { user_id: string }) => counts.set(user_id, (counts.get(user_id) || 0) + 1));
                    if (rows.length < 1000) break;
                    const next = await supabase.from("user_tickets").select("id,user_id").is("used_at", null).gt("expires_at", cutoff).order("user_id").order("id").range(offset, offset + 999);
                    if (next.error) throw next.error;
                    rows = next.data || [];
                    offset += rows.length;
                }
            }
            setTrainees(traineeProfiles.map((profile) => ({ ...profile, tickets: counts.get(profile.id) || 0 })));
        } catch (error) {
            console.error(error);
            toast({ title: "לא הצלחנו לטעון את המתאמנות", description: "כדאי לנסות שוב בעוד רגע.", type: "error" });
        } finally {
            setLoading(false);
        }
    }, [supabase, toast]);

    useEffect(() => {
        fetchTrainees();
    }, [fetchTrainees]);

    const handleGrantTickets = async (userId: string, quantity: number) => {
        setGrantingTickets(userId);
        try {
            // 1. Grant Tickets DB
            const { data, error } = await supabase.rpc("admin_grant_tickets", {
                p_user_id: userId,
                p_quantity: quantity,
            });

            if (error) throw error;
            if (!data?.success) throw new Error(data?.message || "Ticket update failed");

            setTrainees(prev => prev.map(t =>
                t.id === userId ? { ...t, tickets: t.tickets + quantity } : t
            ));
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
            toast({ title: "שגיאה בהענקת כרטיסים", description: err instanceof Error ? err.message : "כדאי לנסות שוב בעוד רגע.", type: "error" });
        } finally {
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

                <div className="relative mt-4">
                    <Search aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#aebbad]" />
                    <input
                        type="text"
                        aria-label="חיפוש מתאמנת"
                        placeholder="חיפוש לפי שם, מייל או טלפון"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="min-h-12 w-full rounded-2xl border border-white/15 bg-[#202c21] py-2 pr-12 pl-4 text-sm text-[var(--studio-deep-contrast)] outline-none placeholder:text-[#aebbad] focus:border-[#dce780]"
                    />
                </div>
            </header>

            {loading ? (
                <div aria-label="טוענים מתאמנות" className="space-y-3">
                    {Array.from({ length: 2 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-[1.35rem] bg-[#202c21]" />)}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredTrainees.map((trainee) => (
                        <article
                            key={trainee.id}
                            className="rounded-[1.35rem] bg-[var(--studio-sheet)] p-4 text-[var(--studio-ink)]"
                        >
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--studio-coral-bg)] text-lg font-bold text-[var(--studio-ink)]">
                                    {trainee.full_name ? trainee.full_name[0] : <User aria-hidden="true" className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="truncate text-lg font-bold">{trainee.full_name || "ללא שם"}</h2>
                                    {trainee.phone && <p dir="ltr" className="mt-1 truncate text-right text-xs text-[var(--studio-muted)]">{trainee.phone}</p>}
                                    <p dir="ltr" className="mt-1 truncate text-right text-xs text-[var(--studio-muted)]">{trainee.email}</p>
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

                    {filteredTrainees.length === 0 && (
                        <div className="rounded-[1.75rem] border border-dashed border-white/15 bg-[#202c21]/50 px-5 py-12 text-center text-sm text-[#aebbad]">
                            {searchTerm ? "לא נמצאו מתאמנות שמתאימות לחיפוש." : "אין מתאמנות להצגה כרגע."}
                        </div>
                    )}
                </div>
            )}

            {/* Ticket Update Modal */}
            <TicketUpdateModal
                isOpen={isTicketModalOpen}
                onClose={() => setIsTicketModalOpen(false)}
                onConfirm={(amount) => { if (selectedTraineeForUpdate) void handleGrantTickets(selectedTraineeForUpdate.id, amount); }}
                traineeName={selectedTraineeForUpdate?.full_name ?? ""}
                currentBalance={selectedTraineeForUpdate?.tickets ?? 0}
                isUpdating={!!selectedTraineeForUpdate && grantingTickets === selectedTraineeForUpdate.id}
            />
        </div>
    );
}
