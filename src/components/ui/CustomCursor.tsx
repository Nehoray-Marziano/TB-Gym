"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function CustomCursor() {
    const cursorRef = useRef<HTMLDivElement>(null);
    const followerRef = useRef<HTMLDivElement>(null);
    const [isHovering, setIsHovering] = useState(false);
    const [isMobile, setIsMobile] = useState(true);

    useEffect(() => {
        // Check if device is touch-enabled
        const checkMobile = () => {
            setIsMobile(window.matchMedia("(pointer: coarse)").matches);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);

        if (isMobile) return;

        const cursor = cursorRef.current;
        const follower = followerRef.current;

        // Move cursor and follower
        const moveCursor = (e: MouseEvent) => {
            gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.1, ease: "power2.out" });
            gsap.to(follower, { x: e.clientX, y: e.clientY, duration: 0.5, ease: "power3.out" });
        };

        // Hover effects
        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === "BUTTON" || target.tagName === "A" || target.closest("button") || target.closest("a")) {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };

        window.addEventListener("mousemove", moveCursor);
        window.addEventListener("mouseover", handleMouseOver);

        return () => {
            window.removeEventListener("resize", checkMobile);
            window.removeEventListener("mousemove", moveCursor);
            window.removeEventListener("mouseover", handleMouseOver);
        };
    }, [isMobile]);

    if (isMobile) return null;

    return (
        <>
            <div
                ref={cursorRef}
                className={`fixed top-0 left-0 w-3 h-3 bg-[#E2F163] rounded-full pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 mix-blend-difference transition-transform duration-300 ${isHovering ? "scale-0" : "scale-100"}`}
            />
            <div
                ref={followerRef}
                className={`fixed top-0 left-0 w-8 h-8 border border-[#E2F163] rounded-full pointer-events-none z-[9998] -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out ${isHovering ? "scale-[2.5] bg-[#E2F163]/10 border-transparent backdrop-blur-sm" : "scale-100"}`}
            />
        </>
    );
}
