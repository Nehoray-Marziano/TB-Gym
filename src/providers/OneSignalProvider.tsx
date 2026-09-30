"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

type OneSignalClient = {
    init: (options: Record<string, unknown>) => Promise<void>;
    login: (externalId: string) => Promise<void>;
    logout: () => Promise<void>;
    User: {
        addTag: (key: string, value: string) => Promise<void>;
        addEmail: (email: string) => Promise<void>;
    };
    Notifications: {
        addEventListener: (event: "foregroundWillDisplay", listener: (event: {
            notification: { title?: string; body?: string };
        }) => void) => void;
    };
};

declare global {
    interface Window {
        OneSignalDeferred?: Array<(client: OneSignalClient) => void | Promise<void>>;
        OneSignal?: OneSignalClient;
    }
}

interface OneSignalProviderProps {
    userId?: string;
    userRole?: string;
    userEmail?: string;
}

let sdkRequested = false;
let sdkInitialized = false;

export default function OneSignalProvider({ userId, userRole, userEmail }: OneSignalProviderProps) {
    const { toast } = useToast();

    useEffect(() => {
        if (process.env.NODE_ENV === "development" || !userId) return;

        window.OneSignalDeferred ||= [];
        if (!sdkRequested) {
            sdkRequested = true;
            const script = document.createElement("script");
            script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
            script.defer = true;
            document.head.appendChild(script);
        }

        window.OneSignalDeferred.push(async (client) => {
            if (sdkInitialized) return;
            sdkInitialized = true;
            try {
                await client.init({
                    appId: "2e5776b6-3487-4a5d-bca0-04570c82d150",
                    welcomeNotification: { disable: true },
                    notifyButton: { enable: false },
                    serviceWorkerParam: { scope: "/" },
                    serviceWorkerPath: "sw.js",
                    autoResubscribe: true,
                    autoRegister: false,
                });
                client.Notifications.addEventListener("foregroundWillDisplay", (event) => {
                    toast({
                        title: event.notification.title || "הודעה חדשה",
                        description: event.notification.body,
                        type: "info",
                    });
                });
            } catch (error) {
                sdkInitialized = false;
                console.error("OneSignal initialization failed:", error);
            }
        });
    }, [userId, toast]);

    useEffect(() => {
        if (process.env.NODE_ENV === "development" || !sdkRequested) return;
        window.OneSignalDeferred ||= [];
        window.OneSignalDeferred.push(async (client) => {
            if (!client.User) return;
            try {
                if (!userId) {
                    await client.logout();
                    return;
                }
                await client.login(userId);
                if (userRole) await client.User.addTag("role", userRole.toLowerCase());
                if (userEmail) await client.User.addEmail(userEmail);
            } catch (error) {
                console.error("OneSignal identity sync failed:", error);
            }
        });
    }, [userId, userRole, userEmail]);

    return null;
}
