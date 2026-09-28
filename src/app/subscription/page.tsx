"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronRight } from "lucide-react";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";
import PaymentModal from "@/components/subscription/PaymentModal";

const TIERS = [
    {
        id: 1,
        displayName: "בסיסי",
        sessions: 4,
        price: 240,
        features: [
            "4 אימונים בחודש",
            "60 ₪ לאימון",
            "גישה לכל השיעורים",
            "ביטול ללא עלות עד 10 שעות לפני האימון",
        ],
    },
    {
        id: 2,
        displayName: "סטנדרטי",
        sessions: 8,
        price: 450,
        popular: true,
        features: [
            "8 אימונים בחודש",
            "כ־56 ₪ לאימון",
            "גישה לכל השיעורים",
            "ביטול ללא עלות עד 10 שעות לפני האימון",
            "אפשר להוסיף אימונים באותו מחיר",
        ],
    },
    {
        id: 3,
        displayName: "פרימיום",
        sessions: 12,
        price: 650,
        features: [
            "12 אימונים בחודש",
            "כ־54 ₪ לאימון",
            "גישה לכל השיעורים",
            "ביטול ללא עלות עד 10 שעות לפני האימון",
            "אפשר להוסיף אימונים באותו מחיר",
            "קדימות בהרשמה",
        ],
    },
] as const;

