"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, MoveHorizontal } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";
import StudioLogo from "@/components/StudioLogo";
import StudioBotanical from "@/components/StudioBotanical";
import PaymentModal from "./PaymentModal";

const BIT_URL = "https://www.bitpay.co.il/app/me/BE137CD7-0248-51EB-42FD-5E889D31DEB83A1E";

const PLANS = [
    { sessions: 4, weekly: 1, price: 240, name: "קצב ראשון", rhythm: "פעם בשבוע. מקום קבוע לעצמך.", tag: "מתחילות לזוז", tone: "terracotta",
        features: ["4 אימוני סטודיו בחודש", "קבוצה קטנה, עד 6 מתאמנות", "הרשמה עצמאית למערכת השעות", "ביטול עד 10 שעות מראש, ללא חיוב"] },
    { sessions: 8, weekly: 2, price: 450, name: "נכנסות לקצב", rhythm: "פעמיים בשבוע. שגרה שעושה טוב.", tag: "מקום לתנועה", tone: "sage",
        features: ["8 אימוני סטודיו בחודש", "קבוצה קטנה, עד 6 מתאמנות", "הרשמה עצמאית למערכת השעות", "אימונים נוספים ב־56 ₪ לאימון"] },
    { sessions: 12, weekly: 3, price: 650, name: "יותר בשבילך", rhythm: "3 פעמים בשבוע. תנועה וליווי אישי.", tag: "כולל ליווי תזונתי", tone: "champagne",
        features: ["12 אימוני סטודיו בחודש", "קדימות בהרשמה לשיעורים", "ייעוץ תזונתי אישי · 30 דקות", "אפשרות הקפאה שנתית עד 7 ימים"] },
] as const;

const FAQS = [
    { question: "איך משלמים ומקבלים את האימונים?", answer: "בוחרות מסלול וממשיכות לביט. את הסכום וסיבת ההעברה ממלאים בביט לפי ההנחיות. האימונים יתווספו ליתרה באפליקציה אחרי שטליה תאשר את ההעברה." },
    { question: "איך בוחרים את מועדי האימון?", answer: "את מועדי האימונים בוחרים באופן עצמאי במערכת השעות באפליקציה, בהתאם למקומות הפנויים. הקצב השבועי הוא דרך לעזור לך לבחור מסלול." },
    { question: "מה אם צריך לבטל, ולכמה זמן המסלול תקף?", answer: "אפשר לבטל באפליקציה עד 10 שעות לפני תחילת האימון, ללא חיוב בכניסה. המסלולים תקפים לחודש קלנדרי, ללא התחייבות שנתית. היתרה ותוקף המנוי מוצגים באפליקציה." },
];

// Let the browser animate scrolling. Correct the destination once at completion
// instead of forcing layout and writing the window scroll position every frame.
function revealGallery(element: HTMLElement, reduceMotion: boolean, onComplete: () => void) {
    let frame = 0;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    const cancel = () => {
        cancelAnimationFrame(frame);
        clearTimeout(fallback);
        document.removeEventListener("scrollend", onScrollEnd);
        window.removeEventListener("touchstart", interrupt);
        window.removeEventListener("wheel", interrupt);
        window.removeEventListener("keydown", interrupt);
    };
    const interrupt = () => {
        cancel();
        window.scrollTo({ top: window.scrollY, behavior: "instant" });
    };
    const finish = () => {
        cancel();
        const remaining = element.getBoundingClientRect().top;
        if (Math.abs(remaining) > 1) window.scrollTo({ top: window.scrollY + remaining, behavior: "instant" });
        onComplete();
    };
    const onScrollEnd = (event: Event) => {
        if (event.target === document) finish();
    };
    document.addEventListener("scrollend", onScrollEnd);
    window.addEventListener("touchstart", interrupt, { passive: true });
    window.addEventListener("wheel", interrupt, { passive: true });
    window.addEventListener("keydown", interrupt);
    frame = requestAnimationFrame(() => {
        const destination = window.scrollY + element.getBoundingClientRect().top;
        window.scrollTo({ top: destination, behavior: reduceMotion ? "instant" : "smooth" });
        if (reduceMotion || Math.abs(element.getBoundingClientRect().top) < 1) finish();
        else fallback = setTimeout(finish, 1200);
    });
    return cancel;
}

function TierMotif({ weekly, className = "" }: { weekly: number; className?: string }) {
    return <svg className={`membership-tier-motif ${className}`} viewBox="0 0 120 130" fill="none" aria-hidden="true">
        {[
            "M20 104C-12 53 35-6 74 26S130 103 86 115",
            "M37 96C12 54 45 17 71 38S103 93 75 102",
            "M51 85C35 56 54 35 69 49S82 78 65 86",
        ].map((path, index) => <path key={path} d={path} className={index < weekly ? "is-lit" : undefined} />)}
    </svg>;
}

