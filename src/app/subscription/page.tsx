"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { Check, Crown, Flame, Star, ChevronRight, Zap, Sparkles, ArrowRight, Loader2, Lock as LockIcon, CalendarX, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
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
        color: "#94a3b8", // Slate
        bgGradient: "radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)",
        accentGradient: "from-slate-400 to-slate-600",
        features: [
            "4 אימונים בחודש",
            "60₪ לאימון",
            "גישה לכל השיעורים",
            "ביטול חינם עד 10 שעות לפני האימון",
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
        color: "#E2F163", // Neon
        bgGradient: "radial-gradient(circle at 50% 50%, #1a1c05 0%, #000000 100%)",
        accentGradient: "from-[#E2F163] to-[#d4e450]",
        popular: true,
        discount: 6,
        features: [
            "8 אימונים בחודש",
            "56₪ לאימון — חיסכון של 6%",
            "גישה לכל השיעורים",
            "ביטול חינם עד 10 שעות לפני האימון",
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
        color: "#db2777", // Pink
        bgGradient: "radial-gradient(circle at 50% 50%, #290514 0%, #000000 100%)",
        accentGradient: "from-pink-500 to-rose-600",
        features: [
            "12 אימונים בחודש",
            "54₪ לאימון — חיסכון של 10%",
            "גישה לכל השיעורים",
            "ביטול חינם עד 10 שעות לפני האימון",
            "רכישת כרטיסים נוספים באותו מחיר",
        ]
    }
];

