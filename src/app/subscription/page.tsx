"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, Check, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";
import PaymentModal from "@/components/subscription/PaymentModal";
import StudioLogo from "@/components/StudioLogo";

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
    const activeTier = TIERS.find((tier) => tier.id === selectedTierId) ?? TIERS[1];

    useEffect(() => {
        const intro = introRef.current;
        if (!intro) return;
        const observer = new IntersectionObserver(([entry]) => setShowPaymentBar(!entry.isIntersecting), { rootMargin: "-35% 0px 0px 0px", threshold: 0 });
        observer.observe(intro);
        return () => observer.disconnect();
    }, []);

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
            <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} onConfirm={handleBitRedirect} tierDisplay={activeTier.displayName} amount={activeTier.price} userName={profile?.full_name || "מתאמנת"} />

            <main className="mx-auto max-w-lg pb-[calc(7rem+env(safe-area-inset-bottom))]">
                <header ref={introRef} className="relative isolate overflow-hidden bg-[#f28c69] px-5 pb-8 pt-4 sm:px-7">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(#162218_1px,transparent_1px),linear-gradient(90deg,#162218_1px,transparent_1px)] [background-size:28px_28px]" />
                    <StudioLogo className="pointer-events-none absolute -bottom-14 -left-12 h-56 w-56 bg-[#162218]/10" />
                    <button type="button" onClick={() => router.back()} aria-label="חזרה" className="relative mb-8 flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[#162218]/30 transition-colors active:bg-[#162218]/10"><ChevronRight aria-hidden="true" className="h-5 w-5" /></button>
                    <motion.div initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="relative">
                        <p className="mb-3 flex items-center gap-2 text-xs font-bold"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#dce780]" />המסלולים בסטודיו</p>
                        <h1 className="text-[clamp(3.6rem,15vw,5.2rem)] font-bold leading-[0.96] tracking-[-0.06em]">
                            בקצב<br />
                            <span className="relative inline-block pb-3 text-[#f6f6ed]">שלך
                                <svg aria-hidden="true" className="pointer-events-none absolute -bottom-1 inset-x-0 h-5 w-full overflow-visible" viewBox="0 0 100 20" preserveAspectRatio="none">
                                    <path className="studio-hand-underline" d="M3 13 C 24 3, 61 19, 97 8" fill="none" stroke="#dce780" strokeWidth="6" strokeLinecap="round" pathLength="100" />
                                </svg>
                            </span><span className="text-[#162218]">.</span>
                        </h1>
                        <p className="mt-5 max-w-[20rem] text-sm leading-relaxed text-[#513329]">יש לך מקום בכל שיעור. בחרי כמה פעמים תרצי להגיע בחודש, ותוכלי להירשם לאימונים שמתאימים לך.</p>
                        <div className="mt-5 flex items-center gap-3 border-t border-[#162218]/25 pt-4 text-xs font-bold"><span>04 / 08 / 12</span><span className="h-px w-8 bg-[#162218]/40" /><span>אימונים בחודש</span></div>
                        <button type="button" onClick={() => plansRef.current?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth", block: "start" })} className="mt-6 flex min-h-12 w-full items-center justify-between rounded-full bg-[#162218] px-5 text-sm font-bold text-[#dce780] transition-transform active:scale-[0.98]">לראות את המסלולים <ArrowDown aria-hidden="true" className="h-4 w-4" /></button>
                    </motion.div>
                </header>

                <section ref={plansRef} className="scroll-mt-4 px-5 pt-7 sm:px-7" aria-labelledby="plans-title">
                    <div className="mb-5 border-b border-[#162218]/25 pb-4">
                        <p className="text-[11px] font-bold text-[#68794f]">03 מסלולים · קצב אחד שמתאים לך</p>
                        <h2 id="plans-title" className="mt-1 text-[1.8rem] font-bold leading-tight">בוחרים קצב.</h2>
                        <p className="mt-1 text-xs leading-relaxed text-[#5d6958]">הקישי על המסלול שמתאים לך. כל הפרטים כאן, בלי להחליק לצדדים.</p>
                    </div>
                    <div className="space-y-3">
                        {TIERS.map((tier) => {
                            const isSelected = selectedTierId === tier.id;
                            return (
                                <button key={tier.id} type="button" onClick={() => { setSelectedTierId(tier.id); if (navigator.vibrate) navigator.vibrate(5); }} aria-pressed={isSelected}
                                    className={`relative block w-full overflow-hidden rounded-[1.5rem] border p-5 text-start transition-colors duration-200 ${isSelected ? "border-[#162218] bg-[#162218] text-[#f6f6ed]" : "border-[#162218]/15 bg-[#f6f6ed] text-[#162218]"}`}>
                                    <StudioLogo className={`pointer-events-none absolute -bottom-14 -left-14 h-44 w-44 ${isSelected ? "bg-[#dce780]/10" : "bg-[#162218]/5"}`} />
                                    <span className="relative flex items-center justify-between gap-3">
                                        <span className={`text-[11px] font-bold ${isSelected ? "text-[#dce780]" : "text-[#68794f]"}`}>מסלול {String(tier.id).padStart(2, "0")}</span>
                                        {"popular" in tier && tier.popular && <span className="rounded-full bg-[#dce780] px-3 py-1 text-[11px] font-bold text-[#162218]">הכי נבחר</span>}
                                    </span>
                                    <span className="relative mt-2 flex items-end justify-between gap-3">
                                        <span><span className="block text-[1.55rem] font-bold leading-tight">{tier.displayName}</span><span className={`mt-1 block text-xs ${isSelected ? "text-[#c6d5c1]" : "text-[#5d6958]"}`}>{tier.sessions} אימונים בחודש</span></span>
                                        <span className="shrink-0 text-end"><span className="text-[2.15rem] font-bold leading-none tabular-nums">{tier.price} ₪</span><span className={`block text-[11px] ${isSelected ? "text-[#c6d5c1]" : "text-[#5d6958]"}`}>לחודש</span></span>
                                    </span>
                                    <span className={`relative mt-4 flex flex-col gap-2 border-t pt-3 ${isSelected ? "border-white/20" : "border-[#162218]/15"}`}>
                                        {tier.features.slice(1).map((feature) => <span key={feature} className={`flex items-start gap-2 text-xs leading-relaxed ${isSelected ? "text-[#e1e9db]" : "text-[#5d6958]"}`}><Check aria-hidden="true" className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isSelected ? "text-[#dce780]" : "text-[#68794f]"}`} />{feature}</span>)}
                                    </span>
                                    <span className={`relative mt-4 block text-xs font-bold ${isSelected ? "text-[#dce780]" : "text-[#68794f]"}`}>{isSelected ? "המסלול שבחרת" : "לבחירת המסלול"}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>
            </main>

            {showPaymentBar && <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#162218]/15 bg-[#e9eadc]/95 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
                <div className="mx-auto flex max-w-lg items-center gap-3">
                    <div className="min-w-0 shrink-0"><p className="text-[11px] text-[#5d6958]">{activeTier.displayName} · {activeTier.sessions} אימונים</p><p className="text-lg font-bold tabular-nums">{activeTier.price} ₪</p></div>
                    <button type="button" onClick={() => setIsPaymentModalOpen(true)} disabled={purchasing} className="flex min-h-12 min-w-0 flex-1 items-center justify-between gap-2 rounded-full bg-[#162218] px-5 text-sm font-bold text-[#dce780] active:bg-[#334436] disabled:opacity-50">{purchasing ? "מעבירים אותך..." : "לתשלום"}<ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" /></button>
                </div>
            </div>}
        </div>
    );
}
