"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Check, Star, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tiers = [
    {
        name: "התחלה",
        subtitle: "צעד ראשון לשינוי",
        price: "199",
        currency: "₪",
        frequency: "/חודש",
        description: "חבילה בסיסית למתאמנים שרוצים גישה חופשית לחדר הכושר וציוד איכותי.",
        features: [
            "כניסה חופשית למתחם האימונים",
            "שימוש במלתחות ולוקרים",
            "אפליקציית מעקב אימונים",
            "הדרכה ראשונית על המכשירים",
        ],
        cta: "להצטרפות",
        popular: false,
        color: "bg-zinc-100 dark:bg-zinc-900",
        border: "border-zinc-200 dark:border-zinc-800",
        icon: Star,
    },
    {
        name: "פרימיום",
        subtitle: "הבחירה הפופולרית",
        price: "299",
        currency: "₪",
        frequency: "/חודש",
        description: "החוויה המלאה. שילוב מושלם של אימוני כוח, אירובי ושיעורי סטודיו מגוונים.",
        features: [
            "כל מה שיש בחבילת התחלה",
            "כניסה חופשית לכל שיעורי הסטודיו",
            "גישה למתחם הסאונה",
            "חניה חינם לשעתיים",
            "הקפאת מנוי עד חודש בשנה",
        ],
        cta: "אני רוצה את זה",
        popular: true,
        color: "bg-black/5 dark:bg-white/5",
        border: "border-primary",
        icon: Zap,
    },
    {
        name: "עלית",
        subtitle: "למקצוענים בלבד",
        price: "450",
        currency: "₪",
        frequency: "/חודש",
        description: "מעטפת הליווי המקצועית והמקיפה ביותר, להשגת תוצאות מקסימליות.",
        features: [
            "כל מה שיש בחבילת פרימיום",
            "2 אימונים אישיים בחודש",
            "בניית תוכנית אימונים אישית",
            "ייעוץ תזונה חודשי",
            "כניסה 24/7 למועדון",
            "מגבת אימון בכל כניסה",
        ],
        cta: "הצטרפות למועדון האקסקלוסיבי",
        popular: false,
        color: "bg-zinc-100 dark:bg-zinc-900",
        border: "border-zinc-200 dark:border-zinc-800",
        icon: Crown,
    },
];

export default function SubscriptionPage() {
    const containerRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

            tl.from(".header-animate", {
                y: 30,
                opacity: 0,
                duration: 1,
                stagger: 0.1,
            });

            tl.from(
                ".tier-card",
                {
                    y: 60,
                    opacity: 0,
                    duration: 0.8,
                    stagger: 0.15,
                    scale: 0.95,
                },
                "-=0.6"
            );
        },
        { scope: containerRef }
    );

    return (
        <div
            ref={containerRef}
            className="min-h-screen w-full bg-background py-20 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center overflow-hidden relative"
            dir="rtl"
        >
            {/* Background Decorative Blobs */}
            <div className="absolute top-0 right-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] opacity-20 mix-blend-screen animate-pulse duration-[10s]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px] opacity-20 mix-blend-screen animate-pulse duration-[12s]" />
            </div>

            <div className="text-center max-w-3xl mx-auto mb-16 header-animate">
                <h2 className="text-primary font-bold tracking-wide uppercase text-sm mb-3">
                    מסלולי הצטרפות
                </h2>
                <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground mb-4">
                    לבחור את הדרך שלך
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    בין אם אתם מתחילים או מקצוענים, יש לנו את המסלול המדויק עבורכם.
                    ללא התחייבות, ניתן לשינוי בכל עת.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-7xl mx-auto items-stretch">
                {tiers.map((tier) => (
                    <div
                        key={tier.name}
                        className={cn(
                            "tier-card relative flex flex-col p-8 rounded-[2rem] transition-all duration-300 group hover:-translate-y-2",
                            "border backdrop-blur-xl",
                            tier.border,
                            tier.popular
                                ? "bg-gradient-to-b from-zinc-50/50 to-white/10 dark:from-zinc-900/50 dark:to-black/10 shadow-2xl z-10 md:scale-105 border-primary/50 ring-1 ring-primary/20"
                                : "bg-background/40 hover:bg-background/60 border-border/50 hover:border-border/80"
                        )}
                    >
                        {tier.popular && (
                            <div className="absolute -top-4 right-1/2 translate-x-1/2 px-4 py-1.5 bg-primary text-black text-xs font-bold uppercase tracking-wider rounded-full shadow-lg shadow-primary/25">
                                הכי פופולרי
                            </div>
                        )}

                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={cn(
                                    "p-2 rounded-xl inline-flex",
                                    tier.popular ? "bg-primary text-black" : "bg-muted text-foreground"
                                )}>
                                    <tier.icon className="w-5 h-5" />
                                </div>
                                <h3 className="text-2xl font-bold text-foreground">{tier.name}</h3>
                            </div>

                            <div className="mt-2 flex items-baseline text-foreground">
                                <span className="text-5xl font-black tracking-tight">
                                    {tier.price}
                                </span>
                                <span className="text-2xl font-bold mr-1">{tier.currency}</span>
                                <span className="text-muted-foreground mr-1 font-medium">
                                    {tier.frequency}
                                </span>
                            </div>
                            <p className="mt-4 text-sm text-muted-foreground leading-relaxed h-[40px]">
                                {tier.description}
                            </p>
                        </div>

                        <div className="flex-1 mb-8">
                            <ul className="space-y-4">
                                {tier.features.map((feature) => (
                                    <li key={feature} className="flex items-start">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5 ml-3">
                                            <Check className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        <span className="text-sm text-foreground/90 font-medium">
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <Button
                            className={cn(
                                "w-full rounded-2xl py-6 text-base font-bold shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
                                tier.popular
                                    ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/30"
                                    : "bg-secondary/80 text-secondary-foreground hover:bg-secondary"
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
