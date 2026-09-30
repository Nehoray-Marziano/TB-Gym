"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function ConnectionStatus() {
    const [offline, setOffline] = useState(false);

    useEffect(() => {
        const update = () => setOffline(!navigator.onLine);
        update();
        window.addEventListener("online", update);
        window.addEventListener("offline", update);
        return () => {
            window.removeEventListener("online", update);
            window.removeEventListener("offline", update);
        };
    }, []);

    if (!offline) return null;

    return (
        <div role="status" className="pointer-events-none fixed inset-x-4 top-[max(0.5rem,env(safe-area-inset-top))] z-[100] mx-auto flex max-w-md items-center gap-2 rounded-2xl bg-[var(--studio-deep)] px-4 py-3 text-xs font-bold text-[var(--studio-deep-contrast)] shadow-lg">
            <WifiOff aria-hidden="true" className="h-4 w-4 shrink-0" />
            אין חיבור לאינטרנט. נסי שוב כשהחיבור יתחדש.
        </div>
    );
}
