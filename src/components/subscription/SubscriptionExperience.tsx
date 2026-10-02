"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronDown, ChevronRight, Clock3, Leaf, ShieldCheck, Users } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";
import StudioLogo from "@/components/StudioLogo";
import PaymentModal from "./PaymentModal";

const BIT_URL = "https://www.bitpay.co.il/app/me/BE137CD7-0248-51EB-42FD-5E889D31DEB83A1E";

const PLANS = [
    {
        sessions: 4, weekly: 1, price: 240,
        rhythm: "פעם בשבוע", name: "מקום לעצמך",
        description: "אימון אחד בשבוע. זמן קבוע להתחזק, לזוז ולהתחיל לבנות שגרה.",
        highlight: "מתחילות בקצב נעים",
        features: ["4 אימוני סטודיו בחודש", "הרשמה עצמאית למערכת השעות", "יחס אישי בקבוצה קטנה"],
    },
    {
        sessions: 8, weekly: 2, price: 450,
        rhythm: "פעמיים בשבוע", name: "נכנסות לקצב",
        description: "שני אימונים בשבוע. מקום לתנועה בלו״ז, ושגרה שכיף לחזור אליה.",
        highlight: "זמן לתנועה, זמן לעצמך",
        features: ["8 אימוני סטודיו בחודש", "הרשמה עצמאית למערכת השעות", "אימונים נוספים ב־56 ₪ לאימון"],
    },
    {
        sessions: 12, weekly: 3, price: 650,
        rhythm: "3 פעמים בשבוע", name: "נותנות לעצמך יותר",
        description: "שלושה אימונים בשבוע. יותר תנועה, עם מקום גם לליווי התזונתי שלך.",
        highlight: "כולל ליווי תזונתי אישי",
        features: ["12 אימוני סטודיו בחודש", "קדימות בהרשמה לשיעורים", "שיחת ייעוץ תזונתי אישית · 30 דקות", "אפשרות הקפאה שנתית עד 7 ימים"],
    },
] as const;

const FAQS = [
    { question: "איך משלמים ומקבלים את האימונים?", answer: "בוחרות מסלול וממשיכות לביט. את הסכום וסיבת ההעברה ממלאים בביט לפי ההנחיות. האימונים יתווספו ליתרה באפליקציה אחרי שטליה תאשר את ההעברה." },
    { question: "איך בוחרים את מועדי האימון?", answer: "הקצב השבועי עוזר לבחור מסלול. את מועדי האימונים בוחרים באופן עצמאי במערכת השעות באפליקציה, בהתאם למקומות הפנויים." },
    { question: "מה קורה אם צריך לבטל אימון?", answer: "אפשר לבטל באפליקציה עד 10 שעות לפני תחילת האימון, ללא חיוב בכניסה. הכניסה נשמרת לשימוש במועד אחר באותו חודש." },
    { question: "לכמה זמן המסלול תקף?", answer: "המסלולים הם חודשיים, לפי חודש קלנדרי, ללא התחייבות שנתית. את יתרת האימונים ותוקף המנוי אפשר לראות באפליקציה." },
];

