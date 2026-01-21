"use client";

import { useEffect, useState } from "react";
import { Check, Star, Zap, Crown, Plus, Minus, Loader2, Ticket, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type SubscriptionTier = {
    id: number;
    name: string;
    display_name: string;
    sessions: number;
    price_nis: number;
    price_per_session: number;
};

// Updated icons and colors for more pop
const tierConfig: Record<string, { icon: React.ElementType, color: string, gradient: string }> = {
    basic: { icon: Star, color: "text-blue-400", gradient: "from-blue-400/20 to-blue-600/20" },
    standard: { icon: Zap, color: "text-[#E2F163]", gradient: "from-[#E2F163]/20 to-yellow-500/20" },
    premium: { icon: Crown, color: "text-purple-400", gradient: "from-purple-400/20 to-pink-600/20" },
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

    // Current user subscription state
    const [currentSubscription, setCurrentSubscription] = useState<{
        tier_name: string;
        tier_display_name: string;
        expires_at: string;
        is_active: boolean;
    } | null>(null);
    const [availableTickets, setAvailableTickets] = useState(0);

    useEffect(() => {
        fetchTiers();
        fetchUserSubscription();
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

            // Check if user is logged in first
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return;
            }

            // Try to get subscription info
            try {
                const { data: subData, error: subError } = await supabase.rpc("get_user_subscription", {
                    p_user_id: user.id
                });

                if (!subError && subData && subData.is_active) {
                    setCurrentSubscription(subData);
                }
            } catch (e) {
                console.log("RPC not available yet");
            }

            // Try to get available tickets
            try {
                const { data: ticketCount, error: ticketError } = await supabase.rpc("get_available_tickets", {
                    p_user_id: user.id
                });

                if (!ticketError && ticketCount !== null) {
                    setAvailableTickets(ticketCount);
                }
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
                toast({
                    title: "שגיאה ברכישה",
                    description: data.message,
                    type: "error",
                });
            }
        } catch (error) {
            toast({
                title: "שגיאה",
                description: "משהו השתבש, נסי שוב",
                type: "error",
            });
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
                toast({
                    title: "שגיאה ברכישה",
                    description: data.message,
                    type: "error",
                });
            }
        } catch (error) {
            toast({
                title: "שגיאה",
                description: "משהו השתבש, נסי שוב",
                type: "error",
            });
        } finally {
            setPurchasingAdditional(false);
        }
    };

    const getCurrentTierPricePerSession = () => {
        if (!currentSubscription) return 60; // Default to basic tier price
        const tier = tiers.find(t => t.name === currentSubscription.tier_name);
        return tier?.price_per_session || 60;
    };

    const formatExpiryDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat("he-IL", {
            day: "numeric",
            month: "long",
        }).format(date);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-background py-10 px-4 sm:px-6 lg:px-8 overflow-x-hidden pb-32" dir="rtl">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-12">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 py-1 px-4 rounded-full bg-secondary/80 backdrop-blur-sm text-secondary-foreground text-xs font-extrabold tracking-wider uppercase mb-6 border border-white/10"
                >
                    <Sparkles className="w-3 h-3 text-[#E2F163]" />
                    <span>כרטיסי אימון</span>
                </motion.div>

                <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground mb-6 leading-tight">
                    בחרי את{" "}
                    <span className="relative">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E2F163] to-green-400 relative z-10">
                            החבילה שלך
                        </span>
                        <span className="absolute -bottom-2 right-0 w-full h-3 bg-[#E2F163]/20 -rotate-1 rounded-full z-0" />
                    </span>
                </h1>

                <p className="text-lg text-muted-foreground/80 max-w-xl mx-auto leading-relaxed">
                    חסכי עד <span className="text-[#E2F163] font-bold">15%</span> בכל אימון עם חבילות הפרימיום שלנו.
                    <br />
                    הכרטיסים תקפים עד סוף החודש • ללא התחייבות
                </p>
            </div>

            {/* Current Subscription Status */}
            {currentSubscription?.is_active && (
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-4xl mx-auto mb-12"
                >
                    <div className="bg-gradient-to-r from-neutral-900 to-neutral-900/50 border border-white/10 rounded-[2rem] p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#E2F163]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-16 h-16 bg-[#E2F163] rounded-2xl flex items-center justify-center shadow-lg shadow-[#E2F163]/20">
                                <Ticket className="w-8 h-8 text-black" />
                            </div>
                            <div>
                                <p className="text-sm text-neutral-400 font-medium mb-1">המנוי הפעיל שלך</p>
                                <h3 className="text-2xl font-bold text-white tracking-tight">{currentSubscription.tier_display_name}</h3>
                            </div>
                        </div>

                        <div className="flex items-center gap-8 relative z-10 bg-black/20 p-4 rounded-2xl border border-white/5">
                            <div className="text-center px-2">
                                <p className="text-4xl font-black text-white mb-1">{availableTickets}</p>
                                <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">כרטיסים</p>
                            </div>
                            <div className="w-px h-10 bg-white/10" />
                            <div className="text-center px-2">
                                <div className="flex items-center justify-center gap-1.5 text-neutral-300 mb-1">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm font-bold">תוקף</span>
                                </div>
                                <span className="text-xs text-neutral-400">{formatExpiryDate(currentSubscription.expires_at)}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Tier Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-7xl mx-auto items-stretch mb-20">
                {tiers.map((tier, index) => {
                    const config = tierConfig[tier.name] || tierConfig.basic;
                    const Icon = config.icon;
                    // Highlight both standard and premium as attractive options, but styled differently
                    const isPremium = tier.name === "premium";
                    const isStandard = tier.name === "standard";
                    const isCurrentTier = currentSubscription?.tier_name === tier.name;

                    return (
                        <motion.div
                            key={tier.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={cn(
                                "relative flex flex-col p-8 rounded-[2.5rem] transition-all duration-300 group hover:-translate-y-2",
                                isPremium
                                    ? "bg-card shadow-2xl shadow-purple-900/20 border-2 border-purple-500/30 z-10"
                                    : isStandard
                                        ? "bg-card shadow-2xl shadow-[#E2F163]/10 border-2 border-[#E2F163]/50 ring-1 ring-[#E2F163]/20 z-10"
                                        : "bg-card/40 border border-white/5 hover:bg-card/60",
                                isCurrentTier && "ring-4 ring-green-500/20 border-green-500/50"
                            )}
                        >
                            {/* Best Value Badge for 12 Sessions (Premium) */}
                            {isPremium && (
                                <div className="absolute -top-5 right-1/2 translate-x-1/2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-sm font-black rounded-full shadow-lg shadow-purple-500/30 flex items-center gap-2 uppercase tracking-wide">
                                    <Crown className="w-4 h-4 fill-white" />
                                    VIP
                                </div>
                            )}

                            {/* Most Popular Badge for Standard */}
                            {isStandard && (
                                <div className="absolute -top-5 right-1/2 translate-x-1/2 px-6 py-2 bg-[#E2F163] text-black text-sm font-black rounded-full shadow-lg shadow-[#E2F163]/30 flex items-center gap-2 uppercase tracking-wide">
                                    <Zap className="w-4 h-4 fill-black" />
                                    הכי פופולרי
                                </div>
                            )}

                            {isCurrentTier && (
                                <div className="absolute top-4 left-4 px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full border border-green-500/30">
                                    המנוי שלך
                                </div>
                            )}

                            {/* Card Header */}
                            <div className="mb-8 pt-4">
                                <div className="flex items-center justify-between mb-6">
                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-inner",
                                        isPremium ? "bg-purple-500/20 text-purple-400" :
                                            isStandard ? "bg-[#E2F163] text-black" :
                                                "bg-white/5 text-white"
                                    )}>
                                        <Icon className="w-7 h-7" />
                                    </div>
                                    <h3 className={cn("text-2xl font-black tracking-tight", config.color)}>
                                        {tier.display_name}
                                    </h3>
                                </div>

                                <div className="flex items-baseline text-foreground mb-4 relative">
                                    <span className="text-6xl font-black tracking-tighter">{tier.price_nis}</span>
                                    <span className="text-3xl font-bold mr-2 text-muted-foreground">₪</span>
                                </div>

                                <div className="flex items-center gap-3 text-sm">
                                    <span className={cn(
                                        "font-bold px-4 py-1.5 rounded-full text-sm",
                                        isPremium ? "bg-purple-500/20 text-purple-300" :
                                            isStandard ? "bg-[#E2F163]/20 text-[#E2F163]" :
                                                "bg-white/10 text-white"
                                    )}>
                                        {tier.sessions} אימונים
                                    </span>
                                    <span className={cn(
                                        "font-medium",
                                        (isStandard || isPremium) ? "text-[#E2F163]" : "text-muted-foreground"
                                    )}>
                                        רק {Math.round(tier.price_per_session)}₪ לאימון
                                    </span>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

                            {/* Features */}
                            <ul className="space-y-4 flex-1 mb-8">
                                <li className="flex items-start gap-4">
                                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                        isStandard ? "bg-[#E2F163]/20 text-[#E2F163]" : "bg-white/10 text-white/60")}>
                                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                                    </div>
                                    <span className="text-base font-medium text-foreground/90">
                                        <strong className="text-white">{tier.sessions}</strong> כרטיסי אימון לחודש
                                    </span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                        isStandard ? "bg-[#E2F163]/20 text-[#E2F163]" : "bg-white/10 text-white/60")}>
                                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                                    </div>
                                    <span className="text-base font-medium text-foreground/90">
                                        רכישת כרטיסים נוספים בהנחה
                                    </span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                        isStandard ? "bg-[#E2F163]/20 text-[#E2F163]" : "bg-white/10 text-white/60")}>
                                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                                    </div>
                                    <span className="text-base font-medium text-foreground/90">
                                        גישה לכל סוגי האימונים
                                    </span>
                                </li>
                            </ul>

                            {/* CTA */}
                            <Button
                                onClick={() => handlePurchaseSubscription(tier.id)}
                                disabled={purchasing !== null}
                                className={cn(
                                    "w-full rounded-2xl py-7 text-lg font-bold shadow-lg active:scale-[0.98] transition-all hover:shadow-xl",
                                    isPremium
                                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 shadow-purple-500/25"
                                        : isStandard
                                            ? "bg-[#E2F163] text-black hover:bg-[#d4e450] shadow-[#E2F163]/25"
                                            : "bg-white text-black hover:bg-white/90"
                                )}
                            >
                                {purchasing === tier.id ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : isCurrentTier ? (
                                    "חידוש מנוי"
                                ) : (
                                    "רכישה מהירה"
                                )}
                            </Button>
                        </motion.div>
                    );
                })}
            </div>

            {/* Additional Tickets Section */}
            {currentSubscription?.is_active && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="max-w-2xl mx-auto"
                >
                    <div className="bg-neutral-900/50 border border-white/5 rounded-[2rem] p-8 backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#E2F163]/50 to-transparent" />

                        <div className="text-center mb-8">
                            <h3 className="text-2xl font-bold text-white mb-2">נגמרו הכרטיסים?</h3>
                            <p className="text-neutral-400">
                                אפשר לרכוש כרטיסים בודדים במחיר המנוי שלך
                                <span className="inline-block mx-2 bg-[#E2F163]/10 text-[#E2F163] px-2 py-0.5 rounded-md font-bold text-sm border border-[#E2F163]/20">
                                    {Math.round(getCurrentTierPricePerSession())}₪ לכרטיס
                                </span>
                            </p>
                        </div>

                        <div className="flex items-center justify-between gap-6 bg-black/20 p-4 rounded-2xl border border-white/5 mb-8 max-w-sm mx-auto">
                            <button
                                onClick={() => setAdditionalQuantity(Math.max(1, additionalQuantity - 1))}
                                className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center active:scale-95 transition-all text-white border border-white/5"
                            >
                                <Minus className="w-5 h-5" />
                            </button>
                            <div className="text-center w-24">
                                <span className="text-4xl font-black text-white">{additionalQuantity}</span>
                                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mt-1">כרטיסים</p>
                            </div>
                            <button
                                onClick={() => setAdditionalQuantity(additionalQuantity + 1)}
                                className="w-12 h-12 bg-[#E2F163] hover:bg-[#d4e450] text-black rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-[#E2F163]/20"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="text-center mb-6">
                            <p className="text-sm text-neutral-400 mb-1">סה״כ לתשלום</p>
                            <p className="text-3xl font-black text-white">
                                {Math.round(getCurrentTierPricePerSession() * additionalQuantity)}₪
                            </p>
                        </div>

                        <Button
                            onClick={handlePurchaseAdditional}
                            disabled={purchasingAdditional}
                            className="w-full rounded-2xl py-6 bg-white text-black font-bold text-lg hover:bg-white/90 active:scale-[0.98] transition-all"
                        >
                            {purchasingAdditional ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                `רכישת ${additionalQuantity} כרטיסים`
                            )}
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Footer Note */}
            <div className="text-center mt-16 pb-8 opacity-60 hover:opacity-100 transition-opacity">
                <p className="text-sm text-muted-foreground font-medium flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-[#E2F163]" />
                    הכרטיסים תקפים עד סוף החודש הנוכחי בלבד
                </p>
            </div>
        </div>
    );
}
