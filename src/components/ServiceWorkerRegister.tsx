"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Version key stored in localStorage to track actual SW updates
const SW_VERSION_KEY = "talia_sw_version";

export default function ServiceWorkerRegister() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
    // Track if we've already handled an update this session to prevent double-prompts
    const updateHandledRef = useRef<boolean>(false);

    const handleUpdate = useCallback(() => {
        // Use ref to avoid stale state
        const reg = registrationRef.current;

        // Clear all caches
        if ("caches" in window) {
            caches.keys().then(keys => {
                keys.forEach(key => caches.delete(key));
            });
        }

        // Tell waiting SW to take over
        if (reg?.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Update the stored version timestamp
        localStorage.setItem(SW_VERSION_KEY, Date.now().toString());

        // Force reload after short delay
        setTimeout(() => {
            window.location.reload();
        }, 300);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
            return;
        }

        const registerSW = async () => {
            try {
                const reg = await navigator.serviceWorker.register("/sw.js");
                registrationRef.current = reg;
                console.log("[SW] Registered successfully:", reg.scope);

                // Only listen for NEW updates (updatefound event)
                reg.addEventListener("updatefound", () => {
                    const newWorker = reg.installing;
                    if (!newWorker || updateHandledRef.current) return;

                    console.log("[SW] New version installing...");

                    newWorker.addEventListener("statechange", () => {
                        // When new SW is installed and waiting, AND there's an existing controller
                        // (meaning this is truly an update, not first install)
                        if (
                            newWorker.state === "installed" &&
                            navigator.serviceWorker.controller &&
                            !updateHandledRef.current
                        ) {

                            // Double check if it's really a new version by comparing with current
                            // This prevents some OneSignal-related false positives
                            if (newWorker !== navigator.serviceWorker.controller) {
                                updateHandledRef.current = true;
                                console.log("[SW] Update available - showing prompt");
                                setUpdateAvailable(true);
                            }
                        }
                    });
                });

                // Check for updates in background (don't show banner for stale waiting workers)
                setTimeout(() => {
                    reg.update().catch(() => {
                        // Silently ignore update check failures
                    });
                }, 10000);

            } catch (error) {
                console.error("[SW] Registration failed:", error);
            }
        };

        registerSW();

        // REMOVED: potentially dangerous controllerchange auto-reload
        // This was likely causing the "crash/restart" loop on app open

        // Check for updates periodically (every hour)
        const interval = setInterval(() => {
            if (!updateHandledRef.current) {
                registrationRef.current?.update();
            }
        }, 60 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <AnimatePresence>
            {updateAvailable && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
                >
                    <div className="bg-gradient-to-r from-[#1a1c19] to-[#232521] border border-[#E2F163]/30 rounded-2xl p-4 shadow-2xl shadow-black/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#E2F163]/10 rounded-xl flex items-center justify-center shrink-0">
                                <span className="text-2xl">✨</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-white text-sm">גרסה חדשה זמינה!</h4>
                                <p className="text-xs text-neutral-400">לחצי לרענון ולקבלת העדכונים</p>
                            </div>
                            <button
                                onClick={handleUpdate}
                                className="bg-[#E2F163] text-black px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-transform shrink-0"
                            >
                                רענון
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
