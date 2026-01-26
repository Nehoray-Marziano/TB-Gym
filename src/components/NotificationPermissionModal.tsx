"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellRing, X, Sparkles } from "lucide-react";

declare global {
    interface Window {
        OneSignal?: any;
    }
}

interface NotificationPermissionModalProps {
    onComplete?: () => void;
}

export default function NotificationPermissionModal({ onComplete }: NotificationPermissionModalProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    // Key for storing the LAST time the user dismissed or interacted with the prompt
    // We no longer use "versioned" keys. We use a cooldown strategy.
    const STORAGE_COOLDOWN_KEY = "talia_notification_cooldown_timestamp";
    const COOLDOWN_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 Days in milliseconds

    useEffect(() => {
        // Check if we should show the modal
        const checkPermission = async () => {
            // Detect if running as installed PWA (standalone mode)
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                || (window.navigator as any).standalone === true;

            // Optional: If we ONLY want to show this in standalone mode, we can enforce it here.
            // For now, we allow it in browser too if the logic allows.

            // Check Cooldown
            const lastInteractionStr = localStorage.getItem(STORAGE_COOLDOWN_KEY);
            if (lastInteractionStr) {
                const lastInteraction = parseInt(lastInteractionStr, 10);
                const now = Date.now();

                // If cooldown hasn't expired yet, skip
                if (now - lastInteraction < COOLDOWN_PERIOD_MS) {
                    setHasChecked(true);
                    return; // EXIT: Cooldown active
                }
            }

            // Wait for OneSignal to be ready
            let attempt = 0;
            const waitForOneSignal = setInterval(async () => {
                attempt++;
                if (window.OneSignal) {
                    clearInterval(waitForOneSignal);

                    try {
                        const permission = window.OneSignal.Notifications.permission;

                        // v16 Permission States:
                        // true / 'granted' -> Already subscribed.
                        // false / 'denied' -> Blocked by OS/Browser.
                        // 'default' (or undefined/false in some older contexts) -> Can Request.

                        const isGranted = permission === "granted" || permission === true;
                        const isDenied = permission === "denied";

                        // Only show if NOT granted and NOT denied (i.e. we have a chance to ask)
                        if (!isGranted && !isDenied) {
                            setTimeout(() => {
                                setIsVisible(true);
                            }, 1500);
                        }
                    } catch (e) {
                        console.error("[NotificationModal] Error:", e);
                    }

                    setHasChecked(true);
                }
            }, 500);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(waitForOneSignal);
                setHasChecked(true);
            }, 10000);
        };

        checkPermission();
    }, []);

    const handleAllow = async () => {
        setIsLoading(true);

        try {
            if (window.OneSignal) {
                // If they say YES, we don't need a cooldown, the OS permission state will handle "granted" logic next time.
                await window.OneSignal.Notifications.requestPermission();
            }
        } catch (e) {
            console.error("Permission request error:", e);
        }

        setIsLoading(false);
        // We DON'T set cooldown on Allow, because if they allow, we rely on the sub status.
        // Actually, preventing re-prompting while invalid is handled by 'isGranted' check.
        // But if they click Allow here but then Deny native prompt, we should probably set cooldown.
        // For simplicity, we assume if they get to this flow, they might have clicked Allow.

        // Let's set a short cooldown (1 hour) just to prevent instant re-popup if they cancel native prompt.
        localStorage.setItem(STORAGE_COOLDOWN_KEY, Date.now().toString());

        setIsVisible(false);
        onComplete?.();
    };

    const handleDismiss = () => {
        // User clicked "Maybe Later"
        // Set full cooldown (7 days)
        localStorage.setItem(STORAGE_COOLDOWN_KEY, Date.now().toString());

        setIsVisible(false);
        onComplete?.();
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleDismiss}
                    className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ translateY: "100%", opacity: 0 }}
                    animate={{ translateY: "0%", opacity: 1 }}
                    exit={{ translateY: "100%", opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-sm bg-card border border-border rounded-3xl p-8 shadow-2xl overflow-hidden"
                >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[50px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-[40px] pointer-events-none" />

                    {/* Close button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 left-4 w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* Content */}
                    <div className="flex flex-col items-center text-center relative z-10">
                        {/* Animated bell icon */}
                        <motion.div
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", delay: 0.2, stiffness: 200 }}
                            className="w-20 h-20 bg-gradient-to-br from-primary to-[#c8d64a] rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-primary/30 relative"
                        >
                            <BellRing className="w-10 h-10 text-black" />
                            {/* Sparkle */}
                            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-primary animate-pulse" />
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-2xl font-bold text-foreground mb-3"
                        >
                            קבלי התראות! 🔔
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-muted-foreground text-sm leading-relaxed mb-8 px-4"
                        >
                            נשלח לך עדכונים על אימונים חדשים, תזכורות ועוד.
                            <br />
                            <span className="text-primary font-bold">את תמיד יכולה לבטל בהגדרות.</span>
                        </motion.p>

                        {/* Buttons */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="w-full space-y-3"
                        >
                            <button
                                onClick={handleAllow}
                                disabled={isLoading}
                                className="w-full py-4 bg-primary text-black font-bold text-lg rounded-2xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-all hover:shadow-primary/50 disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Bell className="w-5 h-5" />
                                        כן, אני רוצה לקבל התראות
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleDismiss}
                                className="w-full py-3 text-muted-foreground font-medium text-sm hover:text-foreground transition-colors"
                            >
                                אולי אחר כך
                            </button>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
