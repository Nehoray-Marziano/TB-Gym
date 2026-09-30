"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { activatePWAUpdate } from "@/lib/activatePWAUpdate";
import { checkPWAAppVersion } from "@/lib/checkPWAAppVersion";

type UpdateStatus = "hidden" | "ready" | "applying" | "error";

const DISMISSED_KEY = "talia:pwa-update-dismissed";
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export default function ServiceWorkerRegister() {
    const pathname = usePathname();
    const [status, setStatus] = useState<UpdateStatus>("hidden");
    const applyRef = useRef<(() => void) | null>(null);
    const dismissRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (process.env.NODE_ENV === "development" || !("serviceWorker" in navigator)) return;

        let mounted = true;
        let registration: ServiceWorkerRegistration | null = null;
        let installing: ServiceWorker | null = null;
        let activationAbort: AbortController | null = null;
        let updateInFlight = false;
        let applying = false;
        let reloading = false;
        let dismissed = false;

        try {
            dismissed = sessionStorage.getItem(DISMISSED_KEY) === "1";
        } catch {
            // Storage may be unavailable in a private browser context.
        }

        const clearActivation = () => {
            activationAbort?.abort();
            activationAbort = null;
        };

        const reloadOnce = () => {
            if (!mounted || reloading) return;
            reloading = true;
            clearActivation();
            window.location.reload();
        };

        const showWaiting = async () => {
            if (!mounted || applying || !navigator.serviceWorker.controller) return;
            const worker = registration?.waiting;
            if (!worker || dismissed) return;
            let newerAppAvailable = false;
            try {
                newerAppAvailable = await checkPWAAppVersion(process.env.APP_BUILD_ID ?? "");
            } catch {
                // A network error cannot establish that a new app was deployed.
            }
            if (!mounted || applying || registration?.waiting !== worker) return;
            setStatus(newerAppAvailable ? "ready" : "hidden");
        };

        const onInstallingStateChange = () => {
            if (installing?.state === "installed") queueMicrotask(() => void showWaiting());
        };

        const onUpdateFound = () => {
            installing?.removeEventListener("statechange", onInstallingStateChange);
            installing = registration?.installing ?? null;
            if (!installing) return;
            dismissed = false;
            try { sessionStorage.removeItem(DISMISSED_KEY); } catch { /* Storage is optional. */ }
            installing.addEventListener("statechange", onInstallingStateChange);
            onInstallingStateChange();
        };

        const checkForUpdate = async () => {
            if (!mounted || !registration || updateInFlight || !navigator.onLine) return;
            updateInFlight = true;
            try {
                await registration.update();
                void showWaiting();
            } catch {
                // A transient network failure should not interrupt the app.
            } finally {
                updateInFlight = false;
            }
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") void checkForUpdate();
        };

        applyRef.current = () => {
            if (applying || !registration) return;
            const worker = registration.waiting;
            if (!worker) {
                // Another tab may already have activated the replacement.
                if (registration.active && registration.active !== navigator.serviceWorker.controller) reloadOnce();
                else {
                    setStatus("hidden");
                    void checkForUpdate();
                }
                return;
            }

            applying = true;
            dismissed = false;
            setStatus("applying");
            try { sessionStorage.removeItem(DISMISSED_KEY); } catch { /* Storage is optional. */ }
            activationAbort = new AbortController();
            void activatePWAUpdate(worker, navigator.serviceWorker, activationAbort.signal)
                .then(reloadOnce)
                .catch(() => {
                    if (!mounted || reloading) return;
                    clearActivation();
                    applying = false;
                    if (registration?.active && registration.active !== navigator.serviceWorker.controller) reloadOnce();
                    else setStatus("error");
                });
        };

        dismissRef.current = () => {
            dismissed = true;
            try { sessionStorage.setItem(DISMISSED_KEY, "1"); } catch { /* Storage is optional. */ }
            setStatus("hidden");
        };

        const register = async () => {
            try {
                const result = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
                if (!mounted) return;
                registration = result;
                registration.addEventListener("updatefound", onUpdateFound);
                if (registration.installing) onUpdateFound();
                void checkForUpdate();
            } catch (error) {
                console.error("Service worker registration failed", error);
            }
        };

        window.addEventListener("online", checkForUpdate);
        document.addEventListener("visibilitychange", onVisibilityChange);
        const interval = setInterval(() => void checkForUpdate(), UPDATE_CHECK_INTERVAL_MS);
        void register();

        return () => {
            mounted = false;
            applyRef.current = null;
            dismissRef.current = null;
            clearActivation();
            clearInterval(interval);
            registration?.removeEventListener("updatefound", onUpdateFound);
            installing?.removeEventListener("statechange", onInstallingStateChange);
            window.removeEventListener("online", checkForUpdate);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, []);

    if (status === "hidden") return null;

    return (
        <div className={pathname === "/" ? "relative z-[90] w-full bg-[var(--studio-deep)] px-4 pt-3" : "fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[90]"}>
            <div role="status" aria-live="polite" aria-busy={status === "applying"} className="mx-auto flex max-w-md items-center gap-3 rounded-[1.25rem] bg-[var(--studio-deep)] p-3 text-[var(--studio-deep-contrast)] shadow-xl">
                <p className="min-w-0 flex-1 text-xs font-bold">
                    {status === "applying" ? "מעדכנים את האפליקציה…" : status === "error" ? "העדכון לא הושלם. אפשר לנסות שוב." : "גרסה חדשה של סטודיו טליה מוכנה"}
                </p>
                <button type="button" disabled={status === "applying"} onClick={() => applyRef.current?.()} className="min-h-11 shrink-0 rounded-full bg-[var(--studio-accent-bg)] px-4 text-xs font-bold text-[var(--studio-ink)] outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-70">
                    {status === "applying" ? "מעדכנים" : status === "error" ? "לנסות שוב" : "לעדכן עכשיו"}
                </button>
                {status !== "applying" && <button type="button" onClick={() => dismissRef.current?.()} className="min-h-11 shrink-0 px-2 text-xs text-[var(--studio-deep-contrast)]/75 outline-none focus-visible:ring-2 focus-visible:ring-white">אחר כך</button>}
            </div>
        </div>
    );
}
