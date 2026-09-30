"use client";

import { useEffect, useRef, useState } from "react";

export default function ServiceWorkerRegister() {
    const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const refreshing = useRef(false);

    const applyUpdate = () => {
        if (!waiting || refreshing.current) return;
        refreshing.current = true;
        // clientsClaim is deliberately off: an activated worker does not take
        // over an open tab, so controllerchange alone is insufficient here.
        if (waiting.state === "activated") {
            window.location.reload();
            return;
        }
        waiting.addEventListener("statechange", () => {
            if (waiting.state === "activated") window.location.reload();
        });
        waiting.postMessage({ type: "SKIP_WAITING" });
        setWaiting(null);
        // Some older installed workers do not claim the current tab. A reload
        // also gives the new worker a chance to control the next navigation.
        window.setTimeout(() => window.location.reload(), 1500);
    };

    useEffect(() => {
        if (process.env.NODE_ENV === "development" || !("serviceWorker" in navigator)) return;

        let active = true;
        let registration: ServiceWorkerRegistration | null = null;
        let installing: ServiceWorker | null = null;
        let updateTimer: ReturnType<typeof setTimeout> | null = null;

        const onControllerChange = () => {
            if (refreshing.current) window.location.reload();
        };
        const onStateChange = () => {
            if (active && installing?.state === "installed" && navigator.serviceWorker.controller && registration?.waiting) {
                setWaiting(registration.waiting);
            }
        };
        const onUpdateFound = () => {
            installing?.removeEventListener("statechange", onStateChange);
            installing = registration?.installing ?? null;
            installing?.addEventListener("statechange", onStateChange);
        };

        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
        const register = async () => {
            try {
                registration = await navigator.serviceWorker.register("/sw.js");
                if (!active) return;
                if (registration.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting);
                registration.addEventListener("updatefound", onUpdateFound);
                updateTimer = setTimeout(() => { void registration?.update().catch(() => undefined); }, 30000);
            } catch (error) {
                console.error("Service worker registration failed", error);
            }
        };
        void register();

        return () => {
            active = false;
            if (updateTimer) clearTimeout(updateTimer);
            registration?.removeEventListener("updatefound", onUpdateFound);
            installing?.removeEventListener("statechange", onStateChange);
            navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
        };
    }, []);

    if (!waiting || dismissed) return null;

    return (
        <div role="status" className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[90] mx-auto flex max-w-md items-center gap-3 rounded-[1.25rem] bg-[var(--studio-deep)] p-3 text-[var(--studio-deep-contrast)] shadow-xl">
            <p className="min-w-0 flex-1 text-xs font-bold">יש עדכון לסטודיו טליה</p>
            <button type="button" onClick={applyUpdate} className="min-h-11 rounded-full bg-[var(--studio-accent-bg)] px-4 text-xs font-bold text-[var(--studio-ink)]">לעדכן</button>
            <button type="button" onClick={() => setDismissed(true)} className="min-h-11 px-2 text-xs text-[var(--studio-deep-contrast)]/75">אחר כך</button>
        </div>
    );
}
