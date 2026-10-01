import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Copy, Check, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    amount: number;
    userName: string;
    tierDisplay: string;
}

export default function PaymentModal({
    isOpen,
    onClose,
    onConfirm,
    amount,
    userName,
    tierDisplay
}: PaymentModalProps) {
    const [copied, setCopied] = useState(false);
    const reduceMotion = useReducedMotion();

    // Generate description: "Name - Tier - Month"
    // Example: "נהוראי - פרימיום - ינואר"
    const currentMonth = new Date().toLocaleString('he-IL', { month: 'long' });
    const paymentDescription = `${userName} - ${tierDisplay} - ${currentMonth}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(paymentDescription);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[70] flex items-end justify-center">
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-[#111a12]/75 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        key="modal"
                        initial={reduceMotion ? false : { opacity: 0, y: "100%" }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: "100%" }}
                        transition={{ type: "spring", stiffness: 350, damping: 32 }}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="payment-title"
                        className="relative z-10 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[2.2rem] bg-[var(--studio-sheet)] pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-[var(--studio-ink)] shadow-2xl"
                    >
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                type="button"
                                aria-label="סגירה"
                                className="absolute left-5 top-5 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[#162218]/20 transition-colors active:bg-[var(--studio-deep)]/10"
                            >
                                <X aria-hidden="true" className="h-5 w-5" />
                            </button>

                            {/* Header Section */}
                            <div className="border-b border-[#162218]/15 px-6 pb-5 pt-7">
                                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00b0ba]/10">
                                        <Image
                                            src="/Bit_logo.svg"
                                            alt="ביט"
                                            width={60}
                                            height={60}
                                            className="h-11 w-11"
                                        />
                                </div>
                                <p className="mb-1 text-xs font-bold text-[var(--studio-subtle)]">עוד רגע ממשיכים</p>
                                <h3 id="payment-title" className="max-w-[16rem] text-[2rem] font-bold leading-tight">לפני שעוברים לביט.</h3>
                                <p className="mt-2 text-sm leading-relaxed text-[var(--studio-muted)]">את הסכום וסיבת ההעברה ממלאים באפליקציית ביט.</p>
                            </div>

                            {/* Body Section */}
                            <div className="space-y-5 p-6">

                                {/* Amount Display */}
                                <div className="flex items-center justify-between rounded-[1.5rem] bg-[var(--studio-deep)] p-5 text-[var(--studio-deep-contrast)]">
                                    <span className="text-sm font-medium text-[#b8c7ae]">סכום ההעברה</span>
                                    <span className="text-3xl font-bold tabular-nums text-[var(--studio-accent-text)]">{amount} ₪</span>
                                </div>

                                {/* Explanation Text */}
                                <div className="rounded-2xl bg-[var(--studio-accent-bg)]/50 p-4 text-xs leading-relaxed">
                                    האימונים יתווספו ליתרה שלך אחרי שטליה תאשר את ההעברה.
                                </div>

                                {/* Description Copy Section */}
                                <div>
                                    <p className="mb-2 text-xs font-bold text-[var(--studio-muted)]">סיבת ההעברה · כדאי להעתיק</p>
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-[#162218]/15 bg-[var(--studio-card)] p-3 text-start transition-colors active:bg-[var(--studio-accent-bg)]/20"
                                    >
                                        <span className="min-w-0 break-words px-2 text-sm font-medium">
                                            {paymentDescription}
                                        </span>
                                        <div className={cn(
                                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                                            copied ? "bg-[var(--studio-accent-bg)] text-[var(--studio-ink)]" : "bg-[var(--studio-canvas)] text-[var(--studio-ink)]"
                                        )}>
                                            {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
                                        </div>
                                    </button>
                                    {copied && <p className="mt-1 text-xs text-[var(--studio-subtle)]">הועתק</p>}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={onConfirm}
                                        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--studio-deep)] px-4 text-sm font-bold text-[var(--studio-accent-text)] transition-colors active:bg-[#334436]"
                                    >
                                        <span>להמשך באפליקציית ביט</span>
                                        <ExternalLink aria-hidden="true" className="h-4 w-4" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="min-h-11 w-full rounded-full text-xs font-bold text-[var(--studio-muted)] transition-colors active:bg-[var(--studio-deep)]/10"
                                    >
                                        ביטול
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
            )}
        </AnimatePresence>
    );
}
