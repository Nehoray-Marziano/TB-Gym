"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, Check, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";
import PaymentModal from "@/components/subscription/PaymentModal";
import StudioLogo from "@/components/StudioLogo";
import StudioBotanical from "@/components/StudioBotanical";

const TIERS = [
    { id: 1, displayName: "בסיסי", sessions: 4, price: 240, features: ["4 אימונים בחודש", "60 ₪ לאימון", "גישה לכל השיעורים", "ביטול ללא עלות עד 10 שעות לפני האימון"] },
    { id: 2, displayName: "סטנדרטי", sessions: 8, price: 450, popular: true, features: ["8 אימונים בחודש", "כ־56 ₪ לאימון", "גישה לכל השיעורים", "ביטול ללא עלות עד 10 שעות לפני האימון", "אפשר להוסיף אימונים באותו מחיר"] },
    { id: 3, displayName: "פרימיום", sessions: 12, price: 650, features: ["12 אימונים בחודש", "כ־54 ₪ לאימון", "גישה לכל השיעורים", "ביטול ללא עלות עד 10 שעות לפני האימון", "אפשר להוסיף אימונים באותו מחיר", "קדימות בהרשמה"] },
] as const;

export default function SubscriptionPage() {
    const router = useRouter();
    const reduceMotion = useReducedMotion();
    const { profile } = useGymStore();
    const { toast } = useToast();
    const [selectedTierId, setSelectedTierId] = useState(2);
    const [purchasing, setPurchasing] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [showPaymentBar, setShowPaymentBar] = useState(false);
    const introRef = useRef<HTMLElement>(null);
    const plansRef = useRef<HTMLElement>(null);
    const carouselRef = useRef<HTMLDivElement>(null);
    const activeTier = TIERS.find((tier) => tier.id === selectedTierId) ?? TIERS[1];

    useEffect(() => {
        const intro = introRef.current;
        if (!intro) return;
        const observer = new IntersectionObserver(([entry]) => setShowPaymentBar(!entry.isIntersecting), { rootMargin: "-35% 0px 0px 0px", threshold: 0 });
        observer.observe(intro);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const carousel = carouselRef.current;
        const popularCard = carousel?.children[1] as HTMLElement | undefined;
        if (!carousel || !popularCard) return;
        // Only move the horizontal strip. scrollIntoView also moved the page
        // vertically, which hid the introduction on entry.
        const carouselCenter = carousel.getBoundingClientRect().left + carousel.clientWidth / 2;
        const cardCenter = popularCard.getBoundingClientRect().left + popularCard.clientWidth / 2;
        carousel.scrollTo({ left: carousel.scrollLeft + cardCenter - carouselCenter, behavior: "instant" });
    }, []);

    const centerCard = (card: HTMLElement) => {
        const carousel = carouselRef.current;
        if (!carousel) return;
        const carouselCenter = carousel.getBoundingClientRect().left + carousel.clientWidth / 2;
        const cardCenter = card.getBoundingClientRect().left + card.clientWidth / 2;
        carousel.scrollTo({ left: carousel.scrollLeft + cardCenter - carouselCenter, behavior: reduceMotion ? "instant" : "smooth" });
    };

    const handleCarouselScroll = () => {
        const carousel = carouselRef.current;
        if (!carousel) return;
        const center = carousel.getBoundingClientRect().left + carousel.clientWidth / 2;
        let closestIndex = 0;
        let closestDistance = Infinity;
        Array.from(carousel.children).forEach((child, index) => {
            const card = child as HTMLElement;
            const distance = Math.abs(card.getBoundingClientRect().left + card.clientWidth / 2 - center);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });
        setSelectedTierId(TIERS[closestIndex].id);
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
        <div className="min-h-dvh overflow-x-hidden bg-[var(--studio-canvas)] text-[var(--studio-ink)]">
            <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} onConfirm={handleBitRedirect} tierDisplay={activeTier.displayName} amount={activeTier.price} userName={profile?.full_name || "מתאמנת"} />

            <main className="mx-auto max-w-lg pb-[calc(7rem+env(safe-area-inset-bottom))]">
                <header ref={introRef} className="relative isolate overflow-hidden bg-[var(--studio-coral-bg)] px-5 pb-8 pt-4 sm:px-7">
                    <StudioBotanical sun={false} className="studio-botanical-drift pointer-events-none absolute -bottom-14 -left-20 h-56 w-80 text-[var(--studio-deep)]/20" />
                    <button type="button" onClick={() => router.back()} aria-label="חזרה" className="relative mb-8 flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[#162218]/30 transition-colors active:bg-[var(--studio-deep)]/10"><ChevronRight aria-hidden="true" className="h-5 w-5" /></button>
                    <motion.div initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="relative">
                        <p className="mb-3 flex items-center gap-2 text-xs font-bold"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--studio-accent-bg)]" />המסלולים בסטודיו</p>
                        <h1 className="text-[clamp(3.6rem,15vw,5.2rem)] font-bold leading-[0.96] tracking-[-0.06em]">
                            בקצב<br />
                            <span className="relative inline-block pb-3 text-[var(--studio-deep-contrast)]">שלך
                                <svg aria-hidden="true" className="pointer-events-none absolute -bottom-1 inset-x-0 h-5 w-full overflow-visible" viewBox="0 0 100 20" preserveAspectRatio="none">
                                    <path className="studio-hand-underline" d="M3 13 C 24 3, 61 19, 97 8" fill="none" stroke="var(--studio-accent-text)" strokeWidth="6" strokeLinecap="round" pathLength="100" />
                                </svg>
                            </span><span className="text-[var(--studio-ink)]">.</span>
                        </h1>
                        <p className="mt-5 max-w-[20rem] text-sm leading-relaxed text-[var(--studio-coral-ink)]">יש לך מקום בכל שיעור. בחרי כמה פעמים תרצי להגיע בחודש, ותוכלי להירשם לאימונים שמתאימים לך.</p>
                        <div className="mt-5 flex items-center gap-3 border-t border-[#162218]/25 pt-4 text-xs font-bold"><span>04 / 08 / 12</span><span className="h-px w-8 bg-[var(--studio-deep)]/40" /><span>אימונים בחודש</span></div>
                        <button type="button" onClick={() => plansRef.current?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth", block: "start" })} className="mt-6 flex min-h-12 w-full items-center justify-between rounded-full bg-[var(--studio-deep)] px-5 text-sm font-bold text-[var(--studio-accent-text)] transition-transform active:scale-[0.98]">לראות את המסלולים <ArrowDown aria-hidden="true" className="h-4 w-4" /></button>
                    </motion.div>
                </header>

                <section ref={plansRef} className="scroll-mt-4 px-5 pt-7 sm:px-7" aria-labelledby="plans-title">
                    <div className="mb-5 border-b border-[#162218]/25 pb-4">
                        <p className="text-[11px] font-bold text-[var(--studio-subtle)]">03 מסלולים · קצב אחד שמתאים לך</p>
                        <h2 id="plans-title" className="mt-1 text-[1.8rem] font-bold leading-tight">בוחרים קצב.</h2>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--studio-muted)]">החליקי בין המסלולים כדי להשוות, והקישי על זה שמתאים לך.</p>
                    </div>
                    <div ref={carouselRef} onScroll={handleCarouselScroll} role="region" aria-label="מסלולי מנוי" className="studio-plan-carousel -mx-5 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto pb-4 scrollbar-hide sm:-mx-7">
                        {TIERS.map((tier) => {
                            const isSelected = selectedTierId === tier.id;
                            return (
                                <button key={tier.id} type="button" onClick={(event) => { setSelectedTierId(tier.id); centerCard(event.currentTarget); if (navigator.vibrate) navigator.vibrate(5); }} aria-pressed={isSelected}
                                    className={`relative flex w-[min(82vw,20rem)] shrink-0 snap-center flex-col overflow-hidden rounded-[1.5rem] border p-5 text-start transition-colors duration-200 ${isSelected ? "border-[var(--studio-accent-text)] bg-[var(--studio-deep)] text-[var(--studio-deep-contrast)]" : "border-[#162218]/15 bg-[var(--studio-card)] text-[var(--studio-ink)]"}`}>
                                    <StudioLogo className={`pointer-events-none absolute -bottom-14 -left-14 h-44 w-44 ${isSelected ? "bg-[var(--studio-accent-bg)]/10" : "bg-[var(--studio-deep)]/5"}`} />
                                    <span className="relative flex items-center justify-between gap-3">
                                        <span className={`text-[11px] font-bold ${isSelected ? "text-[var(--studio-accent-text)]" : "text-[var(--studio-subtle)]"}`}>מסלול {String(tier.id).padStart(2, "0")}</span>
                                        {"popular" in tier && tier.popular && <span className="rounded-full bg-[var(--studio-accent-bg)] px-3 py-1 text-[11px] font-bold text-[var(--studio-ink)]">הכי נבחר</span>}
                                    </span>
                                    <span className="relative mt-2 flex items-end justify-between gap-3">
                                        <span><span className="block text-[1.55rem] font-bold leading-tight">{tier.displayName}</span><span className={`mt-1 block text-xs ${isSelected ? "text-[#c6d5c1]" : "text-[var(--studio-muted)]"}`}>{tier.sessions} אימונים בחודש</span></span>
                                        <span className="shrink-0 text-end"><span className="text-[2.15rem] font-bold leading-none tabular-nums">{tier.price} ₪</span><span className={`block text-[11px] ${isSelected ? "text-[#c6d5c1]" : "text-[var(--studio-muted)]"}`}>לחודש</span></span>
                                    </span>
                                    <span className={`relative mt-4 flex flex-col gap-2 border-t pt-3 ${isSelected ? "border-white/20" : "border-[#162218]/15"}`}>
                                        {tier.features.slice(1).map((feature) => <span key={feature} className={`flex items-start gap-2 text-xs leading-relaxed ${isSelected ? "text-[#e1e9db]" : "text-[var(--studio-muted)]"}`}><Check aria-hidden="true" className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isSelected ? "text-[var(--studio-accent-text)]" : "text-[var(--studio-subtle)]"}`} />{feature}</span>)}
                                    </span>
                                    <span className={`relative mt-auto block pt-4 text-xs font-bold ${isSelected ? "text-[var(--studio-accent-text)]" : "text-[var(--studio-subtle)]"}`}>{isSelected ? "המסלול שבחרת" : "לבחירת המסלול"}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-4 text-[11px] font-bold text-[var(--studio-subtle)]"><span>החליקי לעוד מסלולים</span><span className="flex items-center gap-1.5" aria-label={`מסלול ${selectedTierId} מתוך 3`}>{TIERS.map((tier) => <span key={tier.id} aria-hidden="true" className={`h-1.5 rounded-full transition-all duration-300 ${selectedTierId === tier.id ? "w-6 bg-[var(--studio-accent-text)]" : "w-1.5 bg-[var(--studio-ink)]/25"}`} />)}</span></div>
                </section>
            </main>

            {showPaymentBar && <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#162218]/15 bg-[var(--studio-canvas)]/95 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
                <div className="mx-auto flex max-w-lg items-center gap-3">
                    <div className="min-w-0 shrink-0"><p className="text-[11px] text-[var(--studio-muted)]">{activeTier.displayName} · {activeTier.sessions} אימונים</p><p className="text-lg font-bold tabular-nums">{activeTier.price} ₪</p></div>
                    <button type="button" onClick={() => setIsPaymentModalOpen(true)} disabled={purchasing} className="flex min-h-12 min-w-0 flex-1 items-center justify-between gap-2 rounded-full bg-[var(--studio-accent-bg)] px-5 text-sm font-bold text-[var(--studio-ink)] transition-transform active:scale-[0.98] disabled:opacity-50">{purchasing ? "מעבירים אותך..." : "לתשלום"}<ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" /></button>
                </div>
            </div>}
        </div>
    );
}
