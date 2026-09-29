"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Download, MoreVertical, Share2, Smartphone, X } from "lucide-react";
import { useInstallApp } from "@/components/PWAInstallProvider";

export default function InstallAppButton() {
    const { isStandalone, isIOS, canInstall, promptInstall } = useInstallApp();
    const [instructionsOpen, setInstructionsOpen] = useState(false);
    const reduceMotion = useReducedMotion();

    if (isStandalone) return null;

    const handleClick = async () => {
        if (canInstall) {
            await promptInstall();
        } else {
            setInstructionsOpen(true);
        }
    };

    return (
        <>
            <button type="button" onClick={handleClick} className="flex min-h-16 w-full items-center gap-3 rounded-[1.5rem] border border-[var(--studio-ink)]/10 bg-[var(--studio-card)] px-5 text-start transition-colors active:bg-[var(--studio-accent-bg)]/20">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--studio-accent-bg)] text-[var(--studio-ink)]"><Download aria-hidden="true" className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">להוסיף למסך הבית</span><span className="mt-0.5 block text-xs text-[var(--studio-muted)]">כניסה מהירה בלי לפתוח דפדפן</span></span>
            </button>

            <AnimatePresence>
                {instructionsOpen && (
                    <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end justify-center">
                        <button type="button" aria-label="סגירה" onClick={() => setInstructionsOpen(false)} className="absolute inset-0 bg-black/65" />
                        <motion.div role="dialog" aria-modal="true" aria-labelledby="install-app-title" initial={reduceMotion ? false : { y: "100%" }} animate={{ y: 0 }} exit={reduceMotion ? undefined : { y: "100%" }} transition={{ type: "spring", stiffness: 350, damping: 35 }} className="relative w-full max-w-lg rounded-t-[2rem] bg-[var(--studio-sheet)] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-7 text-[var(--studio-ink)]">
                            <button type="button" onClick={() => setInstructionsOpen(false)} aria-label="סגירה" className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--studio-ink)]/15"><X aria-hidden="true" className="h-5 w-5" /></button>
                            <Smartphone aria-hidden="true" className="h-7 w-7 text-[var(--studio-subtle)]" />
                            <h2 id="install-app-title" className="mt-4 text-[1.7rem] font-bold">הסטודיו במסך הבית</h2>
                            <p className="mt-2 text-sm text-[var(--studio-muted)]">כך מגיעים לאימונים בלחיצה אחת:</p>
                            <div className="mt-6 space-y-3">
                                {isIOS ? (
                                    <>
                                        <p className="flex items-center gap-3 text-sm"><Share2 aria-hidden="true" className="h-5 w-5 text-[var(--studio-subtle)]" />פתחי את תפריט השיתוף בדפדפן.</p>
                                        <p className="flex items-center gap-3 text-sm"><Download aria-hidden="true" className="h-5 w-5 text-[var(--studio-subtle)]" />בחרי ״הוספה למסך הבית״.</p>
                                    </>
                                ) : (
                                    <p className="flex items-center gap-3 text-sm"><MoreVertical aria-hidden="true" className="h-5 w-5 text-[var(--studio-subtle)]" />פתחי את תפריט הדפדפן ובחרי ״התקנת האפליקציה״ או ״הוספה למסך הבית״.</p>
                                )}
                            </div>
                            <button type="button" onClick={() => setInstructionsOpen(false)} className="mt-7 min-h-12 w-full rounded-full bg-[var(--studio-deep)] text-sm font-bold text-[var(--studio-deep-contrast)]">הבנתי</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