export default function SubscriptionExperience() {
    const [selected, setSelected] = useState(1);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentError, setPaymentError] = useState("");
    const [handoffStarted, setHandoffStarted] = useState(false);
    const reduceMotion = useReducedMotion();
    const { profile, subscription, tickets } = useGymStore();
    const { toast } = useToast();
    const plan = PLANS[selected];
    const perWorkout = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 2 }).format(plan.price / plan.sessions);
    const tierDisplay = `מסלול ${plan.sessions} אימונים`;

    const openPayment = () => {
        setPaymentError("");
        setPaymentOpen(true);
    };

    const continueToBit = () => {
        const paymentWindow = window.open(BIT_URL, "_blank");
        if (!paymentWindow) {
            setPaymentError("הדפדפן חסם את פתיחת ביט. אפשר לאפשר חלונות קופצים ולנסות שוב.");
            return;
        }
        paymentWindow.opener = null;
        setPaymentOpen(false);
        setHandoffStarted(true);
        toast({ title: "ביט נפתחה בחלון חדש", description: "האימונים יתווספו אחרי אישור ההעברה על ידי טליה.", type: "info" });
    };

    return (
        <div className="membership-page">
            <PaymentModal isOpen={paymentOpen} onClose={() => setPaymentOpen(false)} onConfirm={continueToBit}
                tierDisplay={tierDisplay} amount={plan.price} userName={profile?.full_name || "מתאמנת"} error={paymentError} />

            <div className="membership-content">
                <header className="membership-header">
                    <Link href="/dashboard" className="membership-back"><ChevronRight aria-hidden="true" /><span>חזרה לבית</span></Link>
                    <span className="membership-brand"><StudioLogo className="membership-logo" /><span>סטודיו טליה</span></span>
                </header>

                <main id="membership-main">
                    <div className="membership-layout">
                        <div className="membership-discovery">
                            <section className="membership-intro" aria-labelledby="membership-title">
                                <p className="membership-eyebrow">המקום שלך להתחזק</p>
                                <h1 id="membership-title">זמן לעצמך.<br /><span className="membership-title-accent">בקצב שלך.
                                    <svg aria-hidden="true" viewBox="0 0 300 16" preserveAspectRatio="none"><path d="M4 10C65 1 135 3 186 8S255 14 296 5" /></svg>
                                </span></h1>
                                <p className="membership-lead">אימונים בקבוצה קטנה, יחס אישי ושגרה שמתאימה לחיים שלך.</p>
                                {subscription?.is_active && <p className="membership-current"><Check aria-hidden="true" /><span>המנוי שלך: {subscription.tier_display_name} · {tickets} אימונים ביתרה</span></p>}
                            </section>

                            <fieldset className="membership-rhythm">
                                <legend>כמה פעמים בשבוע נפגשות?</legend>
                                <p className="membership-selector-help">בחרי קצב כדי לראות את המסלול שלך</p>
                                <div className="membership-options">
                                    {PLANS.map((option, index) => (
                                        <label key={option.sessions} className={`membership-option${selected === index ? " is-selected" : ""}`}>
                                            <input type="radio" name="membership-rhythm" value={option.sessions} checked={selected === index}
                                                onChange={() => { setSelected(index); setHandoffStarted(false); }}
                                                aria-label={`${option.rhythm}, ${option.sessions} אימונים בחודש, ${option.price} שקלים לחודש`} />
                                            <span className="membership-option-check" aria-hidden="true"><Check /></span>
                                            <span className="membership-option-number" aria-hidden="true">{option.weekly}</span>
                                            <span className="membership-option-unit" aria-hidden="true">{option.weekly === 1 ? "אימון בשבוע" : "אימונים בשבוע"}</span>
                                            <span className="membership-option-month" aria-hidden="true"><bdi>{option.price} ₪</bdi> לחודש</span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>

                            <div className="membership-assurances" aria-label="בכל המסלולים">
                                <span><Users aria-hidden="true" />עד 6 מתאמנות</span>
                                <span><ShieldCheck aria-hidden="true" />ללא התחייבות שנתית</span>
                            </div>
                        </div>

                        <section className="membership-plan" aria-label="פירוט המסלול הנבחר">
                            <div className="membership-plan-topline"><span>המסלול שלך</span><span className="membership-plan-tag"><Leaf aria-hidden="true" />{plan.highlight}</span></div>
                            <motion.div key={plan.sessions} initial={reduceMotion ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: reduceMotion ? 0 : 0.2 }} className="membership-plan-heading">
                                <h2>{plan.name}</h2>
                                <p>{plan.description}</p>
                            </motion.div>

                            <div className="membership-price-block">
                                <p className="membership-price"><span className="membership-price-value" dir="ltr">{plan.price}<span className="membership-currency">₪</span></span><span className="membership-price-period">לחודש</span></p>
                                <div className="membership-workout-count"><strong>{plan.sessions}</strong><span>אימונים<br />בחודש</span></div>
                            </div>
                            <p className="membership-unit-price"><span><bdi>{perWorkout} ₪</bdi> לאימון</span><span>מסלול חודשי</span></p>

                            <ul className="membership-plan-features">
                                {plan.features.map(feature => <li key={feature}><Check aria-hidden="true" /><span>{feature}</span></li>)}
                            </ul>
                            <div className="membership-plan-note"><Clock3 aria-hidden="true" /><span>ביטול אימון עד 10 שעות מראש, ללא חיוב</span></div>
                            <p className="membership-announcement" role="status" aria-live="polite" aria-atomic="true">נבחר {tierDisplay}, {plan.price} שקלים לחודש, {perWorkout} שקלים לאימון.</p>
                        </section>
                    </div>

                    {handoffStarted && <div className="membership-handoff" role="status"><Check aria-hidden="true" /><p>ביט נפתחה. האימונים יתווספו ליתרה שלך אחרי שטליה תאשר את ההעברה.</p></div>}

                    <section className="membership-details" aria-labelledby="membership-faq-title">
                        <div className="membership-faq-intro"><p className="membership-eyebrow">הכול ברור, לפני שמתחילות</p><h2 id="membership-faq-title">יש לך שאלה?</h2><p>התשלום, ההרשמה וכל מה שביניהם.</p></div>
                        <div className="membership-faq-list">
                            {FAQS.map(faq => <details key={faq.question} className="membership-faq"><summary><span>{faq.question}</span><ChevronDown aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}
                        </div>
                    </section>
                    <footer className="membership-footer"><span>סטודיו טליה</span><span>כוח. תנועה. מקום לעצמך.</span></footer>
                </main>
            </div>

            <div className="membership-purchase-bar">
                <div className="membership-purchase-inner">
                    <div className="membership-purchase-summary"><span>{plan.sessions} אימונים בחודש</span><strong><bdi>{plan.price} ₪</bdi><span> / חודש</span></strong></div>
                    <button type="button" className="membership-purchase-button" onClick={event => { event.currentTarget.focus(); openPayment(); }} aria-haspopup="dialog"><span>{handoffStarted ? "פתיחה חוזרת של ביט" : "זה הקצב שלי"}</span><ArrowLeft aria-hidden="true" /></button>
                    <p className="membership-purchase-help">ממשיכות לתשלום בביט · האימונים יתווספו אחרי אישור טליה</p>
                </div>
            </div>
        </div>
    );
}
