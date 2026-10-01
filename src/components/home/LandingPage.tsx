"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Mail, X } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import StudioLogo from "@/components/StudioLogo";

type LoginView = "email" | "otp";

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
    const [isEmblemPressed, setIsEmblemPressed] = useState(false);
    const supabase = getSupabaseClient();
    const reduceMotion = useReducedMotion();

    const handleEmblemTap = () => {
        setIsEmblemPressed(true);
        setTimeout(() => setIsEmblemPressed(false), 450);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(20);
        }
    };

    const resetLoginState = () => {
        setIsLoginOpen(false);
        setLoginView("email");
        setEmail("");
        setOtpCode("");
        setAuthError("");
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
        }
    };

    const handleVerifyCode = async () => {
        if (!otpCode) return;
        setAuthError("");
        setIsLoading(true);
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token: otpCode,
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
        <div className="relative min-h-svh w-full overflow-hidden bg-[#141f16] text-[var(--studio-deep-contrast)]">
            {/* Background Layer: Animated Botanical Branch, Pulsing Terracotta Sun, and Atmospheric Light */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                {/* Velvety atmospheric gradient */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_65%_30%,#203123_0%,#141f16_60%,#0c140d_100%)] opacity-95" />

                {/* Warm terracotta sun with expanding and retracting halo & shadow */}
                <motion.div
                    className="absolute -left-10 top-20 h-52 w-52 rounded-full bg-[var(--studio-coral-bg)]/25 blur-3xl [@media(max-height:650px)]:top-12"
                    animate={reduceMotion ? undefined : {
                        scale: [1, 1.25, 1],
                        opacity: [0.2, 0.45, 0.2],
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
                <div className="absolute bottom-16 right-0 h-64 w-64 rounded-full bg-[var(--studio-accent-bg)]/12 blur-3xl" />

                {/* User's 5-leaf botanical branch gently tilting from side to side (subtle watermark opacity for maximum text legibility) */}
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
            <main className="relative z-10 mx-auto flex min-h-svh max-w-lg flex-col justify-between px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] [@media(max-height:650px)]:py-3">
                {/* Header: Centered Studio Emblem placed higher and sized larger for commanding brand presence */}
                <header className="relative flex w-full items-center justify-center pt-0 -mt-2 [@media(max-height:650px)]:-mt-1">
                    <motion.button
                        type="button"
                        onClick={handleEmblemTap}
                        whileTap={reduceMotion ? undefined : { scale: 0.90 }}
                        whileHover={reduceMotion ? undefined : { scale: 1.04 }}
                        transition={{ type: "spring", stiffness: 450, damping: 18 }}
                        className="group relative flex items-center justify-center cursor-pointer select-none rounded-3xl p-1.5 outline-none touch-manipulation focus-visible:ring-2 focus-visible:ring-white/40"
                        aria-label="סטודיו טליה - תזונה • אימונים"
                    >
                        {/* Animated ambient touch halo ring */}
                        <motion.div
                            className="absolute inset-0 -z-10 rounded-full bg-[var(--studio-accent-bg)]/30 blur-2xl pointer-events-none"
                            animate={isEmblemPressed ? { scale: [1, 1.45, 1.2], opacity: [0.3, 0.85, 0.4] } : { scale: 1, opacity: 0.15 }}
                            transition={{ duration: 0.45 }}
                        />

                        <img
                            src="/studio_emblem_clean.png"
                            alt="סטודיו טליה - תזונה • אימונים"
                            className="h-[6.75rem] w-auto object-contain drop-shadow-[0_4px_20px_rgba(0,0,0,0.7)] transition-all duration-150 group-active:brightness-125 [@media(max-height:650px)]:h-20"
                        />
                    </motion.button>
                </header>

                {/* Main Hero Section: Bold Editorial Hebrew Typography */}
                <section aria-labelledby="landing-title" className="relative my-auto py-3 [@media(max-height:650px)]:py-1">
                    {/* Eyebrow: Clean text without button borders */}
                    <p className="mb-2 text-sm font-bold tracking-wider text-[var(--studio-accent-text)] [@media(max-height:650px)]:mb-0.5 [@media(max-height:650px)]:text-xs">
                        ✦ האימון הבא מתחיל כאן
                    </p>

                    {/* Headline: Larger, bolder, authoritative */}
                    <h1 id="landing-title" className="font-bold leading-[0.9] tracking-[-0.055em]">
                        <span className="block text-[clamp(3rem,12.5vw,4.6rem)] text-[var(--studio-deep-contrast)]">
                            יש לך
                        </span>
                        <span className="relative inline-block text-[clamp(5.2rem,22vw,7.6rem)] text-[var(--studio-accent-text)]">
                            מקום
                            {/* Animated wavy underline drawing naturally from Right to Left */}
                            <svg aria-hidden="true" viewBox="0 0 240 20" preserveAspectRatio="none" className="absolute -bottom-3.5 right-0 h-4 w-full overflow-visible text-[var(--studio-coral-bg)]">
                                <motion.path
                                    d="M236 4 C175 14 120 8 70 4 S14 12 4 15"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="4.5"
                                    strokeLinecap="round"
                                    initial={reduceMotion ? false : { pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.85, delay: 0.2, ease: "easeOut" }}
                                />
                            </svg>
                        </span>
                        <span className="mt-1 block text-[clamp(4rem,16.5vw,5.8rem)] text-[var(--studio-deep-contrast)]">
                            לזוז<span className="text-[var(--studio-coral-text)]">.</span>
                        </span>
                    </h1>

                    {/* Subtitle: Larger and warm */}
                    <p className="mt-4 max-w-[22rem] text-base leading-relaxed text-[var(--studio-deep-contrast)]/90 [@media(max-height:650px)]:mt-1.5 [@media(max-height:650px)]:text-xs">
                        האימונים, ההרשמות והיתרה שלך — הכול מחכה לך כאן במקום אחד.
                    </p>

                    {/* Studio Features: Each on its own line with user's attached leaf icon */}
                    <ul className="mt-4 space-y-2.5 text-base font-semibold text-[var(--studio-deep-contrast)]/95 [@media(max-height:650px)]:mt-2 [@media(max-height:650px)]:space-y-1.5 [@media(max-height:650px)]:text-xs">
                        <motion.li whileTap={reduceMotion ? undefined : { scale: 0.98 }} className="flex items-center gap-2.5 select-none transition-transform">
                            <UserLeafIcon className="h-5 w-5 shrink-0 text-[var(--studio-accent-text)] drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)] [@media(max-height:650px)]:h-4 [@media(max-height:650px)]:w-4" />
                            <span>לוח אימונים</span>
                        </motion.li>
                        <motion.li whileTap={reduceMotion ? undefined : { scale: 0.98 }} className="flex items-center gap-2.5 select-none transition-transform">
                            <UserLeafIcon className="h-5 w-5 shrink-0 text-[var(--studio-accent-text)] drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)] [@media(max-height:650px)]:h-4 [@media(max-height:650px)]:w-4" />
                            <span>הרשמה</span>
                        </motion.li>
                        <motion.li whileTap={reduceMotion ? undefined : { scale: 0.98 }} className="flex items-center gap-2.5 select-none transition-transform">
                            <UserLeafIcon className="h-5 w-5 shrink-0 text-[var(--studio-accent-text)] drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)] [@media(max-height:650px)]:h-4 [@media(max-height:650px)]:w-4" />
                            <span>ניהול כרטיסיות</span>
                        </motion.li>
                    </ul>
                </section>

                {/* Bottom Action Area: iOS Liquid Glass Buttons */}
                <div className="relative mt-auto w-full pt-3 [@media(max-height:650px)]:pt-1">
                    {authError && <p role="alert" className="mb-2 text-xs font-bold text-[var(--studio-coral-text)]">{authError}</p>}

                    {/* Primary Google Login Button: Authentic iOS Frosted Glass */}
                    <motion.button
                        id="main-signin-button"
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                        transition={{ type: "spring", stiffness: 450, damping: 25 }}
                        className="group relative flex min-h-[3.5rem] w-full items-center justify-center gap-3 rounded-full border border-white/25 bg-[#9faf76]/25 px-6 text-white backdrop-blur-2xl backdrop-saturate-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_10px_30px_rgba(0,0,0,0.35)] transition-colors duration-150 hover:bg-[#9faf76]/32 hover:border-white/35 active:bg-[#9faf76]/42 disabled:opacity-50 touch-manipulation [@media(max-height:650px)]:min-h-12 [@media(max-height:650px)]:px-4"
                    >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-xs transition-transform group-active:scale-95">
                            <GoogleMark className="h-4 w-4" />
                        </span>
                        <span className="text-[16px] font-semibold tracking-[-0.01em] text-[#fbfcf8] [@media(max-height:650px)]:text-sm">
                            {isLoading ? "מחברות אותך..." : "ממשיכים עם גוגל"}
                        </span>
                    </motion.button>

                    {/* Email OTP Button: Clean iOS Secondary Glass */}
                    <motion.button
                        type="button"
                        onClick={() => { setAuthError(""); setLoginView("email"); setIsLoginOpen(true); }}
                        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                        transition={{ type: "spring", stiffness: 450, damping: 25 }}
                        className="group relative mt-2.5 flex min-h-[2.85rem] w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.06] text-sm font-medium text-white/90 backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_4px_16px_rgba(0,0,0,0.2)] transition-colors duration-150 hover:bg-white/[0.12] hover:border-white/20 active:bg-white/[0.18] touch-manipulation [@media(max-height:650px)]:min-h-10 [@media(max-height:650px)]:mt-1.5 [@media(max-height:650px)]:text-xs"
                    >
                        <Mail aria-hidden="true" className="h-4 w-4 text-[var(--studio-accent-text)] opacity-90" />
                        <span>כניסה עם קוד במייל</span>
                    </motion.button>
                </div>
            </main>

            {/* Mobile Login Sheet */}
            <AnimatePresence>
                {isLoginOpen && (
                    <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end justify-center">
                        <motion.button
                            type="button"
                            aria-label="סגירה"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={resetLoginState}
                            className="absolute inset-0 h-full w-full bg-[#111a12]/65 backdrop-blur-xs"
                        />
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="login-title"
                            initial={reduceMotion ? false : { y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            className="relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-[2.25rem] bg-[var(--studio-sheet)] px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 text-[var(--studio-ink)] shadow-2xl"
                        >
                            {/* Drag grabber handle */}
                            <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-[#1b251c]/15" />

                            <button type="button" onClick={resetLoginState} aria-label="סגירה" className="absolute left-6 top-6 flex h-10 w-10 items-center justify-center rounded-full border border-[#1b251c]/15 active:scale-95">
                                <X aria-hidden="true" className="h-4 w-4" />
                            </button>

                            <p className="mb-1 text-xs font-bold text-[var(--studio-subtle)]">סטודיו טליה</p>
                            <h2 id="login-title" className="max-w-[15rem] text-[2rem] font-bold leading-tight">
                                {loginView === "email" ? "נשלח לך קוד למייל" : "הקוד בדרך אלייך"}
                            </h2>
                            <p className="mb-6 mt-2 max-w-[18rem] text-sm leading-relaxed text-[var(--studio-muted)]">
                                {loginView === "email" ? "כתבי את הכתובת שלך ונשלח קוד חד־פעמי ללא סיסמה." : `הקוד נשלח אל ${email}. הזיני אותו כאן.`}
                            </p>

                            {loginView === "email" && (
                                <form onSubmit={(event) => { event.preventDefault(); handleSendCode(); }} className="space-y-3.5">
                                    <div>
                                        <label htmlFor="login-email" className="block text-xs font-bold mb-1.5">כתובת המייל שלך</label>
                                        <input
                                            id="login-email"
                                            type="email"
                                            inputMode="email"
                                            autoComplete="email"
                                            required
                                            dir="ltr"
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            placeholder="כתובת המייל שלך"
                                            className="min-h-14 w-full rounded-2xl border border-[#1b251c]/20 bg-[var(--studio-card)] px-4 text-sm outline-none focus:border-[var(--studio-accent-text)] focus:ring-2 focus:ring-[var(--studio-accent-bg)]/20"
                                        />
                                    </div>
                                    <button type="submit" disabled={isLoading || !email} className="flex min-h-14 w-full items-center justify-between rounded-full bg-[var(--studio-deep)] px-5 text-sm font-bold text-[var(--studio-deep-contrast)] disabled:opacity-50 active:scale-[0.985]">
                                        <span>{isLoading ? "שולחות קוד..." : "שלחי לי קוד"}</span>
                                        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                                    </button>
                                    <button type="button" onClick={resetLoginState} className="flex min-h-10 w-full items-center justify-center text-xs font-bold text-[var(--studio-muted)]">
                                        ביטול וחזרה
                                    </button>
                                </form>
                            )}

                            {loginView === "otp" && (
                                <form onSubmit={(event) => { event.preventDefault(); handleVerifyCode(); }} className="space-y-3.5">
                                    <div>
                                        <label htmlFor="login-code" className="block text-xs font-bold mb-1.5">הקוד שקיבלת</label>
                                        <input
                                            id="login-code"
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            maxLength={10}
                                            required
                                            dir="ltr"
                                            value={otpCode}
                                            onChange={(event) => setOtpCode(event.target.value)}
                                            placeholder="••••••"
                                            className="min-h-14 w-full rounded-2xl border border-[#1b251c]/20 bg-[var(--studio-card)] px-4 text-center font-mono text-xl tracking-[0.35em] outline-none focus:border-[var(--studio-accent-text)]"
                                        />
                                    </div>
                                    <button type="submit" disabled={isLoading || otpCode.length < 6} className="flex min-h-14 w-full items-center justify-between rounded-full bg-[var(--studio-deep)] px-5 text-sm font-bold text-[var(--studio-deep-contrast)] disabled:opacity-50 active:scale-[0.985]">
                                        <span>{isLoading ? "בודקות..." : "אימות וכניסה"}</span>
                                        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                                    </button>
                                    <div className="flex items-center justify-between pt-1 text-xs">
                                        <button type="button" onClick={() => { setAuthError(""); setLoginView("email"); }} className="flex items-center gap-1.5 font-bold text-[var(--studio-muted)]">
                                            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                                            שינוי כתובת מייל
                                        </button>
                                        <button type="button" onClick={handleSendCode} disabled={isLoading} className="font-bold text-[var(--studio-accent-bg)] hover:underline">
                                            שליחה חוזרת
                                        </button>
                                    </div>
                                </form>
                            )}

                            {authError && <p role="alert" className="mt-4 rounded-2xl bg-[var(--studio-danger)]/10 p-3 text-sm text-[var(--studio-danger)]">{authError}</p>}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
