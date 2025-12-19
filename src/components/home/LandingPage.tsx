"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Link from "next/link";

export default function LandingPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const heroTextRef = useRef<HTMLHeadingElement>(null);
    const subTextRef = useRef<HTMLParagraphElement>(null);
    const ctaRef = useRef<HTMLDivElement>(null);
    const decorativeCircleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Timeline for initial entrance
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

            tl.fromTo(
                decorativeCircleRef.current,
                { scale: 0, opacity: 0 },
                { scale: 1, opacity: 0.1, duration: 1.5, ease: "elastic.out(1, 0.5)" }
            )
                .fromTo(
                    heroTextRef.current,
                    { y: 100, opacity: 0, clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)" },
                    {
                        y: 0,
                        opacity: 1,
                        clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
                        duration: 1,
                    },
                    "-=1"
                )
                .fromTo(
                    subTextRef.current,
                    { y: 20, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.8 },
                    "-=0.5"
                )
                .fromTo(
                    ctaRef.current,
                    { scale: 0.8, opacity: 0 },
                    { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" },
                    "-=0.3"
                );

            // Infinite floating animation for the circle
            gsap.to(decorativeCircleRef.current, {
                y: 20,
                duration: 3,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
            });

        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <div
            ref={containerRef}
            className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-background px-6"
        >
            {/* Decorative Background Element */}
            <div
                ref={decorativeCircleRef}
                className="absolute w-[600px] h-[600px] bg-primary rounded-full blur-[120px] pointer-events-none opacity-10"
            />

            {/* Main Content */}
            <main className="z-10 text-center max-w-4xl relative">
                <h1
                    ref={heroTextRef}
                    className="text-6xl md:text-8xl font-bold tracking-tight mb-6 bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent leading-tight pb-2"
                >
                    כושר
                    <br />
                    מחדש
                </h1>
                <p
                    ref={subTextRef}
                    className="text-lg md:text-xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed"
                >
                    הצטרפו לטליה לחוויית אימון אקסקלוסיבית.
                    <br />
                    אימון מקצועי, מתקנים ברמה הגבוהה ביותר, וקהילה שדוחפת קדימה.
                </p>

                <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Link
                        href="/auth/login"
                        className="px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-full  transition-colors shadow-[0_0_20px_rgba(156,169,134,0.3)] text-lg hover:bg-[#8B9A76]"
                    >
                        התחילי את המסע שלך
                    </Link>
                    <button
                        className="px-8 py-4 text-white border border-neutral-800 rounded-full hover:bg-neutral-900 transition-colors text-lg"
                    >
                        צפייה בלוח הזמנים
                    </button>
                </div>
            </main>

            {/* Overlay noise or grid if we wanted extra texture */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
        </div>
    );
}