function PlanGallery({ selected, onSelect, onPurchase, focusOnReveal, revealRequest }: { selected: number; onSelect: (index: number) => void; onPurchase: (button: HTMLButtonElement) => void; focusOnReveal: boolean; revealRequest: number }) {
    const reduceMotion = useReducedMotion();
    const stageRef = useRef<HTMLElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const selectedRef = useRef(selected);
    const requestedRef = useRef(selected);
    const centersRef = useRef<{ index: number; center: number }[]>([]);
    const touchingRef = useRef(false);
    const movingRef = useRef(false);
    const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const [moving, setMoving] = useState(false);

    const finishMovement = useCallback(() => {
        if (touchingRef.current || !trackRef.current || !centersRef.current.length) return;
        clearTimeout(settleTimer.current);
        const center = trackRef.current.scrollLeft + trackRef.current.clientWidth / 2;
        const nearest = centersRef.current.reduce((best, card) => Math.abs(card.center - center) < Math.abs(best.center - center) ? card : best);
        movingRef.current = false;
        setMoving(false);
        requestedRef.current = nearest.index;
        if (nearest.index !== selectedRef.current) { selectedRef.current = nearest.index; onSelect(nearest.index); }
    }, [onSelect]);

    const scheduleSettle = () => {
        clearTimeout(settleTimer.current);
        settleTimer.current = setTimeout(finishMovement, 140);
    };

    const moveTo = useCallback((index: number, instant = false) => {
        const track = trackRef.current;
        const card = centersRef.current.find(card => card.index === index);
        if (!track || !card) return;
        requestedRef.current = index;
        const left = card.center - track.clientWidth / 2;
        track.scrollTo({ left, behavior: instant || reduceMotion ? "instant" : "smooth" });
    }, [reduceMotion]);

    useLayoutEffect(() => {
        const measure = () => {
            centersRef.current = [...(trackRef.current?.querySelectorAll<HTMLElement>("[data-plan-index]") || [])].map(card => ({ index: Number(card.dataset.planIndex), center: card.offsetLeft + card.offsetWidth / 2 }));
        };
        measure();
        moveTo(selectedRef.current, true);
        let width = trackRef.current?.clientWidth;
        const observer = new ResizeObserver(() => {
            const nextWidth = trackRef.current?.clientWidth;
            if (nextWidth !== width) { width = nextWidth; measure(); moveTo(selectedRef.current, true); }
        });
        if (trackRef.current) observer.observe(trackRef.current);
        return () => { clearTimeout(settleTimer.current); observer.disconnect(); };
    }, [moveTo]);

    useEffect(() => {
        const track = trackRef.current;
        const lift = () => {
            if (!touchingRef.current) return;
            touchingRef.current = false;
            clearTimeout(settleTimer.current);
            settleTimer.current = setTimeout(finishMovement, 140);
        };
        track?.addEventListener("scrollend", finishMovement);
        window.addEventListener("touchend", lift, { passive: true, capture: true });
        window.addEventListener("touchcancel", lift, { passive: true, capture: true });
        return () => {
            track?.removeEventListener("scrollend", finishMovement);
            window.removeEventListener("touchend", lift, true);
            window.removeEventListener("touchcancel", lift, true);
            clearTimeout(settleTimer.current);
        };
    }, [finishMovement]);

    useLayoutEffect(() => {
        if (!stageRef.current) return;
        return revealGallery(stageRef.current, Boolean(reduceMotion), () => {
            if (focusOnReveal) trackRef.current?.focus({ preventScroll: true });
        });
    }, [revealRequest, reduceMotion, focusOnReveal]);

    const syncSelection = () => {
        if (!movingRef.current) { movingRef.current = true; setMoving(true); }
        scheduleSettle();
    };

    return (
        <section ref={stageRef} id="membership-plans" className="membership-stage" aria-labelledby="membership-plans-title">
            <div className="membership-stage-heading">
                <a href="#membership-intro" className="membership-intro-link">על הסטודיו <ChevronRight aria-hidden="true" /></a>
                <h2 id="membership-plans-title">לכל שגרה יש התחלה.</h2>
                <p className="membership-swipe-hint"><MoveHorizontal aria-hidden="true" />מחליקות בין המסלולים ובוחרות את שלך</p>
            </div>

            <div ref={trackRef} className="membership-carousel" dir="ltr" role="region" aria-roledescription="קרוסלה" aria-label="מסלולי האימונים" tabIndex={0} onScroll={syncSelection} data-moving={moving} aria-busy={moving}
                onTouchStart={() => { touchingRef.current = true; }}
                onKeyDown={event => {
                    if (event.target !== event.currentTarget) return;
                    const target = event.key === "ArrowRight" ? requestedRef.current - 1 : event.key === "ArrowLeft" ? requestedRef.current + 1 : event.key === "Home" ? 0 : event.key === "End" ? 2 : null;
                    if (target === null) return;
                    event.preventDefault();
                    moveTo(Math.max(0, Math.min(2, target)));
                }}>
                {[2, 1, 0].map(index => {
                    const plan = PLANS[index];
                    const active = selected === index;
                    const perWorkout = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 2 }).format(plan.price / plan.sessions);
                    return <div key={plan.sessions} data-plan-index={index} className={`membership-card-position${active ? " is-active" : ""}`} dir="rtl">
                        <article id={`membership-plan-${index}`} className={`membership-card membership-card--${plan.tone}`} aria-label={`מסלול ${plan.sessions} אימונים`} aria-roledescription="כרטיס מסלול" aria-current={active ? "true" : undefined}>
                            <div className="membership-card-content" inert={!active} aria-hidden={!active}>
                                <div className="membership-card-top"><StudioLogo className="membership-card-logo" /><span><i aria-hidden="true" />{plan.name}</span></div>
                                <div className="membership-card-title"><h3><span className="membership-session-count">{plan.sessions}</span><span className="membership-session-label">אימונים<small>בחודש</small></span></h3><TierMotif weekly={plan.weekly} className="membership-card-motif" /></div>
                                <p className="membership-card-rhythm">{plan.rhythm}</p>
                                <div className="membership-card-price"><span className="membership-price-value" dir="ltr">{plan.price}<span>₪</span></span><span>לחודש</span></div>
                                <p className="membership-unit-price"><bdi>{perWorkout} ₪</bdi> לאימון · ללא התחייבות שנתית</p>
                                <div className="membership-card-rule" aria-hidden="true" />
                                <ul className="membership-card-features">{plan.features.slice(1).map(feature => <li key={feature}><Check aria-hidden="true" /><span>{feature}</span></li>)}</ul>
                                <button type="button" className="membership-card-purchase membership-purchase-button" disabled={!active || moving} onClick={event => onPurchase(event.currentTarget)} aria-haspopup="dialog">זה המסלול שלי <span><ArrowLeft aria-hidden="true" /></span></button>
                                <p className="membership-card-payment">ממשיכות לתשלום בביט</p>
                            </div>
                        </article>
                        <button type="button" className="membership-preview-target" tabIndex={-1} disabled={active} aria-hidden={active} aria-label={`לצפייה במסלול ${plan.sessions} אימונים`} onClick={() => moveTo(index)} />
                    </div>;
                })}
            </div>

            <div className="membership-carousel-controls">
                <button type="button" className="membership-carousel-arrow" aria-label="למסלול הקטן יותר" disabled={selected === 0} onClick={() => moveTo(selected - 1)}><ChevronRight aria-hidden="true" /></button>
                <div className="membership-carousel-pagination" aria-label="בחירת מסלול">{PLANS.map((plan, index) => <button type="button" key={plan.sessions} aria-label={`${plan.sessions} אימונים בחודש`} aria-pressed={selected === index} aria-controls={`membership-plan-${index}`} onClick={() => moveTo(index)}>
                    <span className="membership-pagination-highlight" aria-hidden="true" />
                    <span>{plan.sessions}</span>
                </button>)}</div>
                <button type="button" className="membership-carousel-arrow" aria-label="למסלול הגדול יותר" disabled={selected === 2} onClick={() => moveTo(selected + 1)}><ChevronLeft aria-hidden="true" /></button>
            </div>
            <p className="membership-announcement" role="status" aria-live="polite" aria-atomic="true">נבחר מסלול {PLANS[selected].sessions} אימונים, {PLANS[selected].price} שקלים לחודש.</p>
        </section>
    );
}

