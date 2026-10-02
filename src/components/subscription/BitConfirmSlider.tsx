"use client";

import { useRef, useState, type PointerEvent } from "react";
import { ArrowLeft, Check } from "lucide-react";

export default function BitConfirmSlider({ onConfirm, onClose }: { onConfirm: () => boolean; onClose: () => void }) {
    const railRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ id: number; start: number; travel: number; position: number } | null>(null);
    const [dragging, setDragging] = useState(false);

    const paint = (position: number, travel: number) => {
        railRef.current?.style.setProperty("--slide-x", `${-position}px`);
        railRef.current?.style.setProperty("--slide-progress", String(travel ? position / travel : 0));
    };
    const reset = () => {
        dragRef.current = null;
        setDragging(false);
        paint(0, 1);
    };
    const start = (event: PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0 || dragRef.current || !railRef.current) return;
        const travel = railRef.current.clientWidth - event.currentTarget.offsetWidth - 16;
        if (travel <= 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { id: event.pointerId, start: event.clientX, travel, position: 0 };
        setDragging(true);
    };
    const move = (event: PointerEvent<HTMLButtonElement>) => {
        const drag = dragRef.current;
        if (!drag || event.pointerId !== drag.id) return;
        drag.position = Math.max(0, Math.min(drag.travel, drag.start - event.clientX));
        paint(drag.position, drag.travel);
    };
    const finish = (event: PointerEvent<HTMLButtonElement>) => {
        const drag = dragRef.current;
        if (!drag || event.pointerId !== drag.id) return;
        const complete = drag.position >= drag.travel * .92;
        dragRef.current = null;
        setDragging(false);
        event.currentTarget.releasePointerCapture(event.pointerId);
        // Preserve popup activation by confirming in the trusted release event.
        // Short or cancelled gestures never start an external handoff.
        if (!complete || !onConfirm()) paint(0, 1);
    };

    return <div className="membership-slide-confirm">
        <div ref={railRef} className="membership-slide-rail" data-dragging={dragging} dir="rtl">
            <span className="membership-slide-fill" aria-hidden="true" />
            <span className="membership-slide-label" aria-hidden="true">החליקי לפתיחת ביט</span>
            <span className="membership-slide-destination" aria-hidden="true"><Check /></span>
            <button type="button" className="membership-slide-handle" aria-label="פתיחת ביט" aria-describedby="membership-slide-help"
                onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={reset}
                onLostPointerCapture={() => { if (dragRef.current) reset(); }}
                onKeyDown={event => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    if (!event.repeat) onConfirm();
                }}
                onClick={event => { if (event.detail === 0) onConfirm(); }}>
                <ArrowLeft aria-hidden="true" />
            </button>
        </div>
        <p id="membership-slide-help" className="membership-payment-sr-only">גררי את החץ שמאלה ושחררי בסוף המסילה. אפשר גם לפתוח את ביט בלחיצה על הכפתור הבא או באמצעות Enter.</p>
        <div className="membership-payment-secondary-actions">
            <button type="button" className="membership-bit-button membership-slide-alternative" onClick={onConfirm}>פתיחת ביט בלחיצה</button>
            <button type="button" onClick={onClose} className="membership-payment-cancel">חזרה למסלול שלי</button>
        </div>
    </div>;
}
