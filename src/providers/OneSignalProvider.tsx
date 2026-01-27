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

import { useToast } from "@/components/ui/use-toast";

export default function OneSignalProvider({ userId, userRole, userEmail }: OneSignalProviderProps) {
    const initialized = useRef(false);
    const { toast } = useToast();

    // Effect 1: Initialize OneSignal (Run Once)
    useEffect(() => {
        if (initialized.current) return;
        if (typeof window === "undefined") return;

        initialized.current = true;

        // Load OneSignal SDK
        const script = document.createElement("script");
        script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
        script.defer = true;
        document.head.appendChild(script);

        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async function (OneSignal: any) {
            await OneSignal.init({
                appId: "2e5776b6-3487-4a5d-bca0-04570c82d150",
                welcomeNotification: {
                    disable: true // We let the Dashboard handle this via Push, avoid client-side conflict
                },
                notifyButton: {
                    enable: false, // We'll use our own UI
                },
                allowLocalhostAsSecureOrigin: true, // For development
                // CRITICAL: Use the same SW as the PWA to avoid conflicts
                serviceWorkerParam: { scope: "/" },
                serviceWorkerPath: "sw.js",
            });

            // Enable foreground notifications to appear
            OneSignal.Notifications.addEventListener('foregroundWillDisplay', function (event: any) {
                console.log("[OneSignal] Foreground notification received", event);
                // 1. Prevent native display to avoid double notifications (optional, but cleaner)
                // event.preventDefault(); 

                // 2. Trigger our beautiful In-App Toast
                // We need to access the store/hook outside the component scope? 
                // No, we are inside a React component, but inside an async callback.
                // We should bubble this up or use a static toast method if available.
                // Since this is a Client Component, we can dispatch a custom event or check if we can pass a callback.

                // Simpler: Just rely on preventing default? No, user says it DOESN'T pop up.
                // We will use the custom event pattern to trigger the toast from the layout or just import verify if useToast works here.
                // Actually, since we are inside useEffect, we can't use hooks directly in the callback easily unless we capture the `toast` function from the render scope.

                // We will capture `toast` from the hook in the component scope.
                const notif = event.notification;
                toast({
                    title: notif.title || "New Message",
                    description: notif.body,
                    type: "info"
                });
            });

            console.log("OneSignal initialized core");
        });
    }, []); // Empty dependency array = true singleton init


    // Effect 2: Manage User Identity (Run on change)
    useEffect(() => {
        if (typeof window === "undefined") return;

        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async function (OneSignal: any) {
            // Only convert user if initialized
            if (!OneSignal.User) return;

            console.log("OneSignal Syncing User:", { userId, userRole, userEmail });

            if (userId) {
                console.log(`[OneSignal] Logging in user: ${userId}`);
                await OneSignal.login(userId);

                // Add tags/email only after login
                if (userRole) {
                    console.log(`[OneSignal] Setting role tag: ${userRole.toLowerCase()}`);
                    // Normalize role to lowercase for consistent targeting
                    await OneSignal.User.addTag("role", userRole.toLowerCase());
                } else {
                    console.log("[OneSignal] No userRole provided, skipping role tag.");
                }
                if (userEmail) {
                    await OneSignal.User.addEmail(userEmail);
                }
            } else {
                // If userId becomes null (logout), we might want to logout from OneSignal too
                // OneSignal.logout(); 
                // However, for this app, we might want to keep the device registered as guest.
                // Leaving as is for now unless explicit logout requested.
            }
        });
    }, [userId, userRole, userEmail]);

    return null; // This component doesn't render anything
}
