"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Copy, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type CopyButtonProps = {
    value: string | (() => string);
    label: string;
    disabled?: boolean;
    className?: string;
};

/** Never echoes the copied value in feedback, logs, or application storage. */
export function CopyButton({ value, label, disabled = false, className }: CopyButtonProps) {
    const [status, setStatus] = useState<"idle" | "copying" | "copied" | "error">("idle");
    const pending = useRef(false);

    useEffect(() => {
        if (status !== "copied" && status !== "error") return;
        const timer = setTimeout(() => setStatus("idle"), 2500);
        return () => clearTimeout(timer);
    }, [status]);

    const copy = async () => {
        if (disabled || pending.current) return;
        pending.current = true;
        setStatus("copying");
        try {
            await navigator.clipboard.writeText(typeof value === "function" ? value() : value);
            setStatus("copied");
        } catch {
            setStatus("error");
        } finally {
            pending.current = false;
        }
    };

    return (
        <span className={cn("studio-copy-action", className)}>
            <button
                type="button"
                className="studio-copy-button"
                aria-label={label}
                title={disabled ? "אין ערך להעתקה" : label}
                disabled={disabled}
                aria-busy={status === "copying"}
                data-error={status === "error"}
                onClick={copy}
            >
                {status === "copied" ? <Check aria-hidden="true" /> : status === "error" ? <CircleAlert aria-hidden="true" /> : status === "copying" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Copy aria-hidden="true" />}
            </button>
            <span className="studio-copy-feedback" role="status" aria-live="polite" aria-atomic="true" data-visible={status === "copied" || status === "error"} data-error={status === "error"}>
                {status === "copied" ? "הועתק" : status === "error" ? "ההעתקה נכשלה. נסי שוב." : ""}
            </span>
        </span>
    );
}
