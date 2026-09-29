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
        <div className="min-h-dvh overflow-x-hidden bg-[#e9eadc] text-[#1b251c]">
            <main className="mx-auto max-w-lg">
                <section className="relative isolate overflow-hidden bg-[#162218] px-5 pb-7 pt-6 text-[#f6f6ed] sm:px-7" aria-labelledby="landing-title">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#e9f2ce_1px,transparent_1px),linear-gradient(90deg,#e9f2ce_1px,transparent_1px)] [background-size:28px_28px]" />
                    <header className="relative flex items-center justify-between border-b border-white/20 pb-5">
                        <div className="flex items-center gap-3">
                            <StudioLogo className="h-9 w-9 bg-[#dce780]" />
                            <span className="border-s border-white/25 ps-3 text-xs font-bold leading-tight">סטודיו<br />טליה</span>
                        </div>
                        <span className="text-[11px] font-bold text-[#bac9ae]">האזור שלך בסטודיו</span>
                    </header>

                    <div className="relative pt-9">
                        <motion.p initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-4 flex items-center gap-2 text-xs font-bold text-[#dce780]"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#f28c69]" />לוח האימונים של טליה</motion.p>
                        <motion.h1 id="landing-title" initial={reduceMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }} className="relative z-10 font-bold leading-[0.83] tracking-[-0.065em]">
                            <span className="block text-[clamp(3.3rem,13vw,5rem)]">יש לך</span>
                            <span className="block text-[clamp(5.5rem,23vw,8rem)] text-[#dce780]">מקום</span>
                            <span className="block text-[clamp(4.4rem,18vw,6.7rem)]">לזוז<span className="text-[#f28c69]">.</span></span>
                        </motion.h1>
                    </div>

                    <motion.div initial={reduceMotion ? false : { opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }} aria-label="סטודיו טליה" className="relative mt-8 h-[clamp(12rem,33dvh,18rem)] overflow-hidden rounded-[1.75rem] bg-[#dce780] text-[#162218]">
                        <div aria-hidden="true" className="absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(-25deg,transparent_0,transparent_26px,#1b251c_27px,#1b251c_28px)]" />
                        <div aria-hidden="true" className="absolute -left-11 -top-14 h-[18rem] w-[18rem] rotate-[-13deg] rounded-full border-[1.75rem] border-[#162218]/15" />
                        <div aria-hidden="true" className="studio-artwork-orb absolute -left-5 bottom-0 h-16 w-16 rounded-full bg-[#f28c69]" />
                        <StudioLogo className="studio-artwork-mark absolute -bottom-10 -left-6 h-[clamp(15rem,61vw,20rem)] w-[clamp(15rem,61vw,20rem)] bg-[#162218]" />
                        <div className="absolute right-5 top-5 flex flex-col items-start gap-1 text-[10px] font-bold"><span>טליה / אימונים</span><span className="h-px w-14 bg-[#162218]/40" /></div>
                        <span className="absolute bottom-5 right-5 rounded-full bg-[#162218] px-4 py-2 text-[11px] font-bold text-[#dce780]">לבחור. להירשם. להגיע.</span>
                    </motion.div>

                    <p className="relative mt-6 max-w-[19rem] text-sm leading-relaxed text-[#c4d0bd]">האימונים הקרובים, המקום ששמרת והיתרה שלך. הכול כאן, לפני שיוצאים לסטודיו.</p>
                    <button id="main-signin-button" type="button" onClick={() => setIsLoginOpen(true)} className="relative mt-6 flex min-h-14 w-full items-center justify-between rounded-full bg-[#dce780] px-6 text-sm font-bold text-[#162218] transition-transform active:scale-[0.98]">
                        כניסה לאזור שלי <ArrowLeft aria-hidden="true" className="h-5 w-5" />
                    </button>
                    <div className="relative mt-7 flex items-center justify-between border-t border-white/20 pt-4 text-[11px] font-bold text-[#b8c7ae]"><span>סטודיו טליה</span><span>פשוט להגיע לאימון.</span></div>
                </section>

                <section className="px-5 pb-14 pt-14 sm:px-7" aria-labelledby="what-is-here">
                    <p className="mb-3 text-xs font-bold text-[#68794f]">כאן מתחיל האימון הבא</p>
                    <h2 id="what-is-here" className="max-w-[18rem] text-[clamp(2.3rem,10vw,3.4rem)] font-bold leading-[1.02] tracking-tight">כל מה שצריך.<br /><span className="text-[#829044]">במקום אחד.</span></h2>
                    <div className="mt-9 border-t border-[#1b251c]/25">
                        {[
                            ["01", "לוח האימונים", "רואות מה קרוב ובוחרות מתי להגיע."],
                            ["02", "המקום שלך", "ההרשמה והאימון הבא תמיד מולך."],
                            ["03", "יתרת האימונים", "היתרה שלך תמיד מול העיניים."],
                        ].map(([number, title, description]) => (
                            <div key={number} className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-[#1b251c]/25 py-6">
                                <span className="pt-1 text-xs font-bold text-[#829044]">{number}</span>
                                <div><h3 className="text-lg font-bold">{title}</h3><p className="mt-1 text-xs leading-relaxed text-[#5d6958]">{description}</p></div>
                            </div>
                        ))}
                    </div>
                </section>

                <footer className="mx-5 border-t border-[#1b251c]/20 pb-8 pt-5 text-xs text-[#6f795f] sm:mx-7">© סטודיו טליה</footer>
            </main>

            <AnimatePresence>
                {isLoginOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center">
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
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            className="relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-[#f1f0e8] px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-7 text-[#1b251c]"
                        >
                            <button type="button" onClick={resetLoginState} aria-label="סגירה" className="absolute left-6 top-7 flex h-11 w-11 items-center justify-center rounded-full border border-[#1b251c]/15"><X aria-hidden="true" className="h-5 w-5" /></button>
                            <p className="mb-2 text-xs font-bold text-[#5c6d2e]">סטודיו טליה</p>
                            <h2 id="login-title" className="max-w-[15rem] text-[2rem] font-bold leading-tight">
                                {loginView === "menu" ? "איך נוח לך להיכנס?" : loginView === "email" ? "נשלח לך קוד למייל" : "הקוד בדרך אלייך"}
                            </h2>
                            <p className="mb-7 mt-3 max-w-[18rem] text-sm leading-relaxed text-[#5d6958]">
                                {loginView === "menu" ? "בחרי את הדרך שמתאימה לך." : loginView === "email" ? "כתבי את הכתובת שלך ונשלח קוד חד־פעמי." : "הזיני את הקוד שקיבלת במייל כדי להיכנס."}
                            </p>

                            {loginView === "menu" && (
                                <div className="space-y-3">
                                    <button id="google-signin-button" type="button" onClick={handleGoogleLogin} disabled={isLoading} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[#1b251c] px-5 text-sm font-bold text-[#f6f6ed] disabled:opacity-50">
                                        {isLoading ? <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <GoogleMark />}
                                        המשך עם גוגל
                                    </button>
                                    <button type="button" onClick={() => { setAuthError(""); setLoginView("email"); }} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-[#1b251c]/20 bg-white px-5 text-sm font-bold">
                                        <Mail aria-hidden="true" className="h-4 w-4" /> כניסה עם קוד במייל
                                    </button>
                                </div>
                            )}

                            {loginView === "email" && (
                                <form onSubmit={(event) => { event.preventDefault(); handleSendCode(); }} className="space-y-3">
                                    <label htmlFor="login-email" className="block text-xs font-bold">כתובת המייל שלך</label>
                                    <input id="login-email" type="email" inputMode="email" autoComplete="email" required dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="כתובת המייל שלך" className="min-h-14 w-full rounded-2xl border border-[#1b251c]/20 bg-white px-4 text-sm outline-none focus:border-[#829044]" />
                                    <button type="submit" disabled={isLoading || !email} className="flex min-h-14 w-full items-center justify-between rounded-full bg-[#1b251c] px-5 text-sm font-bold text-[#f6f6ed] disabled:opacity-50">{isLoading ? "שולחים..." : "שלחי לי קוד"}<ArrowLeft aria-hidden="true" className="h-4 w-4" /></button>
                                    <button type="button" onClick={() => { setAuthError(""); setLoginView("menu"); }} className="flex min-h-11 items-center gap-2 text-xs font-bold text-[#5d6958]"><ArrowRight aria-hidden="true" className="h-4 w-4" />חזרה לאפשרויות</button>
                                </form>
                            )}

                            {loginView === "otp" && (
                                <form onSubmit={(event) => { event.preventDefault(); handleVerifyCode(); }} className="space-y-3">
                                    <label htmlFor="login-code" className="block text-xs font-bold">הקוד שקיבלת</label>
                                    <input id="login-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={10} required dir="ltr" value={otpCode} onChange={(event) => setOtpCode(event.target.value)} placeholder="••••••" className="min-h-14 w-full rounded-2xl border border-[#1b251c]/20 bg-white px-4 text-center text-xl tracking-[0.35em] outline-none focus:border-[#829044]" />
                                    <button type="submit" disabled={isLoading || otpCode.length < 6} className="flex min-h-14 w-full items-center justify-between rounded-full bg-[#1b251c] px-5 text-sm font-bold text-[#f6f6ed] disabled:opacity-50">{isLoading ? "בודקים..." : "אימות וכניסה"}<ArrowLeft aria-hidden="true" className="h-4 w-4" /></button>
                                    <button type="button" onClick={() => { setAuthError(""); setLoginView("email"); }} className="flex min-h-11 items-center gap-2 text-xs font-bold text-[#5d6958]"><ArrowRight aria-hidden="true" className="h-4 w-4" />חזרה לכתובת המייל</button>
                                </form>
                            )}

                            {authError && <p role="alert" className="mt-4 rounded-2xl bg-[#a53d35]/10 p-3 text-sm text-[#a53d35]">{authError}</p>}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
