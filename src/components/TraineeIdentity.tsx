"use client";

import { createContext, useContext } from "react";

const TraineeIdentityContext = createContext<string | null>(null);

export function TraineeIdentity({ userId, children }: { userId: string; children: React.ReactNode }) {
    return <TraineeIdentityContext.Provider value={userId}>{children}</TraineeIdentityContext.Provider>;
}

export function useTraineeUserId() {
    const userId = useContext(TraineeIdentityContext);
    if (!userId) throw new Error("Trainee identity is unavailable outside the protected layout");
    return userId;
}
