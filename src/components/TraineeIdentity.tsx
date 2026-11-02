"use client";

import { createContext, useContext, useEffect } from "react";

const TraineeIdentityContext = createContext<string | null>(null);

export function TraineeIdentity({ userId, children }: { userId: string; children: React.ReactNode }) {
    useEffect(() => {
        if (typeof document !== "undefined" && !document.cookie.includes("tb-onboarded=1")) {
            document.cookie = "tb-onboarded=1; path=/; max-age=31536000; SameSite=Lax";
        }
    }, []);

    return <TraineeIdentityContext.Provider value={userId}>{children}</TraineeIdentityContext.Provider>;
}

export function useTraineeUserId(fallbackId?: string) {
    const userId = useContext(TraineeIdentityContext);
    if (!userId && !fallbackId) throw new Error("Trainee identity is unavailable outside the protected layout");
    return userId || fallbackId || "";
}
