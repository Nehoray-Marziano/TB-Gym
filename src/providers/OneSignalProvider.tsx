"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { getOneSignalClient, syncOneSignalIdentity, type ForegroundNotification } from "@/lib/oneSignalClient";

interface OneSignalProviderProps {
    userId?: string;
    userRole?: string;
    userEmail?: string;
}

export default function OneSignalProvider({ userId, userRole, userEmail }: OneSignalProviderProps) {
    const { toast } = useToast();

    useEffect(() => {
        if (process.env.NODE_ENV === "development" || !userId) return;

        let active = true;
        let detach: (() => void) | undefined;
        const listener = (event: ForegroundNotification) => {
            toast({ title: event.notification.title || "הודעה חדשה", description: event.notification.body, type: "info" });
        };
        void getOneSignalClient().then(client => {
            if (!active) return;
            client.Notifications.addEventListener("foregroundWillDisplay", listener);
            detach = () => client.Notifications.removeEventListener("foregroundWillDisplay", listener);
        }).catch(error => console.error("OneSignal initialization failed:", error));
        return () => { active = false; detach?.(); };
    }, [userId, toast]);

    useEffect(() => {
        if (process.env.NODE_ENV === "development") return;
        void syncOneSignalIdentity(userId, userRole, userEmail)
            .catch(error => console.error("OneSignal identity sync failed:", error));
    }, [userId, userRole, userEmail]);

    return null;
}
