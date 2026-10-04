"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

export default function TraineeShell({ children }: { children: ReactNode }) {
    const shellRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const shell = shellRef.current;
        if (!shell) return;
        const viewport = window.visualViewport;
        const fitViewport = () => {
            // Pinch zoom changes the visible region, not the page's layout size.
            if (viewport && viewport.scale !== 1) return;
            const height = viewport ? Math.min(window.innerHeight, viewport.height) : window.innerHeight;
            if (height <= 0) return;
            if (Math.abs(shell.getBoundingClientRect().height - height) > 1) {
                shell.style.height = `${height}px`;
            }
            // Fixed navigation is positioned in the layout viewport. Bring it
            // into the same visible region while standalone viewport units settle.
            const bottom = `${Math.max(0, window.innerHeight - height)}px`;
            if (shell.style.getPropertyValue("--studio-viewport-bottom") !== bottom) {
                shell.style.setProperty("--studio-viewport-bottom", bottom);
            }
        };
        const resume = () => {
            if (document.visibilityState === "visible") fitViewport();
        };
        fitViewport();
        viewport?.addEventListener("resize", fitViewport);
        window.addEventListener("resize", fitViewport);
        window.addEventListener("pageshow", fitViewport);
        document.addEventListener("visibilitychange", resume);
        return () => {
            viewport?.removeEventListener("resize", fitViewport);
            window.removeEventListener("resize", fitViewport);
            window.removeEventListener("pageshow", fitViewport);
            document.removeEventListener("visibilitychange", resume);
        };
    }, []);

    return <div ref={shellRef} className="studio-app-shell">{children}</div>;
}