export default function SubscriptionPage() {
    const router = useRouter();
    const { refreshData } = useGymStore();
    const { toast } = useToast();

    // Default to 'standard' (id=2) active so the page starts with energy
    const [selectedTierId, setSelectedTierId] = useState<number>(2);
    const [purchasing, setPurchasing] = useState<number | null>(null);

    // Get active tier object
    const activeTier = TIERS.find(t => t.id === selectedTierId) || TIERS[1];

    // GSAP Refs for entrance
    const containerRef = useRef<HTMLDivElement>(null);

    // Entrance Animation
    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

            // Ensure initial visibility is hidden/offset
            gsap.set(".entrance-item", { opacity: 0, y: 50 });

            tl.to(".entrance-item", {
                opacity: 1,
                y: 0,
                duration: 0.8,
                stagger: 0.1,
                delay: 0.1
            })
                .to(".underline-path", {
                    strokeDashoffset: 0,
                    duration: 2.5,
                    ease: "power2.out"
                }, "-=0.5");
        }, containerRef);
        return () => ctx.revert();
    }, []);

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
        <div ref={containerRef} className="min-h-screen text-white overflow-x-hidden relative" dir="rtl">

            {/* --- OPTIMIZED REACTIVE BACKGROUND (Opacity Layers) --- */}
            <div className="fixed inset-0 z-0">
                {TIERS.map((tier) => (
                    <motion.div
                        key={tier.id}
                        className="absolute inset-0 transition-opacity duration-700 ease-in-out will-change-[opacity]"
                        style={{
                            background: tier.bgGradient,
                            opacity: selectedTierId === tier.id ? 1 : 0
                        }}
                        initial={false}
                    />
                ))}

                {/* Noise Overlay (Lighter) */}
                <div className="absolute inset-0 opacity-[0.05] bg-[url('/noise.svg')] mix-blend-overlay pointer-events-none" />
                <div className="absolute inset-0 bg-black/20 pointer-events-none" />
            </div>

            {/* --- CONTENT --- */}
            <div className="relative z-10 pb-40">

                {/* HEADER */}
                <div className="pt-4 px-6 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="entrance-item w-12 h-12 mb-4 bg-white/5 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors active:scale-90"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>

                    <div className="entrance-item">

                        <h1 className="text-5xl md:text-6xl font-black mb-4 leading-[1.1]">
                            <span className="block text-white/90">בחרי את המסלול</span>
                            <div className="relative inline-block mt-1">
                                <span
                                    className="relative z-10 bg-clip-text text-transparent bg-gradient-to-r"
                                    style={{
                                        backgroundImage: `linear-gradient(to right, ${activeTier.color}, #ffffff, ${activeTier.color})`,
                                        backgroundSize: '200% auto'
                                    }}
                                >
                                    שמתאים לך
                                </span>
                                {/* Hand-drawn Underline */}
                                <svg className="absolute -bottom-4 left-0 w-full h-[24px] pointer-events-none z-0 overflow-visible" viewBox="0 0 100 20" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="underline-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor={activeTier.color} />
                                            <stop offset="50%" stopColor="#ffffff" />
                                            <stop offset="100%" stopColor={activeTier.color} />
                                        </linearGradient>
                                    </defs>
                                    <path
                                        className="underline-path"
                                        d="M4 14 C 20 24, 60 4, 96 14"
                                        fill="none"
                                        stroke="url(#underline-gradient)"
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        style={{ strokeDasharray: 200, strokeDashoffset: 200 }}
                                    />
                                </svg>
                            </div>
                        </h1>
                        <p className="text-white/60 text-lg max-w-sm leading-relaxed">
                            הצטרפי לקהילה שלנו ותהני מאימונים ברמה הגבוהה ביותר
                        </p>
                    </div>
                </div>

                {/* TIERS STACK */}
                <div className="px-5 space-y-6">
                    {TIERS.map((tier) => {
                        const isSelected = selectedTierId === tier.id;
                        const isPurchasing = purchasing === tier.id;
                        const Icon = tier.icon;

                        return (
                            <motion.div
                                key={tier.id}
                                className="entrance-item relative pt-4" // Added pt-4 for badge space
                                onClick={() => setSelectedTierId(tier.id)}
                            >
                                {/* Popular Badge - positioned OUTSIDE the card to avoid clipping */}
                                {tier.popular && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
                                        <div className="px-4 py-1.5 bg-[#E2F163] rounded-full flex items-center gap-1.5 shadow-lg shadow-[#E2F163]/30">
                                            <Zap className="w-3 h-3 text-black fill-black" />
                                            <span className="text-[10px] font-black text-black uppercase tracking-wider">פופולרי</span>
                                        </div>
                                    </div>
                                )}

                                {/* Active Glow Behind Card */}
                                <div
                                    className={cn(
                                        "absolute -inset-1 top-3 rounded-[2.5rem] blur-xl transition-all duration-500",
                                        isSelected ? "opacity-40" : "opacity-0"
                                    )}
                                    style={{ backgroundColor: tier.color }}
                                />

                                {/* Card Body */}
                                <div
                                    className={cn(
                                        "relative overflow-hidden rounded-[2rem] border transition-all duration-300",
                                        isSelected
                                            ? "border-white/20 bg-white/5 shadow-2xl"
                                            : "border-white/5 bg-black/20"
                                    )}
                                    style={{
                                        backdropFilter: 'blur(12px)',
                                        transform: isSelected ? 'scale(1.02)' : 'scale(1)'
                                    }}
                                >

                                    <div className="p-8">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h3 className={cn("text-xl font-bold mb-1 transition-colors duration-300", isSelected ? "text-white" : "text-white/60")}>
                                                    {tier.displayName}
                                                </h3>
                                                <div className="flex items-baseline gap-1">
                                                    <span className={cn("text-4xl font-black tracking-tight", isSelected ? "text-white" : "text-white/50")}>
                                                        {tier.price}
                                                    </span>
                                                    <span className="text-lg text-white/40">₪</span>
                                                    <span className="text-sm text-white/30 mr-2">/ לחודש</span>
                                                </div>
                                            </div>
                                            <div
                                                className={cn(
                                                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500",
                                                    isSelected ? "bg-white/10 text-white scan-pulse" : "bg-white/5 text-white/20"
                                                )}
                                                style={{ color: isSelected ? tier.color : undefined }}
                                            >
                                                <Icon className="w-6 h-6" />
                                            </div>
                                        </div>

                                        {/* Collapsible Content */}
                                        {/* Collapsible Content - CSS Grid Transition */}
                                        <div
                                            className={cn(
                                                "grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[grid-template-rows]",
                                                isSelected ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                            )}
                                        >
                                            <div className="overflow-hidden">
                                                <div className="pt-6"> {/* Padding moved here to be part of the slide */}
                                                    <div className="h-px w-full bg-white/10 mb-6" />

                                                    <ul className="space-y-4 mb-8">
                                                        {tier.features.map((feature, i) => (
                                                            <li key={i} className="flex items-start gap-3">
                                                                <Check className="w-5 h-5 shrink-0" style={{ color: tier.color }} />
                                                                <span className="text-sm text-white/80 leading-tight">{feature}</span>
                                                            </li>
                                                        ))}
                                                    </ul>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePurchase(tier.id);
                                                        }}
                                                        disabled={isPurchasing}
                                                        className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 relative overflow-hidden group active:scale-95 transition-transform"
                                                        style={{
                                                            background: `linear-gradient(135deg, ${tier.color}, transparent)`,
                                                            backgroundColor: 'rgba(255,255,255,0.1)'
                                                        }}
                                                    >
                                                        {isPurchasing ? (
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <span className="relative z-10 text-white">הצטרפי ב-{tier.price}₪</span>
                                                                <ArrowRight className="w-5 h-5 text-white rotate-180" />
                                                            </>
                                                        )}
                                                        {/* Button sheen - no conflicting tailwind classes */}
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                                                    </button>
                                                    <p className="text-center text-xs text-white/30 mt-4">ללא התחייבות • ביטול בכל שלב</p>
                                                </div>
                                            </div>
                                        </div>

                                        {!isSelected && (
                                            <motion.div
                                                className="text-center mt-2"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.2 }}
                                            >
                                                <span className="text-xs font-medium text-white/30 uppercase tracking-widest">לחץ לפרטים</span>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* TRUST BADGES */}
                <div className="entrance-item mt-16 px-6 flex justify-center opacity-60">
                    <div className="flex flex-col items-center gap-2 p-4 text-center">
                        <LockIcon className="w-6 h-6 text-emerald-400 mb-1" />
                        <span className="text-xs font-bold text-white/90">תשלום מאובטח</span>
                        <span className="text-[10px] text-white/40">SSL Encrypted</span>
                    </div>
                </div>

            </div>
        </div>
    );
}


