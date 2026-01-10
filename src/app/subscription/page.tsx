"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tiers = [
    {
        name: "Regular",
        price: "99",
        currency: "₪",
        frequency: "/month",
        description: "Perfect for getting started on your fitness journey.",
        features: [
            "Access to gym facilities",
            "Basic equipment usage",
            "Locker room access",
            "1 Guest pass per month",
        ],
        cta: "Get Started",
        popular: false,
        color: "bg-zinc-100 dark:bg-zinc-900",
        border: "border-zinc-200 dark:border-zinc-800",
    },
    {
        name: "Premium",
        price: "199",
        currency: "₪",
        frequency: "/month",
        description: "Unlock full potential with advanced features and access.",
        features: [
            "All Regular features",
            "Group classes included",
            "Sauna & Spa access",
            "Free towel service",
            "Nutrition consultation",
        ],
        cta: "Join Now",
        popular: true,
        color: "bg-black/5 dark:bg-white/5", // Glassy feel will be handled by classes
        border: "border-primary",
    },
    {
        name: "Elite",
        price: "299",
        currency: "₪",
        frequency: "/month",
        description: "The ultimate experience for dedicated athletes.",
        features: [
            "All Premium features",
            "Personal trainer sessions (2x/mo)",
            "Priority equipment booking",
            "Private locker",
            "Exclusive merchandise",
            "24/7 Access",
        ],
        cta: "Go Elite",
        popular: false,
        color: "bg-zinc-100 dark:bg-zinc-900",
        border: "border-zinc-200 dark:border-zinc-800",
    },
];

export default function SubscriptionPage() {
    const containerRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

            tl.fromTo(
                ".header-animate",
                { y: 50, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, stagger: 0.1 }
            );

            tl.fromTo(
                ".tier-card",
                { y: 100, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.6, stagger: 0.15 },
                "-=0.4"
            );
        },
        { scope: containerRef }
    );

    return (
        <div
            ref={containerRef}
            className="min-h-screen w-full bg-background py-20 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center overflow-hidden relative"
        >
            {/* Background Decorative Blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl opacity-30 mix-blend-screen animate-pulse duration-[10s]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-3xl opacity-30 mix-blend-screen animate-pulse duration-[12s]" />
            </div>


            <div className="text-center max-w-3xl mx-auto mb-16 header-animate">
                <h2 className="text-primary font-bold tracking-wide uppercase text-sm mb-3">
                    Membership Plans
                </h2>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
                    Choose Your Journey
                </h1>
                <p className="text-lg text-muted-foreground">
                    Select the plan that fits your goals. Upgrade or cancel anytime.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-7xl mx-auto items-start">
                {tiers.map((tier, index) => (
                    <div
                        key={tier.name}
                        className={cn(
                            "tier-card relative flex flex-col p-8 rounded-3xl transition-all duration-300 group hover:-translate-y-2 hover:shadow-2xl",
                            "border backdrop-blur-xl",
                            tier.border,
                            tier.popular
                                ? "bg-gradient-to-b from-zinc-50/50 to-white/10 dark:from-zinc-900/50 dark:to-black/10 shadow-xl z-10 md:scale-105 border-primary/50"
                                : "bg-background/40 hover:bg-background/60 border-border/50"
                        )}
                    >
                        {tier.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-full shadow-md">
                                Most Popular
                            </div>
                        )}

                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-foreground">{tier.name}</h3>
                            <div className="mt-4 flex items-baseline text-foreground">
                                <span className="text-3xl font-semibold mr-1">{tier.currency}</span>
                                <span className="text-5xl font-extrabold tracking-tight">
                                    {tier.price}
                                </span>
                                <span className="text-muted-foreground ml-1 font-medium">
                                    {tier.frequency}
                                </span>
                            </div>
                            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                                {tier.description}
                            </p>
                        </div>

                        <div className="flex-1 mb-8">
                            <ul className="space-y-4">
                                {tier.features.map((feature) => (
                                    <li key={feature} className="flex items-start">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                                            <Check className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        <span className="ml-3 text-sm text-foreground/80">
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <Button
                            className={cn(
                                "w-full rounded-xl py-6 font-semibold shadow-lg transition-all duration-300",
                                tier.popular
                                    ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/25"
                                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            )}
                        >
                            {tier.cta}
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
