"use client";

import { useState, useEffect, useRef } from "react";
import { X, ArrowLeft } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { StudioModal } from "@/components/ui/StudioModal";
import { AdminBusyLabel, AdminError, AdminLoading } from "@/components/admin/AdminFeedback";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { CopyableInput } from "@/components/ui/copyable-field";
import { useToast } from "@/components/ui/use-toast";
import { getAdminMutationRequestId, completeAdminMutationIntent } from "@/lib/adminMutationIntent";
import { AnimatePresence } from "framer-motion";

export type TraineeBalance = {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    tickets: number;
};

interface QuickGrantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGranted: () => void;
    initialTrainee?: TraineeBalance | null;
}

export default function QuickGrantModal({
    isOpen,
    onClose,
    onGranted,
    initialTrainee,
}: QuickGrantModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <QuickGrantSheet
                    onClose={onClose}
                    onGranted={onGranted}
                    initialTrainee={initialTrainee}
                />
            )}
        </AnimatePresence>
    );
}

function QuickGrantSheet({
    onClose,
    onGranted,
    initialTrainee,
}: {
    onClose: () => void;
    onGranted: () => void;
    initialTrainee?: TraineeBalance | null;
}) {
    const supabase = getSupabaseClient();
    const { toast } = useToast();

    const [trainees, setTrainees] = useState<TraineeBalance[]>([]);
    const [loadingTrainees, setLoadingTrainees] = useState(false);
    const [traineeError, setTraineeError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTrainee, setSelectedTrainee] = useState<TraineeBalance | null>(initialTrainee ?? null);

    const [quantityStr, setQuantityStr] = useState("8");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const updateLock = useRef(false);

    useEffect(() => {
        if (initialTrainee) {
            setSelectedTrainee(initialTrainee);
            return;
        }

        let active = true;
        const load = async () => {
            setLoadingTrainees(true);
            setTraineeError(null);
            try {
                const { data, error } = await supabase.rpc("admin_list_trainees");
                if (!active) return;
                if (error) throw error;
                setTrainees((data || []) as TraineeBalance[]);
            } catch {
                if (active) setTraineeError("לא הצלחנו לטעון את רשימת המתאמנות.");
            } finally {
                if (active) setLoadingTrainees(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, [supabase, initialTrainee]);

    const quantity = Number(quantityStr);
    const currentBalance = selectedTrainee?.tickets ?? 0;
    const isValidAmount =
        quantityStr.trim() !== "" &&
        Number.isInteger(quantity) &&
        quantity !== 0 &&
        Math.abs(quantity) <= 100 &&
        currentBalance + quantity >= 0;

    const handleGrant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTrainee || !isValidAmount || updateLock.current || submitting) return;

        updateLock.current = true;
        setSubmitting(true);
        setSubmitError(null);

        try {
            const actorId = (await supabase.auth.getSession()).data.session?.user.id;
            if (!actorId) throw new Error("אימות נדרש");

            const payload = {
                p_user_id: selectedTrainee.id,
                p_quantity: quantity,
            };

            const requestId = await getAdminMutationRequestId("grant_tickets", actorId, payload);
            const { data, error } = await supabase.rpc("admin_grant_tickets_once", {
                ...payload,
                p_request_id: requestId,
            });

            if (error) throw error;
            if (!data?.success) throw new Error(data?.message || "Ticket update failed");

            completeAdminMutationIntent("grant_tickets", actorId, requestId);

            // Optional notification
            void fetch("/api/notifications/grant-tickets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: selectedTrainee.id, amount: quantity }),
            }).catch(console.error);

            toast({
                title: quantity > 0 ? `נוספו ${quantity} אימונים בהצלחה` : `הופחתו ${Math.abs(quantity)} אימונים`,
                type: "success",
            });

            onGranted();
            onClose();
        } catch (err) {
            console.error(err);
            setSubmitError("לא הצלחנו לעדכן את היתרה. נסי שוב בעוד רגע.");
        } finally {
            updateLock.current = false;
            setSubmitting(false);
        }
    };

    const filteredTrainees = trainees.filter((t) => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return true;
        return (
            (t.full_name || "").toLowerCase().includes(query) ||
            (t.phone || "").includes(query) ||
            (t.email || "").toLowerCase().includes(query)
        );
    });

    const presetAmounts = [1, 4, 8, 12];

    return (
        <StudioModal
            variant="admin"
            titleId="quick-grant-title"
            descriptionId="quick-grant-description"
            busy={submitting}
            onClose={onClose}
            actions={
                selectedTrainee ? (
                    <div className="flex w-full items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedTrainee(null)}
                            disabled={submitting}
                            className="studio-admin-action flex-1"
                            data-emphasis="outline"
                        >
                            החלפת מתאמנת
                        </button>
                        <button
                            type="submit"
                            form="quick-grant-form"
                            disabled={submitting || !isValidAmount}
                            className="studio-admin-action flex-1"
                            aria-busy={submitting}
                        >
                            <AdminBusyLabel busy={submitting} idle="עדכון יתרה" pending="מעדכנים..." />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        data-modal-cancel
                        onClick={onClose}
                        className="studio-admin-action w-full"
                        data-emphasis="outline"
                    >
                        ביטול
                    </button>
                )
            }
            header={
                <>
                    <button
                        type="button"
                        data-modal-cancel
                        disabled={submitting}
                        onClick={onClose}
                        aria-label="סגירת טעינת כרטיסים"
                        className="studio-admin-modal-close"
                    >
                        <X aria-hidden="true" className="h-5 w-5" />
                    </button>
                    <div className="studio-admin-modal-heading">
                        <p id="quick-grant-description" className="text-xs font-bold text-[var(--studio-subtle)]">
                            {selectedTrainee ? `עדכון יתרה עבור ${selectedTrainee.full_name}` : "טעינה מהירה ב-2 שניות"}
                        </p>
                        <h2 id="quick-grant-title" className="mt-1.5 text-[1.8rem] font-bold leading-tight">
                            טעינת כרטיסים.
                        </h2>
                    </div>
                </>
            }
        >
            {!selectedTrainee ? (
                <div className="space-y-4">
                    <AdminSearch
                        value={searchTerm}
                        onChange={setSearchTerm}
                        dark={false}
                    />

                    {loadingTrainees ? (
                        <AdminLoading label="טוענים מתאמנות..." />
                    ) : traineeError ? (
                        <AdminError message={traineeError} />
                    ) : (
                        <div className="max-h-72 space-y-2 overflow-y-auto">
                            {filteredTrainees.length === 0 ? (
                                <p className="py-6 text-center text-xs text-[var(--studio-muted)]">
                                    לא נמצאה מתאמנת מתאימה
                                </p>
                            ) : (
                                filteredTrainees.map((trainee) => (
                                    <button
                                        key={trainee.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedTrainee(trainee);
                                            setQuantityStr("8");
                                        }}
                                        className="flex w-full items-center justify-between rounded-xl border border-[#1b251c]/10 bg-[var(--studio-card)] p-3 text-right transition-colors hover:bg-[var(--studio-card)]/80 active:scale-[0.99]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--studio-accent-bg)]/20 font-bold text-[var(--studio-ink)] text-xs">
                                                {trainee.full_name?.[0] || "?"}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-[var(--studio-ink)]">
                                                    {trainee.full_name}
                                                </p>
                                                {trainee.phone && (
                                                    <p className="text-xs text-[var(--studio-muted)]" dir="ltr">
                                                        {trainee.phone}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-[11px] text-[var(--studio-muted)]">יתרה</span>
                                            <span
                                                className={`text-sm font-bold tabular-nums ${
                                                    trainee.tickets <= 0
                                                        ? "text-[var(--studio-danger)]"
                                                        : "text-[var(--studio-ink)]"
                                                }`}
                                            >
                                                {trainee.tickets} אימונים
                                            </span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <form id="quick-grant-form" onSubmit={handleGrant} className="space-y-5">
                    {/* Visual balance comparison */}
                    <div className="flex items-center justify-between rounded-2xl bg-[var(--studio-deep)] p-4 text-[var(--studio-deep-contrast)]">
                        <div className="flex-1 text-center">
                            <span className="mb-1 block text-xs text-[var(--admin-muted)]">יתרה עכשיו</span>
                            <span className="text-[1.8rem] font-bold tabular-nums">
                                {currentBalance}
                            </span>
                        </div>
                        <ArrowLeft aria-hidden="true" className="h-5 w-5 text-[var(--admin-muted)]" />
                        <div className="flex-1 text-center">
                            <span className="mb-1 block text-xs font-bold text-[var(--studio-accent-text)]">
                                יתרה חדשה
                            </span>
                            <span className="text-[2rem] font-bold tabular-nums text-[var(--studio-accent-text)]">
                                {isValidAmount ? currentBalance + quantity : "—"}
                            </span>
                        </div>
                    </div>

                    {/* Presets */}
                    <div>
                        <span className="mb-2 block text-xs font-bold text-[var(--studio-ink)]">
                            חבילות נפוצות
                        </span>
                        <div className="grid grid-cols-4 gap-2">
                            {presetAmounts.map((amt) => (
                                <button
                                    key={amt}
                                    type="button"
                                    onClick={() => setQuantityStr(String(amt))}
                                    className={`flex min-h-11 items-center justify-center rounded-xl border text-sm font-bold transition-all ${
                                        quantity === amt
                                            ? "border-[var(--studio-brand)] bg-[var(--studio-accent-bg)] text-[var(--studio-ink)] shadow-xs"
                                            : "border-[#1b251c]/15 bg-[var(--studio-card)] text-[var(--studio-ink)] hover:bg-[#dfe4d0]"
                                    }`}
                                >
                                    +{amt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom quantity input */}
                    <div className="space-y-1.5">
                        <label htmlFor="custom-quantity" className="block text-xs font-bold text-[var(--studio-ink)]">
                            כמות אישית (הוספה או הפחתה)
                        </label>
                        <CopyableInput
                            id="custom-quantity"
                            copyLabel="העתקת כמות אימונים"
                            type="number"
                            inputMode="numeric"
                            step={1}
                            min={-currentBalance}
                            max={100}
                            disabled={submitting}
                            value={quantityStr}
                            onChange={(e) => setQuantityStr(e.target.value)}
                            placeholder="0"
                            className="min-h-12 w-full rounded-2xl border border-[#1b251c]/20 bg-[var(--studio-card)] px-4 text-center text-lg font-bold outline-none"
                        />
                        <p className="text-[11px] text-[var(--studio-muted)]">
                            להפחתה (למשל ביטול רכישה), הזיני מספר שלילי (לדוגמה: 1-).
                        </p>
                    </div>

                    {submitError && <AdminError message={submitError} />}
                </form>
            )}
        </StudioModal>
    );
}
