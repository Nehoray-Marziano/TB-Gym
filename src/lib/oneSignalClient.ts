export type ForegroundNotification = { notification: { title?: string; body?: string } };
export type OneSignalClient = {
    init: (options: Record<string, unknown>) => Promise<void>;
    login: (externalId: string) => Promise<void>;
    logout: () => Promise<void>;
    User: {
        addTag: (key: string, value: string) => Promise<void>;
        addEmail: (email: string) => Promise<void>;
        PushSubscription: { optedIn: boolean; optIn: () => Promise<void> };
    };
    Notifications: {
        requestPermission: () => Promise<boolean>;
        addEventListener: (event: "foregroundWillDisplay", listener: (event: ForegroundNotification) => void) => void;
        removeEventListener: (event: "foregroundWillDisplay", listener: (event: ForegroundNotification) => void) => void;
    };
};

declare global {
    interface Window {
        OneSignalDeferred?: Array<(client: OneSignalClient) => void | Promise<void>>;
        OneSignal?: OneSignalClient;
    }
}

let ready: Promise<OneSignalClient> | undefined;
let initialization: Promise<void> | undefined;
let identityQueue: Promise<void> = Promise.resolve();
let identityRevision = 0;

export function getOneSignalClient(): Promise<OneSignalClient> {
    if (ready) return ready;
    if (typeof window === "undefined" || process.env.NODE_ENV === "development") {
        return Promise.reject(new Error("Push notifications require the published app"));
    }
    const attempt = new Promise<OneSignalClient>((resolve, reject) => {
        let finished = false;
        const fail = (error: unknown) => { finished = true; clearTimeout(timeout); reject(error); };
        const timeout = setTimeout(() => fail(new Error("Notification service did not load")), 10_000);
        window.OneSignalDeferred ||= [];
        window.OneSignalDeferred.push(async (client) => {
            if (finished) return;
            try {
                initialization ||= client.init({
                    appId: "2e5776b6-3487-4a5d-bca0-04570c82d150",
                    welcomeNotification: { disable: true },
                    notifyButton: { enable: false },
                    serviceWorkerParam: { scope: "/" },
                    serviceWorkerPath: "sw.js",
                    autoResubscribe: true,
                    promptOptions: { slidedown: { prompts: [{ type: "push", autoPrompt: false }] } },
                }).catch(error => { initialization = undefined; throw error; });
                await initialization;
                if (finished) return;
                finished = true;
                clearTimeout(timeout);
                resolve(client);
            } catch (error) { fail(error); }
        });
        let script = document.querySelector<HTMLScriptElement>('script[data-studio-push]');
        if (!script) {
            script = document.createElement("script");
            script.dataset.studioPush = "true";
            script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
            script.defer = true;
            script.addEventListener("error", () => { script?.remove(); fail(new Error("Notification service did not load")); }, { once: true });
            document.head.appendChild(script);
        }
    });
    ready = attempt.catch(error => { ready = undefined; throw error; });
    return ready;
}

// Deferred SDK callbacks run concurrently. Serialize identity changes after init.
export function syncOneSignalIdentity(userId?: string, userRole?: string, userEmail?: string): Promise<void> {
    const revision = ++identityRevision;
    if (!userId && !ready) return Promise.resolve();
    identityQueue = identityQueue.catch(() => {}).then(async () => {
        if (revision !== identityRevision) return;
        const client = await getOneSignalClient();
        if (revision !== identityRevision) return;
        if (!userId) { await client.logout(); return; }
        await client.login(userId);
        if (revision !== identityRevision) return;
        if (userRole) await client.User.addTag("role", userRole.toLowerCase());
        if (revision !== identityRevision) return;
        if (userEmail) await client.User.addEmail(userEmail);
    });
    return identityQueue;
}

export async function enablePushNotifications(): Promise<NotificationPermission | "unsupported"> {
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission === "denied") return "denied";
    const client = await getOneSignalClient();
    if (Notification.permission !== "granted") await client.Notifications.requestPermission();
    if (Notification.permission === "granted") {
        await client.User.PushSubscription.optIn();
        if (!client.User.PushSubscription.optedIn) throw new Error("Push subscription is inactive");
    }
    return Notification.permission;
}
