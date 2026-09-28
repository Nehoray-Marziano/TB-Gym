"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Mail, Ticket, X } from "lucide-react";
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
        <div className="min-h-dvh overflow-x-hidden bg-[#f1f0e8] text-[#1b251c]">
            <main className="mx-auto max-w-lg px-5 pb-16 pt-6 sm:px-7">
                <header className="flex items-center justify-between border-b border-[#1b251c]/15 pb-5">
                    <div className="flex items-center gap-3">
                        <StudioLogo className="h-9 w-9 bg-[#1b251c]" />
                        <span className="border-s border-[#1b251c]/20 ps-3 text-xs font-bold leading-tight">סטודיו<br />טליה</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#5f6c5b]">האזור שלך בסטודיו</span>
                </header>

                <section className="pt-11" aria-labelledby="landing-title">
                    <p className="mb-4 flex items-center gap-2 text-xs font-bold text-[#5d6958]"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#809143]" />לוח האימונים של טליה</p>
                    <h1 id="landing-title" className="text-[clamp(3.7rem,15vw,5.7rem)] font-bold leading-[0.98] tracking-tight">
                        יש לך<br /><span className="text-[#829044]">מקום</span><br />לזוז<span className="text-[#829044]">.</span>
                    </h1>
                    <p className="mt-6 max-w-[19rem] text-[15px] leading-relaxed text-[#5d6958]">האימונים הקרובים, המקום ששמרת והיתרה שלך. הכול כאן, לפני שיוצאים לסטודיו.</p>
                    <button
                        id="main-signin-button"
                        type="button"
                        onClick={() => setIsLoginOpen(true)}
                        className="mt-8 flex min-h-14 w-full items-center justify-between rounded-full bg-[#1b251c] px-6 text-sm font-bold text-[#f6f6ed] transition-colors active:bg-[#334436]"
                    >
                        כניסה לאזור שלי <ArrowLeft aria-hidden="true" className="h-5 w-5" />
                    </button>
                </section>

                <section aria-label="סטודיו טליה" className="relative mt-10 h-[21rem] overflow-hidden rounded-[2rem] bg-[#1b251c] p-6 text-[#f6f6ed]">
                    <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-56 h-80 w-80 rounded-full border-[42px] border-[#dce780]" />
                    <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 -right-28 h-72 w-72 rounded-full border-[38px] border-[#dce780]/20" />
                    <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-[37%] top-0 w-px rotate-[25deg] bg-[#dce780]/15" />
                    <div className="relative flex items-start justify-between">
                        <span className="text-[11px] font-bold text-[#dce780]">טליה / הסטודיו שלך</span>
                        <span className="text-[11px] font-bold text-[#aab7a0]">לוח האימונים מחכה לך</span>
                    </div>
                    <div className="relative mt-16">
                        <p className="text-[clamp(2rem,10vw,2.65rem)] font-bold leading-[1.04] tracking-tight">לבחור אימון.<br />לשמור מקום.<br /><span className="text-[#dce780]">פשוט להגיע.</span></p>
                    </div>
                    <div className="relative mt-7 flex items-center justify-between border-t border-white/20 pt-4 text-[11px] text-[#b9c6b2]">
                        <span>כל מה שצריך לאימון הבא</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-[#dce780]" />
                    </div>
                </section>

                <section className="mt-14" aria-labelledby="what-is-here">
                    <div className="mb-4 flex items-end justify-between border-b border-[#1b251c]/15 pb-3">
                        <h2 id="what-is-here" className="text-lg font-bold">מה מחכה לך כאן</h2>
                    </div>
                    <div className="divide-y divide-[#1b251c]/15">
                        <div className="flex min-h-24 items-center gap-4 py-4">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#dfe6bd] text-[#1b251c]"><CalendarDays aria-hidden="true" className="h-5 w-5" /></span>
                            <div><h3 className="font-bold">לוח האימונים</h3><p className="mt-1 text-xs text-[#5d6958]">רואות מה קרוב ובוחרות מתי להגיע.</p></div>
                        </div>
                        <div className="flex min-h-24 items-center gap-4 py-4">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#dfe6bd] text-[#1b251c]"><Check aria-hidden="true" className="h-5 w-5" /></span>
                            <div><h3 className="font-bold">המקום שלך</h3><p className="mt-1 text-xs text-[#5d6958]">ההרשמה והאימון הבא תמיד מולך.</p></div>
                        </div>
                        <div className="flex min-h-24 items-center gap-4 py-4">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#dfe6bd] text-[#1b251c]"><Ticket aria-hidden="true" className="h-5 w-5" /></span>
                            <div><h3 className="font-bold">יתרת האימונים</h3><p className="mt-1 text-xs text-[#5d6958]">היתרה שלך תמיד מול העיניים.</p></div>
                        </div>
                    </div>
                </section>

                <footer className="mt-14 border-t border-[#1b251c]/15 pt-5 text-xs text-[#6f795f]">© סטודיו טליה</footer>
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
