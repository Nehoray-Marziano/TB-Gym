/** Wait until the replacement worker controls this page before reloading it. */
export function activatePWAUpdate(
    worker: ServiceWorker,
    serviceWorkers: ServiceWorkerContainer,
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
            serviceWorkers.removeEventListener("controllerchange", checkState);
            signal.removeEventListener("abort", onAbort);
            if (error) reject(error);
            else resolve();
        };

        const checkState = () => {
            if (serviceWorkers.controller === worker) finish();
            else if (worker.state === "redundant") finish(new Error("Replacement worker became redundant"));
        };

        const onAbort = () => finish(new Error("Update cancelled"));

        if (signal.aborted) {
            reject(new Error("Update cancelled"));
            return;
        }

        worker.addEventListener("statechange", checkState);
        serviceWorkers.addEventListener("controllerchange", checkState);
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
