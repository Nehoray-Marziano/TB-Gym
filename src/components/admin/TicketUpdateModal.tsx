"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Ticket, ArrowRight, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TicketUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number) => void;
    traineeName: string;
    currentBalance: number;
    isUpdating: boolean;
}

const PRESETS = [
    { label: "בסיסי", amount: 4, color: "bg-slate-700 text-slate-100" },
    { label: "סטנדרטי", amount: 8, color: "bg-[#E2F163] text-black" },
    { label: "פרימיום", amount: 12, color: "bg-pink-600 text-white" },
];

export default function TicketUpdateModal({
    isOpen,
    onClose,
    onConfirm,
    traineeName,
    currentBalance,
    isUpdating
}: TicketUpdateModalProps) {
    const [amountToAdd, setAmountToAdd] = useState<number>(0);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) setAmountToAdd(0);
    }, [isOpen]);

    const handleConfirm = () => {
        if (amountToAdd !== 0) {
            onConfirm(amountToAdd);
        }
    };

    const newBalance = currentBalance + amountToAdd;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1A1C19] border border-white/10 w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl relative"
                            dir="rtl"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <div>
                                    <h3 className="text-xl font-bold text-white">עדכון יתרה</h3>
                                    <p className="text-white/50 text-sm">עבור {traineeName}</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-8">

                                {/* Balance Preview */}
                                <div className="flex items-center justify-between bg-black/30 p-4 rounded-2xl border border-white/5 relative overflow-hidden">
                                    <div className="text-center flex-1">
                                        <span className="text-xs text-white/40 block mb-1">נוכחי</span>
                                        <span className="text-2xl font-bold text-white/60">{currentBalance}</span>
                                    </div>
                                    <ArrowLeft className="w-5 h-5 text-white/20" />
                                    <div className="text-center flex-1">
                                        <span className="text-xs text-[#E2F163] block mb-1 font-bold">חדש</span>
                                        <motion.span
                                            key={newBalance}
                                            initial={{ scale: 1.2, color: "#fff" }}
                                            animate={{ scale: 1, color: "#E2F163" }}
                                            className="text-3xl font-black"
                                        >
                                            {newBalance}
                                        </motion.span>
                                    </div>
                                </div>

                                {/* Custom Input */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider block pr-1">
                                        הוספה/הפחתה ידנית
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="number"
                                            value={amountToAdd === 0 ? '' : amountToAdd}
                                            onChange={(e) => setAmountToAdd(parseInt(e.target.value) || 0)}
                                            placeholder="0"
                                            className="flex-1 bg-neutral-900 border border-white/10 rounded-xl py-4 px-4 text-center text-2xl font-bold text-white focus:outline-none focus:border-[#E2F163] transition-colors placeholder:text-neutral-700"
                                        />
                                    </div>
                                </div>

                                {/* Quick Presets */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider block pr-1">
                                        חבילות מהירות
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {PRESETS.map((preset) => (
                                            <button
                                                key={preset.label}
                                                onClick={() => setAmountToAdd(preset.amount)}
                                                className={cn(
                                                    "py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 shadow-lg",
                                                    preset.color,
                                                    amountToAdd === preset.amount ? "ring-2 ring-white scale-105" : "opacity-80 hover:opacity-100"
                                                )}
                                            >
                                                <span className="text-[10px] font-bold opacity-80">{preset.label}</span>
                                                <span className="text-lg font-black leading-none">+{preset.amount}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Action Button */}
                                <button
                                    onClick={handleConfirm}
                                    disabled={isUpdating || amountToAdd === 0}
                                    className="w-full py-4 bg-[#E2F163] text-black font-bold text-lg rounded-xl hover:bg-[#d4e450] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(226,241,99,0.2)] active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {isUpdating ? (
                                        <span className="animate-pulse">מעדכן...</span>
                                    ) : (
                                        <>
                                            <span>עדכון יתרה</span>
                                            <Ticket className="w-5 h-5 fill-black/20" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