export default function SubscriptionExperience() {
    const [plansVisible, setPlansVisible] = useState(false);
    const [keyboardReveal, setKeyboardReveal] = useState(false);
    const [revealRequest, setRevealRequest] = useState(0);
    const [selected, setSelected] = useState(1);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentError, setPaymentError] = useState("");
    const [handoffStarted, setHandoffStarted] = useState(false);
    const reduceMotion = useReducedMotion();
    const { profile, subscription, tickets } = useGymStore();
    const { toast } = useToast();
    const plan = PLANS[selected];
    const selectPlan = useCallback((index: number) => { setSelected(index); setHandoffStarted(false); }, []);

    const openPayment = (button: HTMLButtonElement) => {
        button.focus();
        setPaymentError("");
        setPaymentOpen(true);
    };
    const continueToBit = () => {
        const paymentWindow = window.open(BIT_URL, "_blank");
        if (!paymentWindow) { setPaymentError("הדפדפן חסם את פתיחת ביט. אפשר לאפשר חלונות קופצים ולנסות שוב."); return; }
        paymentWindow.opener = null;
        setPaymentOpen(false);
        setHandoffStarted(true);
        toast({ title: "ביט נפתחה בחלון חדש", description: "האימונים יתווספו אחרי אישור ההעברה על ידי טליה.", type: "info" });
    };
    const showPlans = (fromKeyboard: boolean) => {
        setKeyboardReveal(fromKeyboard);
        setPlansVisible(true);
        setRevealRequest(value => value + 1);
    };

    return <main className="membership-page" data-tone={plansVisible ? plan.tone : "sage"} data-revealed={plansVisible}>
        <div className="membership-scene" aria-hidden="true">{PLANS.map(tier => <div key={tier.tone} className={`membership-scene-layer membership-scene--${tier.tone}`} data-active={(plansVisible ? plan.tone : "sage") === tier.tone}>
            <span className="membership-scene-halo" /><TierMotif weekly={tier.weekly} className="membership-scene-motif" />
            <span className="membership-scene-horizon" />
        </div>)}</div>
        <PaymentModal isOpen={paymentOpen} onClose={() => setPaymentOpen(false)} onConfirm={continueToBit} tierDisplay={`מסלול ${plan.sessions} אימונים`} amount={plan.price} userName={profile?.full_name || "מתאמנת"} error={paymentError} />
        <section id="membership-intro" className="membership-intro" aria-labelledby="membership-title">
            <div className="membership-atmosphere" aria-hidden="true"><span className="membership-orbit" /><span className="membership-sun" /><StudioBotanical className="membership-botanical" sun={false} /></div>
            <header className="membership-header"><Link href="/dashboard" className="membership-back"><ChevronRight aria-hidden="true" /><span>חזרה לבית</span></Link><span className="membership-brand"><StudioLogo className="membership-logo" /><span>סטודיו טליה</span></span></header>
            <div className="membership-intro-copy">
                <motion.p className="membership-eyebrow" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.5 }}>כוח. תנועה. זמן לעצמך.</motion.p>
                <h1 id="membership-title"><span className="membership-hero-line"><motion.span initial={reduceMotion ? false : { y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}>המקום שלך.</motion.span></span>
                    <span className="membership-hero-line membership-hero-accent"><motion.span initial={reduceMotion ? false : { y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.85, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}>בקצב שלך.</motion.span></span></h1>
                <motion.svg aria-hidden="true" viewBox="0 0 300 20" className="membership-hero-underline"><motion.path d="M5 13C79 3 160 3 207 11S261 16 295 6" initial={reduceMotion ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.55, ease: "easeOut" }} /></motion.svg>
                <motion.p className="membership-lead" initial={reduceMotion ? false : { opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.3 }}>אימונים בקבוצה קטנה, יחס אישי ומקום להתחזק.<br />בחרי את המסלול שיכניס תנועה לחיים שלך.</motion.p>
            </div>
            <motion.div className="membership-intro-action" initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.45 }}>
                <motion.button type="button" className="membership-reveal-button" onClick={event => showPlans(event.detail === 0)} aria-expanded={plansVisible} aria-controls={plansVisible ? "membership-plans" : undefined} whileHover={reduceMotion ? undefined : { y: -3 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }}><span>לראות את המסלולים</span><span className="membership-reveal-icon"><ArrowDown aria-hidden="true" /></span></motion.button>
                <p>מסלולים חודשיים · ללא התחייבות שנתית</p>
            </motion.div>
        </section>

        {plansVisible && <div className="membership-revealed">
            <PlanGallery selected={selected} onSelect={selectPlan} onPurchase={openPayment} focusOnReveal={keyboardReveal} revealRequest={revealRequest} />
            <div className="membership-after-plans">
                {subscription?.is_active && <p className="membership-current">המנוי שלך: {subscription.tier_display_name} · {tickets} אימונים ביתרה</p>}
                {handoffStarted && <p className="membership-handoff" role="status">ביט נפתחה. האימונים יתווספו ליתרה שלך אחרי שטליה תאשר את ההעברה.</p>}
                <section className="membership-details" aria-labelledby="membership-faq-title"><h2 id="membership-faq-title">לפני שמתחילות</h2>{FAQS.map(faq => <details key={faq.question} className="membership-faq"><summary><span>{faq.question}</span><ChevronDown aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}</section>
                <footer className="membership-footer"><StudioLogo className="membership-logo" /><span>סטודיו טליה · מקום לעצמך</span></footer>
            </div>
        </div>}
    </main>;
}
