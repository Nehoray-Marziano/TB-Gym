"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Copy, Check, ExternalLink, X } from "lucide-react";
import Image from "next/image";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    amount: number;
    userName: string;
    tierDisplay: string;
    error?: string;
}

export default function PaymentModal({ isOpen, onClose, onConfirm, amount, userName, tierDisplay, error }: PaymentModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const [copyResult, setCopyResult] = useState<{ description: string; state: "copied" | "error" } | null>(null);
    const reduceMotion = useReducedMotion();
    const currentMonth = new Intl.DateTimeFormat("he-IL", { month: "long", timeZone: "Asia/Jerusalem" }).format(new Date());
    const paymentDescription = `${userName} - ${tierDisplay} - ${currentMonth}`;
    const copyState = copyResult?.description === paymentDescription ? copyResult.state : "idle";

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog || !isOpen) return;
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const previousOverflow = document.body.style.overflow;
        const previousGutter = document.documentElement.style.scrollbarGutter;
        dialog.showModal();
        document.documentElement.style.scrollbarGutter = "stable";
        document.body.style.overflow = "hidden";
        closeRef.current?.focus();
        return () => {
            dialog.close();
            document.body.style.overflow = previousOverflow;
            document.documentElement.style.scrollbarGutter = previousGutter;
            previousFocus?.focus({ preventScroll: true });
        };
    }, [isOpen]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(paymentDescription);
            setCopyResult({ description: paymentDescription, state: "copied" });
        } catch {
            setCopyResult({ description: paymentDescription, state: "error" });
        }
    };

    return (
        <dialog ref={dialogRef} className="membership-payment-dialog" aria-labelledby="payment-title" aria-describedby="payment-description"
            onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}
            onKeyDown={event => {
                if (event.key !== "Tab") return;
                const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")].filter(button => button.getClientRects().length);
                const first = buttons[0];
                const last = buttons[buttons.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first?.focus();
                }
            }}>
            {isOpen && <motion.div className="membership-payment-sheet" initial={reduceMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}>
                <button ref={closeRef} type="button" onClick={onClose} aria-label="סגירת הנחיות התשלום" className="membership-payment-close"><X aria-hidden="true" /></button>
                <Image src="/Bit_logo.svg" alt="ביט" width={52} height={52} className="membership-bit-logo" />
                <p className="membership-eyebrow">הקצב שלך מתחיל כאן</p>
                <h2 id="payment-title">ממשיכות לביט</h2>
                <p id="payment-description">את הסכום וסיבת ההעברה ממלאים באפליקציית ביט. הנה כל מה שצריך:</p>

                <div className="membership-payment-total"><div><span>המסלול שבחרת</span><strong>{tierDisplay}</strong></div><strong dir="ltr">{amount} ₪</strong></div>
                <p className="membership-copy-label">סיבת ההעברה</p>
                <div className="membership-copy-box"><p dir="auto">{paymentDescription}</p><button type="button" onClick={handleCopy} aria-label="העתקת סיבת ההעברה">{copyState === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}<span>{copyState === "copied" ? "הועתק" : "העתקה"}</span></button></div>
                <p className="membership-copy-feedback" role="status">{copyState === "copied" ? "סיבת ההעברה הועתקה. אפשר להדביק אותה בביט." : copyState === "error" ? "לא הצלחנו להעתיק. אפשר לבחור את הטקסט ולהעתיק ידנית." : "אפשר להעתיק ולהדביק בביט."}</p>
                <div className="membership-payment-notice"><Check aria-hidden="true" /><p>האימונים יתווספו ליתרה שלך <strong>אחרי שטליה תאשר את ההעברה.</strong></p></div>
                {error && <p className="membership-payment-error" role="alert">{error}</p>}
                <button type="button" onClick={onConfirm} className="membership-purchase-button membership-bit-button"><span>פתיחת ביט לתשלום</span><ExternalLink aria-hidden="true" /></button>
                <button type="button" onClick={onClose} className="membership-payment-cancel">חזרה לבחירת מסלול</button>
            </motion.div>}
        </dialog>
    );
}
