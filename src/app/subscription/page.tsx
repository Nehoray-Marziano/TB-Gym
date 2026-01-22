"use client";

import { useEffect, useState, useRef } from "react";
import { Check, Crown, Flame, Star, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import gsap from "gsap";

// --- CONFIGURATION ---
const DEFAULT_TIERS = [
    {
        id: 1,
        name: "basic",
        display_name: "BASIC",
        sessions: 4,
        price_nis: 240,
        price_per_session: 60,
        gradient: "from-slate-800 to-slate-900",
        accent: "#94a3b8",
        icon: Star
    },
    {
        id: 2,
        name: "standard",
        display_name: "STANDARD",
        sessions: 8,
        price_nis: 450,
        price_per_session: 56.25,
        gradient: "from-[#E2F163]/20 to-[#E2F163]/5",
        accent: "#E2F163",
        icon: Flame
    },
    {
        id: 3,
        name: "premium",
        display_name: "PREMIUM VIP",
        sessions: 12,
        price_nis: 650,
        price_per_session: 54.16,
        gradient: "from-pink-600/30 to-purple-800/20",
        accent: "#ec4899",
        icon: Crown
    }
];

export default function SubscriptionPage() {
    const { refreshData } = useGymStore();
    const { toast } = useToast();
    const [activeIndex, setActiveIndex] = useState(1); // Start at Standard (middle)
    const [direction, setDirection] = useState(0);
    const [purchasing, setPurchasing] = useState<number | null>(null);

    // Refs for GSAP
    const containerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);

    // --- GSAP ENTRANCE ---
    useEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline();

            tl.from(titleRef.current, {
                y: -50,
                opacity: 0,
                duration: 1,
                ease: "power4.out"
            })
                .from(".tier-card", {
                    y: 100,
                    opacity: 0,
                    duration: 0.8,
                    stagger: 0.1,
                    ease: "back.out(1.7)"
                }, "-=0.5");

        }, containerRef);

        return () => ctx.revert();
    }, []);

    // --- LOGIC ---
    const handlePurchase = async (tierId: number) => {
        setPurchasing(tierId);
        try {
            // Optimistic delay simulation for feel
            await new Promise(r => setTimeout(r, 800));

            const res = await fetch("/api/payment/mock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "subscription", tierId }),
            });
            const data = await res.json();
            if (data.success) {
                toast({ title: "Welcome to the Elite.", description: `You have ${data.data?.tickets_issued} sessions.`, type: "success" });
                refreshData(true);
            }
        } catch (e) {
            toast({ title: "Error", description: "Payment failed", type: "error" });
        } finally {
            setPurchasing(null);
        }
    };

    const nextTier = () => {
        if (activeIndex < DEFAULT_TIERS.length - 1) {
            setDirection(1);
            setActiveIndex(prev => prev + 1);
            triggerHaptic();
        }
    };

    const prevTier = () => {
        if (activeIndex > 0) {
            setDirection(-1);
            setActiveIndex(prev => prev - 1);
            triggerHaptic();
        }
    };

    const handleDragEnd = (event: any, info: PanInfo) => {
        if (info.offset.x < -50) {
            nextTier();
        } else if (info.offset.x > 50) {
            prevTier();
        }
    };

    const triggerHaptic = () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
        }
    };

    const activeTier = DEFAULT_TIERS[activeIndex];

    return (
        <div ref={containerRef} className="h-screen w-full bg-[#050505] text-white overflow-hidden flex flex-col relative font-sans select-none" dir="ltr">

            {/* Cinematic Background */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-slate-800/20 to-transparent blur-[100px]" />
                {/* Dynamic Accent Background based on active tier */}
                <motion.div
                    animate={{ backgroundColor: activeTier.accent }}
                    transition={{ duration: 0.8 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] blur-[150px] opacity-20 rounded-full"
                />

                {/* Noise */}
                <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
            </div>

            {/* Header */}
            <div className="pt-8 px-6 z-10 flex justify-between items-center">
                <div>
                    <h2 className="text-slate-500 text-xs font-bold tracking-[0.2em] uppercase">Choose your path</h2>
                    <h1 ref={titleRef} className="text-4xl font-black italic tracking-tighter mt-1">
                        UNLEASH
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">POTENTIAL</span>
                    </h1>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <span className="font-bold text-[#E2F163]">{activeIndex + 1}/{DEFAULT_TIERS.length}</span>
                </div>
            </div>

            {/* 3D Carousel Stage */}
            <div className="flex-1 relative flex items-center justify-center z-10 perspective-1000">
                <div className="relative w-full max-w-sm h-[60vh]">
                    <AnimatePresence initial={false} custom={direction}>
                        {DEFAULT_TIERS.map((tier, index) => {
                            // Calculate offset from active
                            const offset = index - activeIndex;
                            const isActive = offset === 0;
                            const isVisible = Math.abs(offset) <= 1; // Only show neighbors

                            if (!isVisible) return null;

                            return (
                                <motion.div
                                    key={tier.id}
                                    className={cn(
                                        "tier-card absolute inset-0 rounded-[2.5rem] border border-white/10 p-1 bg-[#111] shadow-2xl origin-bottom",
                                        isActive ? "z-20" : "z-10"
                                    )}

                                    // Drag Gestures
                                    drag={isActive ? "x" : false}
                                    dragConstraints={{ left: 0, right: 0 }}
                                    dragElastic={0.2}
                                    onDragEnd={handleDragEnd}

                                    // Animation Variants
                                    initial={{
                                        scale: 0.8,
                                        opacity: 0,
                                        x: offset * 300,
                                        rotateY: offset * -45
                                    }}
                                    animate={{
                                        scale: isActive ? 1 : 0.85,
                                        opacity: isActive ? 1 : 0.4,
                                        x: offset * (typeof window !== 'undefined' && window.innerWidth < 640 ? 340 : 400), // Spacing
                                        rotateY: offset * -25,
                                        zIndex: isActive ? 20 : 10,
                                        transition: { type: "spring", stiffness: 300, damping: 30 }
                                    }}
                                    exit={{
                                        scale: 0.8,
                                        opacity: 0,
                                        x: offset < 0 ? -300 : 300
                                    }}
                                >
                                    <div className={cn(
                                        "h-full w-full rounded-[2.3rem] overflow-hidden relative flex flex-col p-8 bg-gradient-to-b",
                                        tier.gradient
                                    )}>
                                        {/* Tier Header */}
                                        <div className="flex items-center justify-between mb-8">
                                            <tier.icon className="w-8 h-8 text-white" />
                                            {tier.name === "premium" && (
                                                <span className="px-3 py-1 bg-[#E2F163] text-black text-[10px] font-black uppercase rounded-full tracking-wider">
                                                    Best Value
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-2">{tier.display_name}</h3>

                                        <div className="flex items-baseline gap-1 mb-8">
                                            <span className="text-6xl font-black tracking-tighter">{tier.price_nis}</span>
                                            <span className="text-xl font-bold opacity-60">₪</span>
                                        </div>

                                        {/* Features List */}
                                        <ul className="space-y-4 mb-auto">
                                            {[
                                                { text: `${tier.sessions} TRAININGS`, bold: true },
                                                { text: "FULL ACCESS" },
                                                { text: "FREE CANCELLATION" }
                                            ].map((feat, i) => (
                                                <li key={i} className="flex items-center gap-3 text-sm">
                                                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                                                        <Check className="w-3 h-3" />
                                                    </div>
                                                    <span className={feat.bold ? "font-bold text-white" : "text-slate-300"}>{feat.text}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="pt-6 border-t border-white/10">
                                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest opacity-60 mb-2">
                                                <span>Price / Session</span>
                                                <span>{Math.round(tier.price_per_session)}₪</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 pb-12 z-20 bg-gradient-to-t from-black via-black/80 to-transparent">
                <div className="flex items-center justify-center gap-8 mb-6 md:hidden">
                    <button onClick={prevTier} className="p-3 rounded-full bg-white/5 disabled:opacity-30">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <span className="text-xs font-bold tracking-widest opacity-50">SWIPE</span>
                    <button onClick={nextTier} className="p-3 rounded-full bg-white/5 disabled:opacity-30">
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>

                <Button
                    onClick={() => handlePurchase(activeTier.id)}
                    className={cn(
                        "w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95",
                        "bg-[#E2F163] text-black hover:bg-[#d4e450]"
                    )}
                    disabled={purchasing !== null}
                >
                    {purchasing ? <Loader2 className="animate-spin" /> : `GET ${activeTier.name}`}
                </Button>
            </div>

            {/* Desktop Warning (Visible only on large screens) */}
            <div className="hidden lg:flex absolute top-4 right-4 items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-md">
                <span className="text-xs font-bold">MOBILE MODE ACTIVE</span>
            </div>
        </div>
    );
}
