"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { Check, Crown, Flame, Star, ChevronRight, Zap, Sparkles, ArrowRight, Loader2, ShieldCheck, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";

// --- SUBSCRIPTION TIERS ---
const TIERS = [
    {
        id: 1,
        name: "basic",
        displayName: "בסיסי",
        englishName: "BASIC",
        sessions: 4,
        price: 240,
        pricePerSession: 60,
        icon: Star,
        color: "#94a3b8",
        gradient: "from-slate-600/20 via-slate-700/10 to-slate-800/20",
        borderGlow: "slate-500",
        popular: false,
        discount: 0,
        features: [
            "4 אימונים בחודש",
            "60₪ לאימון",
            "גישה לכל השיעורים",
            "ביטול חינם",
        ]
    },
    {
        id: 2,
        name: "standard",
        displayName: "סטנדרטי",
        englishName: "STANDARD",
        sessions: 8,
        price: 450,
        pricePerSession: 56.25,
        icon: Flame,
        color: "#E2F163",
        gradient: "from-[#E2F163]/30 via-[#E2F163]/10 to-[#d4e450]/20",
        borderGlow: "[#E2F163]",
        popular: true,
        discount: 6,
        features: [
            "8 אימונים בחודש",
            "56₪ לאימון — חיסכון של 6%",
            "גישה לכל השיעורים",
            "ביטול חינם",
            "רכישת כרטיסים נוספים באותו מחיר",
        ]
    },
    {
        id: 3,
        name: "premium",
        displayName: "פרימיום",
        englishName: "PREMIUM",
        sessions: 12,
        price: 650,
        pricePerSession: 54.16,
        icon: Crown,
        color: "#ec4899",
        gradient: "from-pink-500/30 via-purple-600/20 to-fuchsia-700/20",
        borderGlow: "pink-500",
        popular: false,
        discount: 10,
        features: [
            "12 אימונים בחודש",
            "54₪ לאימון — חיסכון של 10%",
            "גישה לכל השיעורים",
            "ביטול חינם",
            "רכישת כרטיסים נוספים באותו מחיר",
        ]
    }
];

