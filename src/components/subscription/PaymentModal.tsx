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
    // Example: "Nehoray - Premium - January"
    const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
    const paymentDescription = `${userName} - ${tierName.toUpperCase()} - ${currentMonth}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(paymentDescription);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-neutral-900 border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative"
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
                                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
                                        <Image
                                            src="/Bit_logo.svg"
                                            alt="Bit"
                                            width={50}
                                            height={50}
                                            className="w-12 h-12"
                                        />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-1">תשלום ב-Bit</h3>
                                <p className="text-white/60 text-sm">העברה מהירה ומאובטחת</p>
                            </div>

                            {/* Body Section */}
                            <div className="p-6 space-y-6">

                                {/* Amount Display */}
                                <div className="bg-black/40 rounded-2xl p-4 flex justify-between items-center border border-white/5">
                                    <span className="text-white/60 font-medium">סכום לתשלום:</span>
                                    <span className="text-3xl font-bold text-white">{amount}₪</span>
                                </div>

                                {/* Description Copy Section */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider block pr-1">
                                        תיאור להעברה (חובה להעתיק)
                                    </label>
                                    <div
                                        onClick={handleCopy}
                                        className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/10 transition-colors group active:scale-[0.98]"
                                    >
                                        <code className="text-[#E2F163] font-mono text-sm break-all font-bold tracking-wide">
                                            {paymentDescription}
                                        </code>
                                        <div className={cn(
                                            "p-2 rounded-lg transition-all",
                                            copied ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white group-hover:bg-white/20"
                                        )}>
                                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-white/40 pr-2">
                                        * אנא הדביקי את הטקסט בשדה "הערה" באפליקציית ביט
                                    </p>
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
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
