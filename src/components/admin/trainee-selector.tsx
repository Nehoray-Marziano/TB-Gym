"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Search, User, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Trainee = {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    avatar_url?: string;
};

interface TraineeSelectorProps {
    selectedIds: string[];
    onSelect: (ids: string[]) => void;
    onClose: () => void;
}

export function TraineeSelector({ selectedIds, onSelect, onClose }: TraineeSelectorProps) {
    const supabase = getSupabaseClient();
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [filtered, setFiltered] = useState<Trainee[]>([]);
    const [term, setTerm] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrainees = async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, full_name, email, phone, avatar_url")
                .order("full_name", { ascending: true });

            if (data) {
                // @ts-ignore
                setTrainees(data);
                setFiltered(data);
            }
            setLoading(false);
        };
        fetchTrainees();
    }, []);

    useEffect(() => {
        const lowerTerm = term.toLowerCase();
        setFiltered(trainees.filter(t =>
            (t.full_name?.toLowerCase().includes(lowerTerm)) ||
            (t.phone?.includes(lowerTerm)) ||
            (t.email?.toLowerCase().includes(lowerTerm))
        ));
    }, [term, trainees]);

    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            onSelect(selectedIds.filter(sid => sid !== id));
        } else {
            onSelect([...selectedIds, id]);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#1A1C19] border border-white/10 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative z-10"
            >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-white/5 bg-[#1A1C19]/50 backdrop-blur-xl z-20">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-white">בחירת מתאמנות</h3>
                        <button onClick={onClose} className="p-2 bg-neutral-800/50 rounded-full hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="חפשי מתאמנת..."
                            value={term}
                            onChange={e => setTerm(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-3 pr-10 pl-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#E2F163] transition-colors"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-[#E2F163] border-t-transparent rounded-full animate-spin" /></div>
                    ) : (
                        filtered.map(trainee => {
                            const isSelected = selectedIds.includes(trainee.id);
                            return (
                                <div
                                    key={trainee.id}
                                    onClick={() => toggleSelection(trainee.id)}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer group",
                                        isSelected
                                            ? "bg-[#E2F163]/10 border-[#E2F163]/50"
                                            : "bg-neutral-900/40 border-transparent hover:bg-neutral-900/80 hover:border-white/5"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-colors shrink-0",
                                        isSelected ? "bg-[#E2F163] text-black" : "bg-neutral-800 text-neutral-400 group-hover:text-white"
                                    )}>
                                        {trainee.full_name?.[0] || <User className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn("font-bold text-sm truncate", isSelected ? "text-[#E2F163]" : "text-white")}>
                                            {trainee.full_name || "ללא שם"}
                                        </p>
                                        <p className="text-xs text-neutral-500 font-mono truncate">{trainee.phone}</p>
                                    </div>
                                    <div className={cn(
                                        "w-6 h-6 rounded-full border flex items-center justify-center transition-all",
                                        isSelected ? "bg-[#E2F163] border-[#E2F163]" : "border-neutral-700 group-hover:border-neutral-500"
                                    )}>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-[#1A1C19] z-20 flex justify-between items-center">
                    <span className="text-sm font-bold text-neutral-400 bg-neutral-900 px-3 py-1 rounded-lg">
                        נבחרו: <span className="text-[#E2F163]">{selectedIds.length}</span>
                    </span>
                    <button
                        onClick={onClose}
                        className="bg-[#E2F163] text-black font-bold px-6 py-2.5 rounded-xl hover:bg-[#d4e450] transition-colors shadow-[0_0_15px_rgba(226,241,99,0.2)]"
                    >
                        אישור
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
