"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, useIsPresent, useReducedMotion } from "framer-motion";

const scrollLocks = new WeakMap<HTMLElement, { users: number; overflow: string }>();

type StudioModalProps = {
    titleId: string;
    descriptionId?: string;
    variant?: "confirmation" | "booking";
    busy?: boolean;
    onClose: () => void;
    children: ReactNode;
    actions: ReactNode;
};

/** Native top-layer modal with background isolation and explicit keyboard focus wrapping. */
export function StudioModal({ titleId, descriptionId, variant = "confirmation", busy = false, onClose, children, actions }: StudioModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const reduceMotion = useReducedMotion();
    const isPresent = useIsPresent();
    const behaviorRef = useRef({ busy, isPresent, onClose });

    useLayoutEffect(() => {
        behaviorRef.current = { busy, isPresent, onClose };
    }, [busy, isPresent, onClose]);

    useLayoutEffect(() => {
        // Disabling the focused action can send focus to the document body.
        // Keep keyboard events inside the modal throughout the pending state.
        if (busy && dialogRef.current?.open) dialogRef.current.focus({ preventScroll: true });
    }, [busy]);

    useLayoutEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const scrollers = [...document.querySelectorAll<HTMLElement>("[data-member-scroll]")];
        scrollers.forEach(element => {
            const lock = scrollLocks.get(element);
            if (lock) lock.users++;
            else scrollLocks.set(element, { users: 1, overflow: element.style.overflowY });
            element.style.overflowY = "hidden";
        });
        const viewport = window.visualViewport;
        const fitViewport = () => {
            dialog.style.setProperty("--modal-height", `${viewport?.height ?? window.innerHeight}px`);
            dialog.style.setProperty("--modal-top", `${viewport?.offsetTop ?? 0}px`);
            dialog.style.setProperty("--modal-width", `${viewport?.width ?? window.innerWidth}px`);
            dialog.style.setProperty("--modal-left", `${viewport?.offsetLeft ?? 0}px`);
        };
        fitViewport();
        // Cancel is a native, non-bubbling event. Guard it synchronously with
        // committed behavior, including when all action buttons are disabled.
        const cancel = (event: Event) => {
            event.preventDefault();
            const behavior = behaviorRef.current;
            if (!behavior.busy && behavior.isPresent) behavior.onClose();
        };
        dialog.addEventListener("cancel", cancel);
        dialog.showModal();
        if (behaviorRef.current.busy) dialog.focus({ preventScroll: true });
        else dialog.querySelector<HTMLElement>("[data-modal-cancel]")?.focus();
        viewport?.addEventListener("resize", fitViewport);
        viewport?.addEventListener("scroll", fitViewport);
        window.addEventListener("resize", fitViewport);
        return () => {
            dialog.close();
            dialog.removeEventListener("cancel", cancel);
            scrollers.forEach(element => {
                const lock = scrollLocks.get(element);
                if (lock && --lock.users === 0) {
                    element.style.overflowY = lock.overflow;
                    scrollLocks.delete(element);
                }
            });
            viewport?.removeEventListener("resize", fitViewport);
            viewport?.removeEventListener("scroll", fitViewport);
            window.removeEventListener("resize", fitViewport);
            if (previousFocus?.isConnected) {
                previousFocus.focus({ preventScroll: true });
                // Native focus restoration does not account for a resized route
                // or its dock clearance. Scroll only as far as the trigger needs.
                if (previousFocus.closest("[data-member-scroll]")) {
                    previousFocus.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
                }
            }
        };
    }, []);

    return createPortal(
        <dialog ref={dialogRef} role="dialog" tabIndex={-1} className="studio-modal" data-variant={variant} aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={busy}
            onClick={event => { if (event.target === event.currentTarget && !busy && isPresent) onClose(); }}
            onKeyDown={event => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    const behavior = behaviorRef.current;
                    if (!behavior.busy && behavior.isPresent) behavior.onClose();
                    return;
                }
                if (event.key !== "Tab") return;
                const dialog = event.currentTarget;
                const controls = [...dialog.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])')]
                    .filter(element => element.getClientRects().length && !element.closest("[inert], [hidden]"));
                const first = controls[0];
                const last = controls[controls.length - 1];
                if (!first) {
                    event.preventDefault();
                    dialog.focus({ preventScroll: true });
                } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
                    event.preventDefault();
                    first.focus();
                }
            }}>
            <motion.div className="studio-modal-surface" inert={!isPresent}
                initial={reduceMotion ? false : { opacity: 0, y: variant === "booking" ? 48 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: variant === "booking" ? 48 : 12 }}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.2, 0.8, 0.2, 1] }}>
                <div className="studio-modal-content">{children}</div>
                <div className="studio-modal-actions">{actions}</div>
            </motion.div>
        </dialog>, document.body
    );
}
