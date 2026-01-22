"use client";

import { useEffect, useState, useRef } from "react";
import { Check, Star, Zap, Crown, Plus, Minus, Loader2, Ticket, Sparkles, Flame, ShieldCheck, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate } from "framer-motion";

type SubscriptionTier = {
    id: number;
    name: string;
    display_name: string;
    sessions: number;
    price_nis: number;
    price_per_session: number;
};

// --- PRE-DEFINED DATA FOR INSTANT LOAD ---
const DEFAULT_TIERS = [
    {
        id: 3,
        name: "premium",
        display_name: "חבילת VIP",
        sessions: 12,
        price_nis: 650,
        price_per_session: 54.16
    },
    {
        id: 2,
        name: "standard",
        display_name: "חבילה סטנדרטית",
        sessions: 8,
        price_nis: 450,
        price_per_session: 56.25
    },
    {
        id: 1,
        name: "basic",
        display_name: "חבילה בסיסית",
        sessions: 4,
        price_nis: 240,
        price_per_session: 60
    }
];

// Configuration
const tierConfig: Record<string, { icon: React.ElementType, color: string, gradient: string, glow: string }> = {
    basic: {
        icon: Star,
        color: "text-blue-400",
        gradient: "from-blue-500/20 to-cyan-500/5",
        glow: "shadow-blue-500/30"
    },
    standard: {
        icon: Flame,
        color: "text-[#E2F163]",
        gradient: "from-[#E2F163]/20 to-yellow-500/5",
        glow: "shadow-[#E2F163]/30"
    },
    premium: {
        icon: Crown,
        color: "text-pink-400",
        gradient: "from-pink-500/20 to-purple-600/5",
        glow: "shadow-pink-500/50"
    },
};

// --- COMPONENTS ---

