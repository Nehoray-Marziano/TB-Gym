"use client";

import { useEffect, useState } from "react";

// Keep cancellation guidance current while a sheet is open, even after resume.
// The database remains the authority for the actual cancellation deadline.
export function useCurrentTime() {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const update = () => setNow(Date.now());
        const timer = window.setInterval(update, 30_000);
        document.addEventListener("visibilitychange", update);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", update);
        };
    }, []);
    return now;
}
