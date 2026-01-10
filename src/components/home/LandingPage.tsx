"use client";

import { useEffect, useRef, useState } from "react";
import { Zap, Users, Trophy, Loader2 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { AnimatePresence, motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";

export default function LandingPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const counterRef = useRef<HTMLSpanElement>(null);
    const [counterValue, setCounterValue] = useState(0);

    // Login State
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const supabase = getSupabaseClient();

    // Mouse parallax
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 });
    const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20 });

    // Scroll animations
    const { scrollYProgress } = useScroll();
    const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -50]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.8]);

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

    // Mouse parallax effect
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 40;
            const y = (e.clientY / window.innerHeight - 0.5) * 40;
            mouseX.set(x);
            mouseY.set(y);
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX, mouseY]);

    // Counter animation
    useEffect(() => {
        const duration = 2500;
        const target = 1234;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            setCounterValue(Math.floor(eased * target));

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        const timer = setTimeout(animate, 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div ref={containerRef} className="min-h-[100dvh] w-full bg-[#131512] text-[#ECF0E7] overflow-x-hidden font-sans relative selection:bg-primary selection:text-black">

            {/* Background Noise & Atmosphere */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay"></div>

                {/* Dynamic Floating Orbs - Optimized */}
                <motion.div
                    className="absolute top-[5%] left-[10%] w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-primary/5 rounded-full blur-[40px] will-change-transform"
                    style={{ x: smoothX, y: smoothY }}
                />
                <motion.div
                    className="absolute bottom-[15%] right-[5%] w-[250px] h-[250px] md:w-[400px] md:h-[400px] bg-[#E2F163]/5 rounded-full blur-[40px] will-change-transform"
                />
            </div>

            {/* HERO SECTION */}
            <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-4 pt-10 perspective-1000">

                {/* Weightlifting Illustration with animation */}
                <motion.div
                    className="mb-6 md:mb-8 opacity-90 scale-[0.85] md:scale-100 relative"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <div className="absolute inset-0 bg-primary/20 blur-[30px] rounded-full animate-pulse" />
                    <motion.svg
                        width="240"
                        height="120"
                        viewBox="0 0 200 100"
                        className="drop-shadow-[0_0_20px_rgba(156,169,134,0.6)] relative z-10"
                        animate={{ y: [-4, 4, -4] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <rect x="20" y="45" width="160" height="10" rx="4" fill="#5F6F52" />
                        <motion.g
                            animate={{ rotate: [-4, 4, -4] }}
                            transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut" }}
                            style={{ transformOrigin: "30px 50px" }}
                        >
                            <rect x="20" y="20" width="10" height="60" rx="2" fill="#9CA986" />
                            <rect x="35" y="30" width="8" height="40" rx="2" fill="#ECF0E7" />
                        </motion.g>
                        <motion.g
                            animate={{ rotate: [4, -4, 4] }}
                            transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut" }}
                            style={{ transformOrigin: "170px 50px" }}
                        >
                            <rect x="170" y="20" width="10" height="60" rx="2" fill="#9CA986" />
                            <rect x="157" y="30" width="8" height="40" rx="2" fill="#ECF0E7" />
                        </motion.g>
                    </motion.svg>
                </motion.div>

                {/* Massive Typography with stagger animation */}
                <motion.h1
                    className="relative font-bold leading-[0.9] tracking-tighter mb-6 md:mb-8 drop-shadow-2xl select-none"
                    style={{ y: heroY, opacity: heroOpacity }}
                >
                    <motion.div
                        className="text-[20vw] md:text-[11vw] text-white mix-blend-overlay"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        כושר
                    </motion.div>
                    <motion.div
                        className="text-[20vw] md:text-[11vw] text-transparent bg-clip-text bg-gradient-to-tr from-[#E2F163] via-primary to-[#E2F163] mt-[-3vw] md:mt-[-2vw] relative z-20"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                    >
                        מחדש
                    </motion.div>
                </motion.h1>

                <motion.p
                    className="text-lg md:text-2xl text-neutral-400 max-w-sm md:max-w-2xl mx-auto leading-relaxed mb-10 md:mb-12 font-bold font-rubik px-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                >
                    לא עוד מכון רגיל. <span className="text-[#E2F163]">טליה</span> הוא המקום שבו הכוח שלך מתפרץ.
                    <br className="hidden md:block" />
                    קהילה, עוצמה, ותוצאות שאפשר לראות.
                </motion.p>

                {/* ANIMATED LOGIN REVEAL */}
                <motion.div
                    className="min-h-[100px] flex items-center justify-center relative z-50 w-full px-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.7 }}
                >
                    <AnimatePresence mode="wait">
                        {!isLoginOpen ? (
                            <motion.button
                                id="main-signin-button"
                                key="join-btn"
                                layoutId="login-container"
                                onClick={() => setIsLoginOpen(true)}
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                whileTap={{ scale: 0.95 }}
                                whileHover={{ scale: 1.02 }}
                                className="group relative w-full md:w-auto px-12 py-6 bg-[#E2F163] text-black font-bold text-2xl rounded-full overflow-hidden shadow-2xl active:scale-95 transition-transform"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3">
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
                                className="w-full md:w-auto bg-neutral-900/90 backdrop-blur-xl border border-white/10 p-4 md:p-2 rounded-[2rem] shadow-2xl flex flex-col md:flex-row gap-3 items-center relative overflow-hidden"
                            >
                                {/* Close Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsLoginOpen(false); }}
                                    className="absolute top-3 left-4 md:left-auto md:top-2 md:right-4 text-neutral-500 hover:text-white text-xs font-bold uppercase tracking-wider z-20 p-2"
                                >
                                    חזרה
                                </button>

                                <div className="p-4 pt-8 md:pt-4 text-center md:text-right w-full md:w-auto">
                                    <h3 className="text-white font-bold text-lg mb-1">התחברות מהירה</h3>
                                    <p className="text-neutral-500 text-xs">בחרי דרך להתחיל</p>
                                </div>

                                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                                    <motion.button
                                        id="google-signin-button"
                                        onClick={handleGoogleLogin}
                                        whileTap={{ scale: 0.98 }}
                                        whileHover={{ scale: 1.02 }}
                                        className="flex items-center gap-3 bg-white text-black font-bold py-4 px-6 rounded-2xl transition-colors w-full md:min-w-[200px] justify-center"
                                    >
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                            <>
                                                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                                Google
                                            </>
                                        )}
                                    </motion.button>

                                    <motion.button
                                        id="apple-signin-button"
                                        whileTap={{ scale: 0.98 }}
                                        className="flex items-center gap-3 bg-black/50 border border-neutral-700 text-white font-bold py-4 px-6 rounded-2xl transition-colors w-full md:min-w-[160px] justify-center grayscale opacity-80"
                                    >
                                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.8 9.9c.2-.5.3-1.1.3-1.7 0-1.2-.5-2.3-1.3-3.1-.8-.8-1.9-1.3-3.1-1.3-1.2 0-2.3.5-3.1 1.3-.8.8-1.3 1.9-1.3 3.1 0 .6.1 1.2.3 1.7L6 19.4h2.5l2.2-4.7c.4.2.9.3 1.3.3.5 0 .9-.1 1.3-.3l2.2 4.7H18l-3.6-9.5c.2-.5.3-1.1.3-1.7zm-5.8 0c0-.8.3-1.6.9-2.2.6-.6 1.3-.9 2.2-.9.8 0 1.6.3 2.2.9.6.6.9 1.3.9 2.2 0 1-.4 1.9-1 2.5l-1.4-2.9h-1.3l-1.4 2.9c-.6-.6-1-1.5-1-2.5z" /></svg>
                                        Apple
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Live Stats */}
                <motion.div
                    className="mt-24 md:mt-32 w-full max-w-2xl mx-auto px-4 grid grid-cols-2 gap-8 md:flex md:justify-center md:gap-16 text-center"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.9 }}
                >
                    <div>
                        <div className="text-4xl md:text-6xl font-bold text-white mb-2 flex items-center justify-center gap-1 shadow-green-glow">
                            <span>{counterValue.toLocaleString()}</span><span>+</span>
                        </div>
                        <div className="text-xs md:text-sm font-bold text-neutral-500 uppercase tracking-widest">מתאמנות פעילות</div>
                    </div>

                    <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-neutral-700 to-transparent" />

                    <div>
                        <div className="text-4xl md:text-6xl font-bold text-white mb-2">
                            24/7
                        </div>
                        <div className="text-xs md:text-sm font-bold text-neutral-500 uppercase tracking-widest">זמינות בסטודיו</div>
                    </div>
                </motion.div>

            </section>

            {/* Dynamic Feature Cards */}
            <section className="relative z-10 py-20 md:py-32 px-4 md:px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {[
                        { icon: Trophy, title: "אלופה", desc: "תחרויות ואתגרים חודשיים שיוציאו ממך את המקסימום." },
                        { icon: Users, title: "ביחד", desc: "אימונים בקבוצות קטנות שמרגישים בדיוק כמו משפחה." },
                        { icon: Zap, title: "אנרגיה", desc: "מוזיקה, תאורה ואווירה שגורמים לך לשכוח מהכל ולהתמקד." }
                    ].map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            whileInView={{ opacity: 1, y: 0, scale: 1 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            whileHover={{ scale: 1.02, y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            className="group p-8 md:p-10 rounded-[2rem] bg-neutral-900/40 border border-white/5 backdrop-blur-md hover:bg-neutral-800/80 hover:border-[#E2F163]/30 transition-all duration-500 relative overflow-hidden cursor-pointer"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 md:w-40 md:h-40 bg-[#E2F163]/5 rounded-full blur-[60px] group-hover:bg-[#E2F163]/20 transition-all duration-700" />

                            <motion.div
                                className="w-14 h-14 md:w-16 md:h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/5 group-hover:border-[#E2F163]/50"
                                whileHover={{ scale: 1.1, rotate: 6 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <feature.icon className="w-7 h-7 md:w-8 md:h-8 text-[#E2F163] group-hover:text-white transition-colors" />
                            </motion.div>

                            <h3 className="text-xl md:text-2xl font-bold mb-3 text-white group-hover:text-[#E2F163] transition-colors">{feature.title}</h3>
                            <p className="text-neutral-400 font-medium leading-relaxed group-hover:text-neutral-300 text-sm md:text-base">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>
        </div>
    );
}
