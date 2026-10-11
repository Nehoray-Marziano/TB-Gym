"use client";

import "./globals.css";
import AppRecovery from "@/components/AppRecovery";
import { useTransition } from "react";

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
    const [pending, startTransition] = useTransition();
    return (
        <html lang="he" dir="rtl">
            <body style={{ fontFamily: "Arial, sans-serif", margin: 0 }}>
                <title>תקלה באפליקציה | סטודיו טליה</title>
                <AppRecovery
                    title="לא הצלחנו לפתוח את האפליקציה"
                    message="בדקי את החיבור ונסי שוב בעוד רגע."
                    busy={pending}
                    retry={() => startTransition(retry)}
                />
            </body>
        </html>
    );
}
