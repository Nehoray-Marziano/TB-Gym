"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Download, MoreVertical, PlusSquare, Share2, Smartphone, Sparkles, X } from "lucide-react";
import { useInstallApp } from "@/components/PWAInstallProvider";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";
import { usePathname } from "next/navigation";

const DISMISS_KEY = "talia_install_prompt_dismissed";
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const SESSION_SHOWN_KEY = "talia_install_prompt_shown";
const INSTALLED_KEY = "talia_pwa_installed";
const LOGIN_FLAG_KEY = "talia_just_logged_in";

export default function PWAInstallPrompt() {
    const { isStandalone, canInstall, isIOS, promptInstall, isPromptOpen, openPrompt, closePrompt } = useInstallApp();
    const { userId } = useGymStore();
    const { toast } = useToast();
    const pathname = usePathname();
    const reduceMotion = useReducedMotion();
    const [installing, setInstalling] = useState(false);
    const [showManualGuide, setShowManualGuide] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);

    // Auto-prompt on login or for logged-in users who haven't installed yet
    useEffect(() => {
        if (typeof window === "undefined") return;
        // Never prompt if already in standalone mode
        if (isStandalone) return;
        // Only prompt logged-in users
        if (!userId) return;

        // Skip QA synthetic test fixtures, auth and onboarding routes
        if (pathname?.includes("-check") || pathname?.startsWith("/auth/") || pathname?.startsWith("/onboarding")) {
            return;
        }

        let justLoggedIn = false;
        try {
            if (sessionStorage.getItem(LOGIN_FLAG_KEY) === "1") {
                justLoggedIn = true;
                sessionStorage.removeItem(LOGIN_FLAG_KEY);
            }
        } catch {
            // Storage access might be restricted
        }

        if (!justLoggedIn && typeof document !== "undefined" && document.cookie.includes(`${LOGIN_FLAG_KEY}=1`)) {
            justLoggedIn = true;
            document.cookie = `${LOGIN_FLAG_KEY}=; path=/; max-age=0`;
        }

        if (!justLoggedIn && typeof window !== "undefined") {
            try {
                const searchParams = new URLSearchParams(window.location.search);
                if (searchParams.get("login") === "1") {
                    justLoggedIn = true;
                    const url = new URL(window.location.href);
                    url.searchParams.delete("login");
                    window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
                }
            } catch {
                // Ignore URL parsing errors
            }
        }

        // Check if user already installed the app
        try {
            if (localStorage.getItem(INSTALLED_KEY) === "1") return;
        } catch {
            // Storage access might be restricted
        }

        // If the user literally just logged in, show prompt with a brief settling pause
        if (justLoggedIn) {
            const timer = setTimeout(() => {
                openPrompt();
                try {
                    sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
                } catch {}
            }, 750);
            return () => clearTimeout(timer);
        }

        // Otherwise, prompt once per session if not recently dismissed
        try {
            const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
            const isDismissed = dismissedAt && Date.now() - dismissedAt < DISMISS_MS;
            const shownThisSession = sessionStorage.getItem(SESSION_SHOWN_KEY) === "1";

            if (!isDismissed && !shownThisSession) {
                const timer = setTimeout(() => {
                    openPrompt();
                    try {
                        sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
                    } catch {}
                }, 1200);
                return () => clearTimeout(timer);
            }
        } catch {
            // Storage access might be restricted
        }
    }, [userId, isStandalone, pathname, openPrompt]);

    // Handle external appinstalled event
    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleInstalled = () => {
            try {
                localStorage.setItem(INSTALLED_KEY, "1");
            } catch {}
            closePrompt();
            toast({
                type: "success",
                title: "האפליקציה נוספה בהצלחה!",
                description: "תוכלי לפתוח אותה ישירות ממסך הבית שלך.",
            });
        };

        window.addEventListener("appinstalled", handleInstalled);
        return () => window.removeEventListener("appinstalled", handleInstalled);
    }, [closePrompt, toast]);

    const handleDismiss = useCallback(() => {
        try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
            sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
        } catch {}
        closePrompt();
    }, [closePrompt]);

    const handleInstallClick = async () => {
        if (canInstall) {
            setInstalling(true);
            try {
                const success = await promptInstall();
                if (success) {
                    try {
                        localStorage.setItem(INSTALLED_KEY, "1");
                    } catch {}
                    closePrompt();
                    toast({
                        type: "success",
                        title: "האפליקציה נוספה בהצלחה!",
                        description: "תוכלי לפתוח אותה ישירות ממסך הבית שלך.",
                    });
                }
            } finally {
                setInstalling(false);
            }
        } else {
            setShowManualGuide(true);
        }
    };

    // Close on Escape key
    useEffect(() => {
        if (!isPromptOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                handleDismiss();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isPromptOpen, handleDismiss]);

    if (!isPromptOpen || isStandalone) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
            >
                {/* Backdrop */}
                <button
                    type="button"
                    aria-label="סגירה"
                    onClick={handleDismiss}
                    className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity"
                />

                {/* Modal surface */}
                <motion.div
                    ref={dialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="install-pwa-title"
                    initial={reduceMotion ? false : { y: "100%", opacity: 0.8 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={reduceMotion ? undefined : { y: "100%", opacity: 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 36 }}
                    className="relative w-full max-w-lg rounded-t-[2.25rem] sm:rounded-[2rem] border-t sm:border border-[var(--studio-ink)]/15 bg-[var(--studio-sheet)] px-6 pb-[calc(1.75rem+env(safe-area-inset-bottom))] pt-7 text-[var(--studio-ink)] shadow-[0_-8px_32px_rgba(0,0,0,0.18)] sm:shadow-2xl"
                >
                    {/* Close 'X' Button */}
                    <button
                        type="button"
                        onClick={handleDismiss}
                        aria-label="סגירה"
                        className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--studio-ink)]/15 text-[var(--studio-muted)] hover:text-[var(--studio-ink)] active:scale-95 transition-colors"
                    >
                        <X aria-hidden="true" className="h-5 w-5" />
                    </button>

                    {/* Studio Icon Badge */}
                    <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[var(--studio-deep)] text-[#cbd3aa] shadow-sm">
                        <Smartphone aria-hidden="true" className="h-7 w-7 text-[#cbd3aa]" />
                    </div>

                    {/* Headline */}
                    <h2 id="install-pwa-title" className="mt-4 text-2xl font-bold tracking-tight text-[var(--studio-ink)]">
                        הסטודיו איתך במסך הבית
                    </h2>

                    {/* Subtitle */}
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--studio-muted)]">
                        התחברת בהצלחה! הוסיפי את סטודיו טליה למסך הבית לגישה מהירה, שריון מקום מיידי וחוויית שימוש במסך מלא.
                    </p>

                    {/* Body content based on platform */}
                    {isIOS || showManualGuide ? (
                        <div className="mt-5 space-y-3 rounded-2xl border border-[var(--studio-ink)]/10 bg-[var(--studio-card)] p-4 text-sm">
                            <p className="font-bold text-xs text-[var(--studio-subtle)] mb-1">
                                {isIOS ? "הוראות התקנה ב-iPhone (Safari):" : "הוראות התקנה:"}
                            </p>
                            {isIOS ? (
                                <>
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--studio-accent-bg)]/20 text-[var(--studio-ink)]">
                                            <Share2 aria-hidden="true" className="h-4.5 w-4.5 text-[var(--studio-subtle)]" />
                                        </span>
                                        <span className="font-medium text-[var(--studio-ink)]">
                                            1. לחצי על כפתור השיתוף בתחתית הדפדפן (ספארי)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--studio-accent-bg)]/20 text-[var(--studio-ink)]">
                                            <PlusSquare aria-hidden="true" className="h-4.5 w-4.5 text-[var(--studio-subtle)]" />
                                        </span>
                                        <span className="font-medium text-[var(--studio-ink)]">
                                            2. גללי ובחרי ״הוספה למסך הבית״ (Add to Home Screen)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--studio-accent-bg)]/20 text-[var(--studio-ink)]">
                                            <Sparkles aria-hidden="true" className="h-4.5 w-4.5 text-[var(--studio-subtle)]" />
                                        </span>
                                        <span className="font-medium text-[var(--studio-ink)]">
                                            3. לחצי ״הוסף״ והאפליקציה מחכה לך על המסך!
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--studio-accent-bg)]/20 text-[var(--studio-ink)]">
                                        <MoreVertical aria-hidden="true" className="h-4.5 w-4.5 text-[var(--studio-subtle)]" />
                                    </span>
                                    <span className="font-medium text-[var(--studio-ink)]">
                                        פתחי את תפריט הדפדפן (3 נקודות) ובחרי ״התקנת אפליקציה״ או ״הוספה למסך הבית״.
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="mt-5 space-y-2 rounded-2xl border border-[var(--studio-ink)]/10 bg-[var(--studio-card)] p-4 text-xs font-medium text-[var(--studio-muted)]">
                            <div className="flex items-center gap-2.5">
                                <Sparkles aria-hidden="true" className="h-4 w-4 text-[var(--studio-brand)]" />
                                <span>כניסה מהירה בלחיצה אחת ללא צורך לפתוח דפדפן</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <Sparkles aria-hidden="true" className="h-4 w-4 text-[var(--studio-brand)]" />
                                <span>חוויית שימוש במסך מלא ומותאמת אישית</span>
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-6 flex flex-col gap-2.5">
                        {canInstall && !showManualGuide ? (
                            <button
                                type="button"
                                disabled={installing}
                                onClick={handleInstallClick}
                                className="flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-[var(--studio-deep)] text-sm font-bold text-[var(--studio-deep-contrast)] shadow-md transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
                            >
                                <Download aria-hidden="true" className="h-4.5 w-4.5" />
                                <span>{installing ? "מתקין…" : "להתקנה במסך הבית"}</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleDismiss}
                                className="flex min-h-13 w-full items-center justify-center rounded-full bg-[var(--studio-deep)] text-sm font-bold text-[var(--studio-deep-contrast)] shadow-md transition-all hover:brightness-110 active:scale-[0.98]"
                            >
                                הבנתי, תודה
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleDismiss}
                            className="flex min-h-11 w-full items-center justify-center rounded-full text-xs font-semibold text-[var(--studio-muted)] hover:text-[var(--studio-ink)] transition-colors"
                        >
                            לא עכשיו
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
