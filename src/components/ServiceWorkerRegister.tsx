"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ServiceWorkerRegister() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
    // Track if this is a fresh page load (no existing controller when we started)
    const wasFreshLoad = useRef<boolean>(false);

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

        // Force reload after short delay
        setTimeout(() => {
            window.location.reload();
        }, 300);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
            return;
        }

        // Check if there was an existing controller when the page loaded
        // If not, this is a "fresh" load (app was closed/new tab)
        wasFreshLoad.current = !navigator.serviceWorker.controller;
        console.log("[SW] Fresh load (no existing controller):", wasFreshLoad.current);

        const registerSW = async () => {
            try {
                const reg = await navigator.serviceWorker.register("/sw.js");
                registrationRef.current = reg;
                console.log("[SW] Registered successfully:", reg.scope);

                // Check for updates immediately
                reg.update();

                // Helper to handle a waiting SW
                const handleWaitingSW = (waitingWorker: ServiceWorker) => {
                    if (wasFreshLoad.current) {
                        // FRESH LOAD: Auto-activate immediately (user wasn't mid-session)
                        console.log("[SW] Fresh load detected - auto-activating new version");
                        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
                    } else {
                        // APP WAS OPEN: Show prompt so user can finish what they're doing
                        console.log("[SW] App was open - showing update prompt");
                        setUpdateAvailable(true);
                    }
                };

                // Listen for new service worker installing
                reg.addEventListener("updatefound", () => {
                    const newWorker = reg.installing;
                    if (!newWorker) return;

                    console.log("[SW] New version installing...");

                    newWorker.addEventListener("statechange", () => {
                        // When new SW is installed and waiting
                        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                            handleWaitingSW(newWorker);
                        }
                    });
                });

                // Also check if there's already a waiting worker on page load
                if (reg.waiting && navigator.serviceWorker.controller) {
                    handleWaitingSW(reg.waiting);
                }

            } catch (error) {
                console.error("[SW] Registration failed:", error);
            }
        };

        registerSW();

        // When a new SW takes over, reload to use the new version
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (refreshing) return;
            refreshing = true;
            console.log("[SW] Controller changed - reloading page");
            window.location.reload();
        });

        // Check for updates periodically (every 5 minutes)
        const interval = setInterval(() => {
            registrationRef.current?.update();
        }, 5 * 60 * 1000);

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