export default function SubscriptionPage() {
    const router = useRouter();
    const { refreshData, subscription } = useGymStore();
    const { toast } = useToast();
    const [selectedTier, setSelectedTier] = useState<number | null>(null);
    const [purchasing, setPurchasing] = useState<number | null>(null);
    const [isAnimated, setIsAnimated] = useState(false);

    // GSAP Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const cardsRef = useRef<HTMLDivElement>(null);

    // GSAP Entrance Animation
    useLayoutEffect(() => {
        if (isAnimated) return;

        const ctx = gsap.context(() => {
            // Set initial states
            gsap.set(headerRef.current, { opacity: 0, y: -30 });
            gsap.set(".tier-card", { opacity: 0, y: 60, scale: 0.9 });
            gsap.set(".floating-orb", { scale: 0, opacity: 0 });

            // Master timeline
            const tl = gsap.timeline({
                defaults: { ease: "power3.out" },
                onComplete: () => setIsAnimated(true)
            });

            // Floating orbs fade in
            tl.to(".floating-orb", {
                scale: 1,
                opacity: 1,
                duration: 1.5,
                stagger: 0.2,
                ease: "elastic.out(1, 0.5)"
            })
                // Header slides down
                .to(headerRef.current, {
                    opacity: 1,
                    y: 0,
                    duration: 0.6
                }, "-=1")
                // Draw underline (starts slightly before header finishes)
                .to(".underline-path", {
                    strokeDashoffset: 0,
                    duration: 0.8,
                    ease: "power2.out"
                }, "-=0.3")
                // Cards stagger in with spring
                .to(".tier-card", {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.7,
                    stagger: 0.12,
                    ease: "back.out(1.4)"
                }, "-=0.3");

        }, containerRef);

        return () => ctx.revert();
    }, [isAnimated]);

    // Purchase handler
    const handlePurchase = async (tierId: number) => {
        setPurchasing(tierId);
        if (navigator.vibrate) navigator.vibrate([10, 50, 10]);

        try {
            const res = await fetch("/api/payment/mock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "subscription", tierId }),
            });
            const data = await res.json();

            if (data.success) {
                toast({
                    title: "!ברוכה הבאה למשפחה 🎉",
                    description: `קיבלת ${data.data?.tickets_issued} כרטיסי אימון`,
                    type: "success"
                });
                await refreshData(true);
                router.push("/dashboard");
            } else {
                throw new Error(data.message);
            }
        } catch (e: any) {
            toast({
                title: "שגיאה בתשלום",
                description: e.message || "אנא נסי שוב",
                type: "error"
            });
        } finally {
            setPurchasing(null);
        }
    };

    return (
        <div ref={containerRef} className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden relative" dir="rtl">

            {/* Animated Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                {/* Large gradient orbs */}
                <div className="floating-orb absolute -top-32 -right-32 w-[500px] h-[500px] bg-gradient-to-br from-[#E2F163]/15 to-transparent rounded-full blur-[120px]" />
                <div className="floating-orb absolute top-1/2 -left-48 w-[400px] h-[400px] bg-gradient-to-br from-pink-500/10 to-purple-600/10 rounded-full blur-[100px]" />
                <div className="floating-orb absolute -bottom-32 right-1/4 w-[350px] h-[350px] bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full blur-[80px]" />

                {/* Grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: '50px 50px'
                    }}
                />

                {/* Noise texture */}
                <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
                />
            </div>

            {/* Header */}
            <div ref={headerRef} className="relative z-10 pt-safe px-6 py-8">
                {/* Back button */}
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 mb-6 bg-white/5 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>

                <div className="text-center mb-2">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#E2F163]/10 border border-[#E2F163]/20 rounded-full mb-4">
                        <Sparkles className="w-4 h-4 text-[#E2F163]" />
                        <span className="text-sm font-bold text-[#E2F163]">מנויים חודשיים</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-black mb-3 leading-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/60">
                            בחרי את המסלול
                        </span>
                        <br />
                        <div className="relative inline-block">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E2F163] via-[#d4e450] to-[#E2F163] relative z-10">
                                שמתאים לך
                            </span>
                            {/* Hand-drawn Underline Animation */}
                            <svg className="absolute -bottom-3 left-0 w-full h-[20px] pointer-events-none z-0 overflow-visible" viewBox="0 0 100 20" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="underline-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#E2F163" />
                                        <stop offset="50%" stopColor="#22d3ee" /> {/* Cyan */}
                                        <stop offset="100%" stopColor="#ec4899" /> {/* Pink */}
                                    </linearGradient>
                                </defs>
                                <path
                                    className="underline-path"
                                    d="M4 14 C 20 24, 60 4, 96 14" // Hand-drawn S-curve
                                    fill="none"
                                    stroke="url(#underline-gradient)"
                                    strokeWidth="5"
                                    strokeLinecap="round"
                                    style={{ strokeDasharray: 200, strokeDashoffset: 200 }} // Initial state hidden
                                />
                            </svg>
                        </div>
                    </h1>

                    <p className="text-white/50 text-sm max-w-xs mx-auto">
                        כל המנויים כוללים גישה מלאה + ביטול חינם
                    </p>
                </div>
            </div>

            {/* Pricing Cards */}
            <div ref={cardsRef} className="relative z-10 px-4 pb-32 space-y-5">
                {TIERS.map((tier, index) => {
                    const Icon = tier.icon;
                    const isPopular = tier.popular;
                    const isSelected = selectedTier === tier.id;
                    const isPurchasing = purchasing === tier.id;

                    return (
                        <motion.div
                            key={tier.id}
                            className="tier-card"
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedTier(tier.id)}
                        >
                            <div
                                className={cn(
                                    "relative rounded-[2rem] p-[2px] transition-all duration-300 group",
                                    isPopular ? "bg-gradient-to-b from-[#E2F163] via-[#E2F163]/20 to-transparent" : "bg-gradient-to-b from-white/20 via-white/5 to-transparent",
                                    isSelected && !isPopular && "bg-gradient-to-b from-white via-white/20 to-transparent shadow-2xl"
                                )}
                                style={{
                                    boxShadow: isSelected || isPopular
                                        ? `0 0 40px -10px ${tier.color}50, 0 0 20px -5px ${tier.color}30`
                                        : '0 20px 40px -20px rgba(0,0,0,0.7)'
                                }}
                            >
                                {/* Popular badge */}
                                {isPopular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                                        <div className="px-4 py-1.5 bg-[#E2F163] rounded-full flex items-center gap-1.5 shadow-lg shadow-[#E2F163]/30">
                                            <Zap className="w-3.5 h-3.5 text-black" />
                                            <span className="text-xs font-black text-black tracking-wide">הכי פופולרי</span>
                                        </div>
                                    </div>
                                )}

                                {/* Card content */}
                                <div className={cn(
                                    "relative rounded-[1.9rem] bg-gradient-to-br overflow-hidden",
                                    tier.gradient,
                                    "backdrop-blur-xl bg-zinc-950/80"
                                )}>
                                    {/* Shine effect on hover/select */}
                                    <div
                                        className={cn(
                                            "absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full transition-transform duration-700",
                                            isSelected && "translate-x-full"
                                        )}
                                    />

                                    <div className="relative p-6">
                                        {/* Header row */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                                    style={{ backgroundColor: `${tier.color}20` }}
                                                >
                                                    <Icon className="w-6 h-6" style={{ color: tier.color }} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-white">{tier.displayName}</h3>
                                                </div>
                                            </div>

                                            {/* Price */}
                                            <div className="text-left">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-4xl font-black text-white">{tier.price}</span>
                                                    <span className="text-lg font-bold text-white/60">₪</span>
                                                </div>
                                                <p className="text-xs text-white/40">לחודש</p>
                                            </div>
                                        </div>

                                        {/* Sessions highlight */}
                                        <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
                                            <div className="flex items-center justify-between">
                                                <span className="text-white/70 text-sm font-medium">כרטיסי אימון</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl font-black" style={{ color: tier.color }}>{tier.sessions}</span>
                                                    <span className="text-white/40 text-sm">בחודש</span>
                                                </div>
                                            </div>
                                            <div className="mt-2 text-xs text-white/40">
                                                {Math.round(tier.pricePerSession)}₪ לאימון
                                            </div>
                                        </div>

                                        {/* Features */}
                                        <ul className="space-y-2.5 mb-5">
                                            {tier.features.map((feature, i) => (
                                                <li key={i} className="flex items-center gap-3">
                                                    <div
                                                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                                        style={{ backgroundColor: `${tier.color}20` }}
                                                    >
                                                        <Check className="w-3 h-3" style={{ color: tier.color }} />
                                                    </div>
                                                    <span className="text-sm text-white/80">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* CTA Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handlePurchase(tier.id);
                                            }}
                                            disabled={purchasing !== null}
                                            className={cn(
                                                "w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                                                isPopular
                                                    ? "bg-[#E2F163] text-black hover:bg-[#d4e450] shadow-lg shadow-[#E2F163]/20"
                                                    : "bg-white/10 text-white hover:bg-white/15 border border-white/10"
                                            )}
                                        >
                                            {isPurchasing ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <span>הצטרפי עכשיו</span>
                                                    <ArrowRight className="w-4 h-4 rotate-180" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}


                <div className="pt-8 flex items-center justify-center gap-6 text-white/40 text-xs font-medium">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-green-400" />
                        <span>תשלום מאובטח</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Unlock className="w-4 h-4 text-[#E2F163]" />
                        <span>ביטול בכל עת</span>
                    </div>
                </div>
            </div>

            {/* Bottom safe area padding */}
            <div className="h-safe" />
        </div>
    );
}
