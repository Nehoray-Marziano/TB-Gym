"use client";

import AppRecovery from "@/components/AppRecovery";
import { useTransition } from "react";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
    const [pending, startTransition] = useTransition();
    return (
        <>
            <title>משהו השתבש | סטודיו טליה</title>
            <AppRecovery
                title="משהו השתבש"
                message="לא הצלחנו לטעון את העמוד. אפשר לנסות שוב או לחזור לבית."
                busy={pending}
                retry={() => startTransition(retry)}
            />
        </>
    );
}
