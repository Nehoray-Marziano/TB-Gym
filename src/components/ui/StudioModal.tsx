"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, useIsPresent, useReducedMotion } from "framer-motion";

const scrollLocks = new WeakMap<HTMLElement, { users: number; overflow: string }>();
const modalStack: HTMLDialogElement[] = [];
const ModalContainerContext = createContext<HTMLElement | null>(null);

/** Keep portaled pickers in the native modal's interactive top layer. */
export function useStudioModalContainer() { return useContext(ModalContainerContext); }

type StudioModalProps = {
    titleId: string;
    descriptionId?: string;
    variant?: "confirmation" | "booking" | "admin";
    role?: "dialog" | "alertdialog";
    busy?: boolean;
    onClose: () => void;
    header?: ReactNode;
    children: ReactNode;
    actions: ReactNode;
};

/** Native top-layer modal with background isolation and explicit keyboard focus wrapping. */
export function StudioModal({ titleId, descriptionId, variant = "confirmation", role = "dialog", busy = false, onClose, header, children, actions }: StudioModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [container, setContainer] = useState<HTMLDialogElement | null>(null);
    const attachDialog = useCallback((element: HTMLDialogElement | null) => {
        dialogRef.current = element;
        setContainer(element);
    }, []);
    const backdropPress = useRef(false);
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
        const scrollers = [...new Set([document.documentElement, document.body, ...document.querySelectorAll<HTMLElement>("[data-member-scroll]")])];
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
        modalStack.push(dialog);
        if (behaviorRef.current.busy) dialog.focus({ preventScroll: true });
        else dialog.querySelector<HTMLElement>("[data-modal-cancel]")?.focus();
        viewport?.addEventListener("resize", fitViewport);
        viewport?.addEventListener("scroll", fitViewport);
        window.addEventListener("resize", fitViewport);
        return () => {
            const index = modalStack.indexOf(dialog);
            if (index !== -1) modalStack.splice(index, 1);
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
            const returnFocus = previousFocus?.isConnected ? previousFocus
                : modalStack.at(-1)?.querySelector<HTMLElement>("[data-modal-cancel]")
                    ?? document.querySelector<HTMLElement>("[data-modal-fallback]");
            if (returnFocus?.isConnected) {
                returnFocus.focus({ preventScroll: true });
                // Native focus restoration does not account for a resized route
                // or its dock clearance. Scroll only as far as the trigger needs.
                if (returnFocus.closest("[data-member-scroll]")) {
                    returnFocus.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
                }
            }
        };
    }, []);

    return createPortal(
        <dialog ref={attachDialog} role={role} tabIndex={-1} className="studio-modal" data-variant={variant} aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={busy}
            onPointerDown={event => { backdropPress.current = event.target === event.currentTarget; }}
            onClick={event => { if (backdropPress.current && event.target === event.currentTarget && !busy && isPresent) onClose(); }}
            onKeyDown={event => {
                if (event.defaultPrevented || modalStack.at(-1) !== event.currentTarget || (event.target instanceof Element && event.target.closest('[data-studio-overlay]'))) return;
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
            <ModalContainerContext.Provider value={container}>
            <motion.div className="studio-modal-surface" inert={!isPresent}
                initial={reduceMotion ? false : { opacity: 0, y: variant === "booking" ? 48 : variant === "admin" ? 32 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: variant === "booking" ? 48 : variant === "admin" ? 32 : 12 }}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.2, 0.8, 0.2, 1] }}>
                {header && <div className="studio-modal-header">{header}</div>}
                <div className="studio-modal-content">{children}</div>
                <div className="studio-modal-actions">{actions}</div>
            </motion.div>
            </ModalContainerContext.Provider>
        </dialog>, document.body
    );
}
