"use client";

import { useRef, useState, type PointerEvent } from "react";
import { ArrowRight, Check } from "lucide-react";

export default function BitConfirmSlider({ onConfirm }: { onConfirm: () => boolean }) {
    const railRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ id: number; start: number; travel: number; position: number; distance: number } | null>(null);
    const [dragging, setDragging] = useState(false);

    const paint = (position: number, travel: number) => {
        railRef.current?.style.setProperty("--slide-x", `${position}px`);
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
        dragRef.current = { id: event.pointerId, start: event.clientX, travel, position: 0, distance: 0 };
        setDragging(true);
    };
    const move = (event: PointerEvent<HTMLButtonElement>) => {
        const drag = dragRef.current;
        if (!drag || event.pointerId !== drag.id) return;
        drag.distance = Math.max(drag.distance, Math.abs(event.clientX - drag.start));
        drag.position = Math.max(0, Math.min(drag.travel, event.clientX - drag.start));
        paint(drag.position, drag.travel);
    };
    const finish = (event: PointerEvent<HTMLButtonElement>) => {
        const drag = dragRef.current;
        if (!drag || event.pointerId !== drag.id) return;
        drag.distance = Math.max(drag.distance, Math.abs(event.clientX - drag.start));
        drag.position = Math.max(0, Math.min(drag.travel, event.clientX - drag.start));
        const complete = drag.position >= drag.travel * .92;
        const tapped = drag.distance <= 6;
        dragRef.current = null;
        setDragging(false);
        event.currentTarget.releasePointerCapture(event.pointerId);
        // Preserve popup activation by confirming in the trusted release event.
        // The handle also owns the tap alternative. Incomplete or cancelled
        // drags never confirm, including drags in the opposite direction.
        if ((!complete && !tapped) || !onConfirm()) paint(0, 1);
    };

    return <div className="membership-slide-confirm">
        <div ref={railRef} className="membership-slide-rail" data-dragging={dragging} dir="ltr">
            <span className="membership-slide-fill" aria-hidden="true" />
            <span className="membership-slide-label" aria-hidden="true" dir="rtl">החליקי לפתיחת ביט</span>
            <span className="membership-slide-destination" aria-hidden="true"><Check /></span>
            <button type="button" className="membership-slide-handle" aria-label="פתיחת ביט" aria-describedby="membership-slide-help"
                title="החליקי ימינה או לחצי לפתיחת ביט"
                onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={reset}
                onLostPointerCapture={() => { if (dragRef.current) reset(); }}
                onKeyDown={event => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    if (!event.repeat) onConfirm();
                }}
                onClick={event => { if (event.detail === 0) onConfirm(); }}>
                <ArrowRight aria-hidden="true" />
            </button>
        </div>
        <p id="membership-slide-help" className="membership-payment-sr-only">גררי את החץ ימינה ושחררי בסוף המסילה. אפשר גם ללחוץ על החץ או לפתוח את ביט באמצעות Enter או מקש הרווח.</p>
    </div>;
}
