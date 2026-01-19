"use client";

import { useEffect, useState } from "react";
import { Check, Star, Zap, Crown, Plus, Minus, Loader2, Ticket, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

type SubscriptionTier = {
    id: number;
    name: string;
    display_name: string;
    sessions: number;
    price_nis: number;
    price_per_session: number;
};

const tierIcons: Record<string, React.ElementType> = {
    basic: Star,
    standard: Zap,
    premium: Crown,
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
                setTiers(data.tiers);
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
                console.log("No user logged in, skipping subscription fetch");
                return;
            }

            // Try to get subscription info (RPC may not exist if migration not applied)
            try {
                const { data: subData, error: subError } = await supabase.rpc("get_user_subscription", {
                    p_user_id: user.id
                });

                if (!subError && subData && subData.is_active) {
                    setCurrentSubscription(subData);
                }
            } catch (e) {
                console.log("get_user_subscription RPC not available yet");
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
                console.log("get_available_tickets RPC not available yet");
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
        <div
            className="min-h-screen w-full bg-background py-10 px-4 sm:px-6 lg:px-8 overflow-x-hidden pb-32"
            dir="rtl"
        >
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-12">
                <span className="inline-block py-1 px-3 rounded-full bg-secondary text-secondary-foreground text-xs font-extrabold tracking-wider uppercase mb-4">
                    כרטיסי אימון
                </span>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-4 leading-tight">
                    בחרי את{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#d4e450]">
                        החבילה שלך
                    </span>
                </h1>
                <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                    הכרטיסים תקפים עד סוף החודש • ככל שקונים יותר - משלמים פחות לאימון
                </p>
            </div>

            {/* Current Subscription Status */}
            {currentSubscription?.is_active && (
                <div className="max-w-7xl mx-auto mb-10">
                    <div className="bg-primary/10 border border-primary/30 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center">
                                <Ticket className="w-7 h-7 text-black" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">המנוי הפעיל שלך</p>
                                <h3 className="text-xl font-bold text-foreground">{currentSubscription.tier_display_name}</h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-3xl font-black text-primary">{availableTickets}</p>
                                <p className="text-xs text-muted-foreground font-medium">כרטיסים</p>
                            </div>
                            <div className="text-center flex items-center gap-2 bg-black/5 rounded-2xl px-4 py-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">עד {formatExpiryDate(currentSubscription.expires_at)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tier Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-7xl mx-auto items-stretch mb-16">
                {tiers.map((tier) => {
                    const Icon = tierIcons[tier.name] || Star;
                    const isPopular = tier.name === "standard";
                    const isCurrentTier = currentSubscription?.tier_name === tier.name;

                    return (
                        <div
                            key={tier.id}
                            className={cn(
                                "relative flex flex-col p-7 rounded-[2.5rem] transition-all",
                                isPopular
                                    ? "bg-card shadow-2xl shadow-primary/20 border-2 border-primary ring-4 ring-primary/10 z-10 md:scale-105"
                                    : "bg-card/50 border border-border/50",
                                isCurrentTier && "ring-2 ring-green-500/50"
                            )}
                        >
                            {isPopular && (
                                <div className="absolute -top-4 right-1/2 translate-x-1/2 px-4 py-1.5 bg-primary text-black text-xs font-black rounded-full shadow-lg flex items-center gap-1 uppercase tracking-wide">
                                    <Crown className="w-3 h-3 fill-black" />
                                    הכי משתלם
                                </div>
                            )}

                            {isCurrentTier && (
                                <div className="absolute -top-4 left-4 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg">
                                    המנוי שלך
                                </div>
                            )}

                            {/* Card Header */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-5">
                                    <div
                                        className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center",
                                            isPopular ? "bg-black text-[#E2F163]" : "bg-muted text-foreground"
                                        )}
                                    >
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-foreground">{tier.display_name}</h3>
                                </div>

                                <div className="flex items-baseline text-foreground mb-3">
                                    <span className="text-5xl font-black tracking-tighter">{tier.price_nis}</span>
                                    <span className="text-2xl font-bold mr-1">₪</span>
                                    <span className="text-muted-foreground text-sm mr-2 font-medium">/חודש</span>
                                </div>

                                <div className="flex items-center gap-2 text-sm">
                                    <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full">
                                        {tier.sessions} אימונים
                                    </span>
                                    <span className="text-muted-foreground">
                                        ({Math.round(tier.price_per_session)}₪ לאימון)
                                    </span>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="h-px w-full bg-border/50 mb-6" />

                            {/* Features */}
                            <ul className="space-y-3 flex-1 mb-6">
                                <li className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                        <Check className="h-3 w-3 text-primary stroke-[3]" />
                                    </div>
                                    <span className="text-sm font-medium text-foreground/90">
                                        {tier.sessions} כרטיסי אימון לחודש
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                        <Check className="h-3 w-3 text-primary stroke-[3]" />
                                    </div>
                                    <span className="text-sm font-medium text-foreground/90">
                                        רכישת כרטיסים נוספים בהנחה
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                        <Check className="h-3 w-3 text-primary stroke-[3]" />
                                    </div>
                                    <span className="text-sm font-medium text-foreground/90">
                                        גישה לכל סוגי האימונים
                                    </span>
                                </li>
                            </ul>

                            {/* CTA */}
                            <Button
                                onClick={() => handlePurchaseSubscription(tier.id)}
                                disabled={purchasing !== null}
                                className={cn(
                                    "w-full rounded-2xl py-6 text-base font-bold shadow-lg active:scale-[0.98] transition-transform",
                                    isPopular
                                        ? "bg-primary text-black hover:bg-primary/90"
                                        : "bg-foreground text-background hover:bg-foreground/90"
                                )}
                            >
                                {purchasing === tier.id ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : isCurrentTier ? (
                                    "חידוש מנוי"
                                ) : (
                                    "רכישה"
                                )}
                            </Button>
                        </div>
                    );
                })}
            </div>

            {/* Additional Tickets Section */}
            {currentSubscription?.is_active && (
                <div className="max-w-xl mx-auto">
                    <div className="bg-card border border-border rounded-3xl p-6">
                        <h3 className="text-xl font-bold text-foreground mb-2">כרטיסים נוספים</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            רכשי כרטיסים נוספים במחיר המנוי שלך ({Math.round(getCurrentTierPricePerSession())}₪ לכרטיס)
                        </p>

                        <div className="flex items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setAdditionalQuantity(Math.max(1, additionalQuantity - 1))}
                                    className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center active:scale-95 transition-transform"
                                >
                                    <Minus className="w-5 h-5" />
                                </button>
                                <span className="text-3xl font-black w-12 text-center">{additionalQuantity}</span>
                                <button
                                    onClick={() => setAdditionalQuantity(additionalQuantity + 1)}
                                    className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center active:scale-95 transition-transform"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="text-left">
                                <p className="text-2xl font-black text-foreground">
                                    {Math.round(getCurrentTierPricePerSession() * additionalQuantity)}₪
                                </p>
                                <p className="text-xs text-muted-foreground">סה״כ</p>
                            </div>
                        </div>

                        <Button
                            onClick={handlePurchaseAdditional}
                            disabled={purchasingAdditional}
                            className="w-full rounded-2xl py-5 bg-primary text-black font-bold active:scale-[0.98] transition-transform"
                        >
                            {purchasingAdditional ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                `רכישת ${additionalQuantity} כרטיסים`
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Footer Note */}
            <div className="text-center mt-12 pb-8">
                <p className="text-sm text-muted-foreground font-medium flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" />
                    הכרטיסים תקפים עד סוף החודש הנוכחי
                </p>
            </div>
        </div>
    );
}
