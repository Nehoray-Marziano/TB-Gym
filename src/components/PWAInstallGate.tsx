"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Smartphone, Share, Plus, X, CheckCircle2, Zap, Bell, Rocket, Home, PartyPopper } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

interface PWAInstallGateProps {
    children: React.ReactNode;
}

export default function PWAInstallGate({ children }: PWAInstallGateProps) {
    const { canAccess, canInstall, isIOS, justInstalled, promptInstall, isLoading } = usePWAInstall();
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);

    // While loading, show nothing (prevents flash)
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#131512] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#E2F163] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // If user can access (PWA or localhost), show the app
    if (canAccess) {
        return <>{children}</>;
    }

    // Show success screen after installation
    if (justInstalled) {
        return (
            <div className="min-h-[100dvh] w-full bg-[#131512] text-[#ECF0E7] overflow-x-hidden font-sans relative">
                {/* Animated Background */}
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-[10%] left-[10%] w-[300px] h-[300px] bg-[#E2F163]/20 rounded-full blur-[80px] animate-pulse" />
                    <div className="absolute bottom-[20%] right-[10%] w-[250px] h-[250px] bg-green-500/10 rounded-full blur-[60px]" />
                </div>

                <main className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-6 py-12">
                    {/* Success Icon */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 15, stiffness: 200 }}
                        className="mb-8"
                    >
                        <div className="w-28 h-28 bg-gradient-to-br from-green-400 to-[#E2F163] rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30">
                            <PartyPopper className="w-14 h-14 text-black" />
                        </div>
                    </motion.div>

                    <motion.h1
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-3xl font-bold mb-4"
                    >
                        ההתקנה הושלמה! 🎉
                    </motion.h1>

                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-neutral-400 text-lg max-w-sm mx-auto mb-10 leading-relaxed"
                    >
                        עכשיו פתחי את האפליקציה<br />
                        <span className="text-white font-bold">מהמסך הבית</span> שלך
                    </motion.p>

                    {/* Visual Hint */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-col items-center gap-4 p-6 bg-white/5 rounded-3xl border border-white/10 max-w-sm w-full"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
                                <img src="/icon.png" alt="Icon" className="w-full h-full object-cover" />
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-white">Talia</p>
                                <p className="text-xs text-neutral-500">מסך הבית</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-[#E2F163]">
                            <Home className="w-4 h-4" />
                            <span className="text-sm font-medium">חפשי את האייקון במסך הבית</span>
                        </div>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="text-neutral-600 text-xs mt-12"
                    >
                        © 2024 Talia Studio
                    </motion.p>
                </main>
            </div>
        );
    }

    // Otherwise, show the install gate
    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSInstructions(true);
        } else if (canInstall) {
            setIsInstalling(true);
            await promptInstall();
            setIsInstalling(false);
        } else {
            // Fallback: show generic instructions
            setShowIOSInstructions(true);
        }
    };

    return (
        <div className="min-h-[100dvh] w-full bg-[#131512] text-[#ECF0E7] overflow-x-hidden font-sans relative">
            {/* Animated Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[10%] left-[10%] w-[300px] h-[300px] bg-[#E2F163]/10 rounded-full blur-[80px] animate-pulse" />
                <div className="absolute bottom-[20%] right-[10%] w-[250px] h-[250px] bg-[#E2F163]/5 rounded-full blur-[60px]" />
            </div>

            {/* Main Content */}
            <main className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-6 py-12">
                {/* App Icon */}
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 20, stiffness: 200 }}
                    className="mb-8"
                >
                    <div className="w-24 h-24 bg-gradient-to-br from-[#E2F163] to-[#9CA986] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#E2F163]/30">
                        <img src="/icon.png" alt="App Icon" className="w-[102%] h-[102%] object-cover rounded-3xl" />
                    </div>
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-3xl md:text-4xl font-bold mb-4"
                >
                    התקיני את <span className="text-[#E2F163]">טליה</span>
                </motion.h1>

                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-neutral-400 text-lg max-w-sm mx-auto mb-8 leading-relaxed"
                >
                    לחוויה הטובה ביותר, התקיני את האפליקציה על המכשיר שלך
                </motion.p>

                {/* Benefits */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-3 gap-4 mb-10 w-full max-w-sm"
                >
                    {[
                        { icon: Rocket, label: "מהירות" },
                        { icon: Bell, label: "התראות" },
                        { icon: Zap, label: "גישה מלאה" },
                    ].map((benefit, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-2xl border border-white/5">
                            <benefit.icon className="w-6 h-6 text-[#E2F163]" />
                            <span className="text-xs text-neutral-400">{benefit.label}</span>
                        </div>
                    ))}
                </motion.div>

                {/* Install Button */}
                <motion.button
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="w-full max-w-sm bg-[#E2F163] text-black font-bold text-lg py-5 px-8 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-[#E2F163]/30 disabled:opacity-70"
                >
                    {isInstalling ? (
                        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <Download className="w-6 h-6" />
                            התקיני עכשיו
                        </>
                    )}
                </motion.button>

                {/* iOS hint */}
                {isIOS && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-neutral-500 text-sm mt-4"
                    >
                        משתמשת באייפון? לחצי לקבלת הוראות
                    </motion.p>
                )}

                {/* Footer */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-neutral-600 text-xs mt-12"
                >
                    © 2024 Talia Studio
                </motion.p>
            </main>

            {/* iOS Instructions Modal */}
            <AnimatePresence>
                {showIOSInstructions && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
                        onClick={() => setShowIOSInstructions(false)}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-[#1a1c19] border border-white/10 rounded-t-3xl md:rounded-3xl p-6 pb-10"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setShowIOSInstructions(false)}
                                className="absolute top-4 left-4 p-2 text-neutral-500 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Header */}
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-[#E2F163]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Smartphone className="w-8 h-8 text-[#E2F163]" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">הוראות התקנה</h2>
                                <p className="text-neutral-400 text-sm">בצעי את הצעדים הבאים להתקנת האפליקציה</p>
                            </div>

                            {/* Steps */}
                            <div className="space-y-4">
                                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl">
                                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                                        <Share className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white mb-1">1. לחצי על כפתור השיתוף</h3>
                                        <p className="text-neutral-400 text-sm">נמצא בתחתית המסך בספארי (ריבוע עם חץ למעלה)</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl">
                                    <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center shrink-0">
                                        <Plus className="w-5 h-5 text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white mb-1">2. בחרי "הוסף למסך הבית"</h3>
                                        <p className="text-neutral-400 text-sm">גללי למטה בתפריט ומצאי את האפשרות</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl">
                                    <div className="w-10 h-10 bg-[#E2F163]/20 rounded-xl flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-5 h-5 text-[#E2F163]" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white mb-1">3. לחצי "הוסף"</h3>
                                        <p className="text-neutral-400 text-sm">האפליקציה תופיע במסך הבית שלך</p>
                                    </div>
                                </div>
                            </div>

                            {/* Done Button */}
                            <button
                                onClick={() => setShowIOSInstructions(false)}
                                className="w-full mt-6 py-4 bg-white/10 text-white font-bold rounded-2xl active:scale-95 transition-transform"
                            >
                                הבנתי, תודה!
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
