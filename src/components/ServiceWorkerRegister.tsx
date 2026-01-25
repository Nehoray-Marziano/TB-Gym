"use client";

import { useEffect, useRef } from "react";

/**
 * ServiceWorkerRegister - Handles SW registration and update prompts
 * 
 * IMPORTANT: This component should NOT show any UI on first install.
 * The banner should ONLY appear when there's a genuine update to an
 * already-installed service worker.
 */
export default function ServiceWorkerRegister() {
    const hasShownBanner = useRef(false);

    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
            return;
        }

        // Don't do anything on first page load - let the SW install quietly
        // Only check for updates after user has been using the app
        const registerAndListen = async () => {
            try {
                // GHOST BUSTER: Find and unregister the old conflicting OneSignal worker
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const reg of registrations) {
                    // Check if this is the "Ghost" worker
                    if (reg.active?.scriptURL.includes("OneSignalSDKWorker.js") ||
                        reg.waiting?.scriptURL.includes("OneSignalSDKWorker.js")) {
                        console.log("[SW] Found ghost worker! Exorcising...", reg.scope);
                        await reg.unregister();
                    }
                }

                const registration = await navigator.serviceWorker.register("/sw.js");
                console.log("[SW] Registered:", registration.scope);

                // ONLY check for updates after 30 seconds of app usage
                // This prevents showing banners on fresh installs
                setTimeout(() => {
                    registration.update().catch(() => { });
                }, 30000);

                // Listen for updates that happen AFTER initial registration
                registration.addEventListener("updatefound", () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;

                    // Wait for the new worker to be installed
                    newWorker.addEventListener("statechange", () => {
                        if (
                            newWorker.state === "installed" &&
                            navigator.serviceWorker.controller && // There was an existing SW
                            registration.active && // And there's an active SW
                            !hasShownBanner.current
                        ) {
                            // This is a genuine update - show a simple console message
                            // We deliberately do NOT show a banner anymore to avoid false positives
                            console.log("[SW] New version available. Refresh to update.");
                            hasShownBanner.current = true;
                        }
                    });
                });

            } catch (error) {
                console.error("[SW] Registration failed:", error);
            }
        };

        registerAndListen();

        // No need for periodic update checks - browser does this automatically
    }, []);

    // Return null - no UI component. Updates will be silent.
    // Users will get updates on next app restart.
    return null;
}
