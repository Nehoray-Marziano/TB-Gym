"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Search, User, Check, X } from "lucide-react";
import { motion } from "framer-motion";
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
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTrainees = async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .order("full_name", { ascending: true });

            if (error) {
                console.error("Error fetching trainees:", error);
                setFetchError("לא הצלחנו לטעון את המתאמנות. כדאי לנסות שוב.");
            } else if (data) {
                setTrainees(data as Trainee[]);
            }
            setLoading(false);
        };
        fetchTrainees();
    }, [supabase]);

    const lowerTerm = term.toLowerCase();
    const filtered = trainees.filter(t =>
        (t.full_name || "").toLowerCase().includes(lowerTerm) ||
        (t.phone || "").includes(lowerTerm) ||
        (t.email || "").toLowerCase().includes(lowerTerm)
    );

    const toggleSelection = (trainee: Trainee) => {
        if (selectedTrainees.some(t => t.id === trainee.id)) {
            onSelect(selectedTrainees.filter(t => t.id !== trainee.id));
        } else {
            onSelect([...selectedTrainees, trainee]);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
            <div className="absolute inset-0 bg-[#071009]/80" onClick={onClose} />
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="trainee-selector-title"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="relative z-10 flex h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] bg-[#f1f0e8] text-[#1b251c]"
            >
                {/* Header */}
                <div className="border-b border-[#1b251c]/10 px-5 pb-5 pt-7">
                    <div className="mb-5 flex items-start justify-between gap-3">
                        <div><p className="text-xs font-bold text-[#5c6d2e]">אימון למוזמנות</p><h3 id="trainee-selector-title" className="mt-2 text-[2rem] font-bold leading-tight">את מי מזמינים?</h3></div>
                        <button type="button" onClick={onClose} aria-label="סגירה" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#1b251c]/15">
                            <X aria-hidden="true" className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search aria-hidden="true" className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5d6958]" />
                        <input
                            type="text"
                            aria-label="חיפוש מתאמנת"
                            placeholder="חיפוש לפי שם או טלפון"
                            value={term}
                            onChange={e => setTerm(e.target.value)}
                            className="min-h-14 w-full rounded-2xl border border-[#1b251c]/20 bg-white py-3 pr-10 pl-4 text-sm outline-none focus:border-[#829044]"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 space-y-2 overflow-y-auto p-5">
                    {loading ? (
                        <div className="flex justify-center p-8"><div aria-label="טוענים מתאמנות" className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b251c] border-t-transparent" /></div>
                    ) : fetchError ? (
                        <div role="alert" className="p-4 text-center text-sm font-bold text-[#a53d35]">{fetchError}</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-8 text-center text-sm text-[#5d6958]">לא נמצאו מתאמנות.</div>
                    ) : (
                        filtered.map(trainee => {
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
                                            ? "border-[#829044]/50 bg-[#dfe6bd]"
                                            : "border-[#1b251c]/10 bg-white"
                                    )}
                                >
                                    <div className={cn(
                                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                                        isSelected ? "bg-[#1b251c] text-white" : "bg-[#dfe6bd] text-[#1b251c]"
                                    )}>
                                        {trainee.full_name?.[0] || <User aria-hidden="true" className="h-5 w-5" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold">
                                            {trainee.full_name || "ללא שם"}
                                        </p>
                                        <p dir="ltr" className="mt-1 truncate text-xs text-[#5d6958]">{trainee.phone}</p>
                                    </div>
                                    <div className={cn(
                                        "flex h-6 w-6 items-center justify-center rounded-full border",
                                        isSelected ? "border-[#1b251c] bg-[#1b251c]" : "border-[#1b251c]/30"
                                    )}>
                                        {isSelected && <Check aria-hidden="true" className="h-3.5 w-3.5 text-white" />}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 border-t border-[#1b251c]/10 bg-[#f1f0e8] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
                    <span className="text-xs font-bold text-[#5d6958]">
                        נבחרו {selectedTrainees.length}
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-12 rounded-full bg-[#1b251c] px-6 text-sm font-bold text-white"
                    >
                        סיימתי
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
