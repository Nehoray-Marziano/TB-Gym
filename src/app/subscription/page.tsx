"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { 
    ChevronRight, 
    ChevronLeft, 
    ArrowDown, 
    Check, 
    Sparkles, 
    ShieldCheck, 
    Clock, 
    Users, 
    HeartHandshake, 
    ArrowLeft,
    CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useGymStore } from "@/providers/GymStoreProvider";
import { useToast } from "@/components/ui/use-toast";
import PaymentModal from "@/components/subscription/PaymentModal";
import StudioLogo from "@/components/StudioLogo";
import StudioBotanical from "@/components/StudioBotanical";

interface TierPlan {
    id: number;
    displayName: string;
    subheading: string;
    sessions: number;
    frequencyText: string;
    price: number;
    perSessionPrice: string;
    popular?: boolean;
    tierBadge?: string;
    cardTheme: "basic" | "popular" | "premium";
    features: string[];
    perkHighlight: string;
}

const TIERS: readonly TierPlan[] = [
    { 
        id: 1, 
        displayName: "בסיסי", 
        subheading: "שמירה על קצב ותנועה עקבית",
        sessions: 4, 
        frequencyText: "פעם בשבוע",
        price: 240, 
        perSessionPrice: "60 ₪ לאימון",
        cardTheme: "basic",
        perkHighlight: "מושלם לשילוב עם שגרת אימונים קיימת",
        features: [
            "4 כניסות לאימוני סטודיו בחודש", 
            "גישה מלאה לכל סוגי השיעורים", 
            "ביטול ללא עלות עד 10 שעות לפני האימון", 
            "קבוצות אינטימיות של עד 6 מתאמנות", 
            "מעקב אימונים והתקדמות באפליקציה"
        ] 
    },
    { 
        id: 2, 
        displayName: "סטנדרטי", 
        subheading: "האיזון המושלם לבניית כוח וחיטוב",
        sessions: 8, 
        frequencyText: "פעמיים בשבוע",
        price: 450, 
        perSessionPrice: "כ־56 ₪ לאימון",
        popular: true, 
        tierBadge: "הבחירה הפופולרית ביותר ⭐",
        cardTheme: "popular",
        perkHighlight: "הקצב המומלץ על ידי טליה לתוצאות נראות לעין",
        features: [
            "8 כניסות לאימוני סטודיו בחודש", 
            "מחיר משתלם: כ־56 ₪ בלבד לאימון", 
            "גישה מלאה לכל מערכת השעות והשיעורים", 
            "ביטול ללא עלות עד 10 שעות לפני האימון", 
            "אפשרות להוספת אימונים נוספים באותו מחיר", 
            "התאמת עומסים אישית וליווי תזונתי מתמשך"
        ] 
    },
    { 
        id: 3, 
        displayName: "פרימיום", 
        subheading: "מחויבות מלאה לאנרגיה שיא ושינוי עמוק",
        sessions: 12, 
        frequencyText: "3 פעמים בשבוע",
        price: 650, 
        perSessionPrice: "כ־54 ₪ לאימון",
        tierBadge: "מקסימום תוצאות ✦ VIP",
        cardTheme: "premium",
        perkHighlight: "החבילה המשתלמת ביותר עם עדיפות מלאה",
        features: [
            "12 כניסות לאימוני סטודיו בחודש", 
            "המחיר המשתלם ביותר: כ־54 ₪ לאימון", 
            "קדימות ורישום מוקדם לשיעורים מבוקשים", 
            "אפשרות להקפאת מנוי עד שבוע בשנה", 
            "ביטול ללא עלות עד 10 שעות מראש", 
            "שיחת ייעוץ תזונתי אישית מותאמת למטרות שלך"
        ] 
    },
];

