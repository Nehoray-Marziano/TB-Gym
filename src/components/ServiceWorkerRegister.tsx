"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ServiceWorkerRegister() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

    const handleUpdate = useCallback(async () => {
        // 1. Clear all caches to ensure fresh content
        if ("caches" in window) {
            try {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
                console.log("[SW] Caches cleared for update");
            } catch (err) {
                console.error("[SW] Failed to clear caches:", err);
            }
        }

        // 2. Tell waiting SW to take over
        if (registration?.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
            // Fallback if no waiting worker (unlikely if updateAvailable is true)
            window.location.reload();
        }
    }, [registration]);

    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
            return;
        }

        const registerSW = async () => {
            try {
                const reg = await navigator.serviceWorker.register("/sw.js");
                setRegistration(reg);
                console.log("[SW] Registered successfully:", reg.scope);

                // Check for updates immediately
                reg.update();

                // Listen for new service worker installing
                reg.addEventListener("updatefound", () => {
                    const newWorker = reg.installing;
                    if (!newWorker) return;

                    console.log("[SW] New version installing...");

                    newWorker.addEventListener("statechange", () => {
                        // When new SW is installed and waiting
                        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                            console.log("[SW] New version ready - showing update prompt");
                            setUpdateAvailable(true);
                        }
                    });
                });

                // Also check if there's already a waiting worker
                if (reg.waiting && navigator.serviceWorker.controller) {
                    setUpdateAvailable(true);
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
            window.location.reload();
        });

        // Check for updates periodically (every 5 minutes)
        const interval = setInterval(() => {
            registration?.update();
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [registration]);

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