function TierCard({ tier, currentSubscription, onPurchase, purchasing, index }: any) {
    const config = tierConfig[tier.name] || tierConfig.basic;
    const Icon = config.icon;
    const isPremium = tier.name === "premium";
    const isStandard = tier.name === "standard";
    const isCurrentTier = currentSubscription?.tier_name === tier.name;

    // 3D Tilt Effect
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

    function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        const { left, top, width, height } = currentTarget.getBoundingClientRect();
        x.set((clientX - left) / width - 0.5);
        y.set((clientY - top) / height - 0.5);
    }

    // Continuous Floating Animation
    const floatingVariants = {
        float: {
            y: [0, -15, 0],
            rotate: [0, 0.5, 0],
            transition: {
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 2 // Stagger the floating
            } as any
        }
    };

    return (
        <motion.div
            variants={floatingVariants}
            animate="float"
            onMouseMove={onMouseMove}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            style={{
                rotateX: useTransform(mouseY, [-0.5, 0.5], [7, -7]),
                rotateY: useTransform(mouseX, [-0.5, 0.5], [-7, 7]),
            }}
            className="perspective-1000 group relative z-10"
        >
            {/* Glow Behind */}
            <div className={cn(
                "absolute inset-4 rounded-[2.5rem] blur-[60px] transition-opacity duration-500 opacity-40 group-hover:opacity-80",
                isPremium ? "bg-pink-600/30" : isStandard ? "bg-[#E2F163]/20" : "bg-blue-600/20"
            )} />

            {/* Badge - Moved Outside */}
            {(isPremium || isStandard) && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-4 z-30">
                    <span className={cn(
                        "px-4 py-1 rounded-b-xl text-[10px] font-black uppercase tracking-widest shadow-lg border-t-0 border border-white/10",
                        isPremium ? "bg-pink-600 text-white" : "bg-[#E2F163] text-black"
                    )}>
                        {isPremium ? "הכי משתלם" : "פופולרי"}
                    </span>
                </div>
            )}

            {/* Main Card Structure */}
            <div
                className={cn(
                    "relative h-full bg-[#111] rounded-[2.5rem] border backdrop-blur-xl transition-colors duration-300 overflow-hidden",
                    isPremium ? "border-pink-500/30 group-hover:border-pink-500/60" :
                        isStandard ? "border-[#E2F163]/30 group-hover:border-[#E2F163]/60" :
                            "border-white/10 group-hover:border-white/20"
                )}
            >
                {/* Gradient background */}
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700",
                    config.gradient
                )} />

                {/* Noise texture overlay */}
                <div
                    className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                    }}
                />

                <div className="p-8 relative z-20 flex flex-col h-full">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            className={cn(
                                "w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-4 shadow-2xl border border-white/10",
                                isPremium ? "bg-gradient-to-br from-pink-500 to-purple-600" :
                                    isStandard ? "bg-[#E2F163] text-black" :
                                        "bg-[#222]"
                            )}
                        >
                            <Icon className={cn("w-9 h-9", isStandard ? "text-black" : "text-white")} />
                        </motion.div>

                        <h3 className={cn("text-2xl font-black mb-1", isPremium ? "text-pink-400" : isStandard ? "text-[#E2F163]" : "text-white")}>
                            {tier.display_name}
                        </h3>

                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-6xl font-black tracking-tighter text-white">{tier.price_nis}</span>
                            <span className="text-xl text-slate-500 font-bold">₪</span>
                        </div>
                        <p className="text-sm text-slate-500 font-medium mt-2">
                            {Math.round(tier.price_per_session)}₪ לאימון
                        </p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-4 mb-8 flex-1">
                        {[
                            { text: `${tier.sessions} כרטיסי כניסה`, highlight: true },
                            { text: "גישה חופשית לכל האימונים" },
                            ...(tier.name !== 'basic' ? [{ text: "רכישת כרטיסים נוספים בהנחה" }] : []),
                            ...(isPremium ? [{ text: "קדימות ברישום לאימונים", premium: true }] : [])
                        ].map((feature, i) => (
                            <li key={i} className="flex items-center gap-3">
                                <div className={cn(
                                    "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                                    feature.premium ? "bg-pink-500/20 text-pink-500" :
                                        isStandard ? "bg-[#E2F163]/20 text-[#E2F163]" :
                                            "bg-white/10 text-slate-400"
                                )}>
                                    <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                                <span className={cn(
                                    "text-sm font-medium",
                                    feature.highlight ? "text-white" : "text-slate-400"
                                )}>
                                    {feature.text}
                                </span>
                            </li>
                        ))}
                    </ul>

                    {/* Action Button */}
                    <Button
                        onClick={() => onPurchase(tier.id)}
                        disabled={purchasing !== null}
                        className={cn(
                            "w-full h-14 rounded-2xl font-bold text-base transition-all duration-300 relative overflow-hidden group/btn hover:scale-[1.02] active:scale-[0.98]",
                            isPremium
                                ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]"
                                : isStandard
                                    ? "bg-[#E2F163] text-black shadow-[0_0_20px_rgba(226,241,99,0.2)] hover:shadow-[0_0_30px_rgba(226,241,99,0.4)]"
                                    : "bg-white/10 text-white hover:bg-white/20"
                        )}
                    >
                        {/* Continuous Shimmer */}
                        {(isPremium || isStandard) && (
                            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />
                        )}

                        <span className="relative z-20 flex items-center gap-2">
                            {purchasing === tier.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : isCurrentTier ? (
                                <>
                                    <ShieldCheck className="w-5 h-5" />
                                    חידוש מנוי
                                </>
                            ) : (
                                <>
                                    רכישה מהירה
                                    <ArrowUpRight className="w-4 h-4 opacity-50 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                </>
                            )}
                        </span>
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}