export default function SubscriptionPage() {
    const router = useRouter();
    const reduceMotion = useReducedMotion();
    const { profile } = useGymStore();
    const { toast } = useToast();
    
    // Active tier index (0, 1, 2) - defaults to 1 (סטנדרטי)
    const [activeIndex, setActiveIndex] = useState(1);
    const [purchasing, setPurchasing] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [showPaymentBar, setShowPaymentBar] = useState(false);
    const [hasRevealedTiers, setHasRevealedTiers] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Touch swipe coordinate memory
    const touchStartX = useRef<number | null>(null);

    const introRef = useRef<HTMLElement>(null);
    const plansRef = useRef<HTMLElement>(null);

    const activeTier = TIERS[activeIndex];

    // Intersection observer to toggle floating action bar
    useEffect(() => {
        const intro = introRef.current;
        if (!intro) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                setShowPaymentBar(!entry.isIntersecting);
                if (!entry.isIntersecting) {
                    setHasRevealedTiers(true);
                }
            }, 
            { rootMargin: "-25% 0px 0px 0px", threshold: 0 }
        );
        observer.observe(intro);
        return () => observer.disconnect();
    }, []);

    // Haptic feedback helper
    const triggerHaptic = (ms = 12) => {
        if (typeof window !== "undefined" && "vibrate" in navigator) {
            try {
                navigator.vibrate(ms);
            } catch {
                // Ignore if not supported
            }
        }
    };

    // Card navigation helpers
    const goToIndex = (index: number) => {
        if (index >= 0 && index < TIERS.length) {
            setActiveIndex(index);
            triggerHaptic(10);
        }
    };

    const handleNext = () => {
        // In Hebrew RTL, next is index + 1 (slides left)
        if (activeIndex < TIERS.length - 1) {
            goToIndex(activeIndex + 1);
        }
    };

    const handlePrev = () => {
        // In Hebrew RTL, prev is index - 1 (slides right)
        if (activeIndex > 0) {
            goToIndex(activeIndex - 1);
        }
    };

    const handleShowOptions = () => {
        triggerHaptic(15);
        setHasRevealedTiers(true);
        plansRef.current?.scrollIntoView({ 
            behavior: reduceMotion ? "instant" : "smooth", 
            block: "start" 
        });
    };

    // Touch event handlers for carousel container
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        const threshold = 35;
        // In RTL, swipe left (negative deltaX) -> next tier
        if (deltaX < -threshold) {
            handleNext();
        } else if (deltaX > threshold) {
            handlePrev();
        }
    };

    const handleBitRedirect = () => {
        setIsPaymentModalOpen(false);
        setPurchasing(true);
        triggerHaptic(30);
        window.open("https://www.bitpay.co.il/app/me/BE137CD7-0248-51EB-42FD-5E889D31DEB83A1E", "_blank");
        toast({
            title: "בקשת התשלום נפתחה בביט",
            description: "האימונים יתווספו ליתרה שלך אחרי שטליה תאשר את ההעברה.",
            type: "success",
        });
        setTimeout(() => router.push("/dashboard"), 1500);
    };

    return (
        <div className="min-h-dvh overflow-x-hidden bg-[var(--studio-canvas)] text-[var(--studio-ink)] selection:bg-[var(--studio-accent-bg)] selection:text-[var(--studio-ink)]">
            <PaymentModal 
                isOpen={isPaymentModalOpen} 
                onClose={() => setIsPaymentModalOpen(false)} 
                onConfirm={handleBitRedirect} 
                tierDisplay={activeTier.displayName} 
                amount={activeTier.price} 
                userName={profile?.full_name || "מתאמנת"} 
            />

            <main className="mx-auto max-w-lg pb-[calc(8.5rem+env(safe-area-inset-bottom))]">
                {/* ========================================================
                    1. TEXTUAL INTRO (Hero with rich editorial narrative)
                    ======================================================== */}
                <header 
                    ref={introRef} 
                    className="relative isolate overflow-hidden bg-gradient-to-b from-[#df876d] via-[var(--studio-coral-bg)] to-[#b86d56] px-5 pb-10 pt-5 text-[var(--studio-ink)] shadow-md sm:px-7"
                >
                    {/* Atmospheric Botanical & Light Ambient Orbs */}
                    <StudioBotanical 
                        sun={true} 
                        className="studio-botanical-drift pointer-events-none absolute -bottom-12 -left-16 h-64 w-80 text-[var(--studio-deep)]/25" 
                    />
                    <div 
                        aria-hidden="true" 
                        className="pointer-events-none absolute -top-20 right-0 h-72 w-72 rounded-full bg-white/15 blur-3xl" 
                    />

                    {/* Top Navigation Row */}
                    <div className="relative mb-6 flex items-center justify-between">
                        <button 
                            type="button" 
                            onClick={() => router.back()} 
                            aria-label="חזרה" 
                            className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[#162218]/30 bg-white/20 backdrop-blur-md transition-all active:scale-95 active:bg-white/35"
                        >
                            <ChevronRight aria-hidden="true" className="h-5 w-5 text-[var(--studio-deep)]" />
                        </button>
                        
                        <div className="flex items-center gap-2 rounded-full border border-[#162218]/25 bg-black/10 px-3.5 py-1.5 backdrop-blur-md">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--studio-accent-text)] opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--studio-accent-text)]"></span>
                            </span>
                            <span className="text-xs font-bold tracking-wide text-[var(--studio-deep)]">
                                סטודיו טליה · מסלולים
                            </span>
                        </div>
                    </div>

                    {/* Main Textual Hero Content */}
                    <motion.div 
                        initial={reduceMotion ? false : { opacity: 0, y: 16 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} 
                        className="relative"
                    >
                        {/* Eyebrow Label */}
                        <p className="mb-3 inline-flex items-center gap-2 rounded-md bg-[var(--studio-deep)]/10 px-2.5 py-1 text-xs font-bold text-[var(--studio-deep)]">
                            <Sparkles className="h-3.5 w-3.5 text-[var(--studio-deep)]" />
                            אימוני בוטיק & תזונה קלינית
                        </p>

                        {/* Title with artistic calligraphy underline */}
                        <h1 className="text-[clamp(3.1rem,13vw,4.5rem)] font-bold leading-[0.98] tracking-[-0.05em] text-[var(--studio-deep)]">
                            להתחזק.<br />
                            להתמיד.<br />
                            <span className="relative inline-block pb-3 text-[var(--studio-deep-contrast)]">
                                בקצב שלך
                                <svg 
                                    aria-hidden="true" 
                                    className="pointer-events-none absolute -bottom-1 inset-x-0 h-5 w-full overflow-visible" 
                                    viewBox="0 0 100 20" 
                                    preserveAspectRatio="none"
                                >
                                    <path 
                                        className="studio-hand-underline" 
                                        d="M3 13 C 24 3, 61 19, 97 8" 
                                        fill="none" 
                                        stroke="var(--studio-accent-text)" 
                                        strokeWidth="6" 
                                        strokeLinecap="round" 
                                        pathLength="100" 
                                    />
                                </svg>
                            </span>
                            <span className="text-[var(--studio-deep)]">.</span>
                        </h1>

                        {/* Editorial Narrative */}
                        <p className="mt-5 text-[0.95rem] leading-relaxed text-[#352019] sm:text-base">
                            בסטודיו של טליה כל מתאמנת מקבלת יחס אישי והתאמה מדויקת.
                            הקבוצות קטנות, האנרגיה ממוקדת, והמחויבות היא קודם כל לבריאות שלך.
                            בחרי את המסלול שמתאים לשגרה שלך החודש.
                        </p>

                        {/* 3 Hallmark Studio Value Pillars */}
                        <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                            <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/30 p-3 backdrop-blur-sm">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--studio-deep)] text-[var(--studio-accent-text)]">
                                    <Users className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-[var(--studio-deep)]">עד 6 מתאמנות</p>
                                    <p className="text-[11px] text-[#4d2d23]">יחס אישי לכל תנועה</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/30 p-3 backdrop-blur-sm">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--studio-deep)] text-[var(--studio-accent-text)]">
                                    <Clock className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-[var(--studio-deep)]">ביטול גמיש</p>
                                    <p className="text-[11px] text-[#4d2d23]">עד 10 שעות לפני האימון</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/30 p-3 backdrop-blur-sm">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--studio-deep)] text-[var(--studio-accent-text)]">
                                    <HeartHandshake className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-[var(--studio-deep)]">ליווי מקצועי</p>
                                    <p className="text-[11px] text-[#4d2d23]">מאמנת ודיאטנית קלינית</p>
                                </div>
                            </div>
                        </div>

                        {/* Frequency Quick-Counter */}
                        <div className="mt-6 flex items-center justify-between border-t border-[#162218]/20 pt-4 text-xs font-bold text-[var(--studio-deep)]">
                            <span className="tracking-widest">04 / 08 / 12 אימונים בחודש</span>
                            <span className="text-[11px] font-semibold text-[#4d2d23]">גמישות מלאה בבחירת שיעורים</span>
                        </div>

                        {/* "Show Options" CTA Button */}
                        <motion.button 
                            type="button" 
                            onClick={handleShowOptions} 
                            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                            className="group mt-6 flex min-h-14 w-full items-center justify-between rounded-full bg-[var(--studio-deep)] px-6 text-sm font-bold text-[var(--studio-accent-text)] shadow-xl transition-all hover:bg-[#203123] active:bg-[#111a12]"
                        >
                            <span className="flex items-center gap-2">
                                <span>לצפייה במסלולים ובחירת מנוי</span>
                            </span>
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8b8e6f]/30 text-[var(--studio-accent-text)] transition-transform duration-300 group-hover:translate-y-0.5">
                                <ArrowDown aria-hidden="true" className="h-4 w-4 animate-bounce" />
                            </div>
                        </motion.button>
                    </motion.div>
                </header>

                {/* ========================================================
                    2. TIERS SECTION (Animated entrance with 3D Coverflow Card Swiper)
                    ======================================================== */}
                <section 
                    ref={plansRef} 
                    className="scroll-mt-4 px-4 pt-7 sm:px-6" 
                    aria-labelledby="plans-section-heading"
                >
                    {/* Section Header */}
                    <div className="mb-5 text-center">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#8b8e6f]/20 px-3 py-1 text-[11px] font-bold text-[#4c5c46]">
                            <Sparkles className="h-3 w-3" />
                            <span>שלושה מסלולים · התאמה מושלמת</span>
                        </div>
                        <h2 
                            id="plans-section-heading" 
                            className="mt-1.5 text-[1.9rem] font-bold leading-tight tracking-tight text-[var(--studio-ink)]"
                        >
                            בחרי את הקצב שלך
                        </h2>
                        <p className="mt-1 text-xs text-[var(--studio-muted)]">
                            החליקי בין הכרטיסים כדי להשוות, או לחצי על המסלול שמתאים לך
                        </p>
                    </div>

                    {/* Interactive Segmented Tab Switcher */}
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
                                    onClick={() => goToIndex(idx)}
                                    className={`relative flex-1 rounded-full py-2.5 text-center text-xs font-bold transition-colors ${
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
                                    <span className="relative z-10 flex items-center justify-center gap-1">
                                        <span>{tier.displayName}</span>
                                        <span className="text-[10px] opacity-75">({tier.sessions})</span>
                                        {tier.popular && !isSelected && (
                                            <span className="hidden h-1.5 w-1.5 rounded-full bg-[var(--studio-coral-bg)] sm:inline-block" />
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* ========================================================
                        3D COVERFLOW SWIPABLE CARDS CAROUSEL
                        Sophisticated, tactile, expensive animated transition
                        ======================================================== */}
                    <div 
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        className="relative mx-auto flex h-[480px] w-full max-w-[360px] items-center justify-center overflow-visible"
                    >
                        {TIERS.map((tier, index) => {
                            const diff = index - activeIndex;
                            const isActive = diff === 0;

                            // 3D transformation values in Hebrew RTL:
                            // diff === -1 (index < activeIndex, e.g. Basic): sits to the right
                            // diff === +1 (index > activeIndex, e.g. Premium): sits to the left
                            let xOffsetPercent = 0;
                            let scale = 1;
                            let rotateY = 0;
                            let opacity = 1;
                            let zIndex = 20;

                            if (diff === 0) {
                                xOffsetPercent = 0;
                                scale = 1;
                                rotateY = 0;
                                opacity = 1;
                                zIndex = 30;
                            } else if (diff === -1) {
                                xOffsetPercent = 75;
                                scale = 0.88;
                                rotateY = -9;
                                opacity = 0.65;
                                zIndex = 15;
                            } else if (diff === 1) {
                                xOffsetPercent = -75;
                                scale = 0.88;
                                rotateY = 9;
                                opacity = 0.65;
                                zIndex = 15;
                            } else if (diff < -1) {
                                xOffsetPercent = 140;
                                scale = 0.78;
                                rotateY = -12;
                                opacity = 0;
                                zIndex = 5;
                            } else if (diff > 1) {
                                xOffsetPercent = -140;
                                scale = 0.78;
                                rotateY = 12;
                                opacity = 0;
                                zIndex = 5;
                            }

                            const isPopular = tier.cardTheme === "popular";
                            const isPremium = tier.cardTheme === "premium";

                            return (
                                <motion.div
                                    key={tier.id}
                                    role="region"
                                    aria-label={`כרטיס מסלול ${tier.displayName}`}
                                    aria-hidden={!isActive}
                                    onClick={() => {
                                        if (!isActive && !isDragging) {
                                            goToIndex(index);
                                        }
                                    }}
                                    drag={isActive ? "x" : false}
                                    dragConstraints={{ left: 0, right: 0 }}
                                    dragElastic={0.22}
                                    onDragStart={() => setIsDragging(true)}
                                    onDragEnd={(_e, info) => {
                                        setIsDragging(false);
                                        const swipeThreshold = 35;
                                        const velocityThreshold = 250;
                                        if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
                                            handleNext();
                                        } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
                                            handlePrev();
                                        }
                                    }}
                                    animate={reduceMotion ? {
                                        opacity: isActive ? 1 : 0,
                                        scale: isActive ? 1 : 0.95,
                                    } : {
                                        x: `${xOffsetPercent}%`,
                                        scale,
                                        rotateY,
                                        opacity,
                                        zIndex,
                                    }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 340,
                                        damping: 32,
                                        mass: 0.85
                                    }}
                                    style={{
                                        perspective: 1200,
                                        transformStyle: "preserve-3d",
                                    }}
                                    className={`absolute inset-x-0 top-0 mx-auto flex h-full w-[88vw] max-w-[340px] flex-col overflow-hidden rounded-[2.2rem] rounded-tl-xl border p-5 text-start select-none transition-shadow ${
                                        isActive ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                                    } ${
                                        isPopular
                                            ? "border-[#cbd3aa]/50 bg-gradient-to-b from-[#19271c] via-[#142017] to-[#0c150e] text-[#f6f6ed] shadow-[0_25px_50px_-12px_rgba(22,34,24,0.45),0_0_25px_rgba(203,211,170,0.15)]"
                                            : isPremium
                                            ? "border-[#d4af37]/35 bg-gradient-to-b from-[#1e1e18] via-[#161713] to-[#0f110c] text-[#f6f6ed] shadow-[0_20px_45px_-12px_rgba(22,34,24,0.35)]"
                                            : "border-[#162218]/15 bg-gradient-to-b from-[#ffffff] via-[#f7f8ef] to-[#edf0e0] text-[var(--studio-ink)] shadow-[0_15px_35px_-10px_rgba(22,34,24,0.12)]"
                                    }`}
                                >
                                    {/* Watermark stamp */}
                                    <StudioLogo 
                                        className={`pointer-events-none absolute -bottom-14 -left-14 h-48 w-48 opacity-10 ${
                                            isPopular || isPremium ? "bg-[var(--studio-accent-bg)]" : "bg-[var(--studio-deep)]"
                                        }`} 
                                    />

                                    {/* Top Card Badge / Ribbon */}
                                    <div className="relative flex items-center justify-between gap-2">
                                        <span className={`text-[11px] font-bold tracking-wider ${
                                            isPopular 
                                                ? "text-[var(--studio-accent-text)]" 
                                                : isPremium 
                                                ? "text-[#eedc9a]" 
                                                : "text-[var(--studio-subtle)]"
                                        }`}>
                                            מסלול {String(tier.id).padStart(2, "0")}
                                        </span>

                                        {tier.tierBadge ? (
                                            <span className={`rounded-full px-3 py-1 text-[11px] font-bold shadow-sm ${
                                                isPopular
                                                    ? "bg-[var(--studio-coral-bg)] text-white shadow-[0_2px_8px_rgba(195,122,97,0.4)]"
                                                    : "bg-[#eedc9a]/25 text-[#eedc9a] border border-[#eedc9a]/40"
                                            }`}>
                                                {tier.tierBadge}
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-[#162218]/8 px-2.5 py-0.5 text-[10px] font-semibold text-[var(--studio-subtle)]">
                                                קצב רגוע
                                            </span>
                                        )}
                                    </div>

                                    {/* Plan Title & Frequency */}
                                    <div className="relative mt-2.5">
                                        <h3 className="text-[1.75rem] font-bold leading-tight tracking-tight">
                                            {tier.displayName}
                                        </h3>
                                        <p className={`mt-0.5 text-xs ${
                                            isPopular || isPremium ? "text-[#c3d3bc]" : "text-[var(--studio-muted)]"
                                        }`}>
                                            {tier.sessions} אימונים בחודש · {tier.frequencyText}
                                        </p>
                                    </div>

                                    {/* Pricing Block with Per-Session Breakdown */}
                                    <div className="relative mt-3 flex items-baseline justify-between border-y border-white/10 py-2.5">
                                        <div>
                                            <span className="text-[2.4rem] font-bold leading-none tracking-tight tabular-nums">
                                                {tier.price}
                                            </span>
                                            <span className="mr-1 text-base font-bold">₪</span>
                                            <span className={`mr-1 text-xs ${isPopular || isPremium ? "text-[#b2c3ab]" : "text-[var(--studio-muted)]"}`}>
                                                / לחודש
                                            </span>
                                        </div>
                                        <div className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                            isPopular
                                                ? "bg-[#cbd3aa]/25 text-[#cbd3aa] border border-[#cbd3aa]/40"
                                                : isPremium
                                                ? "bg-[#eedc9a]/20 text-[#eedc9a] border border-[#eedc9a]/35"
                                                : "bg-[#162218]/10 text-[#162218] border border-[#162218]/15"
                                        }`}>
                                            {tier.perSessionPrice}
                                        </div>
                                    </div>

                                    {/* Perk Highlight Callout */}
                                    <div className={`relative mt-2.5 rounded-xl px-2.5 py-1.5 text-[11px] font-medium leading-snug ${
                                        isPopular
                                            ? "bg-white/10 text-[var(--studio-accent-text)]"
                                            : isPremium
                                            ? "bg-[#eedc9a]/10 text-[#eedc9a]"
                                            : "bg-[var(--studio-deep)]/5 text-[var(--studio-subtle)]"
                                    }`}>
                                        ✦ {tier.perkHighlight}
                                    </div>

                                    {/* Features Checklist */}
                                    <div className="relative mt-3 flex flex-1 flex-col gap-2 overflow-hidden">
                                        {tier.features.slice(0, 5).map((feature, fIdx) => (
                                            <div 
                                                key={fIdx} 
                                                className={`flex items-start gap-2 text-xs leading-relaxed ${
                                                    isPopular || isPremium ? "text-[#d8e4d3]" : "text-[var(--studio-muted)]"
                                                }`}
                                            >
                                                <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                                                    isPopular
                                                        ? "bg-[var(--studio-accent-text)] text-[var(--studio-deep)]"
                                                        : isPremium
                                                        ? "bg-[#eedc9a] text-[var(--studio-deep)]"
                                                        : "bg-[var(--studio-deep)] text-[var(--studio-accent-text)]"
                                                }`}>
                                                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                                                </div>
                                                <span className="min-w-0">{feature}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Card Action Button */}
                                    <div className="relative mt-auto pt-3">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isActive) {
                                                    setIsPaymentModalOpen(true);
                                                } else {
                                                    goToIndex(index);
                                                }
                                            }}
                                            className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-xs font-bold transition-all active:scale-[0.98] ${
                                                isActive
                                                    ? isPopular
                                                        ? "bg-[var(--studio-accent-bg)] text-[var(--studio-ink)] shadow-lg hover:brightness-105"
                                                        : isPremium
                                                        ? "bg-[#eedc9a] text-[var(--studio-deep)] shadow-lg hover:brightness-105"
                                                        : "bg-[var(--studio-deep)] text-[var(--studio-accent-text)] shadow-md"
                                                    : isPopular || isPremium
                                                    ? "border border-white/20 bg-white/10 text-white"
                                                    : "border border-[#162218]/20 bg-black/5 text-[var(--studio-ink)]"
                                            }`}
                                        >
                                            {isActive ? (
                                                <>
                                                    <span>המסלול הנבחר · מעבר לתשלום</span>
                                                    <ArrowLeft className="h-3.5 w-3.5" />
                                                </>
                                            ) : (
                                                <span>בחרי מסלול זה</span>
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Carousel Navigation Controls (Arrows & Smooth Pagination Indicators) */}
                    <div className="mt-4 flex items-center justify-between px-2">
                        {/* Prev Button (In RTL, prev is right arrow) */}
                        <button
                            type="button"
                            onClick={handlePrev}
                            disabled={activeIndex === 0}
                            aria-label="מסלול קודם"
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#162218]/15 bg-[var(--studio-card)] shadow-sm transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
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
                                        onClick={() => goToIndex(idx)}
                                        aria-label={`עבור למסלול ${tier.displayName}`}
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
                            onClick={handleNext}
                            disabled={activeIndex === TIERS.length - 1}
                            aria-label="מסלול הבא"
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#162218]/15 bg-[var(--studio-card)] shadow-sm transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                            <ChevronLeft className="h-5 w-5 text-[var(--studio-ink)]" />
                        </button>
                    </div>

                    {/* Peace of Mind & Trust Row */}
                    <div className="mt-7 rounded-2xl border border-[#162218]/10 bg-[var(--studio-card)]/80 p-4 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-[var(--studio-ink)]">
                            <ShieldCheck className="h-4 w-4 text-[var(--studio-brand)]" />
                            <span>תשלום שקוף, פשוט וללא התחייבות שנתית</span>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-[var(--studio-muted)]">
                            התשלום מועבר ישירות באפליקציית ביט (Bit). לאחר אישור ההעברה על ידי טליה, האימונים נטענים אוטומטית ליתרה שלך באפליקציה ותוכלי להירשם לשיעורים מיד.
                        </p>
                    </div>
                </section>
            </main>

            {/* ========================================================
                3. FLOATING STICKY ACTION BAR
                Appears when user scrolls down to inspect or purchase tiers
                ======================================================== */}
            <AnimatePresence>
                {showPaymentBar && (
                    <motion.div 
                        initial={reduceMotion ? false : { y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 32 }}
                        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#162218]/15 bg-[var(--studio-canvas)]/90 px-5 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3.5 shadow-2xl backdrop-blur-2xl"
                    >
                        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
                            <div className="min-w-0 shrink-0">
                                <p className="text-[11px] font-bold text-[var(--studio-muted)]">
                                    מסלול {activeTier.displayName} · {activeTier.sessions} אימונים
                                </p>
                                <p className="text-xl font-bold tabular-nums text-[var(--studio-ink)]">
                                    {activeTier.price} ₪ <span className="text-xs font-normal text-[var(--studio-muted)]">/ חודש</span>
                                </p>
                            </div>
                            
                            <button 
                                type="button" 
                                onClick={() => setIsPaymentModalOpen(true)} 
                                disabled={purchasing} 
                                className="flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--studio-deep)] px-5 text-sm font-bold text-[var(--studio-accent-text)] shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50"
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
