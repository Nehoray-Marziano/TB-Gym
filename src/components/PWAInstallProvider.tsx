"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { usePWAInstall, type PWAInstallState } from "@/hooks/usePWAInstall";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

export interface PWAInstallContextType extends PWAInstallState {
    isPromptOpen: boolean;
    openPrompt: () => void;
    closePrompt: () => void;
}

const PWAInstallContext = createContext<PWAInstallContextType | null>(null);

export function PWAInstallProvider({ children }: { children: React.ReactNode }) {
    const install = usePWAInstall();
    const [isPromptOpen, setIsPromptOpen] = useState(false);

    const openPrompt = useCallback(() => setIsPromptOpen(true), []);
    const closePrompt = useCallback(() => setIsPromptOpen(false), []);

    return (
        <PWAInstallContext.Provider value={{ ...install, isPromptOpen, openPrompt, closePrompt }}>
            {children}
            <PWAInstallPrompt />
        </PWAInstallContext.Provider>
    );
}

export function useInstallApp() {
    const install = useContext(PWAInstallContext);
    if (!install) throw new Error("Install controls must be inside PWAInstallProvider");
    return install;
}
