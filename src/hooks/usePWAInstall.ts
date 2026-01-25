"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallState {
    /** True if app is running as installed PWA (standalone mode) */
    isStandalone: boolean;
    /** True if we're on localhost (bypass PWA requirement) */
    isLocalhost: boolean;
    /** True if user can access the app (either PWA or localhost) */
    canAccess: boolean;
    /** True if native install prompt is available */
    canInstall: boolean;
    /** True if on iOS (needs manual install instructions) */
    isIOS: boolean;
    /** True if user just installed the app (show success screen) */
    justInstalled: boolean;
    /** Trigger the native install prompt (Android/Chrome) */
    promptInstall: () => Promise<boolean>;
    /** Loading state while detecting environment */
    isLoading: boolean;
}

export function usePWAInstall(): PWAInstallState {
    const [isStandalone, setIsStandalone] = useState(false);
    const [isLocalhost, setIsLocalhost] = useState(false);
    const [canInstall, setCanInstall] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [justInstalled, setJustInstalled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;

        // Check if running on localhost
        const hostname = window.location.hostname;
        const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.");
        setIsLocalhost(isLocal);

        // Check if running as installed PWA (standalone mode)
        const standalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as any).standalone === true || // iOS Safari
            document.referrer.includes("android-app://"); // Android TWA
        setIsStandalone(standalone);

        // Detect iOS
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(iOS);

        // Listen for the install prompt event (Android/Chrome)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault(); // Prevent auto-show
            deferredPromptRef.current = e as BeforeInstallPromptEvent;
            setCanInstall(true);
            console.log("[PWA] Install prompt captured");
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        // Listen for successful installation
        // NOTE: Do NOT set isStandalone here - the browser tab is still in browser mode
        // User must actually open the installed app to be in standalone mode
        window.addEventListener("appinstalled", () => {
            console.log("[PWA] App installed! User should now open the installed app.");
            setJustInstalled(true);
            deferredPromptRef.current = null;
            setCanInstall(false);
        });

        // Also listen for display-mode changes (when user installs mid-session)
        const mediaQuery = window.matchMedia("(display-mode: standalone)");
        const handleDisplayModeChange = (e: MediaQueryListEvent) => {
            setIsStandalone(e.matches);
        };
        mediaQuery.addEventListener("change", handleDisplayModeChange);

        setIsLoading(false);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            mediaQuery.removeEventListener("change", handleDisplayModeChange);
        };
    }, []);

    const promptInstall = useCallback(async (): Promise<boolean> => {
        if (!deferredPromptRef.current) {
            console.warn("[PWA] No install prompt available");
            return false;
        }

        try {
            await deferredPromptRef.current.prompt();
            const { outcome } = await deferredPromptRef.current.userChoice;

            if (outcome === "accepted") {
                console.log("[PWA] User accepted install");
                return true;
            } else {
                console.log("[PWA] User dismissed install");
                return false;
            }
        } catch (error) {
            console.error("[PWA] Install prompt error:", error);
            return false;
        }
    }, []);

    // User can access if: running as PWA OR on localhost
    const canAccess = isStandalone || isLocalhost;

    return {
        isStandalone,
        isLocalhost,
        canAccess,
        canInstall,
        isIOS,
        justInstalled,
        promptInstall,
        isLoading,
    };
}