export default function SubscriptionPage() {
    const { refreshData } = useGymStore();
    const { toast } = useToast();
    const router = useRouter();

    // Use default tiers initially for INSTANT load
    const [tiers, setTiers] = useState<SubscriptionTier[]>(DEFAULT_TIERS);

    // We don't need a blocking loading state!
    const [purchasing, setPurchasing] = useState<number | null>(null);
    const [additionalQuantity, setAdditionalQuantity] = useState(1);
    const [purchasingAdditional, setPurchasingAdditional] = useState(false);

    // Current user subscription
    const [currentSubscription, setCurrentSubscription] = useState<{
        tier_name: string;
        tier_display_name: string;
        expires_at: string;
        is_active: boolean;
    } | null>(null);
    const [availableTickets, setAvailableTickets] = useState(0);

    useEffect(() => {
        // Fetch fresh data in background
        const load = async () => {
            try {
                const res = await fetch("/api/payment/mock");
                const data = await res.json();
                if (data.success) {
                    setTiers(data.tiers);
                }
            } catch (e) {
                // S ilently fail to defaults
            }
            await fetchUserSubscription();
        };
        load();
    }, []);

    const fetchUserSubscription = async () => {
        try {
            const { getSupabaseClient } = await import("@/lib/supabaseClient");
            const supabase = getSupabaseClient(); // Assuming synchronous or fast enough
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: subData } = await supabase.rpc("get_user_subscription", { p_user_id: user.id });
            if (subData && subData.is_active) setCurrentSubscription(subData);

            const { data: ticketCount } = await supabase.rpc("get_available_tickets", { p_user_id: user.id });
            if (ticketCount !== null) setAvailableTickets(ticketCount);

        } catch (error) {
            console.error(error);
        }
    };

    const handlePurchaseSubscription = async (tierId: number) => {
        setPurchasing(tierId);
        try {
            const res = await fetch("/api/payment/mock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "subscription", tierId }),
            });
            const data = await res.json();

            if (data.success) {
                toast({ title: "מנוי הופעל! 🎉", description: `קיבלת ${data.data?.tickets_issued} כרטיסים`, type: "success" });
                await refreshData(true);
                await fetchUserSubscription();
            } else {
                toast({ title: "שגיאה", description: data.message, type: "error" });
            }
        } catch {
            toast({ title: "שגיאה", description: "נסה שוב", type: "error" });
        } finally {
            setPurchasing(null);
        }
    };

    const handlePurchaseAdditional = async () => {
        setPurchasingAdditional(true);
        try {
            const res = await fetch("/api/payment/mock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "additional_tickets", quantity: additionalQuantity }),
            });
            const data = await res.json();

            if (data.success) {
                toast({ title: "בוצע!", description: "כרטיסים נוספו", type: "success" });
                await refreshData(true);
                await fetchUserSubscription();
                setAdditionalQuantity(1);
            }
        } catch {
            toast({ title: "שגיאה", description: "נסה שוב", type: "error" });
        } finally {
            setPurchasingAdditional(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#050505] overflow-x-hidden text-slate-200" dir="rtl">

            {/* Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 blur-[130px] rounded-full opacity-50 animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#E2F163]/10 blur-[130px] rounded-full opacity-40 animate-pulse" style={{ animationDelay: "1s" }} />
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                    }}
                />
            </div>

            <div className="relative z-10 container mx-auto px-4 py-20 pb-32">

                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-24">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 py-2 px-6 rounded-full bg-white/5 border border-white/10 text-xs font-bold tracking-widest uppercase mb-8 text-[#E2F163]"
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>חבילות פרימיום</span>
                    </motion.div>

                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-4 leading-[1.1] relative inline-block">
                        השקיעי ב
                        <span className="relative inline-block mx-4">
                            <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-[#E2F163] via-green-400 to-[#E2F163] animate-gradient-x">
                                עצמך
                            </span>
                            {/* SVG Handwriting Underline */}
                            <svg className="absolute w-full h-4 -bottom-2 left-0 pointer-events-none" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <motion.path
                                    d="M 0 5 Q 50 10 100 5"
                                    fill="transparent"
                                    stroke="#E2F163"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                                />
                            </svg>
                        </span>
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-400 font-light mt-6">
                        בחרי את המסלול שלך. <span className="text-white font-medium">חסכי עד 10%</span> ב-VIP.
                    </p>
                </div>

                {/* Grid - Added generous padding to avoid clipping */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-7xl mx-auto px-4 perspective-1000">
                    {tiers.map((tier, index) => (
                        <TierCard
                            key={tier.id}
                            tier={tier}
                            currentSubscription={currentSubscription}
                            onPurchase={handlePurchaseSubscription}
                            purchasing={purchasing}
                            index={index}
                        />
                    ))}
                </div>

                {/* Additional Tickets */}
                <AnimatePresence>
                    {currentSubscription?.is_active && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            className="max-w-xl mx-auto mt-32"
                        >
                            <div className="bg-[#111] border border-white/10 rounded-[2rem] p-8 text-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-[#E2F163]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-bold text-white mb-2">צריכה עוד?</h3>
                                    <div className="flex items-center justify-center gap-6 my-6">
                                        <button onClick={() => setAdditionalQuantity(Math.max(1, additionalQuantity - 1))} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><Minus className="w-4 h-4" /></button>
                                        <span className="text-3xl font-black">{additionalQuantity}</span>
                                        <button onClick={() => setAdditionalQuantity(additionalQuantity + 1)} className="w-10 h-10 rounded-full bg-[#E2F163] text-black flex items-center justify-center hover:bg-[#d4e450]"><Plus className="w-4 h-4" /></button>
                                    </div>
                                    <Button onClick={handlePurchaseAdditional} disabled={purchasingAdditional} className="w-full h-12 rounded-xl bg-white text-black font-bold hover:bg-gray-200">
                                        {purchasingAdditional ? <Loader2 className="animate-spin" /> : "רכישה"}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

        </div>
    );
}
