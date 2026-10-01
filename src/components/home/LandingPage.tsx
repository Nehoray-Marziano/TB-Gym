"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    Mail,
    ShieldCheck,
    Sparkles,
    Ticket,
    X,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { LiquidGlassButton } from "@/components/ui/LiquidGlass";

type LoginView = "email" | "otp";

interface StudioFeature {
    id: string;
    icon: typeof CalendarDays;
    title: string;
    desc: string;
    badge: string;
    detail: string;
}

const STUDIO_FEATURES: StudioFeature[] = [
    {
        id: "schedule",
        icon: CalendarDays,
        title: "לוח אימונים גמיש",
        desc: "שריון מקום מהיר לפי הימים והשעות שלך",
        badge: "מתעדכן",
        detail: "שיעורי בוקר, ערב וסופי שבוע בקצב שמתאים לשגרה שלך.",
    },
    {
        id: "intimate",
        icon: Sparkles,
        title: "קבוצות בוטיק אינטימיות",
        desc: "עד 8 מתאמנות עם יחס אישי ומדויק",
        badge: "אינטימי",
        detail: "תשומת לב מלאה לכל תנועה, דיוק בטכניקה והתאמה אישית.",
    },
    {
        id: "tickets",
        icon: Ticket,
        title: "כרטיסיות ומעקב חכם",
        desc: "מעקב יתרה, תוקף מנוי וביטול עצמאי",
        badge: "בזמן אמת",
        detail: "שקיפות מלאה ללא אותיות קטנות — כל המידע זמין לך מיד.",
    },
];

