"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { 
    ChevronRight, 
    ChevronLeft, 
    ArrowDown, 
    Check, 
    ShieldCheck, 
    Clock, 
    Users, 
    ArrowLeft,
    CalendarCheck,
    Dumbbell,
    GraduationCap,
    Sparkles
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";
import PaymentModal from "@/components/subscription/PaymentModal";
import StudioLogo from "@/components/StudioLogo";
import StudioBotanical from "@/components/StudioBotanical";

interface TierPlan {
    id: number;
    key: "basic" | "standard" | "premium";
    title: string;
    subtitle: string;
    englishTag: string;
    tierBadge?: string;
    badgeStyle?: "coral" | "gold" | "neutral";
    price: number;
    sessions: number;
    perSessionPrice: string;
    cadence: string;
    cardStyle: "ivory" | "obsidian" | "bronze";
    specSummary: string;
    facts: {
        title: string;
        detail: string;
    }[];
}

const TIERS: readonly TierPlan[] = [
    { 
        id: 1, 
        key: "basic",
        title: "מסלול 4 אימונים",
        subtitle: "פעם בשבוע · 4 אימונים בחודש",
        englishTag: "TIER 01 · ESSENTIAL",
        tierBadge: "בסיס קבוע",
        badgeStyle: "neutral",
        price: 240, 
        sessions: 4, 
        perSessionPrice: "60 ₪ לאימון",
        cadence: "אימון 1 בשבוע",
        cardStyle: "ivory",
        specSummary: "תוקף חודשי קלנדרי · עד 6 מתאמנות בקבוצה",
        facts: [
            {
                title: "4 כניסות לאימוני סטודיו מלאים",
                detail: "רישום עצמאי באפליקציה למערכת השעות השבועית"
            },
            {
                title: "קבוצות בוטיק עד 6 מתאמנות",
                detail: "השגחה אישית צמודה ודיוק טכניקה לכל תרגיל"
            },
            {
                title: "ביטול עצמאי עד 10 שעות מראש",
                detail: "ביטול ללא חיוב ושמירת הכניסה למועד אחר באותו חודש"
            },
            {
                title: "ללא התחייבות שנתית",
                detail: "חידוש חודשי שוטף עם אפשרות הפסקה בכל עת"
            }
        ]
    },
    { 
        id: 2, 
        key: "standard",
        title: "מסלול 8 אימונים",
        subtitle: "פעמיים בשבוע · 8 אימונים בחודש",
        englishTag: "TIER 02 · SIGNATURE",
        tierBadge: "המסלול הנבחר בסטודיו",
        badgeStyle: "coral",
        price: 450, 
        sessions: 8, 
        perSessionPrice: "56 ₪ לאימון",
        cadence: "2 אימונים בשבוע",
        cardStyle: "obsidian",
        specSummary: "תוקף חודשי קלנדרי · עד 6 מתאמנות בקבוצה",
        facts: [
            {
                title: "8 כניסות לאימוני סטודיו מלאים",
                detail: "רישום עצמאי באפליקציה למערכת השעות השבועית"
            },
            {
                title: "קבוצות בוטיק עד 6 מתאמנות",
                detail: "התאמת משקלים ועומסים אישית לכל רמת כושר"
            },
            {
                title: "ביטול עצמאי עד 10 שעות מראש",
                detail: "ביטול ללא חיוב ושמירת הכניסה למועד אחר באותו חודש"
            },
            {
                title: "אימונים נוספים בתעריף מוזל",
                detail: "אפשרות להוספת אימונים נוספים במהלך החודש ב־56 ₪ לאימון"
            }
        ]
    },
    { 
        id: 3, 
        key: "premium",
        title: "מסלול 12 אימונים",
        subtitle: "3 פעמים בשבוע · 12 אימונים בחודש",
        englishTag: "TIER 03 · VIP ELITE",
        tierBadge: "כולל ליווי תזונתי אישי",
        badgeStyle: "gold",
        price: 650, 
        sessions: 12, 
        perSessionPrice: "54 ₪ לאימון",
        cadence: "3 אימונים בשבוע",
        cardStyle: "bronze",
        specSummary: "התעריף המוזל ביותר לאימון בסטודיו",
        facts: [
            {
                title: "12 כניסות לאימוני סטודיו מלאים",
                detail: "3 כניסות שבועיות להרכב קבוצה של עד 6 מתאמנות בלבד"
            },
            {
                title: "קדימות בהרשמה לשיעורים",
                detail: "פתיחת חלון רישום מוקדם לכל שיעורי השבוע"
            },
            {
                title: "שיחת ייעוץ תזונתי אישית (30 דק')",
                detail: "התאמה תזונתית אישית עם טליה, דיאטנית קלינית (B.Sc)"
            },
            {
                title: "אפשרות הקפאה שנתית עד 7 ימים",
                detail: "שמירה על יתרת האימונים ללא עלות במקרה של חופשה"
            }
        ]
    },
];

