"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";
import PaymentModal from "@/components/subscription/PaymentModal";
import StudioLogo from "@/components/StudioLogo";

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
    const reduceMotion = useReducedMotion();
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
        popularCard.scrollIntoView({ inline: "center", block: "nearest", behavior: "instant" });
    }, []);

    const handleScroll = () => {
        const carousel = carouselRef.current;
        if (!carousel) return;

        const carouselBounds = carousel.getBoundingClientRect();
        const center = carouselBounds.left + carouselBounds.width / 2;
        let closestTierId = selectedTierId;
        let minDistance = Infinity;

        Array.from(carousel.children).forEach((child, index) => {
            const card = child as HTMLElement;
            const cardBounds = card.getBoundingClientRect();
            const distance = Math.abs(center - (cardBounds.left + cardBounds.width / 2));
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
        <div className="min-h-dvh overflow-x-hidden bg-[#e9eadc] text-[#162218]">
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onConfirm={handleBitRedirect}
                tierDisplay={activeTier.displayName}
                amount={activeTier.price}
                userName={profile?.full_name || "מתאמנת"}
            />

            <main className="mx-auto max-w-lg pb-[calc(10.5rem+env(safe-area-inset-bottom))]">
                <header className="relative isolate overflow-hidden bg-[#f28c69] px-5 pb-20 pt-5 sm:px-7">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(#162218_1px,transparent_1px),linear-gradient(90deg,#162218_1px,transparent_1px)] [background-size:28px_28px]" />
                    <StudioLogo className="pointer-events-none absolute -bottom-16 -left-12 h-64 w-64 bg-[#162218]/10" />
                    <button type="button" onClick={() => router.back()} aria-label="חזרה" className="relative mb-12 flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[#162218]/30 transition-colors active:bg-[#162218]/10">
                        <ChevronRight aria-hidden="true" className="h-5 w-5" />
                    </button>
                    <motion.div initial={reduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="relative">
                        <p className="mb-4 flex items-center gap-2 text-xs font-bold"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#dce780]" />המסלולים בסטודיו</p>
                        <h1 className="text-[clamp(3.8rem,16vw,5.5rem)] font-bold leading-[0.9] tracking-[-0.06em]">בקצב<br /><span className="text-[#f6f6ed]">שלך.</span></h1>
                        <p className="mt-5 max-w-[19rem] text-sm leading-relaxed text-[#513329]">כמה פעמים תרצי להגיע החודש? בחרי את הקצב שלך.</p>
                    </motion.div>
                </header>

                <div className="relative -mt-8 rounded-t-[2rem] bg-[#e9eadc] px-5 pt-8 sm:px-7">
                    <div className="mb-4 border-b border-[#162218]/25 pb-4">
                        <div className="flex items-center justify-between gap-3 text-[10px] font-bold text-[#68794f]"><p>המסלול שלך / 03</p><span>החליקי לעוד מסלולים</span></div>
                        <h2 className="mt-2 text-[1.65rem] font-bold leading-tight">בוחרים קצב.</h2>
                    </div>
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
                                    event.currentTarget.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth", inline: "center", block: "nearest" });
                                }}
                                aria-pressed={isSelected}
                                className={`relative flex min-h-[27rem] w-[min(82vw,21rem)] shrink-0 snap-center flex-col overflow-hidden rounded-[1.85rem] border p-5 text-start transition-colors duration-300 ${isSelected ? "border-[#162218] bg-[#162218] text-[#f6f6ed]" : "border-[#162218]/10 bg-[#f6f6ed] text-[#162218]"}`}
                            >
                                <StudioLogo className={`pointer-events-none absolute -bottom-14 -left-12 h-56 w-56 ${isSelected ? "bg-[#dce780]/10" : "bg-[#162218]/5"}`} />
                                <span className="relative mb-8 flex min-h-6 items-center justify-between gap-2">
                                    <span className={`text-[11px] font-bold ${isSelected ? "text-[#dce780]" : "text-[#68794f]"}`}>מסלול {String(tier.id).padStart(2, "0")}</span>
                                    {"popular" in tier && tier.popular && <span className="rounded-full bg-[#dce780] px-3 py-1 text-[11px] font-bold text-[#162218]">הכי נבחר</span>}
                                </span>
                                <span className="relative mb-1 text-[4.5rem] font-bold leading-none tracking-[-0.08em]">{tier.sessions}<span className={`ms-2 text-sm tracking-normal ${isSelected ? "text-[#dce780]" : "text-[#68794f]"}`}>אימונים</span></span>
                                <span className="relative mt-2 text-[1.75rem] font-bold leading-tight">{tier.displayName}</span>
                                <span className="relative mt-1 flex items-baseline gap-1">
                                    <span className="text-[3.5rem] font-bold leading-none tabular-nums">{tier.price}</span>
                                    <span className="text-lg">₪</span>
                                    <span className={`ms-1 text-xs ${isSelected ? "text-[#b8c7ae]" : "text-[#5d6958]"}`}>לחודש</span>
                                </span>
                                <span className={`relative mt-5 block w-full border-t pt-4 text-sm font-bold ${isSelected ? "border-white/20" : "border-[#162218]/10"}`}>{tier.sessions} אימונים בחודש</span>
                                <span className="relative mt-3 flex flex-col gap-2.5">
                                    {tier.features.slice(1).map((feature) => (
                                        <span key={feature} className={`flex items-start gap-2 text-xs leading-relaxed ${isSelected ? "text-[#dce4d6]" : "text-[#5d6958]"}`}>
                                            <Check aria-hidden="true" className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isSelected ? "text-[#dce780]" : "text-[#68794f]"}`} />
                                            {feature}
                                        </span>
                                    ))}
                                </span>
                                <span className={`relative mt-auto pt-5 text-xs font-bold ${isSelected ? "text-[#dce780]" : "text-[#68794f]"}`}>{isSelected ? "המסלול שבחרת" : "לצפייה במסלול"}</span>
                            </button>
                        );
                    })}
                </div>
            </main>

            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#162218]/15 bg-[#e9eadc]/95 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
                <div className="mx-auto flex max-w-lg items-center gap-4">
                    <div className="min-w-0 shrink-0">
                        <p className="text-[11px] text-[#5d6958]">{activeTier.displayName} · {activeTier.sessions} אימונים</p>
                        <p className="text-lg font-bold tabular-nums">{activeTier.price} ₪</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsPaymentModalOpen(true)}
                        disabled={purchasing}
                        className="flex min-h-14 min-w-0 flex-1 items-center justify-between gap-2 rounded-full bg-[#162218] px-5 text-sm font-bold text-[#dce780] transition-colors active:bg-[#334436] disabled:opacity-50"
                    >
                        {purchasing ? "מעבירים אותך..." : "לתשלום"}
                        <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
                    </button>
                </div>
            </div>
        </div>
    );
}
