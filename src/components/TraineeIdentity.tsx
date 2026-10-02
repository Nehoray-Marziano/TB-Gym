"use client";

import { createContext, useContext } from "react";

const TraineeIdentityContext = createContext<string | null>(null);

export function TraineeIdentity({ userId, children }: { userId: string; children: React.ReactNode }) {
    return <TraineeIdentityContext.Provider value={userId}>{children}</TraineeIdentityContext.Provider>;
}

export function useTraineeUserId(fallbackId?: string) {
    const userId = useContext(TraineeIdentityContext);
    if (!userId && !fallbackId) throw new Error("Trainee identity is unavailable outside the protected layout");
    return userId || fallbackId || "";
}
