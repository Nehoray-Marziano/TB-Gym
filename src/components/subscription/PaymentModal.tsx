import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    tierName: string;
    amount: number;
    userName: string;
    tierDisplay: string;
}

export default function PaymentModal({
    isOpen,
    onClose,
    onConfirm,
    tierName,
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
                        className="fixed inset-0 bg-black/80 z-[60]"
                    />

                    {/* Modal Wrapper - Independent Layer for Layout */}
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
                        {/* Modal */}
                        <motion.div
                            key="modal"
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-neutral-900 border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative pointer-events-auto will-change-transform"
                        >
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors z-10"
                            >
                                <X className="w-5 h-5 text-white/50" />
                            </button>

                            {/* Header Section */}
                            <div className="bg-[#00b0ba]/10 p-8 text-center border-b border-white/5 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-[#00b0ba]" />
                                <div className="mb-4 flex justify-center">
                                    <div className="w-20 h-20 flex items-center justify-center transform rotate-3">
                                        <Image
                                            src="/Bit_logo.svg"
                                            alt="Bit"
                                            width={60}
                                            height={60}
                                            className="w-16 h-16 drop-shadow-lg"
                                        />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-1">תשלום באמצעות ביט</h3>
                                <p className="text-white/60 text-sm">העברה מהירה ומאובטחת לטליה</p>
                            </div>

                            {/* Body Section */}
                            <div className="p-6 space-y-6">

                                {/* Amount Display */}
                                <div className="bg-black/40 rounded-2xl p-4 flex justify-between items-center border border-white/5">
                                    <span className="text-white/60 font-medium">סכום לתשלום:</span>
                                    <span className="text-3xl font-bold text-white tracking-widest">{amount}₪</span>
                                </div>

                                {/* Explanation Text */}
                                <div className="text-xs text-white/50 text-center leading-relaxed px-2">
                                    <p>יש למלא ידנית את סכום ההעברה וסיבת התשלום באפליקציה.</p>
                                    <p className="mt-1 text-[#E2F163]">הכרטיסים יתעדכנו באפליקציה רק לאחר אישור ההעברה ע"י טליה.</p>
                                </div>

                                {/* Description Copy Section */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end px-1">
                                        <label className="text-xs font-bold text-white/40 uppercase tracking-wider">
                                            סיבת העברה (מומלץ להעתיק)
                                        </label>
                                    </div>
                                    <div
                                        onClick={handleCopy}
                                        className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/10 transition-colors group active:scale-[0.98]"
                                    >
                                        <span className="text-white/90 font-medium text-sm break-all tracking-wide px-2">
                                            {paymentDescription}
                                        </span>
                                        <div className={cn(
                                            "p-2 rounded-lg transition-all shrink-0",
                                            copied ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white group-hover:bg-white/20"
                                        )}>
                                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-2 flex flex-col gap-3">
                                    <button
                                        onClick={onConfirm}
                                        className="w-full bg-[#00b0ba] hover:bg-[#009ca6] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#00b0ba]/20 active:scale-95"
                                    >
                                        <span>מעבר לתשלום באפליקציה</span>
                                        <ExternalLink className="w-5 h-5" />
                                    </button>

                                    <button
                                        onClick={onClose}
                                        className="w-full bg-transparent hover:bg-white/5 text-white/40 font-bold py-3 rounded-xl text-sm transition-colors"
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
