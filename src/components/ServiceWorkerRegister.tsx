"use client";

import { useEffect, useState } from "react";

export default function ServiceWorkerRegister() {
    const [updateReady, setUpdateReady] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (process.env.NODE_ENV === "development" || !("serviceWorker" in navigator)) return;

        let active = true;
        let registration: ServiceWorkerRegistration | null = null;
        let installing: ServiceWorker | null = null;
        let updateTimer: ReturnType<typeof setTimeout> | null = null;

        const onStateChange = () => {
            if (active && installing?.state === "installed" && navigator.serviceWorker.controller) {
                setUpdateReady(true);
            }
        };
        const onUpdateFound = () => {
            installing?.removeEventListener("statechange", onStateChange);
            installing = registration?.installing ?? null;
            installing?.addEventListener("statechange", onStateChange);
        };

        const register = async () => {
            try {
                registration = await navigator.serviceWorker.register("/sw.js");
                if (!active) return;
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
        };
    }, []);

    if (!updateReady || dismissed) return null;

    return (
        <div role="status" className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[90] mx-auto flex max-w-md items-center gap-3 rounded-[1.25rem] bg-[var(--studio-deep)] p-3 text-[var(--studio-deep-contrast)] shadow-xl">
            <p className="min-w-0 flex-1 text-xs font-bold">יש גרסה חדשה לסטודיו טליה</p>
            <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-full bg-[var(--studio-accent-bg)] px-4 text-xs font-bold text-[var(--studio-ink)]">לרענן</button>
            <button type="button" onClick={() => setDismissed(true)} className="min-h-11 px-2 text-xs text-[var(--studio-deep-contrast)]/75">אחר כך</button>
        </div>
    );
}
