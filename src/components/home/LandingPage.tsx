"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { Zap, Users, Trophy, Loader2, Sparkles, Mail, ArrowLeft, ArrowRight } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";

export default function LandingPage() {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [loginView, setLoginView] = useState<'menu' | 'email' | 'otp'>('menu');
    const [email, setEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const supabase = getSupabaseClient();

    // GSAP Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const barbellRef = useRef<SVGSVGElement>(null);
    const heroTextRef = useRef<HTMLHeadingElement>(null);
    const subtitleRef = useRef<HTMLParagraphElement>(null);
    const ctaRef = useRef<HTMLDivElement>(null);
    const statsRef = useRef<HTMLDivElement>(null);
    const featuresRef = useRef<HTMLDivElement>(null);

    // GSAP Hero Animation
    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            // Set initial states
            gsap.set(barbellRef.current, { opacity: 0, scale: 0.8, y: -30 });
            gsap.set(".hero-line-1", { opacity: 0, x: -50 });
            gsap.set(".hero-line-2", { opacity: 0, x: 50 });
            gsap.set(subtitleRef.current, { opacity: 0, y: 20 });
            gsap.set(ctaRef.current, { opacity: 0, scale: 0.9 });
            gsap.set(".stat-item", { opacity: 0, y: 30 });
            gsap.set(".feature-card", { opacity: 0, y: 50 });

            // Master timeline
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

            // Barbell drops in with bounce
            tl.to(barbellRef.current, {
                opacity: 1,
                scale: 1,
                y: 0,
                duration: 0.8,
                ease: "back.out(1.7)"
            })
                // Barbell subtle rotation animation
                .to(barbellRef.current, {
                    rotation: 3,
                    duration: 0.5,
                    ease: "power2.inOut",
                    yoyo: true,
                    repeat: 1
                }, "-=0.3")
                // Hero text reveals
                .to(".hero-line-1", {
                    opacity: 1,
                    x: 0,
                    duration: 0.6
                }, "-=0.5")
                .to(".hero-line-2", {
                    opacity: 1,
                    x: 0,
                    duration: 0.6
                }, "-=0.4")
                // Subtitle fades in
                .to(subtitleRef.current, {
                    opacity: 1,
                    y: 0,
                    duration: 0.5
                }, "-=0.3")
                // CTA button pops in
                .to(ctaRef.current, {
                    opacity: 1,
                    scale: 1,
                    duration: 0.5,
                    ease: "back.out(1.4)"
                }, "-=0.2")
                // Stats stagger in
                .to(".stat-item", {
                    opacity: 1,
                    y: 0,
                    duration: 0.5,
                    stagger: 0.15
                }, "-=0.2")
                // Feature cards stagger in
                .to(".feature-card", {
                    opacity: 1,
                    y: 0,
                    duration: 0.6,
                    stagger: 0.1,
                    ease: "back.out(1.2)"
                }, "-=0.3");

            // Continuous barbell float animation
            gsap.to(barbellRef.current, {
                y: -5,
                duration: 2,
                ease: "power1.inOut",
                yoyo: true,
                repeat: -1,
                delay: 2
            });

        }, containerRef);

        return () => ctx.revert();
    }, []);

    // Handlers
    const resetLoginState = () => {
        setIsLoginOpen(false);
        setLoginView('menu');
        setEmail("");
        setOtpCode("");
        setIsLoading(false);
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        const redirectUrl = `${window.location.origin}/auth/callback`;
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: redirectUrl },
        });
        if (error) {
            console.error(error);
            setIsLoading(false);
        }
    };

    const handleSendCode = async () => {
        if (!email) return;
        setIsLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: true }
        });

        setIsLoading(false);

        if (error) {
            alert("שגיאה: " + error.message);
        } else {
            setLoginView('otp');
        }
    };

    const handleVerifyCode = async () => {
        if (!otpCode) return;
        setIsLoading(true);

        const { error } = await supabase.auth.verifyOtp({
            email,
            token: otpCode,
            type: 'email'
        });

        if (error) {
            setIsLoading(false);
            alert("קוד שגוי או פג תוקף");
        } else {
            // Success - session is set, redirect happens via router or auth state change listener usually
            // But here we rely on Supabase refreshing the session.
            window.location.reload(); // Simple reload to pick up session, or rely on auth state listener higher up
        }
    };

    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

    return (
        <div ref={containerRef} className="min-h-[100dvh] w-full bg-[#131512] text-[#ECF0E7] overflow-x-hidden font-sans relative">

            {/* Animated Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[5%] left-[10%] w-[300px] h-[300px] bg-primary/5 rounded-full blur-[60px] animate-pulse" />
                <div className="absolute bottom-[15%] right-[5%] w-[250px] h-[250px] bg-[#E2F163]/5 rounded-full blur-[60px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/3 rounded-full blur-[100px]" />
            </div>

            {/* HERO SECTION */}
            <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-4 pt-10">

                {/* Weightlifting Illustration - Animated */}
                <div className="mb-6 md:mb-8 opacity-90 scale-[0.85] md:scale-100 relative">
                    <div className="absolute inset-0 bg-primary/20 blur-[30px] rounded-full animate-pulse" />
                    <svg
                        ref={barbellRef}
                        width="240"
                        height="120"
                        viewBox="0 0 200 100"
                        className="drop-shadow-[0_0_25px_rgba(226,241,99,0.5)] relative z-10"
                    >
                        <rect x="20" y="45" width="160" height="10" rx="4" fill="#5F6F52" />
                        <g>
                            <rect x="20" y="20" width="10" height="60" rx="2" fill="#9CA986" />
                            <rect x="35" y="30" width="8" height="40" rx="2" fill="#ECF0E7" />
                        </g>
                        <g>
                            <rect x="170" y="20" width="10" height="60" rx="2" fill="#9CA986" />
                            <rect x="157" y="30" width="8" height="40" rx="2" fill="#ECF0E7" />
                        </g>
                        {/* Sparkle */}
                        <circle cx="100" cy="30" r="2" fill="#E2F163" className="animate-ping" opacity="0.7" />
                    </svg>
                </div>

                {/* Typography with GSAP */}
                <h1 ref={heroTextRef} className="relative font-bold leading-[0.9] tracking-tighter mb-6 md:mb-8 select-none">
                    <div className="hero-line-1 text-[20vw] md:text-[11vw] text-white">
                        כושר
                    </div>
                    <div className="hero-line-2 text-[20vw] md:text-[11vw] text-transparent bg-clip-text bg-gradient-to-tr from-[#E2F163] via-primary to-[#E2F163] mt-[-3vw] md:mt-[-2vw]">
                        מחדש
                    </div>
                </h1>

                <p ref={subtitleRef} className="text-lg md:text-2xl text-neutral-400 max-w-sm md:max-w-2xl mx-auto leading-relaxed mb-10 md:mb-12 font-bold px-4">
                    לא עוד מכון רגיל. <span className="text-[#E2F163]">טליה</span> הוא המקום שבו הכוח שלך מתפרץ.
                    <br className="hidden md:block" />
                    קהילה, עוצמה, ותוצאות שאפשר לראות.
                </p>

                {/* LOGIN REVEAL */}
                <div ref={ctaRef} className="min-h-[100px] flex items-center justify-center relative z-50 w-full px-4">
                    <AnimatePresence mode="wait">
                        {!isLoginOpen ? (
                            <motion.button
                                id="main-signin-button"
                                key="join-btn"
                                onClick={() => setIsLoginOpen(true)}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="group relative w-full md:w-auto px-12 py-6 bg-[#E2F163] text-black font-bold text-2xl rounded-full overflow-hidden shadow-2xl shadow-primary/30"
                            >
                                {/* Shine effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                    הצטרפי למהפכה <Zap className="w-6 h-6 fill-black" />
                                </span>
                            </motion.button>
                        ) : (
                            <motion.div
                                key="login-options"
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="w-full md:w-auto bg-neutral-900/90 backdrop-blur-xl border border-white/10 p-4 md:p-2 rounded-[2rem] shadow-2xl flex flex-col md:flex-row gap-6 items-stretch relative overflow-hidden"
                            >
                                <button
                                    onClick={(e) => { e.stopPropagation(); resetLoginState(); }}
                                    className="absolute top-3 left-4 md:left-auto md:top-2 md:right-4 text-neutral-500 hover:text-white text-xs font-bold uppercase tracking-wider z-20 p-2 transition-colors"
                                >
                                    חזרה
                                </button>

                                <div className="p-4 pt-8 md:pt-4 text-center md:text-right w-full md:w-auto flex flex-col justify-center min-w-[200px]">
                                    <h3 className="text-white font-bold text-lg mb-1 flex items-center justify-center md:justify-start gap-2">
                                        <Sparkles className="w-4 h-4 text-[#E2F163]" />
                                        {loginView === 'menu' && "התחברות מהירה"}
                                        {loginView === 'email' && "התחברות במייל"}
                                        {loginView === 'otp' && "אימות קוד"}
                                    </h3>
                                    <p className="text-neutral-500 text-xs">
                                        {loginView === 'menu' && "בחרי דרך להתחיל"}
                                        {loginView === 'email' && "נשלח לך קוד חד פעמי להתחברות"}
                                        {loginView === 'otp' && "הזיני את הקוד שקיבלת במייל"}
                                    </p>
                                </div>

                                {/* MENU VIEW */}
                                {loginView === 'menu' && (
                                    <div className="flex flex-col gap-3 w-full md:w-auto min-w-[280px]">
                                        <button
                                            id="google-signin-button"
                                            onClick={handleGoogleLogin}
                                            disabled={isLoading}
                                            className="flex items-center gap-3 bg-white text-black font-bold py-4 px-6 rounded-2xl w-full justify-center active:scale-95 transition-all hover:shadow-lg disabled:opacity-70"
                                        >
                                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                                <>
                                                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                                    Google
                                                </>
                                            )}
                                        </button>

                                        <div className="flex items-center gap-2 px-2 opacity-50">
                                            <div className="h-px bg-white/20 flex-1" />
                                            <span className="text-[10px] uppercase font-bold tracking-widest">או</span>
                                            <div className="h-px bg-white/20 flex-1" />
                                        </div>

                                        <button
                                            onClick={() => setLoginView('email')}
                                            className="flex items-center gap-3 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold py-4 px-6 rounded-2xl w-full justify-center active:scale-95 transition-all text-sm"
                                        >
                                            <Mail className="w-4 h-4 text-[#E2F163]" />
                                            התחברות באמצעות קוד במייל
                                        </button>
                                    </div>
                                )}

                                {/* EMAIL INPUT VIEW */}
                                {loginView === 'email' && (
                                    <div className="flex flex-col gap-3 w-full md:w-auto min-w-[280px]">
                                        <input
                                            type="email"
                                            placeholder="your@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#E2F163] transition-colors text-left dir-ltr"
                                            dir="ltr"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleSendCode}
                                            disabled={isLoading || !email}
                                            className="flex items-center gap-2 bg-[#E2F163] text-black font-bold py-4 px-6 rounded-2xl w-full justify-center active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                                <>
                                                    שלחי לי קוד
                                                    <ArrowLeft className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setLoginView('menu')}
                                            className="text-xs text-neutral-400 hover:text-white mt-1"
                                        >
                                            חזרה לאפשרויות
                                        </button>
                                    </div>
                                )}

                                {/* OTP INPUT VIEW */}
                                {loginView === 'otp' && (
                                    <div className="flex flex-col gap-3 w-full md:w-auto min-w-[280px]">
                                        <input
                                            type="text"
                                            placeholder="123456"
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value)}
                                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-4 text-white text-center text-2xl tracking-[0.5em] placeholder:text-white/10 focus:outline-none focus:border-[#E2F163] transition-colors"
                                            maxLength={10}
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleVerifyCode}
                                            disabled={isLoading || otpCode.length < 6}
                                            className="flex items-center gap-2 bg-[#E2F163] text-black font-bold py-4 px-6 rounded-2xl w-full justify-center active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                                <>
                                                    אימות והתחברות
                                                    <ArrowLeft className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setLoginView('email')}
                                            className="text-xs text-neutral-400 hover:text-white mt-1"
                                        >
                                            שליחה מחדש / תיקון מייל
                                        </button>
                                    </div>
                                )}

                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Live Stats */}
                <div ref={statsRef} className="mt-24 md:mt-32 w-full max-w-2xl mx-auto px-4 grid grid-cols-2 gap-8 md:flex md:justify-center md:gap-16 text-center">
                    <div className="stat-item">
                        <div className="text-4xl md:text-6xl font-bold text-white mb-2 flex items-center justify-center gap-1">
                            <span>1,234</span><span className="text-[#E2F163]">+</span>
                        </div>
                        <div className="text-xs md:text-sm font-bold text-neutral-500 uppercase tracking-widest">מתאמנות פעילות</div>
                    </div>

                    <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-neutral-700 to-transparent" />

                    <div className="stat-item">
                        <div className="text-4xl md:text-6xl font-bold text-white mb-2">
                            24/7
                        </div>
                        <div className="text-xs md:text-sm font-bold text-neutral-500 uppercase tracking-widest">זמינות בסטודיו</div>
                    </div>
                </div>

            </section>

            {/* Feature Cards */}
            <section ref={featuresRef} className="relative z-10 py-20 md:py-32 px-4 md:px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {[
                        { icon: Trophy, title: "אלופה", desc: "תחרויות ואתגרים חודשיים שיוציאו ממך את המקסימום.", gradient: "from-amber-500/20 to-amber-600/5" },
                        { icon: Users, title: "ביחד", desc: "אימונים בקבוצות קטנות שמרגישים בדיוק כמו משפחה.", gradient: "from-blue-500/20 to-blue-600/5" },
                        { icon: Zap, title: "אנרגיה", desc: "מוזיקה, תאורה ואווירה שגורמים לך לשכוח מהכל ולהתמקד.", gradient: "from-[#E2F163]/20 to-[#E2F163]/5" }
                    ].map((feature, i) => (
                        <div
                            key={i}
                            className={`feature-card group p-8 md:p-10 rounded-[2rem] bg-gradient-to-br ${feature.gradient} border border-white/5 active:scale-[0.98] transition-all duration-300 hover:border-white/10 hover:shadow-xl`}
                        >
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/5 group-hover:scale-110 group-hover:bg-white/15 transition-all">
                                <feature.icon className="w-7 h-7 md:w-8 md:h-8 text-[#E2F163]" />
                            </div>

                            <h3 className="text-xl md:text-2xl font-bold mb-3 text-white group-hover:text-[#E2F163] transition-colors">{feature.title}</h3>
                            <p className="text-neutral-400 font-medium leading-relaxed text-sm md:text-base">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 py-8 text-center border-t border-white/5">
                <p className="text-neutral-600 text-xs font-medium">
                    © 2024 Talia Studio. כל הזכויות שמורות.
                </p>
            </footer>
        </div>
    );
}