export default function SubscriptionPage() {
    const router = useRouter();
    const { profile } = useGymStore();
    const { toast } = useToast();
    const [selectedTierId, setSelectedTierId] = useState(2);
    const [purchasing, setPurchasing] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const carouselRef = useRef<HTMLDivElement>(null);
    const activeTier = TIERS.find((tier) => tier.id === selectedTierId) ?? TIERS[1];

    useEffect(() => {
        const carousel = carouselRef.current;
        const popularCard = carousel?.children[1] as HTMLElement | undefined;
        if (!carousel || !popularCard) return;
        const scrollLeft = popularCard.offsetLeft - carousel.clientWidth / 2 + popularCard.clientWidth / 2;
        carousel.scrollTo({ left: scrollLeft, behavior: "instant" });
    }, []);

    const handleScroll = () => {
        const carousel = carouselRef.current;
        if (!carousel) return;

        const center = carousel.scrollLeft + carousel.clientWidth / 2;
        let closestTierId = selectedTierId;
        let minDistance = Infinity;

        Array.from(carousel.children).forEach((child, index) => {
            const card = child as HTMLElement;
            const distance = Math.abs(center - (card.offsetLeft + card.clientWidth / 2));
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

    const handleBitRedirect = () => {
        setIsPaymentModalOpen(false);
        setPurchasing(true);
        if (navigator.vibrate) navigator.vibrate([10, 50, 10]);

        window.open("https://www.bitpay.co.il/app/me/BE137CD7-0248-51EB-42FD-5E889D31DEB83A1E", "_blank");
        toast({
            title: "בקשת התשלום נפתחה בביט",
            description: "האימונים יתווספו ליתרה שלך אחרי שטליה תאשר את ההעברה.",
            type: "success",
        });
        setTimeout(() => router.push("/dashboard"), 1500);
    };

    return (
        <div className="min-h-dvh overflow-x-hidden bg-background text-foreground">
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onConfirm={handleBitRedirect}
                tierDisplay={activeTier.displayName}
                amount={activeTier.price}
                userName={profile?.full_name || "מתאמנת"}
            />

            <main className="mx-auto max-w-lg pb-[calc(10.5rem+env(safe-area-inset-bottom))] pt-5">
                <header className="px-5 sm:px-7">
                    <button type="button" onClick={() => router.back()} aria-label="חזרה" className="mb-10 flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-card transition-colors active:bg-muted/40">
                        <ChevronRight aria-hidden="true" className="h-5 w-5" />
                    </button>
                    <p className="mb-2 text-xs font-bold text-primary">המסלולים בסטודיו / 03</p>
                    <h1 className="text-[clamp(2.7rem,11vw,4rem)] font-bold leading-[1.08] tracking-tight">בקצב<br />שלך<span className="text-primary">.</span></h1>
                    <p className="mt-4 max-w-[19rem] text-sm leading-relaxed text-muted-foreground">בחרי כמה פעמים תרצי להגיע החודש. את הקצב אנחנו משאירים לך.</p>
                </header>

                <div className="mb-4 mt-10 flex items-end justify-between border-b border-border px-5 pb-3 sm:px-7">
                    <h2 className="text-base font-bold">בחירת מסלול</h2>
                    <span className="text-xs text-muted-foreground">החליקי כדי לראות עוד</span>
                </div>

                <div ref={carouselRef} onScroll={handleScroll} className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-4 scrollbar-hide sm:px-7">
                    {TIERS.map((tier) => {
                        const isSelected = selectedTierId === tier.id;
                        return (
                            <button
                                key={tier.id}
                                type="button"
                                onClick={(event) => {
                                    setSelectedTierId(tier.id);
                                    event.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                                }}
                                aria-pressed={isSelected}
                                className={`relative flex min-h-[25rem] w-[min(82vw,21rem)] shrink-0 snap-center flex-col overflow-hidden rounded-[1.85rem] border p-5 text-start transition-colors ${isSelected ? "border-[#1b251c] bg-[#1b251c] text-[#f6f6ed]" : "border-border bg-card text-foreground"}`}
                            >
                                <span aria-hidden="true" className={`pointer-events-none absolute -left-20 -top-16 h-56 w-56 rounded-full border-[32px] ${isSelected ? "border-[#dce780]/10" : "border-primary/10"}`} />
                                <span className="relative mb-8 flex min-h-6 items-center justify-between gap-2">
                                    <span className={`text-[11px] font-bold ${isSelected ? "text-[#dce780]" : "text-primary"}`}>מסלול {String(tier.id).padStart(2, "0")}</span>
                                    {"popular" in tier && tier.popular && <span className="rounded-full bg-[#dce780] px-3 py-1 text-[11px] font-bold text-[#1b251c]">הכי נבחר</span>}
                                </span>
                                <span className="relative text-[1.75rem] font-bold leading-tight">{tier.displayName}</span>
                                <span className="relative mt-1 flex items-baseline gap-1">
                                    <span className="text-[3.5rem] font-bold leading-none tabular-nums">{tier.price}</span>
                                    <span className="text-lg">₪</span>
                                    <span className={`ms-1 text-xs ${isSelected ? "text-[#cbd4c5]" : "text-muted-foreground"}`}>לחודש</span>
                                </span>
                                <span className={`relative mt-5 block w-full border-t pt-4 text-sm font-bold ${isSelected ? "border-white/20" : "border-border"}`}>{tier.sessions} אימונים בחודש</span>
                                <span className="relative mt-3 flex flex-col gap-2.5">
                                    {tier.features.slice(1).map((feature) => (
                                        <span key={feature} className={`flex items-start gap-2 text-xs leading-relaxed ${isSelected ? "text-[#dce4d6]" : "text-muted-foreground"}`}>
                                            <Check aria-hidden="true" className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isSelected ? "text-[#dce780]" : "text-primary"}`} />
                                            {feature}
                                        </span>
                                    ))}
                                </span>
                                <span className={`relative mt-auto pt-5 text-xs font-bold ${isSelected ? "text-[#dce780]" : "text-primary"}`}>{isSelected ? "המסלול שבחרת" : "לצפייה במסלול"}</span>
                            </button>
                        );
                    })}
                </div>
            </main>

            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
                <div className="mx-auto flex max-w-lg items-center gap-4">
                    <div className="min-w-0 shrink-0">
                        <p className="text-[11px] text-muted-foreground">{activeTier.displayName} · {activeTier.sessions} אימונים</p>
                        <p className="text-lg font-bold tabular-nums">{activeTier.price} ₪</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsPaymentModalOpen(true)}
                        disabled={purchasing}
                        className="flex min-h-14 min-w-0 flex-1 items-center justify-between gap-2 rounded-full bg-[#1b251c] px-5 text-sm font-bold text-[#f6f6ed] transition-colors active:bg-[#334436] disabled:opacity-50"
                    >
                        {purchasing ? "מעבירים אותך..." : "להמשך לתשלום"}
                        <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
                    </button>
                </div>
            </div>
        </div>
    );
}