function GoogleMark({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
    return (
        <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

function UserLeafIcon({ className = "h-5 w-5" }: { className?: string }) {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={className}
        >
            <path
                d="M11 20a10 10 0 0 0 10 -10 25.9 25.9 0 0 0 -1.04 -7.281 1 1 0 0 0 -1.755 -0.325C15.833 5.5 13 5.5 9.8 6.1A7 7 0 0 0 11 20"
                fill="currentColor"
                fillOpacity="0.24"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M2 21a5 5 0 0 1 2.911 -4.544C7.613 15.212 8.351 15.24 11 13"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export default function LandingPage() {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [loginView, setLoginView] = useState<LoginView>("email");
    const [email, setEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [authError, setAuthError] = useState("");
    const [resendSuccess, setResendSuccess] = useState(false);
    const [isEmblemPressed, setIsEmblemPressed] = useState(false);
    const [activeFeature, setActiveFeature] = useState<string | null>(null);

    const emailInputRef = useRef<HTMLInputElement>(null);
    const otpInputRef = useRef<HTMLInputElement>(null);

    const supabase = getSupabaseClient();
    const reduceMotion = useReducedMotion();

    // Keyboard accessibility: Close login modal on Escape key
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && isLoginOpen) {
                resetLoginState();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isLoginOpen]);

    // Auto-focus input when sheet opens or view changes
    useEffect(() => {
        if (!isLoginOpen) return;
        const timer = setTimeout(() => {
            if (loginView === "email") {
                emailInputRef.current?.focus();
            } else {
                otpInputRef.current?.focus();
            }
        }, 120);
        return () => clearTimeout(timer);
    }, [isLoginOpen, loginView]);

    const handleEmblemTap = () => {
        setIsEmblemPressed(true);
        setTimeout(() => setIsEmblemPressed(false), 450);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(15);
        }
    };

    const toggleFeature = (id: string) => {
        setActiveFeature((prev) => (prev === id ? null : id));
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(10);
        }
    };

    const resetLoginState = () => {
        setIsLoginOpen(false);
        setLoginView("email");
        setEmail("");
        setOtpCode("");
        setAuthError("");
        setResendSuccess(false);
        setIsLoading(false);
    };

    const handleGoogleLogin = async () => {
        setAuthError("");
        setIsLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) {
            console.error(error);
            setAuthError("לא הצלחנו להתחבר עם גוגל. נסי שוב בעוד רגע.");
            setIsLoading(false);
        }
    };

    const handleSendCode = async () => {
        if (!email) return;
        setAuthError("");
        setResendSuccess(false);
        setIsLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: true },
        });
        setIsLoading(false);

        if (error) {
            console.error(error);
            setAuthError("לא הצלחנו לשלוח קוד. בדקי את הכתובת ונסי שוב.");
        } else {
            setLoginView("otp");
            setResendSuccess(true);
            setTimeout(() => setResendSuccess(false), 4000);
        }
    };

    const handleVerifyCode = async () => {
        if (!otpCode) return;
        setAuthError("");
        setIsLoading(true);
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token: otpCode.trim(),
            type: "magiclink",
        });

        if (error) {
            console.error(error);
            setAuthError("הקוד לא תקין או שפג תוקפו. בדקי ונסי שוב.");
            setIsLoading(false);
        } else if (data?.session) {
            window.location.href = "/dashboard";
        } else {
            setAuthError("לא הצלחנו להשלים את הכניסה. נסי שוב.");
            setIsLoading(false);
        }
    };

    return (
        <div className="relative h-dvh max-h-dvh w-full overflow-hidden touch-none bg-[#181611] text-[var(--studio-deep-contrast)] selection:bg-[var(--studio-accent-bg)]/30 selection:text-white">
            {/* Background Layer: Botanical Branch, Terracotta Sun, and Atmospheric Light */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                {/* Velvety atmospheric green-brownish earthy gradient */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_65%_30%,#2a251b_0%,#1a1711_55%,#100e0a_100%)] opacity-95" />

                {/* Warm terracotta sun with expanding and retracting halo & shadow */}
                <motion.div
                    className="absolute -left-10 top-20 h-56 w-56 rounded-full bg-[var(--studio-coral-bg)]/20 blur-3xl [@media(max-height:650px)]:top-12"
                    animate={reduceMotion ? undefined : {
                        scale: [1, 1.25, 1],
                        opacity: [0.18, 0.4, 0.18],
                    }}
                    transition={{
                        duration: 5.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
                <motion.div
                    className="absolute left-6 top-28 h-28 w-28 rounded-full bg-[radial-gradient(circle_at_40%_40%,#d9886e_0%,#c37a61_70%,#9e553f_100%)] opacity-85 [@media(max-height:650px)]:h-18 [@media(max-height:650px)]:w-18 [@media(max-height:650px)]:top-16 [@media(max-height:650px)]:left-3"
                    animate={reduceMotion ? undefined : {
                        scale: [1, 1.05, 1],
                        boxShadow: [
                            "0 0 30px 6px rgba(195,122,97,0.35)",
                            "0 0 65px 18px rgba(195,122,97,0.65)",
                            "0 0 30px 6px rgba(195,122,97,0.35)",
                        ],
                    }}
                    transition={{
                        duration: 4.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                >
                    <motion.div
                        className="absolute -inset-2.5 rounded-full border border-[var(--studio-coral-bg)]/35"
                        animate={reduceMotion ? undefined : {
                            scale: [1, 1.08, 1],
                            opacity: [0.35, 0.65, 0.35],
                        }}
                        transition={{
                            duration: 4.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />
                </motion.div>

                {/* Ambient sage glow */}
                <div className="absolute bottom-16 right-0 h-72 w-72 rounded-full bg-[var(--studio-accent-bg)]/14 blur-3xl" />

                {/* User's 5-leaf botanical branch gently tilting */}
                <motion.img
                    src="/user_leaves_branch_sage.png"
                    alt=""
                    className="absolute -bottom-10 left-7 h-[520px] w-auto max-w-none origin-bottom-left object-contain opacity-18 mix-blend-screen drop-shadow-[0_4px_16px_rgba(0,0,0,0.35)] [@media(max-height:650px)]:h-[340px] [@media(max-height:650px)]:-bottom-4 [@media(max-height:650px)]:left-5"
                    animate={reduceMotion ? undefined : {
                        rotate: [-14, -8, -14],
                    }}
                    transition={{
                        duration: 7,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </div>

            {/* Foreground Content */}
            <main className="relative z-10 mx-auto flex h-full max-h-dvh w-full max-w-md flex-col justify-between px-5 pt-[max(1.1rem,calc(env(safe-area-inset-top)+0.75rem))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {/* Header: Centered Studio Emblem */}
                <header className="flex shrink-0 items-center justify-center pt-1 pb-0.5">
                    <motion.button
                        type="button"
                        onClick={handleEmblemTap}
                        whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                        whileHover={reduceMotion ? undefined : { scale: 1.04 }}
                        transition={{ type: "spring", stiffness: 450, damping: 20 }}
                        className="group relative flex items-center justify-center cursor-pointer select-none rounded-2xl p-1 outline-none touch-manipulation focus-visible:ring-2 focus-visible:ring-white/40"
                        aria-label="סטודיו טליה - תזונה • אימונים"
                    >
                        {/* Animated ambient touch halo ring */}
                        <motion.div
                            className="absolute inset-0 -z-10 rounded-full bg-[var(--studio-accent-bg)]/35 blur-xl pointer-events-none"
                            animate={isEmblemPressed ? { scale: [1, 1.45, 1.2], opacity: [0.3, 0.85, 0.4] } : { scale: 1, opacity: 0.15 }}
                            transition={{ duration: 0.45 }}
                        />

                        <img
                            src="/studio_emblem_clean.png"
                            alt="סטודיו טליה - תזונה • אימונים"
                            className="h-18 sm:h-22 w-auto object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-all duration-150 group-active:brightness-125 [@media(max-height:680px)]:h-14"
                        />
                    </motion.button>
                </header>

                {/* Main Hero Section: Bold Editorial Hebrew Typography */}
                <section aria-labelledby="landing-title" className="my-auto flex flex-col justify-center py-1">
                    {/* Eyebrow badge */}
                    <p className="mb-1 text-xs sm:text-sm font-bold tracking-wide text-[var(--studio-accent-text)]">
                        ✦ האימון הבא מתחיל כאן
                    </p>

                    {/* Headline: Editorial typography with balanced line wrapping */}
                    <h1
                        id="landing-title"
                        style={{ textWrap: "balance" }}
                        className="font-bold leading-[0.92] tracking-[-0.05em]"
                    >
                        <span className="block text-[clamp(2.2rem,8.5vw,3.2rem)] text-[var(--studio-deep-contrast)]">
                            יש לך
                        </span>
                        <span className="relative inline-block text-[clamp(3.8rem,15vw,5.4rem)] text-[var(--studio-accent-text)]">
                            מקום
                            {/* Animated wavy underline drawing RTL */}
                            <svg aria-hidden="true" viewBox="0 0 240 20" preserveAspectRatio="none" className="absolute -bottom-2.5 right-0 h-3.5 w-full overflow-visible text-[var(--studio-coral-bg)]">
                                <motion.path
                                    d="M236 4 C175 14 120 8 70 4 S14 12 4 15"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={reduceMotion ? undefined : {
                                        pathLength: { duration: 0.85, delay: 0.2, ease: "easeOut" },
                                        opacity: { duration: 0.05, delay: 0.2 },
                                    }}
                                />
                            </svg>
                        </span>
                        <span className="mt-0.5 block text-[clamp(3rem,11.5vw,4.2rem)] text-[var(--studio-deep-contrast)]">
                            לזוז<span className="text-[var(--studio-coral-text)]">.</span>
                        </span>
                    </h1>

                    {/* Subtitle */}
                    <p className="mt-2 sm:mt-2.5 max-w-[20rem] text-xs sm:text-sm leading-relaxed text-[var(--studio-deep-contrast)]/85">
                        האימונים, ההרשמות והיתרה שלך — הכול מחכה לך כאן במקום אחד.
                    </p>

                    {/* Studio Features: Compact boutique leaf list */}
                    <ul className="mt-2.5 sm:mt-3 space-y-1.5 text-xs sm:text-sm font-semibold text-[var(--studio-deep-contrast)]/90">
                        <motion.li whileTap={reduceMotion ? undefined : { scale: 0.98 }} className="flex items-center gap-2 select-none">
                            <UserLeafIcon className="h-4 w-4 text-[var(--studio-accent-text)] shrink-0 drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]" />
                            <span>לוח אימונים גמיש ומעודכן</span>
                        </motion.li>
                        <motion.li whileTap={reduceMotion ? undefined : { scale: 0.98 }} className="flex items-center gap-2 select-none">
                            <UserLeafIcon className="h-4 w-4 text-[var(--studio-accent-text)] shrink-0 drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]" />
                            <span>קבוצות בוטיק אינטימיות (עד 8 מתאמנות)</span>
                        </motion.li>
                        <motion.li whileTap={reduceMotion ? undefined : { scale: 0.98 }} className="flex items-center gap-2 select-none">
                            <UserLeafIcon className="h-4 w-4 text-[var(--studio-accent-text)] shrink-0 drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]" />
                            <span>מעקב כרטיסיות ומנוי בזמן אמת</span>
                        </motion.li>
                    </ul>
                </section>

                {/* Bottom Action Area: True iOS Liquid Frosted Glass */}
                <div className="relative mt-auto shrink-0 w-full pt-1.5 pb-0.5">
                    {/* Radiant Ambient Backlight */}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-2 inset-x-2 h-24 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(139,142,111,0.32)_0%,rgba(195,122,97,0.18)_45%,transparent_75%)] blur-xl -z-10"
                    />

                    {authError && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            className="mb-2 flex items-center gap-2 rounded-xl border border-[var(--studio-danger)]/30 bg-[var(--studio-danger)]/15 px-3 py-1.5 text-xs font-bold text-[var(--studio-coral-text)]"
                        >
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>{authError}</span>
                        </div>
                    )}

                    {/* Primary Google Login Button */}
                    <LiquidGlassButton
                        id="main-signin-button"
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        aria-busy={isLoading}
                        radius={16}
                        blur={1}
                        refraction={40}
                        bezel={10}
                        frost={0.35}
                        specular={0.7}
                        profile="squircle"
                        elevated={true}
                        className="w-full"
                    >
                        <div className="flex min-h-[3.25rem] w-full items-center justify-center gap-3 px-5 text-white">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white shadow-xs transition-transform group-active:scale-95">
                                <GoogleMark className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-[15px] font-semibold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                                {isLoading ? "מחברות אותך..." : "ממשיכות עם גוגל"}
                            </span>
                        </div>
                    </LiquidGlassButton>

                    {/* Secondary Email OTP Button */}
                    <LiquidGlassButton
                        type="button"
                        onClick={() => {
                            setAuthError("");
                            setLoginView("email");
                            setIsLoginOpen(true);
                        }}
                        radius={14}
                        blur={1}
                        refraction={35}
                        bezel={8}
                        frost={0.28}
                        specular={0.5}
                        profile="squircle"
                        elevated={false}
                        className="mt-2 w-full"
                    >
                        <div className="flex min-h-[2.65rem] w-full items-center justify-center gap-2 px-4 text-xs sm:text-sm font-medium text-white/90">
                            <Mail aria-hidden="true" className="h-3.5 w-3.5 text-[var(--studio-accent-text)] opacity-95 transition-transform group-hover:scale-105" />
                            <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">כניסה עם קוד במייל</span>
                        </div>
                    </LiquidGlassButton>

                    {/* Reassurance Micro-Copy */}
                    <p className="mt-1.5 text-center text-[10px] font-medium text-white/45">
                        כניסה מאובטחת ללא סיסמה • הפרטים שלך שמורים
                    </p>
                </div>
            </main>

            {/* Mobile Login Sheet (Accessible Modal) */}
            <AnimatePresence>
                {isLoginOpen && (
                    <motion.div
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-end justify-center"
                    >
                        {/* Backdrop button with blur */}
                        <motion.button
                            type="button"
                            aria-label="סגירת חלון התחברות"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={resetLoginState}
                            className="absolute inset-0 h-full w-full bg-[#111a12]/70 backdrop-blur-xs cursor-pointer"
                        />

                        {/* Modal Container */}
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="login-title"
                            aria-describedby="login-desc"
                            initial={reduceMotion ? false : { y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            className="relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-[2.25rem] bg-[var(--studio-sheet)] px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 text-[var(--studio-ink)] shadow-2xl"
                        >
                            {/* Drag grabber handle */}
                            <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-[#1b251c]/20" />

                            <button
                                type="button"
                                onClick={resetLoginState}
                                aria-label="סגירה"
                                className="absolute left-6 top-6 flex h-10 w-10 items-center justify-center rounded-full border border-[#1b251c]/15 text-[var(--studio-ink)] hover:bg-[#1b251c]/5 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-brand)]"
                            >
                                <X aria-hidden="true" className="h-4 w-4" />
                            </button>

                            <p className="mb-1 text-xs font-bold text-[var(--studio-subtle)]">סטודיו טליה</p>
                            <h2 id="login-title" className="max-w-[16rem] text-[2rem] font-bold leading-tight">
                                {loginView === "email" ? "נשלח לך קוד למייל" : "הקוד בדרך אלייך"}
                            </h2>
                            <p id="login-desc" className="mb-6 mt-2 max-w-[19rem] text-sm leading-relaxed text-[var(--studio-muted)]">
                                {loginView === "email" ? (
                                    "כתבי את הכתובת שלך ונשלח קוד חד־פעמי בן 6 ספרות לכניסה מיידית ללא צורך בסיסמה."
                                ) : (
                                    <>
                                        הקוד נשלח אל{" "}
                                        <span dir="ltr" className="font-bold text-[var(--studio-ink)] underline decoration-[var(--studio-brand)]">
                                            {email}
                                        </span>
                                        . הזיני אותו כאן:
                                    </>
                                )}
                            </p>

                            {resendSuccess && (
                                <div
                                    role="status"
                                    className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs font-bold text-emerald-800"
                                >
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                    <span>הקוד נשלח בהצלחה לכתובת המייל!</span>
                                </div>
                            )}

                            {loginView === "email" && (
                                <form
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        handleSendCode();
                                    }}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label htmlFor="login-email" className="block text-xs font-bold mb-1.5 text-[var(--studio-ink)]">
                                            כתובת המייל שלך <span className="text-[var(--studio-coral-bg)]">*</span>
                                        </label>
                                        <input
                                            ref={emailInputRef}
                                            id="login-email"
                                            type="email"
                                            inputMode="email"
                                            autoComplete="email"
                                            required
                                            dir="ltr"
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            placeholder="name@example.com"
                                            className="min-h-14 w-full rounded-2xl border border-[#1b251c]/20 bg-[var(--studio-card)] px-4 text-base outline-none transition-all focus:border-[var(--studio-brand)] focus:ring-2 focus:ring-[var(--studio-accent-bg)]/25"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading || !email}
                                        className="flex min-h-14 w-full items-center justify-between rounded-full bg-[var(--studio-deep)] px-6 text-sm font-bold text-[var(--studio-deep-contrast)] shadow-md hover:bg-black disabled:opacity-50 active:scale-[0.985] transition-all cursor-pointer"
                                    >
                                        <span>{isLoading ? "שולחות קוד..." : "שלחי לי קוד"}</span>
                                        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={resetLoginState}
                                        className="flex min-h-10 w-full items-center justify-center text-xs font-bold text-[var(--studio-muted)] hover:text-[var(--studio-ink)] transition-colors"
                                    >
                                        ביטול וחזרה
                                    </button>
                                </form>
                            )}

                            {loginView === "otp" && (
                                <form
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        handleVerifyCode();
                                    }}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label htmlFor="login-code" className="block text-xs font-bold mb-1.5 text-[var(--studio-ink)]">
                                            קוד אימות בן 6 ספרות <span className="text-[var(--studio-coral-bg)]">*</span>
                                        </label>
                                        <input
                                            ref={otpInputRef}
                                            id="login-code"
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            maxLength={8}
                                            required
                                            dir="ltr"
                                            value={otpCode}
                                            onChange={(event) => setOtpCode(event.target.value)}
                                            placeholder="••••••"
                                            className="min-h-14 w-full rounded-2xl border border-[#1b251c]/20 bg-[var(--studio-card)] px-4 text-center font-mono text-2xl tracking-[0.35em] outline-none transition-all focus:border-[var(--studio-brand)] focus:ring-2 focus:ring-[var(--studio-accent-bg)]/25"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading || otpCode.trim().length < 6}
                                        className="flex min-h-14 w-full items-center justify-between rounded-full bg-[var(--studio-deep)] px-6 text-sm font-bold text-[var(--studio-deep-contrast)] shadow-md hover:bg-black disabled:opacity-50 active:scale-[0.985] transition-all cursor-pointer"
                                    >
                                        <span>{isLoading ? "בודקות קוד..." : "אימות וכניסה"}</span>
                                        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                                    </button>

                                    <div className="flex items-center justify-between pt-1 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAuthError("");
                                                setLoginView("email");
                                            }}
                                            className="flex items-center gap-1.5 font-bold text-[var(--studio-muted)] hover:text-[var(--studio-ink)] transition-colors cursor-pointer"
                                        >
                                            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                                            שינוי כתובת מייל
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleSendCode}
                                            disabled={isLoading}
                                            className="font-bold text-[var(--studio-brand)] hover:underline cursor-pointer disabled:opacity-50"
                                        >
                                            שליחה חוזרת
                                        </button>
                                    </div>
                                </form>
                            )}

                            {authError && (
                                <div
                                    role="alert"
                                    aria-live="assertive"
                                    className="mt-4 flex items-center gap-2 rounded-2xl bg-[var(--studio-danger)]/10 border border-[var(--studio-danger)]/25 p-3 text-sm text-[var(--studio-danger)]"
                                >
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>{authError}</span>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
