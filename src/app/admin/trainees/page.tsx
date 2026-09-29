"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useCallback, useEffect, useState } from "react";
import { Search, User, Ticket } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import TicketUpdateModal from "@/components/admin/TicketUpdateModal";
import { motion, useReducedMotion } from "framer-motion";
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
    subscription: {
        tier_display_name: string;
        expires_at: string;
        is_active: boolean;
    } | null;
};

export default function AdminTraineesPage() {
    const supabase = getSupabaseClient();
    const reduceMotion = useReducedMotion();
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [grantingTickets, setGrantingTickets] = useState<string | null>(null);
    const [selectedTraineeForUpdate, setSelectedTraineeForUpdate] = useState<Trainee | null>(null);
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const { toast } = useToast();

    const fetchTrainees = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("צריך להיכנס לחשבון כדי לראות את המתאמנות.");
            return;
        }

        // Get profiles
        const { data: profiles, error } = await supabase
            .from("profiles")
            .select("*")
            .order("full_name", { ascending: true });

        if (error) {
            console.error(error);
            toast({ title: "לא הצלחנו לטעון את המתאמנות", description: "כדאי לנסות שוב בעוד רגע.", type: "error" });
            return;
        }

        // For each profile, get tickets and subscription info
        const traineeProfiles = (profiles as Profile[]).filter((profile) => profile.role !== "administrator");
        const traineesWithData = await Promise.all(
            traineeProfiles.map(async (p) => {
                const [ticketRes, subRes] = await Promise.all([
                    supabase.rpc("get_available_tickets", { p_user_id: p.id }),
                    supabase.rpc("get_user_subscription", { p_user_id: p.id }),
                ]);

                return {
                    ...p,
                    tickets: ticketRes.data || 0,
                    subscription: subRes.data?.is_active ? subRes.data : null,
                };
            })
        );

        setTrainees(traineesWithData);
        setLoading(false);
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

            // 2. Send Notification
            const notifRes = await fetch('/api/notifications/grant-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, amount: quantity })
            });

            const notifData = await notifRes.json();

            if (!notifRes.ok) {
                console.error("Notification API Error:", notifData);
                toast({
                    title: "שגיאה בשליחת התראה",
                    description: JSON.stringify(notifData.error || "Unknown error"),
                    type: "error" // Using 'error' variant if available, or just title
                });
            } else {
                console.log("Notification sent:", notifData);
            }

            // Update local state
            setTrainees(prev => prev.map(t =>
                t.id === userId ? { ...t, tickets: t.tickets + quantity } : t
            ));

            toast({ title: "הכרטיסים עודכנו בהצלחה", type: "success" });
            setIsTicketModalOpen(false);
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
        <div className="space-y-7 text-[var(--studio-deep-contrast)]">
            {/* Header */}
            <header className="relative isolate overflow-hidden border-b border-white/15 pb-7">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(#e9f2ce_1px,transparent_1px),linear-gradient(90deg,#e9f2ce_1px,transparent_1px)] [background-size:28px_28px]" />
                <StudioLogo className="pointer-events-none absolute -bottom-14 -left-12 h-56 w-56 bg-[var(--studio-accent-bg)]/10" />
                <div className="mb-8 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-bold text-[var(--studio-accent-text)]"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--studio-accent-bg)]" />ניהול הסטודיו</span>
                    <span className="text-xs text-[#aebbad]">מתאמנות</span>
                </div>
                <motion.div initial={reduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="relative">
                    <h1 className="text-[clamp(3.3rem,13vw,5rem)] font-bold leading-[0.92] tracking-[-0.055em]">המתאמנות<br /><span className="text-[var(--studio-accent-text)]">שלך.</span></h1>
                    <p className="mt-5 text-sm leading-relaxed text-[#aebbad]">{loading ? "טוענים מתאמנות..." : trainees.length === 1 ? "מתאמנת אחת בסטודיו" : `${trainees.length} מתאמנות בסטודיו`}</p>
                </motion.div>

                <div className="relative mt-7">
                    <Search aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#aebbad]" />
                    <input
                        type="text"
                        aria-label="חיפוש מתאמנת"
                        placeholder="חיפוש לפי שם, מייל או טלפון"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="min-h-14 w-full rounded-2xl border border-white/15 bg-[#202c21] py-3 pr-12 pl-4 text-sm text-[var(--studio-deep-contrast)] outline-none placeholder:text-[#aebbad] focus:border-[#dce780]"
                    />
                </div>
            </header>

            {loading ? (
                <div aria-label="טוענים מתאמנות" className="space-y-3">
                    {Array.from({ length: 2 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-[1.75rem] bg-[#202c21]" />)}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredTrainees.map((trainee, index) => (
                        <motion.article
                            key={trainee.id}
                            initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.06, 0.24), duration: 0.45 }}
                            className="rounded-[1.75rem] bg-[var(--studio-sheet)] p-5 text-[var(--studio-ink)]"
                        >
                            <div className="flex min-w-0 items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--studio-coral-bg)] text-lg font-bold text-[var(--studio-ink)]">
                                    {trainee.full_name ? trainee.full_name[0] : <User aria-hidden="true" className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="truncate text-lg font-bold">{trainee.full_name || "ללא שם"}</h2>
                                    {trainee.phone && <p dir="ltr" className="mt-2 truncate text-right text-xs text-[var(--studio-muted)]">{trainee.phone}</p>}
                                    <p dir="ltr" className="mt-1 truncate text-right text-xs text-[var(--studio-muted)]">{trainee.email}</p>
                                </div>
                            </div>

                            <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#162218]/15 pt-4">
                                <div>
                                    <p className="text-xs text-[var(--studio-muted)]">יתרת אימונים</p>
                                    <p className="mt-1 flex items-center gap-2 text-3xl font-bold tabular-nums"><Ticket aria-hidden="true" className="h-4 w-4 text-[var(--studio-subtle)]" />{trainee.tickets}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setSelectedTraineeForUpdate(trainee); setIsTicketModalOpen(true); }}
                                    className="min-h-11 shrink-0 rounded-full bg-[var(--studio-accent-bg)] px-4 text-xs font-bold text-[var(--studio-ink)] transition-colors active:bg-[#e9f19e]"
                                >
                                    עדכון יתרה
                                </button>
                            </div>
                        </motion.article>
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
