"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Download, MoreVertical, Share2, Smartphone, X } from "lucide-react";
import { useInstallApp } from "@/components/PWAInstallProvider";

const DISMISS_KEY = "talia_install_nudge_dismissed";
const DISMISS_MS = 30 * 24 * 60 * 60 * 1000;

export default function InstallAppButton({ home = false }: { home?: boolean }) {
    const { isStandalone, isIOS, canInstall, promptInstall } = useInstallApp();
    const [instructionsOpen, setInstructionsOpen] = useState(false);
    const [showHome, setShowHome] = useState(false);
    const reduceMotion = useReducedMotion();

    useEffect(() => {
        if (!home) return;
        if (isStandalone || (!canInstall && !isIOS)) {
            queueMicrotask(() => setShowHome(false));
            return;
        }
        const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
        queueMicrotask(() => setShowHome(!dismissedAt || Date.now() - dismissedAt >= DISMISS_MS));
    }, [home, isStandalone, canInstall, isIOS]);

    if (isStandalone || (home && !showHome)) return null;

    const dismiss = () => {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setShowHome(false);
    };

    const handleClick = async () => {
        if (canInstall) {
            await promptInstall();
        } else {
            setInstructionsOpen(true);
        }
    };

    return (
        <>
            <div className={home ? "relative mt-4" : ""}>
                <button type="button" onClick={handleClick} className="flex min-h-16 w-full items-center gap-3 rounded-[1.5rem] border border-[var(--studio-ink)]/10 bg-[var(--studio-card)] px-5 text-start transition-colors active:bg-[var(--studio-accent-bg)]/20">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--studio-accent-bg)] text-[var(--studio-ink)]"><Download aria-hidden="true" className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{home ? "הסטודיו איתך, בלחיצה" : "להוסיף למסך הבית"}</span><span className="mt-0.5 block text-xs text-[var(--studio-muted)]">{home ? "להוסיף למסך הבית לחוויה הכי נוחה" : "כניסה מהירה בלי לפתוח דפדפן"}</span></span>
                </button>
                {home && <button type="button" onClick={dismiss} aria-label="לא עכשיו" className="absolute left-1 top-1 flex h-11 w-11 items-center justify-center rounded-full text-[var(--studio-muted)]"><X aria-hidden="true" className="h-4 w-4" /></button>}
            </div>

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
                                        <p className="flex items-center gap-3 text-sm"><Share2 aria-hidden="true" className="h-5 w-5 text-[var(--studio-subtle)]" />פתחי את האתר בספארי ואז את תפריט השיתוף.</p>
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
