"use client";

import { useEffect, useRef } from "react";

declare global {
    interface Window {
        OneSignalDeferred?: Array<(OneSignal: any) => void>;
        OneSignal?: any;
    }
}

interface OneSignalProviderProps {
    userId?: string;
    userRole?: string;
    userEmail?: string;
}

export default function OneSignalProvider({ userId, userRole, userEmail }: OneSignalProviderProps) {
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        if (typeof window === "undefined") return;

        // Load OneSignal SDK
        const script = document.createElement("script");
        script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
        script.defer = true;
        document.head.appendChild(script);

        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async function (OneSignal: any) {
            await OneSignal.init({
                appId: "2e5776b6-3487-4a5d-bca0-04570c82d150",
                // Safari web ID can be added here if configured
                notifyButton: {
                    enable: false, // We'll use our own UI
                },
                allowLocalhostAsSecureOrigin: true, // For development
            });

            // Tag user with their role for targeted notifications
            if (userId) {
                await OneSignal.login(userId);
            }
            if (userRole) {
                await OneSignal.User.addTag("role", userRole);
            }
            if (userEmail) {
                await OneSignal.User.addEmail(userEmail);
            }

            console.log("OneSignal initialized", { userId, userRole, userEmail });
        });

        initialized.current = true;
    }, [userId, userRole, userEmail]);

    return null; // This component doesn't render anything
}
