"use client";

import { motion } from "framer-motion";
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
            {/* Background Blobs */}
            <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
            </div>

            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-12">
                <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-primary font-bold tracking-wide uppercase text-sm mb-3 block"
                >
                    מסלולי הצטרפות
                </motion.span>
                <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-4"
                >
                    לבחור את הדרך שלך
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto"
                >
                    בין אם אתם מתחילים או מקצוענים, יש לנו את המסלול עבורכם.
                </motion.p>
            </div>

            {/* Tier Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mx-auto">
                {tiers.map((tier, index) => (
                    <motion.div
                        key={tier.name}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ delay: index * 0.1, duration: 0.4 }}
                        className={cn(
                            "relative flex flex-col p-6 rounded-3xl transition-shadow duration-300",
                            "border",
                            tier.popular
                                ? "bg-card shadow-2xl shadow-primary/10 border-primary/30 md:scale-[1.02]"
                                : "bg-card/50 border-border/50 hover:shadow-xl hover:border-border"
                        )}
                    >
                        {tier.popular && (
                            <div className="absolute -top-3 right-1/2 translate-x-1/2 px-3 py-1 bg-primary text-black text-xs font-bold rounded-full shadow-lg">
                                הכי פופולרי
                            </div>
                        )}

                        {/* Header */}
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <div className={cn(
                                    "p-2 rounded-xl",
                                    tier.popular ? "bg-primary text-black" : "bg-muted text-foreground"
                                )}>
                                    <tier.icon className="w-4 h-4" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground">{tier.name}</h3>
                            </div>

                            <div className="flex items-baseline text-foreground">
                                <span className="text-4xl font-black">{tier.price}</span>
                                <span className="text-xl font-bold mr-1">{tier.currency}</span>
                                <span className="text-muted-foreground text-sm mr-1">{tier.frequency}</span>
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                                {tier.description}
                            </p>
                        </div>

                        {/* Features */}
                        <ul className="space-y-3 flex-1 mb-6">
                            {tier.features.map((feature) => (
                                <li key={feature} className="flex items-start gap-2">
                                    <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                                        <Check className="h-3 w-3 text-primary" />
                                    </div>
                                    <span className="text-sm text-foreground/85">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        {/* CTA */}
                        <Button
                            className={cn(
                                "w-full rounded-xl py-5 font-bold transition-transform active:scale-[0.98]",
                                tier.popular
                                    ? "bg-primary text-black hover:bg-primary/90"
                                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            )}
                        >
                            {tier.cta}
                        </Button>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
