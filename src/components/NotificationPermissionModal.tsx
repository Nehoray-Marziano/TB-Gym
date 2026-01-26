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
    // BUMPED VERSION TO V4 TO FORCE PROMPT FOR USER
    const [storageKey, setStorageKey] = useState("notification_prompt_dismissed_v4");

    useEffect(() => {
        // Check if we should show the modal
        const checkPermission = async () => {
            // Detect if running as installed PWA (standalone mode)
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                || (window.navigator as any).standalone === true;

            // Use different key for standalone vs browser - fresh PWA install = fresh prompt
            const key = isStandalone
                ? "notification_prompt_dismissed_pwa_v4"
                : "notification_prompt_dismissed_browser_v4";
            setStorageKey(key);

            // Don't show if already dismissed in this context
            const dismissed = localStorage.getItem(key);
            if (dismissed) {
                setHasChecked(true);
                return;
            }

            // Wait for OneSignal to be ready
            let attempt = 0;
            const waitForOneSignal = setInterval(async () => {
                attempt++;
                if (window.OneSignal) {
                    clearInterval(waitForOneSignal);

                    try {
                        const permission = window.OneSignal.Notifications.permission;

                        const isGranted = permission === "granted" || permission === true;
                        const isDenied = permission === "denied";

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
                await window.OneSignal.Notifications.requestPermission();
            }
        } catch (e) {
            console.error("Permission request error:", e);
        }

        setIsLoading(false);
        localStorage.setItem(storageKey, "true");
        setIsVisible(false);
        onComplete?.();
    };

    const handleDismiss = () => {
        localStorage.setItem(storageKey, "true");
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
