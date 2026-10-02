"use client";

import { useEffect, useRef } from "react";

const TOP_REVEAL = 24;
const HIDE_DISTANCE = 32;
const REVEAL_DISTANCE = 12;

function isEditing(element: Element | null) {
    return element instanceof HTMLElement && (
        element.isContentEditable ||
        element.matches('textarea, select, input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="hidden"])')
    );
}

/** Owns dock visibility without re-rendering tabs or reading layout on every scroll. */
export function useMemberNavigation(pathname: string) {
    const navRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const nav = navRef.current;
        if (!nav) return;
        let hiddenByScroll = false;
        let suppressed = false;
        let frame = 0;
        let scrollFrame = 0;
        let scrollTarget = nav.closest(".studio-app-shell")?.querySelector<HTMLElement>("[data-member-scroll]") ?? null;
        let lastPosition = scrollTarget?.scrollTop ?? 0;
        let travel = 0;
        let direction = 0;

        const render = () => {
            const hidden = suppressed || hiddenByScroll;
            nav.dataset.hidden = String(hidden);
            nav.dataset.suppressed = String(suppressed);
            // Scroll-hidden links remain keyboard/screen-reader reachable. Tab reveals
            // the dock; modal/input suppression removes the background navigation.
            nav.inert = suppressed;
            if (suppressed && nav.getAttribute("aria-hidden") !== "true") nav.setAttribute("aria-hidden", "true");
            else if (!suppressed && nav.hasAttribute("aria-hidden")) nav.removeAttribute("aria-hidden");
        };
        const resetScroll = () => {
            lastPosition = scrollTarget?.scrollTop ?? 0;
            travel = direction = 0;
            hiddenByScroll = false;
        };
        const checkEnvironment = () => {
            frame = 0;
            const modal = document.body.classList.contains("studio-modal-active") ||
                document.documentElement.classList.contains("studio-modal-active") ||
                Boolean(document.querySelector("dialog:modal")) ||
                [...document.querySelectorAll('[aria-modal="true"][role="dialog"], [aria-modal="true"][role="alertdialog"]')].some(element =>
                    !element.closest('[hidden], [aria-hidden="true"]') &&
                    element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden"
                );
            const viewport = window.visualViewport;
            const keyboard = viewport && viewport.scale === 1 && window.innerHeight - viewport.height > 150;
            const nextSuppressed = Boolean(modal || isEditing(document.activeElement) || keyboard);
            if (suppressed !== nextSuppressed) resetScroll();
            suppressed = nextSuppressed;
            render();
        };
        const scheduleEnvironment = () => {
            if (!frame) frame = requestAnimationFrame(checkEnvironment);
        };
        const readScroll = () => {
            scrollFrame = 0;
            if (!scrollTarget || suppressed) return;
            const max = Math.max(0, scrollTarget.scrollHeight - scrollTarget.clientHeight);
            // Clamp elastic overscroll so a bounce cannot reverse the intended motion.
            const position = Math.max(0, Math.min(max, scrollTarget.scrollTop));
            const delta = position - lastPosition;
            lastPosition = position;
            const focused = document.activeElement;
            const keyboardFocus = focused instanceof HTMLElement && nav.contains(focused) && focused.matches(":focus-visible");
            if (position <= TOP_REVEAL || max <= TOP_REVEAL || keyboardFocus) {
                hiddenByScroll = false;
                travel = direction = 0;
            } else if (delta !== 0) {
                const nextDirection = Math.sign(delta);
                if (direction !== nextDirection) travel = 0;
                direction = nextDirection;
                travel += Math.abs(delta);
                if (direction > 0 && travel >= HIDE_DISTANCE) hiddenByScroll = true;
                if (direction < 0 && travel >= REVEAL_DISTANCE) hiddenByScroll = false;
            }
            render();
        };
        const onScroll = (event: Event) => {
            const target = event.target === document ? document.scrollingElement : event.target;
            if (!(target instanceof HTMLElement) || suppressed) return;
            // Only the route's vertical scroller owns direction. Calendar strips,
            // textareas, sheets and other nested regions cannot toggle the dock.
            if (target !== document.scrollingElement && !target.matches("[data-member-scroll]")) return;
            if (scrollTarget !== target) {
                scrollTarget = target;
                lastPosition = target.scrollTop;
                travel = direction = 0;
            }
            if (!scrollFrame) scrollFrame = requestAnimationFrame(readScroll);
        };
        const onFocus = () => {
            // Update before the next paint so focused actions are never covered.
            cancelAnimationFrame(frame);
            checkEnvironment();
            if (!suppressed) {
                resetScroll();
                render();
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Tab" && !suppressed) {
                hiddenByScroll = false;
                render();
            }
        };
        const onResize = () => {
            resetScroll();
            scheduleEnvironment();
        };

        checkEnvironment();
        const observer = new MutationObserver(records => {
            // Streaming/loading/error states can replace the route scroller
            // without changing the pathname. Seed it before the first gesture.
            if (records.some(record => record.type === "childList")) {
                const owner = nav.closest(".studio-app-shell")?.querySelector<HTMLElement>("[data-member-scroll]") ?? null;
                if (owner !== scrollTarget && (owner || !scrollTarget?.isConnected)) {
                    scrollTarget = owner;
                    resetScroll();
                    render();
                }
            }
            scheduleEnvironment();
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open", "hidden", "aria-hidden", "aria-modal", "role", "class"] });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        document.addEventListener("scroll", onScroll, { capture: true, passive: true });
        document.addEventListener("focusin", onFocus);
        document.addEventListener("focusout", scheduleEnvironment);
        document.addEventListener("keydown", onKeyDown);
        window.addEventListener("resize", onResize, { passive: true });
        window.addEventListener("pageshow", onResize);
        window.visualViewport?.addEventListener("resize", onResize, { passive: true });
        window.visualViewport?.addEventListener("scroll", scheduleEnvironment, { passive: true });
        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
            cancelAnimationFrame(scrollFrame);
            document.removeEventListener("scroll", onScroll, true);
            document.removeEventListener("focusin", onFocus);
            document.removeEventListener("focusout", scheduleEnvironment);
            document.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("resize", onResize);
            window.removeEventListener("pageshow", onResize);
            window.visualViewport?.removeEventListener("resize", onResize);
            window.visualViewport?.removeEventListener("scroll", scheduleEnvironment);
        };
    }, [pathname]);

    return navRef;
}