export default function SubscriptionPage() {
    const router = useRouter();
    const reduceMotion = useReducedMotion();
    const { profile } = useGymStore();
    const { toast } = useToast();
    
    // Active tier index (0: 4 sessions, 1: 8 sessions [default], 2: 12 sessions)
    const [activeIndex, setActiveIndex] = useState(1);
    const [purchasing, setPurchasing] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [showPaymentBar, setShowPaymentBar] = useState(false);

    const introRef = useRef<HTMLElement>(null);
    const plansRef = useRef<HTMLElement>(null);

    const activeTier = TIERS[activeIndex];

    // Show floating bottom action bar only when scrolled past plans into footer details
    useEffect(() => {
        const plans = plansRef.current;
        if (!plans) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                // Show sticky dock only when user scrolls far down past the cards section
                const isScrolledPast = entry.boundingClientRect.bottom < 200;
                setShowPaymentBar(isScrolledPast);
            }, 
            { threshold: [0, 0.25, 0.5, 0.75, 1] }
        );
        observer.observe(plans);

        const handleScroll = () => {
            if (!plans) return;
            const rect = plans.getBoundingClientRect();
            // Show only when cards are scrolled above top
            setShowPaymentBar(rect.top < -300);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            observer.disconnect();
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    // Haptic feedback helper
    const triggerHaptic = (ms = 10) => {
        if (typeof window !== "undefined" && "vibrate" in navigator) {
            try {
                navigator.vibrate(ms);
            } catch {
                // Ignore
            }
        }
    };

    const handleSelectTier = (index: number) => {
        setActiveIndex(index);
        triggerHaptic(12);
    };

    const handleShowOptions = () => {
        triggerHaptic(15);
        plansRef.current?.scrollIntoView({ 
            behavior: reduceMotion ? "instant" : "smooth", 
            block: "start" 
        });
    };

    const handleBitRedirect = () => {
        setIsPaymentModalOpen(false);
        setPurchasing(true);
        triggerHaptic(30);
        window.open("https://www.bitpay.co.il/app/me/BE137CD7-0248-51EB-42FD-5E889D31DEB83A1E", "_blank");
        toast({
            title: "בקשת התשלום נפתחה בביט",
            description: "האימונים יתווספו ליתרה שלך מיד לאחר אישור ההעברה על ידי טליה.",
            type: "success",
        });
        setTimeout(() => router.push("/dashboard"), 1500);
    };

    // Swipe gesture handler
    // In RTL reading order: Card 0 (4) is to the right, Card 2 (12) is to the left.
    // Swiping right (offset.x > 0) pulls the card on the right into view -> activeIndex decreases.
    // Swiping left (offset.x < 0) pulls the card on the left into view -> activeIndex increases.
    const handleDragEnd = (_e: any, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => {
        const threshold = 40;
        const velocityThreshold = 250;
        
        if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
            if (activeIndex > 0) {
                setActiveIndex(prev => prev - 1);
                triggerHaptic(12);
            }
        } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
            if (activeIndex < TIERS.length - 1) {
                setActiveIndex(prev => prev + 1);
                triggerHaptic(12);
            }
        }
    };

    return (
        <div className="min-h-dvh overflow-x-hidden bg-[var(--studio-canvas)] text-[var(--studio-ink)] selection:bg-[var(--studio-accent-bg)] selection:text-[var(--studio-ink)]">
            <PaymentModal 
                isOpen={isPaymentModalOpen} 
                onClose={() => setIsPaymentModalOpen(false)} 
                onConfirm={handleBitRedirect} 
                tierDisplay={activeTier.title} 
                amount={activeTier.price} 
                userName={profile?.full_name || "מתאמנת"} 
            />

            <main className="mx-auto max-w-lg pb-[calc(5rem+env(safe-area-inset-bottom))]">
                {/* ========================================================
                    1. TEXTUAL INTRO (Factual, Authoritative & Architectural)
                    ======================================================== */}
                <header 
                    ref={introRef} 
                    className="relative isolate overflow-hidden bg-gradient-to-b from-[#e38c75] via-[var(--studio-coral-bg)] to-[#b35e47] px-5 pb-9 pt-5 text-[var(--studio-ink)] shadow-md sm:px-7"
                >
                    {/* Atmospheric Botanical & Radial Glow */}
                    <StudioBotanical 
                        sun={true} 
                        className="studio-botanical-drift pointer-events-none absolute -bottom-10 -left-16 h-72 w-80 text-[var(--studio-deep)]/25" 
                    />
                    <div 
                        aria-hidden="true" 
                        className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-white/20 blur-3xl" 
                    />

                    {/* Top Navigation Row */}
                    <div className="relative mb-6 flex items-center justify-between">
                        <button 
                            type="button" 
                            onClick={() => router.back()} 
                            aria-label="חזרה" 
                            className="flex min-h-12 min-w-12 items-center justify-center rounded-full border border-[#162218]/30 bg-white/25 backdrop-blur-md transition-all active:scale-95 active:bg-white/40"
                        >
                            <ChevronRight aria-hidden="true" className="h-6 w-6 text-[var(--studio-deep)]" />
                        </button>
                        
                        <div className="flex items-center gap-2 rounded-full border border-[#162218]/25 bg-black/10 px-4 py-1.5 backdrop-blur-md">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--studio-accent-text)] opacity-75"></span>
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--studio-accent-text)]"></span>
                            </span>
                            <span className="text-xs font-bold tracking-wide text-[var(--studio-deep)]">
                                סטודיו טליה · מחירון ומסלולים
                            </span>
                        </div>
                    </div>

                    {/* Main Factual Hero Content */}
                    <motion.div 
                        initial={reduceMotion ? false : { opacity: 0, y: 14 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} 
                        className="relative"
                    >
                        {/* Eyebrow Label */}
                        <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-[var(--studio-deep)]/15 px-3 py-1 text-xs font-extrabold text-[var(--studio-deep)]">
                            <Sparkles className="h-4 w-4 text-[var(--studio-deep)]" />
                            <span>אימונים פונקציונליים & ליווי תזונתי</span>
                        </div>

                        {/* Factual, Clear Title */}
                        <h1 className="text-4xl sm:text-5xl font-black leading-[1.05] tracking-tight text-[var(--studio-deep)]">
                            מחירון ומסלולי סטודיו
                        </h1>

                        {/* Factual Studio Narrative */}
                        <p className="mt-4 text-base sm:text-lg font-medium leading-relaxed text-[#2d1b15]">
                            אימוני סטודיו בקבוצות של עד 6 מתאמנות בלבד בהנחיית טליה ברקאי — תזונאית קלינית מוסמכת (B.Sc) ומאמנת כושר. כל המסלולים הם חודשיים מתחדשים ללא התחייבות שנתית וללא דמי רישום.
                        </p>

                        {/* 4 Objective Studio Specifications Grid */}
                        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-3">
                            <div className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white/40 p-3.5 backdrop-blur-sm">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--studio-deep)] text-[var(--studio-accent-text)]">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-black text-[var(--studio-deep)]">עד 6 מתאמנות</p>
                                    <p className="mt-0.5 text-xs font-semibold text-[#4d2d23] leading-tight">יחס אישי ודיוק תנועתי</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white/40 p-3.5 backdrop-blur-sm">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--studio-deep)] text-[var(--studio-accent-text)]">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-black text-[var(--studio-deep)]">ביטול עד 10 שעות</p>
                                    <p className="mt-0.5 text-xs font-semibold text-[#4d2d23] leading-tight">ביטול עצמאי ללא חיוב</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white/40 p-3.5 backdrop-blur-sm">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--studio-deep)] text-[var(--studio-accent-text)]">
                                    <GraduationCap className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-black text-[var(--studio-deep)]">מאמנת & תזונאית</p>
                                    <p className="mt-0.5 text-xs font-semibold text-[#4d2d23] leading-tight">דיאטנית קלינית (B.Sc)</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white/40 p-3.5 backdrop-blur-sm">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--studio-deep)] text-[var(--studio-accent-text)]">
                                    <CalendarCheck className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-black text-[var(--studio-deep)]">ללא התחייבות</p>
                                    <p className="mt-0.5 text-xs font-semibold text-[#4d2d23] leading-tight">חידוש חודשי שוטף</p>
                                </div>
                            </div>
                        </div>

                        {/* "Show Options" CTA Button */}
                        <motion.button 
                            type="button" 
                            onClick={handleShowOptions} 
                            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                            className="group mt-6 flex min-h-14 w-full items-center justify-between rounded-full bg-[var(--studio-deep)] px-6 text-base font-extrabold text-[var(--studio-accent-text)] shadow-xl transition-all hover:bg-[#203123] active:bg-[#111a12]"
                        >
                            <span className="flex items-center gap-2">
                                <span>לצפייה בפירוט המסלולים ובחירת מנוי</span>
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8b8e6f]/30 text-[var(--studio-accent-text)] transition-transform duration-300 group-hover:translate-y-0.5">
                                <ArrowDown aria-hidden="true" className="h-5 w-5 animate-bounce" />
                            </div>
                        </motion.button>
                    </motion.div>
                </header>

                {/* ========================================================
                    2. TIERS SECTION (Large, Bold, Grand Luxury Boutique Cards)
                    ======================================================== */}
                <section 
                    ref={plansRef} 
                    className="scroll-mt-4 pt-8" 
                    aria-labelledby="plans-section-heading"
                >
                    {/* Section Header */}
                    <div className="mb-5 px-5 text-center sm:px-7">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#8b8e6f]/20 px-3.5 py-1 text-xs font-extrabold text-[#455440]">
                            <Dumbbell className="h-3.5 w-3.5" />
                            <span>שלושה מסלולים חודשיים · ללא התחייבות</span>
                        </div>
                        <h2 
                            id="plans-section-heading" 
                            className="mt-2 text-3xl sm:text-4xl font-black leading-tight tracking-tight text-[var(--studio-ink)]"
                        >
                            בחרי את המסלול המתאים לך
                        </h2>
                        <p className="mt-1 text-sm font-medium text-[var(--studio-muted)]">
                            החליקי בין הכרטיסים לצפייה בפרטים, או בחרי מהלשוניות למעבר ישיר
                        </p>
                    </div>

                    {/* Interactive Segmented Tab Switcher */}
                    <div className="px-5 sm:px-7">
                        <div 
                            role="tablist" 
                            aria-label="בחירת מסלול מנוי" 
                            className="mb-5 flex rounded-full border border-[#162218]/15 bg-[var(--studio-card)] p-1.5 shadow-sm"
                        >
                            {TIERS.map((tier, idx) => {
                                const isSelected = activeIndex === idx;
                                return (
                                    <button
                                        key={tier.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={isSelected}
                                        onClick={() => handleSelectTier(idx)}
                                        className={`relative flex-1 rounded-full py-2.5 text-center text-xs sm:text-sm font-extrabold transition-colors ${
                                            isSelected 
                                                ? "text-[var(--studio-deep-contrast)]" 
                                                : "text-[var(--studio-muted)] hover:text-[var(--studio-ink)]"
                                        }`}
                                    >
                                        {isSelected && (
                                            <motion.div
                                                layoutId="active-segment-pill"
                                                className="absolute inset-0 rounded-full bg-[var(--studio-deep)] shadow-sm"
                                                transition={{ type: "spring", stiffness: 450, damping: 35 }}
                                            />
                                        )}
                                        <span className="relative z-10 flex items-center justify-center gap-1.5">
                                            <span>{tier.sessions} אימונים</span>
                                            {tier.badgeStyle === "coral" && !isSelected && (
                                                <span className="h-2 w-2 rounded-full bg-[var(--studio-coral-bg)]" />
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ========================================================
                        FLUID STAGE CAROUSEL WITH 100% INTUITIVE SWIPING
                        Zero stutter, full 120fps hardware acceleration,
                        proper RTL coordinates, and expansive card sizing.
                        ======================================================== */}
                    <div className="relative mx-auto h-[550px] sm:h-[570px] w-full max-w-[430px] overflow-hidden px-4">
                        {TIERS.map((tier, index) => {
                            const offsetIndex = index - activeIndex;
                            const isSelected = offsetIndex === 0;
                            const isObsidian = tier.cardStyle === "obsidian";
                            const isBronze = tier.cardStyle === "bronze";
                            const isIvory = tier.cardStyle === "ivory";

                            // In RTL reading order:
                            // Card 0 (index 0) is to the RIGHT of Card 1.
                            // Card 2 (index 2) is to the LEFT of Card 1.
                            // offsetIndex = index - activeIndex.
                            // When activeIndex=1: Card 0 has offsetIndex=-1 (should be on the RIGHT -> +104%).
                            // Card 2 has offsetIndex=+1 (should be on the LEFT -> -104%).
                            // So xOffset = offsetIndex * -104%.
                            const xPercent = offsetIndex * -104;

                            return (
                                <motion.article
                                    key={tier.id}
                                    role="tabpanel"
                                    aria-hidden={!isSelected}
                                    animate={{
                                        x: `${xPercent}%`,
                                        scale: isSelected ? 1 : 0.9,
                                        opacity: isSelected ? 1 : 0.45,
                                        zIndex: isSelected ? 20 : 10,
                                    }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 320,
                                        damping: 30,
                                    }}
                                    drag={isSelected ? "x" : false}
                                    dragConstraints={{ left: 0, right: 0 }}
                                    dragElastic={0.2}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => {
                                        if (!isSelected) handleSelectTier(index);
                                    }}
                                    className={`absolute inset-x-4 top-1 flex h-[calc(100%-8px)] flex-col justify-between overflow-hidden rounded-[2.25rem] rounded-tl-xl border-2 p-5 text-start select-none sm:p-6 ${
                                        isSelected 
                                            ? "cursor-grab active:cursor-grabbing" 
                                            : "cursor-pointer pointer-events-auto"
                                    } ${
                                        isObsidian
                                            ? "border-[#cbd3aa]/45 bg-gradient-to-b from-[#132216] via-[#0d170f] to-[#070d08] text-[#f6f6ed] shadow-[0_25px_60px_-12px_rgba(17,30,20,0.7),0_0_35px_rgba(203,211,170,0.1)]"
                                            : isBronze
                                            ? "border-[#d4af37]/45 bg-gradient-to-b from-[#1c1a16] via-[#141310] to-[#0c0b09] text-[#f6f6ed] shadow-[0_25px_60px_-15px_rgba(212,175,55,0.25)]"
                                            : "border-[#162218]/15 bg-gradient-to-b from-[#ffffff] via-[#f7f8f1] to-[#edf0e3] text-[var(--studio-ink)] shadow-[0_20px_50px_-15px_rgba(22,34,24,0.15)]"
                                    }`}
                                >
                                    {/* Watermark Logo Emblem */}
                                    <StudioLogo 
                                        className={`pointer-events-none absolute -bottom-8 -left-8 h-44 w-44 opacity-[0.06] ${
                                            isObsidian || isBronze ? "bg-[var(--studio-accent-bg)]" : "bg-[var(--studio-deep)]"
                                        }`} 
                                    />

                                    <div>
                                        {/* Top Badge Row */}
                                        <div className="relative flex items-center justify-between gap-2">
                                            <span className={`text-[11px] font-black tracking-widest uppercase ${
                                                isObsidian 
                                                    ? "text-[var(--studio-accent-text)]" 
                                                    : isBronze 
                                                    ? "text-[#eedc9a]" 
                                                    : "text-[var(--studio-subtle)]"
                                            }`}>
                                                {tier.englishTag}
                                            </span>

                                            {tier.tierBadge && (
                                                <span className={`rounded-full px-3 py-1 text-xs font-extrabold shadow-sm ${
                                                    tier.badgeStyle === "coral"
                                                        ? "bg-[var(--studio-coral-bg)] text-white shadow-[0_2px_10px_rgba(195,122,97,0.45)]"
                                                        : tier.badgeStyle === "gold"
                                                        ? "bg-[#eedc9a]/25 text-[#eedc9a] border border-[#eedc9a]/40"
                                                        : "bg-[#162218]/10 text-[var(--studio-ink)] border border-[#162218]/15"
                                                }`}>
                                                    {tier.tierBadge}
                                                </span>
                                            )}
                                        </div>

                                        {/* Plan Title & Cadence */}
                                        <div className="relative mt-2.5">
                                            <h3 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight">
                                                {tier.title}
                                            </h3>
                                            <p className={`mt-0.5 text-xs sm:text-sm font-semibold ${
                                                isObsidian || isBronze ? "text-[#c2d2bc]" : "text-[var(--studio-muted)]"
                                            }`}>
                                                {tier.subtitle}
                                            </p>
                                        </div>

                                        {/* Pricing Block with Per-Session Breakdown */}
                                        <div className={`relative mt-3 flex items-baseline justify-between border-y py-2.5 ${
                                            isObsidian || isBronze ? "border-white/10" : "border-[#162218]/10"
                                        }`}>
                                            <div>
                                                <span className="text-4xl sm:text-5xl font-black leading-none tracking-tight tabular-nums">
                                                    {tier.price}
                                                </span>
                                                <span className="mr-1 text-xl font-bold">₪</span>
                                                <span className={`mr-1 text-xs font-medium ${isObsidian || isBronze ? "text-[#b2c3ab]" : "text-[var(--studio-muted)]"}`}>
                                                    / לחודש
                                                </span>
                                            </div>

                                            <div className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                                                isObsidian
                                                    ? "bg-[#cbd3aa]/25 text-[#cbd3aa] border border-[#cbd3aa]/40"
                                                    : isBronze
                                                    ? "bg-[#eedc9a]/20 text-[#eedc9a] border border-[#eedc9a]/35"
                                                    : "bg-[#162218]/10 text-[#162218] border border-[#162218]/15"
                                            }`}>
                                                {tier.perSessionPrice}
                                            </div>
                                        </div>

                                        {/* Factual Spec Summary */}
                                        <div className={`mt-2 text-[11px] font-semibold ${
                                            isObsidian ? "text-[#cbd3aa]" : isBronze ? "text-[#eedc9a]" : "text-[var(--studio-deep)]"
                                        }`}>
                                            ✦ {tier.specSummary}
                                        </div>

                                        {/* 4 Clear, Factual Benefits */}
                                        <div className="relative mt-3 flex flex-col gap-2 sm:gap-2.5">
                                            {tier.facts.map((fact, factIdx) => (
                                                <div key={factIdx} className="flex items-start gap-2.5">
                                                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                                                        isObsidian
                                                            ? "bg-[var(--studio-accent-text)] text-[var(--studio-deep)]"
                                                            : isBronze
                                                            ? "bg-[#eedc9a] text-[var(--studio-deep)]"
                                                            : "bg-[var(--studio-deep)] text-[var(--studio-accent-text)]"
                                                    }`}>
                                                        <Check className="h-3 w-3 stroke-[3]" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className={`text-xs sm:text-sm font-bold leading-tight ${
                                                            isObsidian || isBronze ? "text-white" : "text-[var(--studio-ink)]"
                                                        }`}>
                                                            {fact.title}
                                                        </p>
                                                        <p className={`text-[11px] font-medium leading-tight ${
                                                            isObsidian || isBronze ? "text-[#b0c0a8]" : "text-[var(--studio-muted)]"
                                                        }`}>
                                                            {fact.detail}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Card Action Button */}
                                    <div className="relative mt-4">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isSelected) {
                                                    setIsPaymentModalOpen(true);
                                                } else {
                                                    handleSelectTier(index);
                                                }
                                            }}
                                            className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all active:scale-[0.98] ${
                                                isSelected
                                                    ? isObsidian
                                                        ? "bg-[var(--studio-accent-bg)] text-[var(--studio-ink)] shadow-[0_6px_16px_rgba(203,211,170,0.3)] hover:brightness-105"
                                                        : isBronze
                                                        ? "bg-[#eedc9a] text-[var(--studio-deep)] shadow-[0_6px_16px_rgba(238,220,154,0.3)] hover:brightness-105"
                                                        : "bg-[var(--studio-deep)] text-[var(--studio-accent-text)]"
                                                    : isObsidian || isBronze
                                                    ? "border border-white/20 bg-white/10 text-white"
                                                    : "border border-[#162218]/20 bg-black/5 text-[var(--studio-ink)]"
                                            }`}
                                        >
                                            {isSelected ? (
                                                <>
                                                    <span>מעבר לתשלום בביט · {tier.price} ₪</span>
                                                    <ArrowLeft className="h-4 w-4" />
                                                </>
                                            ) : (
                                                <span>בחרי מסלול זה</span>
                                            )}
                                        </button>
                                    </div>
                                </motion.article>
                            );
                        })}
                    </div>

                    {/* Carousel Navigation Controls (Prominent Arrows & Indicators) */}
                    <div className="mt-3 flex items-center justify-between px-6 sm:px-8">
                        {/* Prev Button (In RTL, prev is right arrow) */}
                        <button
                            type="button"
                            onClick={() => handleSelectTier(Math.max(0, activeIndex - 1))}
                            disabled={activeIndex === 0}
                            aria-label="מסלול קודם"
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#162218]/15 bg-[var(--studio-card)] shadow-sm transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-25"
                        >
                            <ChevronRight className="h-5 w-5 text-[var(--studio-ink)]" />
                        </button>

                        {/* Fluid Pill Indicators */}
                        <div 
                            className="flex items-center gap-2" 
                            aria-label={`מסלול ${activeIndex + 1} מתוך ${TIERS.length}`}
                        >
                            {TIERS.map((tier, idx) => {
                                const isCurrent = activeIndex === idx;
                                return (
                                    <button
                                        key={tier.id}
                                        type="button"
                                        onClick={() => handleSelectTier(idx)}
                                        aria-label={`עבור למסלול ${tier.title}`}
                                        className="py-2"
                                    >
                                        <span 
                                            className={`block h-2 rounded-full transition-all duration-300 ${
                                                isCurrent 
                                                    ? "w-8 bg-[var(--studio-deep)] shadow-sm" 
                                                    : "w-2 bg-[#162218]/25 hover:bg-[#162218]/45"
                                            }`} 
                                        />
                                    </button>
                                );
                            })}
                        </div>

                        {/* Next Button (In RTL, next is left arrow) */}
                        <button
                            type="button"
                            onClick={() => handleSelectTier(Math.min(TIERS.length - 1, activeIndex + 1))}
                            disabled={activeIndex === TIERS.length - 1}
                            aria-label="מסלול הבא"
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#162218]/15 bg-[var(--studio-card)] shadow-sm transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-25"
                        >
                            <ChevronLeft className="h-5 w-5 text-[var(--studio-ink)]" />
                        </button>
                    </div>

                    {/* Factual Trust & Peace of Mind Specifications Box */}
                    <div className="mx-5 mt-6 rounded-2xl border border-[#162218]/12 bg-[var(--studio-card)] p-4 shadow-sm sm:mx-7">
                        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-black text-[var(--studio-ink)]">
                            <ShieldCheck className="h-4 w-4 text-[var(--studio-brand)]" />
                            <span>מדיניות תשלומים והרשמה שקופה</span>
                        </div>
                        <ul className="mt-2.5 space-y-1.5 text-xs font-medium text-[var(--studio-muted)] leading-relaxed">
                            <li className="flex items-start gap-2">
                                <span className="font-bold text-[var(--studio-ink)]">•</span>
                                <span>התשלום מועבר ישירות באמצעות אפליקציית ביט (Bit) לחשבון הסטודיו.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold text-[var(--studio-ink)]">•</span>
                                <span>לאחר אישור ההעברה, האימונים נטענים אוטומטית ליתרה שלך באפליקציה.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold text-[var(--studio-ink)]">•</span>
                                <span>המנוי חודשי ומתחדש בכל 1 לחודש, ללא התחייבות שנתית וניתן להפסקה בכל עת.</span>
                            </li>
                        </ul>
                    </div>
                </section>
            </main>

            {/* ========================================================
                3. FLOATING STICKY ACTION BAR
                Appears only when user scrolls far down past the cards section
                ======================================================== */}
            <AnimatePresence>
                {showPaymentBar && (
                    <motion.div 
                        initial={reduceMotion ? false : { y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 32 }}
                        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#162218]/15 bg-[var(--studio-canvas)]/95 px-5 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3.5 shadow-2xl backdrop-blur-2xl"
                    >
                        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
                            <div className="min-w-0 shrink-0">
                                <p className="text-xs font-bold text-[var(--studio-muted)]">
                                    {activeTier.title} · {activeTier.sessions} אימונים
                                </p>
                                <p className="text-xl font-black tabular-nums text-[var(--studio-ink)]">
                                    {activeTier.price} ₪ <span className="text-xs font-normal text-[var(--studio-muted)]">/ חודש</span>
                                </p>
                            </div>
                            
                            <button 
                                type="button" 
                                onClick={() => setIsPaymentModalOpen(true)} 
                                disabled={purchasing} 
                                className="flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--studio-deep)] px-5 text-sm font-extrabold text-[var(--studio-accent-text)] shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50"
                            >
                                <span>{purchasing ? "מעבירים אותך..." : "מעבר לתשלום בביט"}</span>
                                <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
