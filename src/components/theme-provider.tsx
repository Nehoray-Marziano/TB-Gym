"use client";

import * as React from "react";

export function ThemeProvider({
    children,
}: {
    children: React.ReactNode;
    [key: string]: unknown;
}) {
    React.useEffect(() => {
        try {
            // Clean up any stale theme preference from past sessions to ensure complete stability
            localStorage.removeItem("theme");
            document.documentElement.classList.remove("dark", "light", "classic");
        } catch {}
    }, []);

    return <>{children}</>;
}
