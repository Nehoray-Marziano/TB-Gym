"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Check, Clock3, X } from "lucide-react";
import Image from "next/image";
import BitConfirmSlider from "./BitConfirmSlider";
import "./payment.css";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => boolean;
    amount: number;
    userName: string;
    tierDisplay: string;
    tone: string;
    error?: string;
}

export default function PaymentModal({ isOpen, onClose, onConfirm, amount, userName, tierDisplay, tone, error }: PaymentModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const confirmedRef = useRef(false);
    const [copyResult, setCopyResult] = useState<{ description: string; state: "copied" | "error" } | null>(null);
    const currentMonth = new Intl.DateTimeFormat("he-IL", { month: "long", timeZone: "Asia/Jerusalem" }).format(new Date());
    const paymentDescription = userName + " - " + tierDisplay + " - " + currentMonth;
    const copyState = copyResult?.description === paymentDescription ? copyResult.state : "idle";

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog || !isOpen) return;
        confirmedRef.current = false;
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
    const handleConfirm = () => {
        if (confirmedRef.current) return true;
        confirmedRef.current = onConfirm();
        return confirmedRef.current;
    };

    return <dialog ref={dialogRef} className="membership-payment-dialog" data-tone={tone} aria-labelledby="payment-title" aria-describedby="payment-description"
        onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}
        onKeyDown={event => {
            if (event.key !== "Tab") return;
            const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")].filter(button => button.getClientRects().length);
            const first = buttons[0];
            const last = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }}>
        {isOpen && <div className="membership-payment-sheet">
            <div className="membership-payment-content">
            <header className="membership-payment-header">
                <div className="membership-payment-brand"><Image src="/Bit_logo.svg" alt="ביט" width={44} height={44} className="membership-bit-logo" /><span>סטודיו טליה<span>תשלום דרך ביט</span></span></div>
                <button ref={closeRef} type="button" onClick={onClose} aria-label="סגירת פרטי התשלום" className="membership-payment-close"><X aria-hidden="true" /></button>
                <p className="membership-payment-eyebrow">הבחירה שלך</p>
                <h2 id="payment-title">כמעט שם.</h2>
                <div className="membership-payment-total"><div><strong>{tierDisplay}</strong><span>לחודש · ללא התחייבות שנתית</span></div><strong dir="ltr">{amount}<span>₪</span></strong></div>
                <p id="payment-description">עוד רגע עוברים לביט. הנה כל הפרטים להעברה.</p>
            </header>
            <div className="membership-payment-body">
                <div className="membership-payment-copy-section">
                    <p className="membership-copy-label">לצרף לתיאור התשלום בביט</p>
                    <div className="membership-copy-box"><p dir="auto">{paymentDescription}</p><button type="button" onClick={handleCopy} aria-label="העתקת תיאור התשלום">{copyState === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}<span>{copyState === "copied" ? "הועתק" : "העתקה"}</span></button></div>
                    <p className="membership-copy-feedback" role="status">{copyState === "copied" ? "התיאור הועתק. הדביקי אותו בשדה התיאור בביט." : copyState === "error" ? "לא הצלחנו להעתיק. נסי שוב באמצעות כפתור ההעתקה." : "העתיקי עכשיו, והדביקי בתיאור ההעברה בביט."}</p>
                </div>
                <div className="membership-payment-notice"><span><Clock3 aria-hidden="true" /></span><p><strong>האימונים בדרך אלייך</strong>המנוי יופעל לאחר אישור התשלום על ידי טליה.</p></div>
            </div>
            </div>
            <footer className="membership-payment-actions">
                {error && <p className="membership-payment-error" role="alert">{error}</p>}
                <BitConfirmSlider onConfirm={handleConfirm} onClose={onClose} />
                <p className="membership-payment-hint">ההעברה עצמה מתבצעת בביט.</p>
            </footer>
        </div>}
    </dialog>;
}
