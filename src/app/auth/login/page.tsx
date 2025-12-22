"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowLeft, Check, Star, Zap, Users, Trophy, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { AnimatePresence, motion } from "framer-motion";

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const counterRef = useRef<HTMLSpanElement>(null);

    // Animations Refs
    const barbellRef = useRef<SVGSVGElement>(null);
    const platesLeftRef = useRef<SVGGElement>(null);
    const platesRightRef = useRef<SVGGElement>(null);

    // Login State
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createClient();

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

    useEffect(() => {
        const ctx = gsap.context(() => {
            // 1. Hero Text Explosion
            const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

            tl.fromTo(".hero-line",
                { y: 100, opacity: 0, rotateX: -45, scale: 0.8 },
                { y: 0, opacity: 1, rotateX: 0, scale: 1, duration: 1.5, stagger: 0.1 }
            )
                .fromTo(".hero-desc",
                    { y: 20, opacity: 0 },
                    { y: 0, opacity: 1, duration: 1 },
                    "-=1"
                );
            // Note: CTA animation moved to Framer Motion

            // 2. Weightlifting Animation (Barbell Bounce)
            if (barbellRef.current) {
                gsap.to(barbellRef.current, {
                    y: -20,
                    duration: 1.5,
                    repeat: -1,
                    yoyo: true,
                    ease: "power1.inOut"
                });

                gsap.to([platesLeftRef.current, platesRightRef.current], {
                    rotation: 5,
                    duration: 0.2,
                    repeat: -1,
                    yoyo: true,
                    ease: "sine.inOut"
                });
            }

            // 3. Counter Animation
            gsap.to({}, {
                duration: 2.5,
                ease: "power3.out",
                onUpdate: function () {
                    const progress = this.progress();
                    const value = Math.floor(progress * 1234);
                    if (counterRef.current) {
                        counterRef.current.innerText = value.toLocaleString();
                    }
                },
                scrollTrigger: {
                    trigger: ".stats-section",
                    start: "top 80%",
                }
            });

            // 4. Parallax Background
            gsap.to(".bg-parallax", {
                y: "20%",
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top top",
                    end: "bottom top",
                    scrub: 1
                }
            });

        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <div ref={containerRef} className="min-h-[200vh] bg-[#131512] text-[#ECF0E7] overflow-x-hidden font-heebo relative selection:bg-primary selection:text-black">

            {/* Background Noise & Atmosphere */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
                <div className="bg-parallax absolute top-0 left-0 w-full h-[120vh] bg-gradient-to-b from-primary/5 to-transparent blur-3xl" />

                {/* Floating Orbs */}
                <div className="bg-parallax absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-[#E2F163]/5 rounded-full blur-[80px]" />
            </div>

            {/* HERO SECTION */}
            <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-4 pt-10">

                {/* Weightlifting Illustrations */}
                <div className="mb-8 opacity-90 scale-90 md:scale-100 relative">
                    <div className="absolute inset-0 bg-primary/20 blur-[40px] rounded-full animate-pulse" />
                    <svg ref={barbellRef} width="240" height="120" viewBox="0 0 200 100" className="drop-shadow-[0_0_20px_rgba(156,169,134,0.6)] relative z-10">
                        <rect x="20" y="45" width="160" height="10" rx="4" fill="#5F6F52" />
                        <g ref={platesLeftRef}>
                            <rect x="20" y="20" width="10" height="60" rx="2" fill="#9CA986" />
                            <rect x="35" y="30" width="8" height="40" rx="2" fill="#ECF0E7" />
                        </g>
                        <g ref={platesRightRef}>
                            <rect x="170" y="20" width="10" height="60" rx="2" fill="#9CA986" />
                            <rect x="157" y="30" width="8" height="40" rx="2" fill="#ECF0E7" />
                        </g>
                    </svg>
                </div>

                {/* Massive Typography */}
                <h1 className="relative font-black leading-[0.9] tracking-tighter mb-8 drop-shadow-2xl select-none">
                    <div className="hero-line text-[14vw] md:text-[11vw] text-white mix-blend-overlay">
                        כושר
                    </div>
                    <div className="hero-line text-[14vw] md:text-[11vw] text-transparent bg-clip-text bg-gradient-to-tr from-[#E2F163] via-primary to-[#E2F163] mt-[-2vw] relative z-20">
                        מחדש
                    </div>
                </h1>

                <p className="hero-desc text-xl md:text-2xl text-neutral-400 max-w-2xl mx-auto leading-relaxed mb-12 font-bold">
                    לא עוד מכון רגיל. <span className="text-[#E2F163]">טליה</span> הוא המקום שבו הכוח שלך מתפרץ.
                    <br className="hidden md:block" />
                    קהילה, עוצמה, ותוצאות שאפשר לראות.
                </p>

                {/* ANIMATED LOGIN REVEAL */}
                <div className="min-h-[100px] flex items-center justify-center relative z-50">
                    <AnimatePresence mode="wait">
                        {!isLoginOpen ? (
                            <motion.button
                                key="join-btn"
                                layoutId="login-container"
                                onClick={() => setIsLoginOpen(true)}
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(226,241,99,0.4)" }}
                                whileTap={{ scale: 0.95 }}
                                className="group relative px-12 py-6 bg-[#E2F163] text-black font-black text-2xl rounded-full overflow-hidden shadow-2xl"
                            >
                                <span className="relative z-10 flex items-center gap-3">
                                    הצטרפי למהפכה <Zap className="w-6 h-6 fill-black animate-pulse" />
                                </span>
                                <div className="absolute inset-0 bg-white/40 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                            </motion.button>
                        ) : (
                            <motion.div
                                key="login-options"
                                layoutId="login-container"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="bg-neutral-900/80 backdrop-blur-xl border border-white/10 p-2 rounded-[2rem] shadow-2xl flex flex-col sm:flex-row gap-3 items-center relative overflow-hidden"
                            >
                                {/* Close Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsLoginOpen(false); }}
                                    className="absolute top-2 right-4 text-neutral-500 hover:text-white text-xs font-bold uppercase tracking-wider z-20"
                                >
                                    חזרה
                                </button>

                                <div className="p-4 pt-8 sm:pt-4 text-center sm:text-right">
                                    <h3 className="text-white font-bold text-lg mb-1">התחברות מהירה</h3>
                                    <p className="text-neutral-500 text-xs">בחרי דרך להתחיל</p>
                                </div>

                                <motion.button
                                    onClick={handleGoogleLogin}
                                    whileHover={{ scale: 1.02, backgroundColor: "white" }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex items-center gap-3 bg-white text-black font-bold py-4 px-6 rounded-2xl transition-colors min-w-[200px] justify-center"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>
                                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                            Google
                                        </>
                                    )}
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02, backgroundColor: "white" }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex items-center gap-3 bg-white text-black font-bold py-4 px-6 rounded-2xl transition-colors min-w-[200px] justify-center"
                                >
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.8 9.9c.2-.5.3-1.1.3-1.7 0-1.2-.5-2.3-1.3-3.1-.8-.8-1.9-1.3-3.1-1.3-1.2 0-2.3.5-3.1 1.3-.8.8-1.3 1.9-1.3 3.1 0 .6.1 1.2.3 1.7L6 19.4h2.5l2.2-4.7c.4.2.9.3 1.3.3.5 0 .9-.1 1.3-.3l2.2 4.7H18l-3.6-9.5c.2-.5.3-1.1.3-1.7zm-5.8 0c0-.8.3-1.6.9-2.2.6-.6 1.3-.9 2.2-.9.8 0 1.6.3 2.2.9.6.6.9 1.3.9 2.2 0 1-.4 1.9-1 2.5l-1.4-2.9h-1.3l-1.4 2.9c-.6-.6-1-1.5-1-2.5z" /></svg>
                                    Apple
                                </motion.button>

                                {/* TEMP DEV LOGIN */}
                                <motion.button
                                    onClick={async () => {
                                        setIsLoading(true);
                                        const email = `dev_${Date.now()}@test.com`;
                                        const password = "password123";
                                        const { error } = await supabase.auth.signUp({
                                            email,
                                            password,
                                            options: {
                                                data: {
                                                    first_name: "Dev",
                                                    last_name: "Tester",
                                                }
                                            }
                                        });
                                        if (error) {
                                            // If sign up fails (maybe user exists logic, though timestamp prevents it), try sign in
                                            console.error("Dev Signup Error", error);
                                            await supabase.auth.signInWithPassword({ email, password });
                                        }
                                        // Force redirect
                                        window.location.href = "/book";
                                    }}
                                    whileHover={{ scale: 1.05 }}
                                    className="px-4 py-2 bg-red-500/20 text-red-400 text-xs rounded-lg border border-red-500/50 mt-2"
                                >
                                    Dev Login
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Live Stats */}
                <div className="stats-section mt-32 flex flex-wrap justify-center gap-8 md:gap-16 text-center">
                    <div>
                        <div className="text-4xl md:text-6xl font-black text-white mb-2 flex items-center justify-center gap-1 shadow-green-glow">
                            <span ref={counterRef}>0</span><span>+</span>
                        </div>
                        <div className="text-sm font-black text-neutral-500 uppercase tracking-[0.2em]">מתאמנות פעילות</div>
                    </div>
                    <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-neutral-700 to-transparent" />
                    <div>
                        <div className="text-4xl md:text-6xl font-black text-white mb-2">
                            24/7
                        </div>
                        <div className="text-sm font-black text-neutral-500 uppercase tracking-[0.2em]">זמינות בסטודיו</div>
                    </div>
                </div>

            </section >

            {/* Dynamic Feature Cards */}
            < section className="relative z-10 py-32 px-6 max-w-7xl mx-auto" >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { icon: Trophy, title: "אלופה", desc: "תחרויות ואתגרים חודשיים שיוציאו ממך את המקסימום." },
                        { icon: Users, title: "ביחד", desc: "אימונים בקבוצות קטנות שמרגישים בדיוק כמו משפחה." },
                        { icon: Zap, title: "אנרגיה", desc: "מוזיקה, תאורה ואווירה שגורמים לך לשכוח מהכל ולהתמקד." }
                    ].map((feature, i) => (
                        <div key={i} className="group p-10 rounded-[2.5rem] bg-neutral-900/40 border border-white/5 backdrop-blur-md hover:bg-neutral-800/80 hover:border-[#E2F163]/30 transition-all duration-500 hover:-translate-y-3 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-[#E2F163]/5 rounded-full blur-[60px] group-hover:bg-[#E2F163]/20 transition-all duration-700" />

                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 border border-white/5 group-hover:border-[#E2F163]/50">
                                <feature.icon className="w-8 h-8 text-[#E2F163] group-hover:text-white transition-colors" />
                            </div>

                            <h3 className="text-2xl font-black mb-3 text-white group-hover:text-[#E2F163] transition-colors">{feature.title}</h3>
                            <p className="text-neutral-400 font-medium leading-relaxed group-hover:text-neutral-300">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </section >
        </div >
    );
}
