"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAInstallState {
    isStandalone: boolean;
    canInstall: boolean;
    isIOS: boolean;
    promptInstall: () => Promise<boolean>;
}

export function usePWAInstall(): PWAInstallState {
    const [isStandalone, setIsStandalone] = useState(false);
    const [canInstall, setCanInstall] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const mediaQuery = window.matchMedia("(display-mode: standalone)");
        let active = true;
        queueMicrotask(() => {
            if (!active) return;
            setIsStandalone(mediaQuery.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true || document.referrer.includes("android-app://"));
            setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream);
        });

        // Listen for the install prompt event (Android/Chrome)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault(); // Prevent auto-show
            deferredPromptRef.current = e as BeforeInstallPromptEvent;
            setCanInstall(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        // Listen for successful installation
        // NOTE: Do NOT set isStandalone here - the browser tab is still in browser mode
        // User must actually open the installed app to be in standalone mode
        const handleInstalled = () => {
            deferredPromptRef.current = null;
            setCanInstall(false);
        };
        window.addEventListener("appinstalled", handleInstalled);

        // Also listen for display-mode changes (when user installs mid-session)
        const handleDisplayModeChange = (e: MediaQueryListEvent) => {
            setIsStandalone(e.matches);
        };
        mediaQuery.addEventListener("change", handleDisplayModeChange);

        return () => {
            active = false;
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleInstalled);
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
                setCanInstall(false);
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error("[PWA] Install prompt error:", error);
            return false;
        }
    }, []);

    return {
        isStandalone,
        canInstall,
        isIOS,
        promptInstall,
    };
}
