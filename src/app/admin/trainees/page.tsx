"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useCallback, useEffect, useState } from "react";
import { Search, User, Ticket } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import TicketUpdateModal from "@/components/admin/TicketUpdateModal";

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
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [grantingTickets, setGrantingTickets] = useState<string | null>(null);
    const [selectedTraineeForUpdate, setSelectedTraineeForUpdate] = useState<Trainee | null>(null);
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
            setSelectedTraineeForUpdate(null); // Close modal
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
        <div className="space-y-7 text-[#f6f6ed]">
            {/* Header */}
            <header className="border-b border-white/15 pb-7">
                <div className="mb-8 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-bold text-[#dce780]"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#dce780]" />ניהול הסטודיו</span>
                    <span className="text-xs text-[#aebbad]">מתאמנות</span>
                </div>
                <h1 className="text-[clamp(2.7rem,11vw,4.1rem)] font-bold leading-[1.02] tracking-tight">המתאמנות<br /><span className="text-[#dce780]">שלך.</span></h1>
                <p className="mt-4 text-sm leading-relaxed text-[#aebbad]">{loading ? "טוענים מתאמנות..." : trainees.length === 1 ? "מתאמנת אחת בסטודיו" : `${trainees.length} מתאמנות בסטודיו`}</p>

                <div className="relative mt-7">
                    <Search aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#aebbad]" />
                    <input
                        type="text"
                        aria-label="חיפוש מתאמנת"
                        placeholder="חיפוש לפי שם, מייל או טלפון"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="min-h-14 w-full rounded-2xl border border-white/15 bg-[#202c21] py-3 pr-12 pl-4 text-sm text-[#f6f6ed] outline-none placeholder:text-[#aebbad] focus:border-[#dce780]"
                    />
                </div>
            </header>

            {loading ? (
                <div aria-label="טוענים מתאמנות" className="space-y-3">
                    {Array.from({ length: 2 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-[1.75rem] bg-[#202c21]" />)}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredTrainees.map((trainee) => (
                        <article
                            key={trainee.id}
                            className="rounded-[1.75rem] border border-white/10 bg-[#202c21] p-5"
                        >
                            <div className="flex min-w-0 items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#dce780]/15 text-lg font-bold text-[#dce780]">
                                    {trainee.full_name ? trainee.full_name[0] : <User aria-hidden="true" className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="truncate text-lg font-bold">{trainee.full_name || "ללא שם"}</h2>
                                    {trainee.phone && <p dir="ltr" className="mt-2 truncate text-right text-xs text-[#aebbad]">{trainee.phone}</p>}
                                    <p dir="ltr" className="mt-1 truncate text-right text-xs text-[#aebbad]">{trainee.email}</p>
                                </div>
                            </div>

                            <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                                <div>
                                    <p className="text-xs text-[#aebbad]">יתרת אימונים</p>
                                    <p className="mt-1 flex items-center gap-2 text-2xl font-bold tabular-nums"><Ticket aria-hidden="true" className="h-4 w-4 text-[#dce780]" />{trainee.tickets}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedTraineeForUpdate(trainee)}
                                    className="min-h-11 shrink-0 rounded-full bg-[#dce780] px-4 text-xs font-bold text-[#1b251c] transition-colors active:bg-[#e9f19e]"
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
            {selectedTraineeForUpdate && (
                <TicketUpdateModal
                    isOpen={!!selectedTraineeForUpdate}
                    onClose={() => setSelectedTraineeForUpdate(null)}
                    onConfirm={(amount) => handleGrantTickets(selectedTraineeForUpdate.id, amount)}
                    traineeName={selectedTraineeForUpdate.full_name}
                    currentBalance={selectedTraineeForUpdate.tickets}
                    isUpdating={grantingTickets === selectedTraineeForUpdate.id}
                />
            )}
        </div>
    );
}
