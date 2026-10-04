"use client";

import { useEffect } from "react";

/** Native copy is disabled; explicit copy buttons use the Clipboard API. */
export default function TextCopyPolicy() {
    useEffect(() => {
        const preventCopy = (event: ClipboardEvent) => event.preventDefault();
        document.addEventListener("copy", preventCopy, true);
        return () => document.removeEventListener("copy", preventCopy, true);
    }, []);
    return null;
}
