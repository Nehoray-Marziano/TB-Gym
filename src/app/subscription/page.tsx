"use client";

import { Check, Star, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tiers = [
    {
        name: "התחלה",
        price: "199",
        currency: "₪",
        frequency: "/חודש",
        description: "חבילה בסיסית למתאמנים שרוצים גישה חופשית לחדר הכושר.",
        features: [
            "כניסה חופשית למתחם האימונים",
            "שימוש במלתחות ולוקרים",
            "אפליקציית מעקב אימונים",
            "הדרכה ראשונית על המכשירים",
        ],
        cta: "להצטרפות",
        popular: false,
        icon: Star,
    },
    {
        name: "פרימיום",
        price: "299",
        currency: "₪",
        frequency: "/חודש",
        description: "החוויה המלאה עם שיעורי סטודיו וסאונה.",
        features: [
            "כל מה שיש בחבילת התחלה",
            "כניסה חופשית לכל שיעורי הסטודיו",
            "גישה למתחם הסאונה",
            "חניה חינם לשעתיים",
            "הקפאת מנוי עד חודש בשנה",
        ],
        cta: "אני רוצה את זה",
        popular: true,
        icon: Zap,
    },
    {
        name: "עלית",
        price: "450",
        currency: "₪",
        frequency: "/חודש",
        description: "הליווי המקצועי והמקיף ביותר.",
        features: [
            "כל מה שיש בחבילת פרימיום",
            "2 אימונים אישיים בחודש",
            "בניית תוכנית אימונים אישית",
            "ייעוץ תזונה חודשי",
            "כניסה 24/7 למועדון",
            "מגבת אימון בכל כניסה",
        ],
        cta: "הצטרפות למועדון",
        popular: false,
        icon: Crown,
    },
];

export default function SubscriptionPage() {
    return (
        <div
            className="min-h-screen w-full bg-background py-16 px-4 sm:px-6 lg:px-8 overflow-x-hidden"
            dir="rtl"
        >
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-16">
                <span className="inline-block py-1 px-3 rounded-full bg-secondary text-secondary-foreground text-xs font-extrabold tracking-wider uppercase mb-4">
                    מסלולי הצטרפות
                </span>
                <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground mb-6 leading-tight">
                    לבחור את <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#d4e450]">הדרך שלך</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
                    בין אם אתם מתחילים או מקצוענים, בנינו עבורכם מסלולים שיתאימו בדיוק לקצב שלכם.
                </p>
            </div>

            {/* Tier Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-7xl mx-auto items-stretch">
                {tiers.map((tier) => (
                    <div
                        key={tier.name}
                        className={cn(
                            "relative flex flex-col p-8 rounded-[2.5rem] transition-transform active:scale-[0.98]",
                            tier.popular
                                ? "bg-card shadow-2xl shadow-primary/20 border-2 border-primary ring-4 ring-primary/10 z-10 md:scale-105"
                                : "bg-card/50 border border-border/50"
                        )}
                    >
                        {tier.popular && (
                            <div className="absolute -top-4 right-1/2 translate-x-1/2 px-4 py-1.5 bg-primary text-black text-xs font-black rounded-full shadow-lg flex items-center gap-1 uppercase tracking-wide">
                                <Crown className="w-3 h-3 fill-black" />
                                הכי פופולרי
                            </div>
                        )}

                        {/* Card Header */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                                    tier.popular ? "bg-black text-[#E2F163]" : "bg-muted text-foreground"
                                )}>
                                    <tier.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-bold text-foreground">{tier.name}</h3>
                            </div>

                            <div className="flex items-baseline text-foreground mb-4">
                                <span className="text-5xl font-black tracking-tighter">{tier.price}</span>
                                <span className="text-2xl font-bold mr-1">{tier.currency}</span>
                                <span className="text-muted-foreground text-sm mr-2 font-medium">{tier.frequency}</span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                                {tier.description}
                            </p>
                        </div>

                        {/* Divider */}
                        <div className="h-px w-full bg-border/50 mb-8" />

                        {/* Features */}
                        <ul className="space-y-4 flex-1 mb-8">
                            {tier.features.map((feature) => (
                                <li key={feature} className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                        <Check className="h-3 w-3 text-primary stroke-[3]" />
                                    </div>
                                    <span className="text-sm font-medium text-foreground/90">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        {/* CTA */}
                        <Button
                            className={cn(
                                "w-full rounded-2xl py-6 text-base font-bold shadow-lg active:scale-[0.98] transition-transform",
                                tier.popular
                                    ? "bg-primary text-black"
                                    : "bg-foreground text-background"
                            )}
                        >
                            {tier.cta}
                        </Button>
                    </div>
                ))}
            </div>

            {/* Money Back Guarantee */}
            <div className="text-center mt-16 pb-8">
                <p className="text-sm text-muted-foreground font-medium flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4" />
                    ניתן לבטל את המנוי בכל עת ללא אותיות קטנות
                </p>
            </div>
        </div>
    );
}
