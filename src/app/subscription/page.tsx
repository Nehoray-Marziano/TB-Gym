"use client";

import { useEffect, useState } from "react";
import { Check, Star, Zap, Crown, Plus, Minus, Loader2, Ticket, Sparkles, Flame, ShieldCheck, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";

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
        glow: "shadow-pink-500/50" // Stronger glow for premium
    },
};

export default function SubscriptionPage() {
    const { refreshData } = useGymStore();
    const { toast } = useToast();
    const router = useRouter();
    const { scrollY } = useScroll();

    // Parallax background movement
    const y1 = useTransform(scrollY, [0, 500], [0, 150]);
    const y2 = useTransform(scrollY, [0, 500], [0, -150]);

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
        <div className="min-h-screen w-full bg-[#050505] py-12 px-4 sm:px-6 lg:px-8 overflow-x-hidden pb-32 text-slate-200 relative" dir="rtl">

            {/* Ambient Animated Background - Fixed positioning to avoid scroll issues */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <motion.div
                    style={{ y: y1 }}
                    className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 blur-[120px] rounded-full will-change-transform opacity-60"
                />
                <motion.div
                    style={{ y: y2 }}
                    className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#E2F163]/10 blur-[120px] rounded-full will-change-transform opacity-40"
                />
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 max-w-7xl mx-auto">

                {/* Header Section */}
                <div className="text-center max-w-3xl mx-auto mb-20 pt-10">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="inline-flex items-center gap-2 py-2 px-6 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-xs font-bold tracking-widest uppercase mb-8 text-[#E2F163] shadow-[0_0_20px_rgba(226,241,99,0.1)] hover:shadow-[0_0_30px_rgba(226,241,99,0.2)] transition-shadow cursor-default"
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>חבילות אימון</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                        className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-6 leading-[0.9]"
                    >
                        השקיעי ב<span className="text-transparent bg-clip-text bg-gradient-to-br from-[#E2F163] via-green-400 to-[#E2F163] animate-gradient-x">עצמך</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                        className="text-xl md:text-2xl text-slate-400 max-w-xl mx-auto leading-relaxed font-light"
                    >
                        בחרי את המסלול שמתאים לך.
                        <br />
                        <span className="text-white font-semibold">חסכי עד 10%</span> עם חבילת ה-VIP.
                    </motion.p>
                </div>

                {loading ? (
                    /* Skeleton Loader - Grid Layout Fix */
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mb-24 relative z-10">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-[600px] rounded-[2.5rem] bg-white/5 border border-white/5 animate-pulse flex flex-col p-8 backdrop-blur-sm" />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Current Subscription - Glassmorphism Card */}
                        <AnimatePresence>
                            {currentSubscription?.is_active && (
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6 }}
                                    className="max-w-4xl mx-auto mb-20 relative z-20"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#E2F163] to-green-500 rounded-[2.5rem] blur opacity-20 transform scale-[0.98] translate-y-2" />
                                    <div className="bg-[#111111]/80 backdrop-blur-2xl border border-white/10 rounded-[2.2rem] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#E2F163]/5 rounded-full blur-[50px] pointer-events-none" />

                                        <div className="flex items-center gap-8 z-10 w-full md:w-auto">
                                            <div className="w-24 h-24 bg-gradient-to-br from-[#E2F163] to-green-500 rounded-3xl flex items-center justify-center shadow-[0_10px_30px_rgba(226,241,99,0.15)] transform rotate-3 group-hover:rotate-6 transition-transform duration-500">
                                                <Ticket className="w-10 h-10 text-black fill-black/10" />
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                    <p className="text-sm text-[#E2F163] font-bold tracking-widest uppercase">מנוי פעיל</p>
                                                </div>
                                                <h3 className="text-4xl font-black text-white tracking-tight">{currentSubscription.tier_display_name}</h3>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 w-full md:w-auto z-10">
                                            <div className="flex-1 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl p-5 border border-white/5 text-center min-w-[140px]">
                                                <div className="text-4xl font-black text-white mb-1 tabular-nums tracking-tighter">{availableTickets}</div>
                                                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">כרטיסים נותרו</div>
                                            </div>
                                            <div className="flex-1 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl p-5 border border-white/5 text-center min-w-[140px]">
                                                <div className="text-xl font-bold text-white mb-1 h-[40px] flex items-center justify-center tracking-tight">
                                                    {formatExpiryDate(currentSubscription.expires_at)}
                                                </div>
                                                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">תוקף המנוי</div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Pricing Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 w-full mb-32 relative z-10 px-2">
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
                                        initial={{ opacity: 0, y: 50 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.15, duration: 0.5, ease: "easeOut" }}
                                        onMouseEnter={() => setHoveredTier(tier.id)}
                                        onMouseLeave={() => setHoveredTier(null)}
                                        className="relative group perspective"
                                    >
                                        {/* Dynamic Glow Behind Card */}
                                        <div className={cn(
                                            "absolute inset-0 rounded-[2.5rem] blur-2xl transition-all duration-700 opacity-0 group-hover:opacity-100",
                                            isPremium ? "bg-pink-600/20 translate-y-4" :
                                                isStandard ? "bg-[#E2F163]/20 translate-y-4" :
                                                    "bg-blue-500/10 translate-y-2"
                                        )} />

                                        {/* Main Card */}
                                        <div className={cn(
                                            "relative h-full flex flex-col bg-[#0f0f0f] rounded-[2.5rem] p-1 border transition-all duration-500 transform group-hover:-translate-y-2",
                                            isPremium ? "border-pink-500/40" :
                                                isStandard ? "border-[#E2F163]/40" :
                                                    "border-white/5 hover:border-white/10"
                                        )}>

                                            {/* Inner Card Content */}
                                            <div className="flex-1 flex flex-col rounded-[2.3rem] overflow-hidden bg-gradient-to-b from-[#151515] to-[#0A0A0A] p-8 relative">

                                                {/* Gradient Overlay */}
                                                <div className={cn(
                                                    "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500",
                                                    config.gradient,
                                                    isHovered && "opacity-100"
                                                )} />

                                                {/* Badges */}
                                                {(isPremium || isStandard) && (
                                                    <div className="absolute top-6 right-0 left-0 flex justify-center z-20">
                                                        <motion.div
                                                            initial={{ y: -20, opacity: 0 }}
                                                            animate={{ y: 0, opacity: 1 }}
                                                            className={cn(
                                                                "text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1.5 backdrop-blur-md",
                                                                isPremium ? "bg-pink-500 text-white shadow-pink-500/20" :
                                                                    "bg-[#E2F163] text-black shadow-[#E2F163]/20"
                                                            )}
                                                        >
                                                            {isPremium ? <Crown className="w-3 h-3 block" /> : <Zap className="w-3 h-3 block" />}
                                                            {isPremium ? "הכי משתלם" : "פופולרי"}
                                                        </motion.div>
                                                    </div>
                                                )}

                                                {/* Card Header Content */}
                                                <div className="relative z-10 mt-6 text-center">

                                                    {/* Floating Icon */}
                                                    <div className="relative w-20 h-20 mx-auto mb-6 group-hover:scale-110 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
                                                        <div className={cn(
                                                            "absolute inset-0 rounded-2xl blur-xl opacity-40 transition-opacity duration-500",
                                                            isPremium ? "bg-pink-500" : isStandard ? "bg-[#E2F163]" : "bg-blue-500"
                                                        )} />
                                                        <div className={cn(
                                                            "absolute inset-0 rounded-3xl flex items-center justify-center border shadow-2xl",
                                                            isPremium ? "bg-gradient-to-br from-pink-500 to-purple-700 border-white/20 text-white" :
                                                                isStandard ? "bg-gradient-to-br from-[#E2F163] to-yellow-500 border-white/20 text-black" :
                                                                    "bg-[#1A1A1A] border-white/10 text-slate-300"
                                                        )}>
                                                            <Icon className="w-9 h-9" />
                                                        </div>
                                                    </div>

                                                    <h3 className="text-2xl font-black tracking-tight text-white mb-2">{tier.display_name}</h3>

                                                    <div className="flex items-center justify-center gap-1 mb-6">
                                                        <span className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 tracking-tighter">
                                                            {tier.price_nis}
                                                        </span>
                                                        <span className="text-xl font-bold text-slate-500 self-end mb-2">₪</span>
                                                    </div>

                                                    <div className="flex items-center justify-center gap-3 text-sm font-bold mb-8">
                                                        <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-slate-300">
                                                            {tier.sessions} כניסות
                                                        </div>
                                                        <div className={cn(
                                                            isPremium || isStandard ? "text-[#E2F163]" : "text-slate-500"
                                                        )}>
                                                            {Math.round(tier.price_per_session)}₪ / אימון
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Divider */}
                                                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

                                                {/* Features */}
                                                <ul className="space-y-4 mb-8 flex-1 relative z-10 px-1">
                                                    {[
                                                        { text: `${tier.sessions} כרטיסי כניסה`, highlight: true },
                                                        { text: "גישה חופשית לכל האימונים" },
                                                        ...(tier.name !== 'basic' ? [{ text: "רכישת כרטיסים נוספים בהנחה" }] : []),
                                                        ...(isPremium ? [{ text: "קדימות ברישום לאימונים", premium: true }] : [])
                                                    ].map((feature, i) => (
                                                        <li key={i} className="flex items-center gap-3 group/item">
                                                            <div className={cn(
                                                                "w-5 h-5 rounded-full flex items-center justify-center transition-colors shadow-sm",
                                                                feature.premium ? "bg-pink-500/20" : isStandard ? "bg-[#E2F163]/20" : "bg-white/10",
                                                                feature.premium ? "text-pink-400" : isStandard ? "text-[#E2F163]" : "text-slate-400 group-hover/item:text-white"
                                                            )}>
                                                                <Check className="w-3 h-3 stroke-[3]" />
                                                            </div>
                                                            <span className={cn(
                                                                "text-sm font-medium transition-colors",
                                                                feature.highlight ? "text-white" : "text-slate-400 group-hover/item:text-slate-200"
                                                            )}>
                                                                {feature.text}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>

                                                {/* Button */}
                                                <div className="mt-auto relative z-10">
                                                    <Button
                                                        onClick={() => handlePurchaseSubscription(tier.id)}
                                                        disabled={purchasing !== null}
                                                        className={cn(
                                                            "w-full h-14 rounded-2xl text-base font-bold transition-all duration-300 relative overflow-hidden group/btn shadow-lg",
                                                            isPremium
                                                                ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-pink-900/20 hover:shadow-pink-600/40"
                                                                : isStandard
                                                                    ? "bg-[#E2F163] text-black shadow-[#E2F163]/10 hover:shadow-[#E2F163]/30 hover:bg-[#d4e450]"
                                                                    : "bg-white/10 text-white hover:bg-white/20 border border-white/5"
                                                        )}
                                                    >
                                                        {/* Shine Effect */}
                                                        {(isPremium || isStandard) && (
                                                            <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent z-10" />
                                                        )}

                                                        <div className="relative z-20 flex items-center gap-2">
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
                                                                    <ArrowUpRight className="w-4 h-4 opacity-50 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                                                </>
                                                            )}
                                                        </div>
                                                    </Button>
                                                </div>

                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Additional Tickets - Compact Design */}
                <AnimatePresence>
                    {currentSubscription?.is_active && !loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="max-w-2xl mx-auto pb-20 relative z-10"
                        >
                            <div className="bg-[#111111] border border-white/10 rounded-[2.5rem] p-10 text-center relative overflow-hidden group hover:border-[#E2F163]/30 transition-colors duration-500">
                                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.05]" />
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-[#E2F163] shadow-[0_0_20px_#E2F163] blur-sm rounded-b-full opacity-50" />

                                <div className="relative z-10">
                                    <h3 className="text-2xl font-bold text-white mb-2">נגמרו הכרטיסים?</h3>
                                    <p className="text-slate-400 mb-8 max-w-sm mx-auto">
                                        רכשי כרטיסים נוספים במחיר המנוי שלך.
                                    </p>

                                    <div className="flex items-center justify-center gap-6 mb-8 bg-black/40 p-2 rounded-full w-fit mx-auto border border-white/5">
                                        <button
                                            onClick={() => setAdditionalQuantity(Math.max(1, additionalQuantity - 1))}
                                            className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all active:scale-95"
                                        >
                                            <Minus className="w-5 h-5" />
                                        </button>
                                        <div className="w-16 text-center">
                                            <span className="text-3xl font-black text-white">{additionalQuantity}</span>
                                        </div>
                                        <button
                                            onClick={() => setAdditionalQuantity(additionalQuantity + 1)}
                                            className="w-12 h-12 rounded-full bg-[#E2F163] hover:bg-[#d4e450] flex items-center justify-center text-black transition-all active:scale-95 shadow-[0_0_15px_rgba(226,241,99,0.3)]"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <Button
                                        onClick={handlePurchaseAdditional}
                                        disabled={purchasingAdditional}
                                        className="w-full max-w-sm rounded-xl py-6 bg-white text-black font-bold text-lg hover:bg-slate-200 active:scale-[0.98] transition-all shadow-xl hover:shadow-2xl"
                                    >
                                        {purchasingAdditional ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            `רכישה ב-${Math.round(getCurrentTierPricePerSession() * additionalQuantity)}₪`
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>

            <style jsx global>{`
                @keyframes shimmer {
                    100% {
                        transform: translateX(100%);
                    }
                }
                .perspective {
                    perspective: 1000px;
                }
                .animate-gradient-x {
                    background-size: 200% 200%;
                    animation: gradient-x 3s ease infinite;
                }
                @keyframes gradient-x {
                    0% { background-position: 0% 50% }
                    50% { background-position: 100% 50% }
                    100% { background-position: 0% 50% }
                }
            `}</style>
        </div>
    );
}
