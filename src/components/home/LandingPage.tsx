"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Mail, X } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import StudioLogo from "@/components/StudioLogo";

type LoginView = "menu" | "email" | "otp";

function GoogleMark() {
    return (
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

export default function LandingPage() {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [loginView, setLoginView] = useState<LoginView>("menu");
    const [email, setEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [authError, setAuthError] = useState("");
    const supabase = getSupabaseClient();
    const reduceMotion = useReducedMotion();

    const resetLoginState = () => {
        setIsLoginOpen(false);
        setLoginView("menu");
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
        <div className="min-h-svh overflow-x-hidden bg-[var(--studio-deep)] text-[var(--studio-deep-contrast)]">
            <main className="relative isolate mx-auto flex min-h-svh max-w-lg flex-col overflow-hidden px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:30px_30px]" />
                <header className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <StudioLogo className="h-9 w-9 bg-[var(--studio-accent-bg)]" />
                        <span className="text-xs font-bold leading-[1.05]">טליה<br />סטודיו</span>
                    </div>
                    <span className="rounded-full border border-white/25 px-3 py-1.5 text-[10px] font-bold text-[var(--studio-accent-text)]">האזור שלך</span>
                </header>

                <section aria-labelledby="landing-title" className="relative mt-[clamp(2rem,7svh,4.5rem)] [@media(max-height:650px)]:mt-4">
                    <p className="mb-3 text-xs font-bold text-[var(--studio-accent-text)]">האימון הבא מתחיל כאן</p>
                    <h1 id="landing-title" className="font-bold leading-[0.88] tracking-[-0.065em]">
                        <span className="block text-[clamp(2.8rem,12vw,4rem)]">יש לך</span>
                        <span className="relative block w-fit text-[clamp(5.3rem,23vw,7.6rem)] text-[var(--studio-accent-text)]">מקום
                            <svg aria-hidden="true" viewBox="0 0 260 24" preserveAspectRatio="none" className="absolute -bottom-2 right-0 h-5 w-full overflow-visible text-[var(--studio-coral-bg)]">
                                <motion.path d="M4 17 C56 3 114 4 158 12 S226 20 256 4" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" initial={reduceMotion ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }} />
                            </svg>
                        </span>
                        <span className="mt-2 block text-[clamp(4rem,18vw,6rem)]">לזוז<span className="text-[var(--studio-coral-text)]">.</span></span>
                    </h1>
                </section>

                <div aria-hidden="true" className="pointer-events-none relative my-3 min-h-20 flex-1 overflow-hidden [@media(max-height:650px)]:min-h-10">
                    <svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid meet" className="absolute bottom-[-10%] left-[-8%] h-full w-full max-h-56 text-[var(--studio-accent-bg)]">
                        <path d="M-20 177 C90 26 218 206 380 2" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="2" />
                        <path d="M-20 198 C99 48 226 217 380 24" fill="none" stroke="currentColor" strokeOpacity=".22" strokeWidth="2" />
                        <circle cx="297" cy="70" r="50" fill="var(--studio-coral-bg)" />
                    </svg>
                    <StudioLogo className="absolute bottom-[-2rem] left-2 h-40 w-40 rotate-[-13deg] bg-[var(--studio-accent-bg)]" />
                </div>

                <div className="relative">
                    <p className="mb-5 max-w-[18rem] text-sm leading-relaxed text-[var(--studio-deep-contrast)]/75 [@media(max-height:650px)]:mb-2">האימונים, ההרשמות והיתרה שלך. הכול מחכה לך כאן.</p>
                    {authError && <p role="alert" className="mb-3 text-xs font-bold text-[var(--studio-coral-text)]">{authError}</p>}
                    <button id="main-signin-button" type="button" onClick={handleGoogleLogin} disabled={isLoading} className="flex min-h-14 w-full items-center justify-between rounded-full bg-[var(--studio-accent-bg)] px-5 text-sm font-bold text-[var(--studio-ink)] transition-transform active:scale-[0.985] disabled:opacity-60">
                        <span className="flex items-center gap-3"><GoogleMark />{isLoading ? "מחברות אותך..." : "ממשיכים עם גוגל"}</span><ArrowLeft aria-hidden="true" className="h-5 w-5" />
                    </button>
                    <button type="button" onClick={() => { setAuthError(""); setLoginView("email"); setIsLoginOpen(true); }} className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 text-xs font-bold text-[var(--studio-deep-contrast)]">
                        <Mail aria-hidden="true" className="h-4 w-4" /> כניסה עם קוד במייל
                    </button>
                </div>
            </main>

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
                            className="absolute inset-0 w-full bg-[#111a12]/65"
                        />
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="login-title"
                            initial={reduceMotion ? false : { y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            className="relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-[var(--studio-sheet)] px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-7 text-[var(--studio-ink)]"
                        >
                            <button type="button" onClick={resetLoginState} aria-label="סגירה" className="absolute left-6 top-7 flex h-11 w-11 items-center justify-center rounded-full border border-[#1b251c]/15"><X aria-hidden="true" className="h-5 w-5" /></button>
                            <p className="mb-2 text-xs font-bold text-[var(--studio-subtle)]">סטודיו טליה</p>
                            <h2 id="login-title" className="max-w-[15rem] text-[2rem] font-bold leading-tight">
                                {loginView === "menu" ? "איך נוח לך להיכנס?" : loginView === "email" ? "נשלח לך קוד למייל" : "הקוד בדרך אלייך"}
                            </h2>
                            <p className="mb-7 mt-3 max-w-[18rem] text-sm leading-relaxed text-[var(--studio-muted)]">
                                {loginView === "menu" ? "בחרי את הדרך שמתאימה לך." : loginView === "email" ? "כתבי את הכתובת שלך ונשלח קוד חד־פעמי." : "הזיני את הקוד שקיבלת במייל כדי להיכנס."}
                            </p>

                            {loginView === "menu" && (
                                <div className="space-y-3">
                                    <button id="google-signin-button" type="button" onClick={handleGoogleLogin} disabled={isLoading} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[var(--studio-deep)] px-5 text-sm font-bold text-[var(--studio-deep-contrast)] disabled:opacity-50">
                                        {isLoading ? <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <GoogleMark />}
                                        המשך עם גוגל
                                    </button>
                                    <button type="button" onClick={() => { setAuthError(""); setLoginView("email"); }} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-[#1b251c]/20 bg-[var(--studio-card)] px-5 text-sm font-bold">
                                        <Mail aria-hidden="true" className="h-4 w-4" /> כניסה עם קוד במייל
                                    </button>
                                </div>
                            )}

                            {loginView === "email" && (
                                <form onSubmit={(event) => { event.preventDefault(); handleSendCode(); }} className="space-y-3">
                                    <label htmlFor="login-email" className="block text-xs font-bold">כתובת המייל שלך</label>
                                    <input id="login-email" type="email" inputMode="email" autoComplete="email" required dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="כתובת המייל שלך" className="min-h-14 w-full rounded-2xl border border-[#1b251c]/20 bg-[var(--studio-card)] px-4 text-sm outline-none focus:border-[var(--studio-accent-text)]" />
                                    <button type="submit" disabled={isLoading || !email} className="flex min-h-14 w-full items-center justify-between rounded-full bg-[var(--studio-deep)] px-5 text-sm font-bold text-[var(--studio-deep-contrast)] disabled:opacity-50">{isLoading ? "שולחים..." : "שלחי לי קוד"}<ArrowLeft aria-hidden="true" className="h-4 w-4" /></button>
                                    <button type="button" onClick={() => { setAuthError(""); setLoginView("menu"); }} className="flex min-h-11 items-center gap-2 text-xs font-bold text-[var(--studio-muted)]"><ArrowRight aria-hidden="true" className="h-4 w-4" />חזרה לאפשרויות</button>
                                </form>
                            )}

                            {loginView === "otp" && (
                                <form onSubmit={(event) => { event.preventDefault(); handleVerifyCode(); }} className="space-y-3">
                                    <label htmlFor="login-code" className="block text-xs font-bold">הקוד שקיבלת</label>
                                    <input id="login-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={10} required dir="ltr" value={otpCode} onChange={(event) => setOtpCode(event.target.value)} placeholder="••••••" className="min-h-14 w-full rounded-2xl border border-[#1b251c]/20 bg-[var(--studio-card)] px-4 text-center text-xl tracking-[0.35em] outline-none focus:border-[var(--studio-accent-text)]" />
                                    <button type="submit" disabled={isLoading || otpCode.length < 6} className="flex min-h-14 w-full items-center justify-between rounded-full bg-[var(--studio-deep)] px-5 text-sm font-bold text-[var(--studio-deep-contrast)] disabled:opacity-50">{isLoading ? "בודקים..." : "אימות וכניסה"}<ArrowLeft aria-hidden="true" className="h-4 w-4" /></button>
                                    <button type="button" onClick={() => { setAuthError(""); setLoginView("email"); }} className="flex min-h-11 items-center gap-2 text-xs font-bold text-[var(--studio-muted)]"><ArrowRight aria-hidden="true" className="h-4 w-4" />חזרה לכתובת המייל</button>
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
