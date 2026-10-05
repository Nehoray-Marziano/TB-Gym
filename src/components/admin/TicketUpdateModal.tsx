"use client";

import { AnimatePresence } from "framer-motion";
import { X, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CopyableInput } from "@/components/ui/copyable-field";
import { StudioModal } from "@/components/ui/StudioModal";
import { AdminBusyLabel, AdminError } from "./AdminFeedback";

interface TicketUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number) => Promise<void>;
    traineeName: string;
    currentBalance: number;
    isUpdating: boolean;
}

export default function TicketUpdateModal(props: TicketUpdateModalProps) {
    return <AnimatePresence>{props.isOpen && <TicketUpdateSheet {...props} />}</AnimatePresence>;
}

function TicketUpdateSheet({ onClose, onConfirm, traineeName, currentBalance, isUpdating }: TicketUpdateModalProps) {
    const [value, setValue] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const amount = Number(value);
    const valid = value.trim() !== "" && Number.isInteger(amount) && amount !== 0 && Math.abs(amount) <= 100 && currentBalance + amount >= 0;
    const busy = isUpdating || submitting;
    const confirm = async (event: React.FormEvent) => {
        event.preventDefault();
        if (busy || !valid) return;
        setSubmitting(true);
        setError(null);
        try { await onConfirm(amount); }
        catch { setError("לא הצלחנו לאשר שהיתרה עודכנה. נסי שוב עם אותו שינוי; ניסיון חוזר לא יבצע אותו פעמיים."); }
        finally { setSubmitting(false); }
    };
    return <StudioModal variant="admin" titleId="ticket-update-title" descriptionId="ticket-update-description" busy={busy} onClose={onClose} actions={
        <button type="submit" form="ticket-update-form" disabled={busy || !valid} className="studio-admin-action" aria-busy={busy}>
            <AdminBusyLabel busy={busy} idle="עדכון יתרה" pending="מעדכנים..." />
        </button>
    } header={<>
        <button type="button" data-modal-cancel disabled={busy} onClick={onClose} aria-label="סגירת עדכון היתרה" className="studio-admin-modal-close"><X aria-hidden="true" className="h-5 w-5" /></button>
        <div className="studio-admin-modal-heading">
            <p id="ticket-update-description" className="text-xs font-bold text-[var(--studio-subtle)]">יתרת האימונים של {traineeName}</p>
            <h2 id="ticket-update-title" className="mt-2 text-[2rem] font-bold leading-tight">עדכון יתרה.</h2>
        </div>
    </>}>
        <form id="ticket-update-form" noValidate onSubmit={confirm} className="space-y-6">
            <div className="flex items-center justify-between rounded-[1.5rem] bg-[var(--studio-deep)] p-5 text-[var(--studio-deep-contrast)]">
                <div className="flex-1 text-center"><span className="mb-2 block text-xs text-[var(--admin-muted)]">יתרה עכשיו</span><span className="text-[2rem] font-bold tabular-nums">{currentBalance}</span></div>
                <ArrowLeft aria-hidden="true" className="h-5 w-5 text-[var(--admin-muted)]" />
                <div className="flex-1 text-center"><span className="mb-2 block text-xs font-bold text-[var(--studio-accent-text)]">יתרה אחרי העדכון</span><span aria-live="polite" className="text-[2.25rem] font-bold tabular-nums text-[var(--studio-accent-text)]">{valid || amount === 0 ? currentBalance + amount : "—"}</span></div>
            </div>
            <div className="space-y-2">
                <label htmlFor="ticket-change" className="block text-xs font-bold">כמה אימונים להוסיף או להפחית?</label>
                <CopyableInput id="ticket-change" copyLabel="העתקת מספר האימונים" type="number" inputMode="numeric" step={1} min={Math.max(-100, -currentBalance)} max={100} disabled={busy} value={value} onChange={event => { setValue(event.target.value); setError(null); }} placeholder="0" aria-invalid={value !== "" && !valid} aria-describedby="ticket-change-help" className="min-h-14 w-full rounded-2xl border border-[#1b251c]/20 bg-[var(--studio-card)] px-4 text-center text-xl font-bold outline-none" />
                <p id="ticket-change-help" className="text-xs leading-relaxed text-[var(--studio-muted)]">להפחתה, כתבי מספר עם סימן מינוס. עד 100 אימונים בכל עדכון, בלי לרדת מתחת לאפס.</p>
            </div>
            <fieldset disabled={busy} className="space-y-2"><legend className="mb-2 text-xs font-bold">בחירה מהירה</legend><div className="grid grid-cols-3 gap-2">{[4, 8, 12].map(preset => <button type="button" key={preset} onClick={() => { setValue(String(preset)); setError(null); }} aria-pressed={amount === preset} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border px-1", amount === preset ? "border-[var(--studio-subtle)] bg-[var(--studio-accent-bg)]" : "border-[#1b251c]/15 bg-[var(--studio-card)]")}><span className="text-xs font-bold">{preset} אימונים</span><span className="text-lg font-bold leading-none tabular-nums">+{preset}</span></button>)}</div></fieldset>
            {error && <AdminError message={error} />}
        </form>
    </StudioModal>;
}
