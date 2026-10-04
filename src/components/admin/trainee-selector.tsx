"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { User, Check, X } from "lucide-react";
import { StudioModal } from "@/components/ui/StudioModal";
import { AdminSearch } from "./AdminSearch";
import { AdminError, AdminLoading } from "./AdminFeedback";
import { cn } from "@/lib/utils";

export type Trainee = {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    avatar_url?: string;
};

interface TraineeSelectorProps {
    selectedTrainees: Trainee[];
    onSelect: (trainees: Trainee[]) => void;
    onClose: () => void;
}

export function TraineeSelector({ selectedTrainees, onSelect, onClose }: TraineeSelectorProps) {
    const supabase = getSupabaseClient();
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [term, setTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [attempt, setAttempt] = useState(0);
    const [limit, setLimit] = useState(24);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        const load = async () => {
            setLoading(true);
            setFetchError(null);
            try {
                const { data, error } = await supabase.from("profiles")
                    .select("id,full_name,email,phone").neq("role", "administrator")
                    .order("full_name", { ascending: true });
                if (!active) return;
                if (error) throw error;
                setTrainees((data || []) as Trainee[]);
            } catch {
                if (active) setFetchError("לא הצלחנו לטעון את המתאמנות. כדאי לנסות שוב.");
            } finally { if (active) setLoading(false); }
        };
        void load();
        return () => { active = false; };
    }, [supabase, attempt]);

    const lowerTerm = term.trim().toLowerCase();
    const filtered = trainees.filter(trainee =>
        (trainee.full_name || "").toLowerCase().includes(lowerTerm) ||
        (trainee.phone || "").includes(lowerTerm) ||
        (trainee.email || "").toLowerCase().includes(lowerTerm)
    );
    const toggleSelection = (trainee: Trainee) => {
        onSelect(selectedTrainees.some(item => item.id === trainee.id)
            ? selectedTrainees.filter(item => item.id !== trainee.id)
            : [...selectedTrainees, trainee]);
    };

    return <StudioModal variant="admin" titleId="trainee-selector-title" onClose={onClose} actions={
        <div className="flex items-center justify-between gap-3">
            <span role="status" className="text-sm font-bold text-[var(--studio-muted)]">נבחרו {selectedTrainees.length}</span>
            <button type="button" onClick={onClose} className="studio-admin-action">סיימתי</button>
        </div>
    } header={<>
        <button type="button" data-modal-cancel onClick={onClose} aria-label="סגירת בחירת המתאמנות" className="studio-admin-modal-close"><X aria-hidden="true" className="h-5 w-5" /></button>
        <div className="studio-admin-modal-heading"><p className="text-xs font-bold text-[var(--studio-subtle)]">אימון למוזמנות</p><h2 id="trainee-selector-title" className="mt-2 text-[2rem] font-bold leading-tight">את מי מזמינים?</h2></div>
    </>}>
        <AdminSearch value={term} onChange={value => { setTerm(value); setLimit(24); }} />
        <div className="mt-5 space-y-2">
            {loading ? <AdminLoading label="טוענים מתאמנות..." /> : fetchError ? <AdminError message={fetchError} onRetry={() => setAttempt(value => value + 1)} /> : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-[var(--studio-muted)]">לא נמצאו מתאמנות.</div>
            ) : (
                        filtered.slice(0, limit).map(trainee => {
                            const isSelected = selectedTrainees.some(t => t.id === trainee.id);
                            return (
                                <button
                                    type="button"
                                    key={trainee.id}
                                    onClick={() => toggleSelection(trainee)}
                                    aria-pressed={isSelected}
                                    className={cn(
                                        "flex min-h-16 w-full items-center gap-3 rounded-2xl border p-3 text-right transition-colors",
                                        isSelected
                                            ? "border-[var(--studio-accent-text)]/50 bg-[var(--studio-neutral-bg)]"
                                            : "border-[#1b251c]/10 bg-[var(--studio-card)]"
                                    )}
                                >
                                    <div className={cn(
                                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                                        isSelected ? "bg-[var(--studio-deep)] text-white" : "bg-[var(--studio-neutral-bg)] text-[var(--studio-ink)]"
                                    )}>
                                        {trainee.full_name?.[0] || <User aria-hidden="true" className="h-5 w-5" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="break-words text-sm font-bold">
                                            {trainee.full_name || "ללא שם"}
                                        </p>
                                        <p dir="ltr" className="mt-1 break-all text-xs text-[var(--studio-muted)]">{trainee.phone}</p>
                                    </div>
                                    <div className={cn(
                                        "flex h-6 w-6 items-center justify-center rounded-full border",
                                        isSelected ? "border-[#1b251c] bg-[var(--studio-deep)]" : "border-[#1b251c]/30"
                                    )}>
                                        {isSelected && <Check aria-hidden="true" className="h-3.5 w-3.5 text-white" />}
                                    </div>
                                </button>
                            );
                        })
            )}
            {!loading && !fetchError && filtered.length > limit && <button type="button" onClick={() => setLimit(value => value + 24)} className="studio-admin-action w-full" data-emphasis="outline">הצגת מתאמנות נוספות ({filtered.length - limit})</button>}
        </div>
    </StudioModal>;
}
