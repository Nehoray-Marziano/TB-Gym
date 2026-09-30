/** Wait for the replacement worker before reloading the current page. */
export function activatePWAUpdate(
    worker: ServiceWorker,
    registration: ServiceWorkerRegistration,
    signal: AbortSignal,
    timeoutMs = 15_000,
): Promise<void> {
    return new Promise((resolve, reject) => {
        let finished = false;

        const finish = (error?: Error) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            worker.removeEventListener("statechange", checkState);
            signal.removeEventListener("abort", onAbort);
            if (error) reject(error);
            else resolve();
        };

        const checkState = () => {
            if (worker.state === "activated" || registration.active === worker) finish();
            else if (worker.state === "redundant") finish(new Error("Replacement worker became redundant"));
        };

        const onAbort = () => finish(new Error("Update cancelled"));

        if (signal.aborted) {
            reject(new Error("Update cancelled"));
            return;
        }

        worker.addEventListener("statechange", checkState);
        signal.addEventListener("abort", onAbort);
        const timer = setTimeout(() => finish(new Error("Service worker activation timed out")), timeoutMs);

        try {
            worker.postMessage({ type: "SKIP_WAITING" });
            checkState();
        } catch (error) {
            finish(error instanceof Error ? error : new Error("Could not start update"));
        }
    });
}
