"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function GSAPRegistry({
    children,
}: {
    children: React.ReactNode;
}) {
    useLayoutEffect(() => {
        gsap.registerPlugin(ScrollTrigger);
    }, []);

    return <>{children}</>;
}
