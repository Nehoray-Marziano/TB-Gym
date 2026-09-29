"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, Download, Plus, Share2, Smartphone, X } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import StudioLogo from "@/components/StudioLogo";

export default function PWAInstallGate({ children }: { children: React.ReactNode }) {
    const { canAccess, canInstall, isIOS, justInstalled, promptInstall, isLoading } = usePWAInstall();
    const reduceMotion = useReducedMotion();
    const [showInstructions, setShowInstructions] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [continueInBrowser, setContinueInBrowser] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("talia-browser-access") === "true");

    if (isLoading) {
        return <div className="flex min-h-dvh items-center justify-center bg-[var(--studio-sheet)]"><span aria-label="טוענים" className="h-8 w-8 animate-spin rounded-full border-2 border-[#1b251c] border-t-transparent" /></div>;
    }

    if (canAccess || continueInBrowser) return <>{children}</>;

    if (justInstalled) {
        return (
            <div className="min-h-dvh bg-[var(--studio-sheet)] text-[var(--studio-ink)]">
                <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-10 pt-6 sm:px-7">
                    <div className="flex items-center gap-3 border-b border-[#1b251c]/15 pb-5">
                        <StudioLogo className="h-9 w-9 bg-[var(--studio-deep)]" />
                        <span className="border-s border-[#1b251c]/20 ps-3 text-xs font-bold leading-tight">סטודיו<br />טליה</span>
                    </div>
                    <div className="mt-auto pt-12">
                        <p className="mb-3 text-xs font-bold text-[var(--studio-muted)]">הכול מוכן / 01</p>
                        <h1 className="text-[clamp(3.3rem,13vw,5rem)] font-bold leading-[1.04] tracking-tight">האפליקציה<br />מחכה לך<span className="text-[var(--studio-subtle)]">.</span></h1>
                        <p className="mt-5 max-w-[19rem] text-sm leading-relaxed text-[var(--studio-muted)]">חפשי את סטודיו טליה במסך הבית ופתחי משם את האימונים שלך.</p>
                    </div>
                    <div className="relative mt-10 overflow-hidden rounded-[2rem] bg-[var(--studio-deep)] p-6 text-[var(--studio-deep-contrast)]">
                        <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-20 h-52 w-52 rounded-full border-[30px] border-[#dce780]/20" />
                        <div className="relative flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--studio-accent-bg)]"><StudioLogo className="h-10 w-10 bg-[var(--studio-deep)]" /></div>
                            <div><p className="text-lg font-bold">סטודיו טליה</p><p className="mt-1 text-xs text-[#b9c6b2]">עכשיו במסך הבית שלך</p></div>
                        </div>
                    </div>
                    <p className="mt-auto pt-10 text-center text-xs text-[var(--studio-muted)]">© סטודיו טליה</p>
                </main>
            </div>
        );
    }

    const handleInstallClick = async () => {
        if (isIOS || !canInstall) {
            setShowInstructions(true);
            return;
        }
        setIsInstalling(true);
        await promptInstall();
        setIsInstalling(false);
    };

    const handleContinueInBrowser = () => {
        window.localStorage.setItem("talia-browser-access", "true");
        setContinueInBrowser(true);
    };

    return (
        <div className="min-h-dvh bg-[var(--studio-sheet)] text-[var(--studio-ink)]">
            <main className="mx-auto max-w-lg px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6 sm:px-7">
                <header className="flex items-center gap-3 border-b border-[#1b251c]/15 pb-5">
                    <StudioLogo className="h-9 w-9 bg-[var(--studio-deep)]" />
                    <span className="border-s border-[#1b251c]/20 ps-3 text-xs font-bold leading-tight">סטודיו<br />טליה</span>
                </header>

                <div className="pt-12">
                    <p className="mb-4 text-xs font-bold text-[var(--studio-muted)]">האימונים שלך, במסך הבית / 01</p>
                    <h1 className="text-[clamp(3.25rem,13vw,5rem)] font-bold leading-[1.04] tracking-tight">הסטודיו<br />תמיד איתך<span className="text-[var(--studio-subtle)]">.</span></h1>
                    <p className="mt-5 max-w-[19rem] text-sm leading-relaxed text-[var(--studio-muted)]">הוסיפי את סטודיו טליה למסך הבית כדי להגיע ללוח האימונים בלחיצה אחת.</p>
                </div>

                <div className="relative mt-10 overflow-hidden rounded-[2rem] bg-[var(--studio-deep)] p-6 text-[var(--studio-deep-contrast)]">
                    <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full border-[36px] border-[#dce780]" />
                    <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -right-20 h-64 w-64 rounded-full border-[36px] border-[#dce780]/15" />
                    <p className="relative text-[11px] font-bold text-[var(--studio-accent-text)]">סטודיו טליה / האפליקציה</p>
                    <div className="relative mt-16 flex items-end justify-between gap-4">
                        <p className="text-[2rem] font-bold leading-[1.08]">בוחרות.<br />נרשמות.<br /><span className="text-[var(--studio-accent-text)]">מגיעות.</span></p>
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--studio-accent-bg)]"><StudioLogo className="h-10 w-10 bg-[var(--studio-deep)]" /></div>
                    </div>
                </div>

                <button type="button" onClick={handleInstallClick} disabled={isInstalling} className="mt-8 flex min-h-14 w-full items-center justify-between rounded-full bg-[var(--studio-deep)] px-6 text-sm font-bold text-[var(--studio-deep-contrast)] disabled:opacity-50">
                    <span className="flex items-center gap-2"><Download aria-hidden="true" className="h-4 w-4" />{isInstalling ? "מוסיפים..." : "הוספה למסך הבית"}</span>
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                </button>
                <button type="button" onClick={handleContinueInBrowser} className="mt-3 min-h-12 w-full text-xs font-bold text-[var(--studio-muted)] underline underline-offset-4">להמשיך בדפדפן</button>
                <p className="mt-7 text-center text-[11px] text-[var(--studio-muted)]">אפשר לבחור מה נוח לך, גם בלי התקנה.</p>
            </main>

            <AnimatePresence>
                {showInstructions && (
                    <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end justify-center">
                        <motion.button type="button" aria-label="סגירה" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInstructions(false)} className="absolute inset-0 w-full bg-[#111a12]/65" />
                        <motion.div role="dialog" aria-modal="true" aria-labelledby="install-title" initial={reduceMotion ? false : { y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }} className="relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-[var(--studio-sheet)] px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-7">
                            <button type="button" onClick={() => setShowInstructions(false)} aria-label="סגירה" className="absolute left-6 top-7 flex h-11 w-11 items-center justify-center rounded-full border border-[#1b251c]/15"><X aria-hidden="true" className="h-5 w-5" /></button>
                            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dfe6bd]"><Smartphone aria-hidden="true" className="h-7 w-7" /></div>
                            <h2 id="install-title" className="text-2xl font-bold">איך מוסיפים למסך הבית?</h2>
                            <p className="mt-2 text-sm leading-relaxed text-[var(--studio-muted)]">{isIOS ? "באייפון, עושים את זה דרך תפריט השיתוף בספארי." : "פתחי את תפריט הדפדפן ובחרי הוספה למסך הבית."}</p>
                            <div className="mt-7 divide-y divide-[#1b251c]/15 border-y border-[#1b251c]/15">
                                {isIOS ? (
                                    <>
                                        <div className="flex min-h-20 items-center gap-4 py-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#dfe6bd]"><Share2 aria-hidden="true" className="h-5 w-5" /></span><p className="text-sm"><strong>01</strong> · לחצי על כפתור השיתוף בספארי.</p></div>
                                        <div className="flex min-h-20 items-center gap-4 py-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#dfe6bd]"><Plus aria-hidden="true" className="h-5 w-5" /></span><p className="text-sm"><strong>02</strong> · בחרי ״הוסף למסך הבית״.</p></div>
                                        <div className="flex min-h-20 items-center gap-4 py-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#dfe6bd]"><Check aria-hidden="true" className="h-5 w-5" /></span><p className="text-sm"><strong>03</strong> · אשרי את ההוספה.</p></div>
                                    </>
                                ) : (
                                    <div className="flex min-h-20 items-center gap-4 py-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#dfe6bd]"><Plus aria-hidden="true" className="h-5 w-5" /></span><p className="text-sm">בחרי ״הוספה למסך הבית״ בתפריט הדפדפן ואשרי.</p></div>
                                )}
                            </div>
                            <button type="button" onClick={() => setShowInstructions(false)} className="mt-7 min-h-12 w-full rounded-full bg-[var(--studio-deep)] px-5 text-sm font-bold text-[var(--studio-deep-contrast)]">הבנתי</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
