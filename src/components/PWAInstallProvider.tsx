"use client";

import { createContext, useContext } from "react";
import { usePWAInstall, type PWAInstallState } from "@/hooks/usePWAInstall";

const PWAInstallContext = createContext<PWAInstallState | null>(null);

export function PWAInstallProvider({ children }: { children: React.ReactNode }) {
    const install = usePWAInstall();
    return <PWAInstallContext.Provider value={install}>{children}</PWAInstallContext.Provider>;
}

export function useInstallApp() {
    const install = useContext(PWAInstallContext);
    if (!install) throw new Error("Install controls must be inside PWAInstallProvider");
    return install;
}
