"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Bell, BellRing, X } from "lucide-react";
import StudioLogo from "@/components/StudioLogo";

type BrowserOneSignal = { Notifications: { requestPermission: () => Promise<void> } };

const STORAGE_COOLDOWN_KEY = "talia_notification_cooldown_timestamp";
const COOLDOWN_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

interface NotificationPermissionModalProps {
    onComplete?: () => void;
}

export default function NotificationPermissionModal({ onComplete }: NotificationPermissionModalProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const reduceMotion = useReducedMotion();

    useEffect(() => {
        // Check if we should show the modal
        const checkPermission = () => {
            // Check if Notification API is available
            if (!("Notification" in window)) {
                return; // Notifications not supported
            }

            // Check Cooldown first (most common case for returning users)
            const lastInteractionStr = localStorage.getItem(STORAGE_COOLDOWN_KEY);
            if (lastInteractionStr) {
                const lastInteraction = parseInt(lastInteractionStr, 10);
                const now = Date.now();

                // If cooldown hasn't expired yet, skip
                if (now - lastInteraction < COOLDOWN_PERIOD_MS) {
                    return; // EXIT: Cooldown active
                }
            }

            // Check native permission state FIRST (doesn't require OneSignal)
            const nativePermission = Notification.permission;

            // If already granted or denied, no need to show modal
            if (nativePermission === "granted" || nativePermission === "denied") {
                return;
            }

            // Permission is "default" - we CAN show the modal
            // But wait a moment to let the dashboard load first
            const timeout = setTimeout(() => {
                // Double-check we're still in a valid state
                if (Notification.permission === "default") {
                    setIsVisible(true);
                }
            }, 2000); // 2 second delay for better UX
            return timeout;
        };

        const timeout = checkPermission();
        return () => { if (timeout) clearTimeout(timeout); };
    }, []);


    const handleAllow = async () => {
        setIsLoading(true);

        try {
            const oneSignal = (window as Window & { OneSignal?: BrowserOneSignal }).OneSignal;
            if (oneSignal?.Notifications) {
                // Use OneSignal to request permission (preferred - handles subscription)
                await oneSignal.Notifications.requestPermission();
            } else {
                // Fallback to native API if OneSignal hasn't loaded yet
                console.log("[NotificationModal] OneSignal not ready, using native API");
                await Notification.requestPermission();
            }
        } catch (e) {
            console.error("Permission request error:", e);
        }

        setIsLoading(false);

        // Set a short cooldown to prevent instant re-popup if they cancel native prompt
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

    return (
        <AnimatePresence>
            {isVisible && <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-end justify-center">
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
                    initial={reduceMotion ? false : { y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 28, stiffness: 300 }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="notification-permission-title"
                    className="relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-[var(--studio-sheet)] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-7 text-[var(--studio-ink)]"
                >
                    <StudioLogo className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 bg-[var(--studio-deep)]/5" />

                    {/* Close button */}
                    <button
                        onClick={handleDismiss}
                        type="button"
                        aria-label="סגירה"
                        className="absolute left-5 top-6 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-[#162218]/15 transition-colors active:bg-[var(--studio-deep)]/10"
                    >
                        <X aria-hidden="true" className="h-5 w-5" />
                    </button>

                    {/* Content */}
                    <div className="relative z-10">
                        <span className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--studio-accent-bg)] text-[var(--studio-ink)]"><BellRing aria-hidden="true" className="h-8 w-8" /></span>
                        <p className="mb-2 text-xs font-bold text-[var(--studio-subtle)]">נשארות מעודכנות</p>
                        <h2 id="notification-permission-title" className="max-w-[17rem] text-[2rem] font-bold leading-tight">לשמוע כשיש אימון חדש?</h2>
                        <p className="mb-8 mt-3 max-w-[18rem] text-sm leading-relaxed text-[var(--studio-muted)]">נעדכן אותך כשהלו״ז משתנה או כשמתפנה מקום באימון. אפשר לכבות את ההתראות בכל רגע.</p>

                        {/* Buttons */}
                        <div className="w-full space-y-2">
                            <button
                                type="button"
                                onClick={handleAllow}
                                disabled={isLoading}
                                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--studio-deep)] px-4 text-sm font-bold text-[var(--studio-accent-text)] transition-colors active:bg-[#334436] disabled:opacity-70"
                            >
                                {isLoading ? (
                                    <div aria-label="טוענים" className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                    <>
                                        <Bell aria-hidden="true" className="h-5 w-5" />
                                        כן, אשמח לעדכונים
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleDismiss}
                                className="min-h-11 w-full rounded-full text-xs font-bold text-[var(--studio-muted)] transition-colors active:bg-[var(--studio-deep)]/10"
                            >
                                אולי אחר כך
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>}
        </AnimatePresence>
    );
}
