"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { Check, Crown, Flame, Star, ChevronRight, Zap, Sparkles, ArrowRight, Loader2, Lock as LockIcon, CalendarX, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import gsap from "gsap";
import PaymentModal from "@/components/subscription/PaymentModal";

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
            "קדימות בהרשמה"
        ]
    }
];

export default function SubscriptionPage() {
    const router = useRouter();
    const { refreshData, profile } = useGymStore();
    const { toast } = useToast();

    // Default to '2' (Standard/Popular) so page starts populated
    const [selectedTierId, setSelectedTierId] = useState<number>(2);
    const [purchasing, setPurchasing] = useState<boolean>(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Get active tier object
    const activeTier = TIERS.find(t => t.id === selectedTierId);

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const carouselRef = useRef<HTMLDivElement>(null);

    // Scroll to initial central item
    useEffect(() => {
        if (carouselRef.current) {
            const container = carouselRef.current;
            const popularCard = container.children[1] as HTMLElement; // Index 1 is Standard (id 2)
            if (popularCard) {
                // Determine center position
                const scrollLeft = popularCard.offsetLeft - (container.clientWidth / 2) + (popularCard.clientWidth / 2);
                container.scrollTo({ left: scrollLeft, behavior: "instant" });
            }
        }
    }, []);

    // Handle Scroll for Auto-Selection
    const handleScroll = () => {
        if (!carouselRef.current) return;
        const container = carouselRef.current;
        const center = container.scrollLeft + (container.clientWidth / 2);

        // Find closest card to center
        let closestTierId = selectedTierId;
        let minDistance = Infinity;

        Array.from(container.children).forEach((child, index) => {
            const card = child as HTMLElement;
            const cardCenter = card.offsetLeft + (card.clientWidth / 2);
            const distance = Math.abs(center - cardCenter);

            if (distance < minDistance) {
                minDistance = distance;
                closestTierId = TIERS[index].id;
            }
        });

        if (closestTierId !== selectedTierId) {
            if (navigator.vibrate) navigator.vibrate(5);
            setSelectedTierId(closestTierId);
        }
    };

    // Entrance Animation
    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

            gsap.set(".entrance-item", { opacity: 0, y: 50 });
            gsap.set(".footer-action", { y: 100 });

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
                }, "-=0.5")
                .to(".footer-action", {
                    y: 0,
                    duration: 0.6,
                    ease: "back.out(1.2)"
                }, "-=0.5");

        }, containerRef);
        return () => ctx.revert();
    }, []);

    const handleBitRedirect = async () => {
        setIsPaymentModalOpen(false);
        setPurchasing(true);
        if (navigator.vibrate) navigator.vibrate([10, 50, 10]);

        const bitUrl = "https://www.bitpay.co.il/app/me/BE137CD7-0248-51EB-42FD-5E889D31DEB83A1E";
        window.open(bitUrl, '_blank');

        toast({
            title: "בקשת התשלום נפתחה ב-Bit 📱",
            description: "הכרטיסים יתעדכנו באפליקציה לאחר אישור ההעברה ע״י טליה.",
            type: "success"
        });

        setTimeout(() => {
            router.push("/dashboard");
        }, 1500);
    };

    return (
        <div ref={containerRef} className="h-[100dvh] bg-[#0A0A0A] text-white overflow-hidden relative flex flex-col space-y-0" dir="rtl">

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onConfirm={handleBitRedirect}
                tierName={activeTier?.englishName || ""}
                tierDisplay={activeTier?.displayName || ""}
                amount={activeTier?.price || 0}
                userName={profile?.full_name || "User"}
            />

            {/* --- REACTIVE BACKGROUND --- */}
            <div className="fixed inset-0 z-0 pointer-events-none">
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
                {/* Noise & Overlay */}
                <div className="absolute inset-0 opacity-[0.05] bg-[url('/noise.svg')] mix-blend-overlay" />
                <div className="absolute inset-0 bg-black/20" />
            </div>

            {/* --- HEADER (Fixed Top) --- */}
            <div className="relative z-10 flex-none pt-4 px-6 pb-2">
                <button
                    onClick={() => router.back()}
                    className="entrance-item w-10 h-10 mb-2 bg-white/5 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors active:scale-90"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>

                <div className="entrance-item">
                    <h1 className="text-4xl font-black mb-1 leading-tight">
                        <span className="block text-white/90">בחרי את המסלול</span>
                        <div className="relative inline-block mt-1">
                            <span
                                className="relative z-10 bg-clip-text text-transparent bg-gradient-to-r transition-all duration-500"
                                style={{
                                    backgroundImage: activeTier
                                        ? `linear-gradient(to right, ${activeTier.color}, #ffffff, ${activeTier.color})`
                                        : 'linear-gradient(to right, #ffffff, #aaaaaa)',
                                    backgroundSize: '200% auto'
                                }}
                            >
                                שמתאים לך
                            </span>
                            {/* Underline */}
                            <svg className="absolute -bottom-2 left-0 w-full h-[12px] pointer-events-none z-0 overflow-visible" viewBox="0 0 100 20" preserveAspectRatio="none">
                                <path
                                    className="underline-path"
                                    d="M4 14 C 20 24, 60 4, 96 14"
                                    fill="none"
                                    stroke={activeTier?.color || '#ffffff'}
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    style={{ strokeDasharray: 200, strokeDashoffset: 200, transition: 'stroke 0.5s ease' }}
                                />
                            </svg>
                        </div>
                    </h1>
                </div>
            </div>

            {/* --- HORIZONTAL CAROUSEL --- */}
            <div
                ref={carouselRef}
                onScroll={handleScroll}
                className="relative z-10 flex-1 flex items-center overflow-x-auto snap-x snap-mandatory px-[12.5vw] gap-6 scrollbar-hide pb-20"
            >
                {TIERS.map((tier) => {
                    const isSelected = selectedTierId === tier.id;
                    const Icon = tier.icon;

                    return (
                        <motion.div
                            key={tier.id}
                            layout
                            className={cn(
                                "entrance-item snap-center shrink-0 w-[75vw] max-w-[350px] aspect-[4/5] relative transition-all duration-500 ease-out",
                                isSelected ? "scale-100 opacity-100 z-20" : "scale-90 opacity-60 z-10 blur-[1px]"
                            )}
                            onClick={() => {
                                // Scroll to this card if clicked
                                const card = document.getElementById(`tier-card-${tier.id}`);
                                card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                            }}
                            id={`tier-card-${tier.id}`}
                        >
                            {/* Card Content Container */}
                            <div
                                className={cn(
                                    "h-full w-full rounded-[2.5rem] border overflow-hidden relative flex flex-col justify-between p-6 transition-all duration-300",
                                    isSelected
                                        ? "border-white/20 bg-white/5 shadow-2xl"
                                        : "border-white/5 bg-black/20"
                                )}
                                style={{ backdropFilter: 'blur(20px)' }}
                            >
                                {/* Popular Badge */}
                                {tier.popular && (
                                    <div className="absolute top-4 left-4">
                                        <div className="px-3 py-1 bg-[#E2F163] rounded-full flex items-center gap-1 shadow-lg shadow-[#E2F163]/30">
                                            <Zap className="w-3 h-3 text-black fill-black" />
                                            <span className="text-[10px] font-black text-black uppercase tracking-wider">פופולרי</span>
                                        </div>
                                    </div>
                                )}

                                {/* Card Header */}
                                <div className="mt-2">
                                    <div
                                        className={cn(
                                            "w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-all duration-300",
                                            isSelected ? "bg-white/10 text-white" : "bg-white/5 text-white/20"
                                        )}
                                        style={{ color: isSelected ? tier.color : undefined }}
                                    >
                                        <Icon className="w-7 h-7" />
                                    </div>
                                    <h3 className={cn("text-2xl font-bold mb-1", isSelected ? "text-white" : "text-white/60")}>
                                        {tier.displayName}
                                    </h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className={cn("text-5xl font-black tracking-tighter", isSelected ? "text-white" : "text-white/50")}>
                                            {tier.price}
                                        </span>
                                        <span className="text-xl text-white/40">₪</span>
                                    </div>
                                    <p className="text-sm text-white/30">לחודש</p>
                                </div>

                                {/* Features */}
                                <div className="space-y-3 mt-4 flex-1">
                                    <div className="h-px w-full bg-white/10 mb-4" />
                                    <ul className="space-y-3">
                                        {tier.features.slice(0, 4).map((feature, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: tier.color }} />
                                                <span className="text-sm text-white/80 leading-tight">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* --- FIXED FOOTER BUTTON --- */}
            {activeTier && (
                <motion.div
                    animate={{
                        y: isPaymentModalOpen ? 200 : 0, // Slide down if modal open
                        opacity: isPaymentModalOpen ? 0 : 1
                    }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 p-6 pt-0 pb-8 z-50 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/90 to-transparent"
                >
                    <motion.button
                        onClick={() => setIsPaymentModalOpen(true)}
                        disabled={purchasing}
                        animate={{
                            backgroundColor: activeTier.color,
                            color: activeTier.id === 1 ? 'white' : 'black',
                            boxShadow: `0 0 30px ${activeTier.color}30`
                        }}
                        transition={{ duration: 0.3 }}
                        className="w-full py-4 rounded-[1.2rem] font-black text-lg flex items-center justify-center gap-2 relative overflow-hidden group active:scale-95 transition-transform"
                    >
                        {purchasing ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <div className="flex items-center gap-2 relative z-10">
                                {/* Text Transition Container */}
                                <div className="relative h-7 overflow-hidden flex flex-col items-center">
                                    <AnimatePresence mode="popLayout" initial={false}>
                                        <motion.span
                                            key={activeTier.id}
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -20, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            className="block whitespace-nowrap tracking-tight"
                                        >
                                            רכישת מנוי {activeTier.displayName}
                                        </motion.span>
                                    </AnimatePresence>
                                </div>
                                <ArrowRight className={cn("w-5 h-5 rotate-180", activeTier.id === 1 ? "text-white" : "text-black")} />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    </motion.button>
                </motion.div>
            )}
        </div>
    );
}


