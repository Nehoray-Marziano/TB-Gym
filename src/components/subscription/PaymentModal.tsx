import { motion, AnimatePresence } from "framer-motion";
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
                <>
                    {/* Backdrop - Independent Layer */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[60] bg-[#111a12]/70"
                    />

                    {/* Modal Wrapper - Independent Layer for Layout */}
                    <div className="pointer-events-none fixed inset-0 z-[60] flex items-end justify-center">
                        {/* Modal */}
                        <motion.div
                            key="modal"
                            initial={{ opacity: 0, y: "100%" }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: "100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="payment-title"
                            className="pointer-events-auto relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] border border-border bg-card pb-[env(safe-area-inset-bottom)] text-foreground shadow-2xl"
                        >
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                type="button"
                                aria-label="סגירה"
                                className="absolute left-5 top-5 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-card transition-colors active:bg-muted/40"
                            >
                                <X aria-hidden="true" className="h-5 w-5" />
                            </button>

                            {/* Header Section */}
                            <div className="border-b border-border px-6 pb-5 pt-7">
                                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00b0ba]/10">
                                        <Image
                                            src="/Bit_logo.svg"
                                            alt="ביט"
                                            width={60}
                                            height={60}
                                            className="h-11 w-11"
                                        />
                                </div>
                                <h3 id="payment-title" className="text-2xl font-bold">לפני שעוברים לביט</h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">את הסכום וסיבת ההעברה ממלאים באפליקציית ביט.</p>
                            </div>

                            {/* Body Section */}
                            <div className="space-y-5 p-6">

                                {/* Amount Display */}
                                <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-4">
                                    <span className="text-sm font-medium text-muted-foreground">סכום ההעברה</span>
                                    <span className="text-2xl font-bold tabular-nums">{amount} ₪</span>
                                </div>

                                {/* Explanation Text */}
                                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-xs leading-relaxed">
                                    האימונים יתווספו ליתרה שלך אחרי שטליה תאשר את ההעברה.
                                </div>

                                {/* Description Copy Section */}
                                <div>
                                    <p className="mb-2 text-xs font-bold text-muted-foreground">סיבת ההעברה · כדאי להעתיק</p>
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 text-start transition-colors active:bg-muted/40"
                                    >
                                        <span className="min-w-0 break-words px-2 text-sm font-medium">
                                            {paymentDescription}
                                        </span>
                                        <div className={cn(
                                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                                            copied ? "bg-primary/15 text-primary" : "bg-muted text-foreground"
                                        )}>
                                            {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
                                        </div>
                                    </button>
                                    {copied && <p className="mt-1 text-xs text-primary">הועתק</p>}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={onConfirm}
                                        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#1b251c] px-4 text-sm font-bold text-[#f6f6ed] transition-colors active:bg-[#334436]"
                                    >
                                        <span>להמשך באפליקציית ביט</span>
                                        <ExternalLink aria-hidden="true" className="h-4 w-4" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="min-h-11 w-full rounded-full text-xs font-bold text-muted-foreground transition-colors active:bg-muted/40"
                                    >
                                        ביטול
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
