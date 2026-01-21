"use client";

import { useEffect, useState } from "react";
import { Check, Star, Zap, Crown, Plus, Minus, Loader2, Ticket, Clock, Sparkles, Flame, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type SubscriptionTier = {
    id: number;
    name: string;
    display_name: string;
    sessions: number;
    price_nis: number;
    price_per_session: number;
};

// Updated icons and colors for more pop
const tierConfig: Record<string, { icon: React.ElementType, color: string, gradient: string, glow: string }> = {
    basic: {
        icon: Star,
        color: "text-blue-400",
        gradient: "from-blue-500/10 to-transparent",
        glow: "shadow-blue-500/20"
    },
    standard: {
        icon: Flame,
        color: "text-[#E2F163]",
        gradient: "from-[#E2F163]/10 to-transparent",
        glow: "shadow-[#E2F163]/20"
    },
    premium: {
        icon: Crown,
        color: "text-pink-400",
        gradient: "from-pink-500/10 to-purple-500/10",
        glow: "shadow-pink-500/40"
    },
};

export default function SubscriptionPage() {
    const { refreshData } = useGymStore();
    const { toast } = useToast();
    const router = useRouter();

    const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<number | null>(null);
    const [additionalQuantity, setAdditionalQuantity] = useState(1);
    const [purchasingAdditional, setPurchasingAdditional] = useState(false);
    const [hoveredTier, setHoveredTier] = useState<number | null>(null);

    // Current user subscription state
    const [currentSubscription, setCurrentSubscription] = useState<{
        tier_name: string;
        tier_display_name: string;
        expires_at: string;
        is_active: boolean;
    } | null>(null);
    const [availableTickets, setAvailableTickets] = useState(0);

    useEffect(() => {
        const load = async () => {
            await Promise.all([fetchTiers(), fetchUserSubscription()]);
        };
        load();
    }, []);

    const fetchTiers = async () => {
        try {
            const res = await fetch("/api/payment/mock");
            const data = await res.json();
            if (data.success) {
                // Manually force the price update if client-side fallback is stale
                const updatedTiers = data.tiers.map((t: any) =>
                    t.name === 'premium' ? { ...t, price_nis: 650, price_per_session: 650 / 12 } : t
                );
                setTiers(updatedTiers);
            }
        } catch (error) {
            console.error("Error fetching tiers:", error);
        } finally {
            // Only set loading to false for tiers, user sub is partly parallel but critical for showing "Renew" vs "Buy"
            setLoading(false);
        }
    };

    const fetchUserSubscription = async () => {
        try {
            const { getSupabaseClient } = await import("@/lib/supabaseClient");
            const supabase = getSupabaseClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Try to get subscription info
            try {
                const { data: subData, error: subError } = await supabase.rpc("get_user_subscription", { p_user_id: user.id });
                if (!subError && subData && subData.is_active) setCurrentSubscription(subData);
            } catch (e) {
                console.log("RPC not available yet");
            }

            // Try to get available tickets
            try {
                const { data: ticketCount, error: ticketError } = await supabase.rpc("get_available_tickets", { p_user_id: user.id });
                if (!ticketError && ticketCount !== null) setAvailableTickets(ticketCount);
            } catch (e) {
                console.log("RPC not available yet");
            }
        } catch (error) {
            console.error("Error fetching subscription:", error);
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
                toast({
                    title: "מנוי הופעל! 🎉",
                    description: `קיבלת ${data.data?.tickets_issued || 0} כרטיסים`,
                    type: "success",
                });
                await refreshData(true);
                await fetchUserSubscription();
            } else {
                toast({ title: "שגיאה ברכישה", description: data.message, type: "error" });
            }
        } catch (error) {
            toast({ title: "שגיאה", description: "משהו השתבש, נסי שוב", type: "error" });
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
                toast({
                    title: "כרטיסים נוספו! 🎉",
                    description: `${additionalQuantity} כרטיסים נוספו לחשבונך`,
                    type: "success",
                });
                await refreshData(true);
                await fetchUserSubscription();
                setAdditionalQuantity(1);
            } else {
                toast({ title: "שגיאה ברכישה", description: data.message, type: "error" });
            }
        } catch (error) {
            toast({ title: "שגיאה", description: "משהו השתבש, נסי שוב", type: "error" });
        } finally {
            setPurchasingAdditional(false);
        }
    };

    const getCurrentTierPricePerSession = () => {
        if (!currentSubscription) return 60;
        const tier = tiers.find(t => t.name === currentSubscription.tier_name);
        return tier?.price_per_session || 60;
    };

    const formatExpiryDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long" }).format(date);
    };

    return (
        <div className="min-h-screen w-full bg-black py-10 px-4 sm:px-6 lg:px-8 overflow-x-hidden pb-32 text-slate-200 relative" dir="rtl">

            {/* Ambient Background Effects - Optimized */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-900/20 blur-[120px] rounded-full opacity-50 will-change-transform translate-x-1/2"
                />
                <div
                    className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#E2F163]/10 blur-[120px] rounded-full opacity-30 will-change-transform translate-y-1/2"
                />
            </div>

            {/* Header - Always visible for fast LCP */}
            <div className="relative z-10 text-center max-w-3xl mx-auto mb-16 pt-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-2 py-1.5 px-5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-xs font-bold tracking-widest uppercase mb-8 text-[#E2F163] shadow-[0_0_15px_rgba(226,241,99,0.15)]"
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>חבילות אימון</span>
                </motion.div>

                <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6 leading-[1.1]">
                    השקיעי ב
                    <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#E2F163] to-green-400">עצמך</span>
                </h1>

                <p className="text-xl text-slate-400 max-w-xl mx-auto leading-relaxed font-light">
                    בחרי את המסלול שמתאים לך.
                    <br />
                    <span className="text-white font-medium">חסכי עד 10%</span> בכל אימון עם חבילת ה-VIP.
                </p>
            </div>

            {loading ? (
                /* Skeleton Loader */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-7xl mx-auto mb-24 relative z-10">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-[600px] rounded-[2.5rem] bg-white/5 border border-white/5 animate-pulse flex flex-col p-8">
                            <div className="w-16 h-16 bg-white/10 rounded-2xl mx-auto mb-6" />
                            <div className="h-4 w-32 bg-white/10 mx-auto rounded mb-4" />
                            <div className="h-12 w-24 bg-white/10 mx-auto rounded mb-8" />
                            <div className="space-y-4 flex-1">
                                <div className="h-4 w-full bg-white/5 rounded" />
                                <div className="h-4 w-3/4 bg-white/5 rounded" />
                                <div className="h-4 w-5/6 bg-white/5 rounded" />
                            </div>
                            <div className="h-14 w-full bg-white/10 rounded-2xl mt-8" />
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    {/* Current Subscription Grid */}
                    <AnimatePresence>
                        {currentSubscription?.is_active && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="max-w-4xl mx-auto mb-16 relative z-10"
                            >
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-1 overflow-hidden">
                                    <div className="bg-black/40 rounded-[1.8rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                                        <div className="flex items-center gap-6">
                                            <div className="w-20 h-20 bg-gradient-to-br from-[#E2F163] to-green-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(226,241,99,0.2)]">
                                                <Ticket className="w-10 h-10 text-black fill-black/10" />
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-[#E2F163] font-bold tracking-wide uppercase mb-1">המנוי הפעיל שלך</p>
                                                <h3 className="text-3xl font-black text-white tracking-tight">{currentSubscription.tier_display_name}</h3>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 md:gap-8 w-full md:w-auto">
                                            <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/10 text-center min-w-[120px]">
                                                <div className="text-4xl font-black text-white mb-1 tabular-nums">{availableTickets}</div>
                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">כרטיסים</div>
                                            </div>
                                            <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/10 text-center min-w-[120px]">
                                                <div className="text-sm font-bold text-white mb-1 h-[40px] flex items-center justify-center">
                                                    {formatExpiryDate(currentSubscription.expires_at)}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">בתוקף עד</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Pricing Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-7xl mx-auto items-stretch mb-24 relative z-10">
                        {tiers.map((tier, index) => {
                            const config = tierConfig[tier.name] || tierConfig.basic;
                            const Icon = config.icon;
                            const isPremium = tier.name === "premium";
                            const isStandard = tier.name === "standard";
                            const isCurrentTier = currentSubscription?.tier_name === tier.name;
                            const isHovered = hoveredTier === tier.id;

                            return (
                                <motion.div
                                    key={tier.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    onMouseEnter={() => setHoveredTier(tier.id)}
                                    onMouseLeave={() => setHoveredTier(null)}
                                    className={cn(
                                        "relative flex flex-col p-1 rounded-[2.5rem] transition-all duration-300",
                                        isHovered ? "scale-[1.02]" : "scale-100"
                                    )}
                                >
                                    {/* Card Glow Effect */}
                                    {isPremium && (
                                        <div className={cn(
                                            "absolute inset-0 bg-gradient-to-b from-pink-600 to-purple-800 rounded-[2.5rem] blur-xl transition-opacity duration-500",
                                            isHovered ? "opacity-40" : "opacity-20"
                                        )} />
                                    )}
                                    {isStandard && (
                                        <div className={cn(
                                            "absolute inset-0 bg-[#E2F163] rounded-[2.5rem] blur-xl transition-opacity duration-500",
                                            isHovered ? "opacity-30" : "opacity-0"
                                        )} />
                                    )}

                                    {/* Main Card Content */}
                                    <div className={cn(
                                        "flex-1 flex flex-col bg-[#0A0A0A] rounded-[2.3rem] p-8 border relative overflow-hidden h-full z-10",
                                        isPremium ? "border-pink-500/30" : isStandard ? "border-[#E2F163]/30" : "border-white/5"
                                    )}>
                                        {/* Gradient Overlay */}
                                        <div className={cn(
                                            "absolute inset-0 bg-gradient-to-b opacity-0 transition-opacity duration-300 pointer-events-none",
                                            config.gradient,
                                            isHovered && "opacity-100"
                                        )} />

                                        {/* Badges */}
                                        {isPremium && (
                                            <div className="absolute top-0 right-0 left-0 flex justify-center -mt-3.5">
                                                <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-[0_0_20px_rgba(236,72,153,0.4)] flex items-center gap-2">
                                                    <Crown className="w-3.5 h-3.5 fill-white" />
                                                    הכי משתלם
                                                </div>
                                            </div>
                                        )}
                                        {isStandard && (
                                            <div className="absolute top-0 right-0 left-0 flex justify-center -mt-3.5">
                                                <div className="bg-[#E2F163] text-black text-xs font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-[0_0_20px_rgba(226,241,99,0.3)] flex items-center gap-2">
                                                    <Zap className="w-3.5 h-3.5 fill-black" />
                                                    פופולרי
                                                </div>
                                            </div>
                                        )}

                                        {/* Card Header */}
                                        <div className="mb-8 pt-4 text-center relative z-10">
                                            <div className={cn(
                                                "w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 shadow-2xl",
                                                isPremium ? "bg-gradient-to-br from-pink-500 to-purple-600 text-white" :
                                                    isStandard ? "bg-[#E2F163] text-black" : "bg-white/5 text-slate-400 border border-white/5",
                                                isHovered && "scale-110 rotate-3"
                                            )}>
                                                <Icon className="w-8 h-8" />
                                            </div>
                                            <h3 className={cn("text-xl font-bold tracking-wide uppercase mb-2", config.color)}>
                                                {tier.display_name}
                                            </h3>
                                            <div className="flex items-baseline justify-center gap-1 text-white">
                                                <span className="text-5xl font-black tracking-tight">{tier.price_nis}</span>
                                                <span className="text-2xl font-bold text-slate-500/80">₪</span>
                                            </div>

                                            <div className="mt-4 flex flex-col gap-1 items-center">
                                                <div className="inline-block px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-xs text-slate-300 font-medium whitespace-nowrap">
                                                    {tier.sessions} אימונים בחודש
                                                </div>
                                                <div className={cn("text-sm font-bold", isPremium || isStandard ? "text-[#E2F163]" : "text-slate-500")}>
                                                    {Math.round(tier.price_per_session)}₪ לאימון
                                                </div>
                                            </div>
                                        </div>

                                        {/* Divider with fade */}
                                        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

                                        {/* Features List */}
                                        <ul className="space-y-4 flex-1 mb-8 relative z-10 px-2">
                                            <li className="flex items-start gap-3">
                                                <Check className={cn("w-5 h-5 shrink-0", isStandard || isPremium ? "text-[#E2F163]" : "text-slate-600")} />
                                                <span className="text-sm font-medium text-slate-300">
                                                    <strong className="text-white">{tier.sessions}</strong> כרטיסי כניסה
                                                </span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <Check className={cn("w-5 h-5 shrink-0", isStandard || isPremium ? "text-[#E2F163]" : "text-slate-600")} />
                                                <span className="text-sm font-medium text-slate-300">
                                                    גישה חופשית לכל האימונים
                                                </span>
                                            </li>
                                            {tier.name !== 'basic' && (
                                                <li className="flex items-start gap-3">
                                                    <Check className={cn("w-5 h-5 shrink-0", isStandard || isPremium ? "text-[#E2F163]" : "text-slate-600")} />
                                                    <span className="text-sm font-medium text-slate-300">
                                                        רכישת כרטיסים נוספים בהנחה
                                                    </span>
                                                </li>
                                            )}
                                            {isPremium && (
                                                <li className="flex items-start gap-3">
                                                    <Check className="w-5 h-5 shrink-0 text-[#E2F163]" />
                                                    <span className="text-sm font-medium text-slate-300">
                                                        קדימות ברישום לאימונים
                                                    </span>
                                                </li>
                                            )}
                                        </ul>

                                        {/* CTA Button */}
                                        <div className="relative z-10 mt-auto">
                                            <Button
                                                onClick={() => handlePurchaseSubscription(tier.id)}
                                                disabled={purchasing !== null}
                                                className={cn(
                                                    "w-full h-14 rounded-2xl text-base font-bold transition-all duration-300 shadow-lg group relative overflow-hidden border-0",
                                                    isPremium
                                                        ? "bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white hover:shadow-pink-500/25"
                                                        : isStandard
                                                            ? "bg-[#E2F163] text-black hover:bg-[#d4e450] hover:shadow-[#E2F163]/25"
                                                            : "bg-white/10 text-white hover:bg-white/20"
                                                )}
                                            >
                                                {/* Shimmer effect for premium/standard buttons */}
                                                {(isPremium || isStandard) && (
                                                    <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />
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
                                                        "רכישה מהירה"
                                                    )}
                                                </span>
                                            </Button>
                                            {isPremium && (
                                                <p className="text-[10px] text-center text-slate-500 mt-3 font-medium uppercase tracking-wider">
                                                    הבחירה המועדפת
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Additional Tickets */}
                    {currentSubscription?.is_active && (
                        <div className="max-w-2xl mx-auto relative z-10">
                            <div className="bg-[#0A0A0A] border border-white/10 rounded-[2rem] p-8 md:p-10 text-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-b from-[#E2F163]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                <div className="relative z-10">
                                    <h3 className="text-2xl font-bold text-white mb-2">נגמרו הכרטיסים?</h3>
                                    <p className="text-slate-400 mb-8 max-w-sm mx-auto">
                                        לא צריך לחכות לחודש הבא. רכשי כרטיסים נוספים במחיר המוזל של המנוי שלך.
                                    </p>

                                    <div className="flex items-center justify-center gap-8 mb-8">
                                        <button
                                            onClick={() => setAdditionalQuantity(Math.max(1, additionalQuantity - 1))}
                                            className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white/5 active:scale-95 transition-all"
                                        >
                                            <Minus className="w-5 h-5" />
                                        </button>
                                        <div>
                                            <div className="text-5xl font-black text-white tabular-nums tracking-tighter">
                                                {additionalQuantity}
                                            </div>
                                            <div className="text-xs text-[#E2F163] font-bold uppercase tracking-wider mt-1">כרטיסים</div>
                                        </div>
                                        <button
                                            onClick={() => setAdditionalQuantity(additionalQuantity + 1)}
                                            className="w-12 h-12 rounded-full bg-[#E2F163] flex items-center justify-center text-black hover:bg-[#d4e450] active:scale-95 transition-all shadow-[0_0_20px_rgba(226,241,99,0.3)]"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <Button
                                        onClick={handlePurchaseAdditional}
                                        disabled={purchasingAdditional}
                                        className="w-full max-w-sm rounded-xl py-6 bg-white text-black font-bold text-lg hover:bg-slate-200 active:scale-[0.98] transition-all"
                                    >
                                        {purchasingAdditional ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            `רכישה ב-${Math.round(getCurrentTierPricePerSession() * additionalQuantity)}₪`
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            <style jsx global>{`
                @keyframes shimmer {
                    100% {
                        transform: translateX(100%);
                    }
                }
            `}</style>
        </div>
    );
}
