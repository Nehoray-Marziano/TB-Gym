"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, Ticket, ArrowLeft } from "lucide-react";
import { useState } from "react";
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
    { label: "4 אימונים", amount: 4 },
    { label: "8 אימונים", amount: 8 },
    { label: "12 אימונים", amount: 12 },
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
    const reduceMotion = useReducedMotion();

    const handleConfirm = () => {
        if (amountToAdd !== 0) {
            onConfirm(amountToAdd);
        }
    };

    const newBalance = currentBalance + amountToAdd;

    return (
        <AnimatePresence onExitComplete={() => setAmountToAdd(0)}>
            {isOpen && (
                    <motion.div
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] flex items-end justify-center bg-[#071009]/80"
                    >
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="ticket-update-title"
                            initial={reduceMotion ? false : { y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-[#f1f0e8] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-7 text-[#1b251c]"
                            dir="rtl"
                        >
                            <div className="relative mb-7">
                                <p className="text-xs font-bold text-[#5c6d2e]">יתרת האימונים של {traineeName}</p>
                                <h3 id="ticket-update-title" className="mt-2 text-[2rem] font-bold leading-tight">עדכון יתרה.</h3>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="סגירה"
                                    className="absolute -top-1 left-0 flex h-11 w-11 items-center justify-center rounded-full border border-[#1b251c]/15"
                                >
                                    <X aria-hidden="true" className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-6">

                                <div className="flex items-center justify-between rounded-[1.5rem] bg-[#1b251c] p-5 text-white">
                                    <div className="flex-1 text-center">
                                        <span className="mb-2 block text-xs text-[#aebbad]">יתרה עכשיו</span>
                                        <span className="text-[2rem] font-bold tabular-nums">{currentBalance}</span>
                                    </div>
                                    <ArrowLeft aria-hidden="true" className="h-5 w-5 text-[#aebbad]" />
                                    <div className="flex-1 text-center">
                                        <span className="mb-2 block text-xs font-bold text-[#dce780]">יתרה אחרי העדכון</span>
                                        <span className="text-[2.25rem] font-bold tabular-nums text-[#dce780]">{newBalance}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="ticket-change" className="block text-xs font-bold">
                                        כמה אימונים להוסיף או להפחית?
                                    </label>
                                    <input
                                        id="ticket-change"
                                        type="number"
                                        inputMode="numeric"
                                        step="1"
                                        value={amountToAdd === 0 ? '' : amountToAdd}
                                        onChange={(e) => setAmountToAdd(parseInt(e.target.value) || 0)}
                                        placeholder="0"
                                        className="min-h-14 w-full rounded-2xl border border-[#1b251c]/20 bg-white px-4 text-center text-xl font-bold outline-none focus:border-[#829044]"
                                    />
                                    <p className="text-xs text-[#5d6958]">להפחתה, כתבי מספר עם סימן מינוס.</p>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-bold">בחירה מהירה</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {PRESETS.map((preset) => (
                                            <button
                                                type="button"
                                                key={preset.label}
                                                onClick={() => setAmountToAdd(preset.amount)}
                                                aria-pressed={amountToAdd === preset.amount}
                                                className={cn(
                                                    "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border px-1 transition-colors",
                                                    amountToAdd === preset.amount ? "border-[#829044] bg-[#dce780]" : "border-[#1b251c]/15 bg-white"
                                                )}
                                            >
                                                <span className="text-[11px] font-bold">{preset.label}</span>
                                                <span className="text-lg font-bold leading-none tabular-nums">+{preset.amount}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    disabled={isUpdating || amountToAdd === 0}
                                    className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#1b251c] px-5 text-sm font-bold text-white disabled:opacity-50"
                                >
                                    {isUpdating ? (
                                        <span>מעדכנים...</span>
                                    ) : (
                                        <>
                                            <span>עדכון יתרה</span>
                                            <Ticket aria-hidden="true" className="h-4 w-4 text-[#dce780]" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
            )}
        </AnimatePresence>
    );
}
