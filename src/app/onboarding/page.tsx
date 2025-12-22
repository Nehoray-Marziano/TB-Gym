"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { ArrowRight, ArrowLeft, Check, Heart, AlertCircle, Sparkles } from "lucide-react";

type FormData = {
    fullName: string;
    age: string;
    phone: string;
    isHealthy: boolean | null;
    medicalConditions: string;
};

const STEPS = [
    { id: 1, title: "נעים להכיר", description: "מה השם שלך?", field: "fullName" },
    { id: 2, title: "פרטים אישיים", description: "קצת מספרים", field: "age" },
    { id: 3, title: "יצירת קשר", description: "איך להשיג אותך?", field: "phone" },
    { id: 4, title: "הצהרת בריאות", description: "המצב הגופני שלך", field: "health" },
];

export default function OnboardingPage() {
    const router = useRouter();
    const supabase = createClient();

    // State
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        fullName: "",
        age: "",
        phone: "",
        isHealthy: null,
        medicalConditions: "",
    });
    const [direction, setDirection] = useState(1);

    // Initial LOAD anim
    useEffect(() => {
        gsap.fromTo(".onboarding-card",
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, ease: "power4.out", delay: 0.2 }
        );
    }, []);

    // Validation
    const isStepValid = () => {
        switch (step) {
            case 1: return formData.fullName.length > 2;
            case 2: return formData.age && parseInt(formData.age) > 12 && parseInt(formData.age) < 120;
            case 3: return /^05\d-?\d{7}$/.test(formData.phone);
            case 4: return formData.isHealthy !== null && (formData.isHealthy === true || formData.medicalConditions.length > 3);
            default: return false;
        }
    };

    const handleNext = () => {
        if (!isStepValid()) return;

        if (step < STEPS.length) {
            setDirection(1);
            setStep(s => s + 1);
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setDirection(-1);
            setStep(s => s - 1);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            // 1. Update Profile
            await supabase.from("profiles").update({
                full_name: formData.fullName,
                age: parseInt(formData.age),
                phone: formData.phone,
                onboarding_completed: true,
                updated_at: new Date().toISOString(),
            }).eq("id", user.id);

            // 2. Health Declaration
            await supabase.from("health_declarations").upsert({
                id: user.id,
                is_healthy: formData.isHealthy,
                medical_conditions: formData.isHealthy ? null : formData.medicalConditions,
            });

            // 3. EXPLOSIVE CONFETTI
            triggerConfetti();

            // 4. Redirect with delay
            setTimeout(() => {
                router.push("/");
                router.refresh();
            }, 2500);

        } catch (error) {
            console.error(error);
            alert("שגיאה בשמירה, נסי שוב");
            setLoading(false);
        }
    };

    const triggerConfetti = () => {
        const duration = 2000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    };

    // Render Steps
    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4">
                        <div className="relative group">
                            <label className="text-[#E2F163] text-sm font-bold uppercase tracking-wider mb-2 block">שם מלא</label>
                            <input
                                autoFocus
                                value={formData.fullName}
                                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && handleNext()}
                                className="w-full bg-transparent border-b-2 border-neutral-800 text-3xl font-bold text-white py-2 focus:outline-none focus:border-[#E2F163] transition-colors placeholder:text-neutral-800 text-center"
                                placeholder="לדוגמה: יעל כהן"
                            />
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4 text-center">
                        <label className="text-[#E2F163] text-sm font-bold uppercase tracking-wider mb-2 block">גיל</label>
                        <div className="flex justify-center items-center gap-4">
                            <button onClick={() => setFormData({ ...formData, age: String(Math.max(16, (parseInt(formData.age) || 25) - 1)) })} className="w-12 h-12 rounded-full border border-white/10 hover:bg-white/10 flex items-center justify-center text-white transition-colors text-2xl font-bold">-</button>
                            <input
                                type="number"
                                autoFocus
                                value={formData.age}
                                onChange={e => setFormData({ ...formData, age: e.target.value })}
                                className="w-32 bg-transparent text-6xl font-bold text-white py-2 focus:outline-none text-center appearance-none"
                                placeholder="25"
                            />
                            <button onClick={() => setFormData({ ...formData, age: String(Math.min(100, (parseInt(formData.age) || 25) + 1)) })} className="w-12 h-12 rounded-full bg-[#E2F163] text-black flex items-center justify-center transition-colors text-2xl font-bold hover:scale-105">+</button>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4">
                        <label className="text-[#E2F163] text-sm font-bold uppercase tracking-wider mb-2 block text-center">מספר נייד</label>
                        <input
                            type="tel"
                            autoFocus
                            dir="ltr"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && handleNext()}
                            className="w-full bg-transparent border-b-2 border-neutral-800 text-4xl font-bold text-white py-2 focus:outline-none focus:border-[#E2F163] transition-colors placeholder:text-neutral-800 text-center tracking-widest"
                            placeholder="050-0000000"
                        />
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setFormData({ ...formData, isHealthy: true, medicalConditions: "" })}
                                className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 group ${formData.isHealthy === true ? "border-[#E2F163] bg-[#E2F163]/10" : "border-white/5 bg-neutral-900/50 hover:border-white/20"}`}
                            >
                                <span className="text-4xl group-hover:scale-110 transition-transform">💪</span>
                                <span className={`font-bold ${formData.isHealthy === true ? "text-[#E2F163]" : "text-neutral-400"}`}>כשירה לאימון</span>
                            </button>
                            <button
                                onClick={() => setFormData({ ...formData, isHealthy: false })}
                                className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 group ${formData.isHealthy === false ? "border-red-400 bg-red-400/10" : "border-white/5 bg-neutral-900/50 hover:border-white/20"}`}
                            >
                                <span className="text-4xl group-hover:scale-110 transition-transform">🩺</span>
                                <span className={`font-bold ${formData.isHealthy === false ? "text-red-400" : "text-neutral-400"}`}>יש רגישויות</span>
                            </button>
                        </div>

                        <AnimatePresence>
                            {formData.isHealthy === false && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    className="overflow-hidden"
                                >
                                    <textarea
                                        autoFocus
                                        value={formData.medicalConditions}
                                        onChange={e => setFormData({ ...formData, medicalConditions: e.target.value })}
                                        placeholder="פרטי לנו בקצרה..."
                                        className="w-full bg-neutral-900 border border-white/10 rounded-2xl p-4 text-white focus:border-red-400 focus:outline-none min-h-[100px]"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
        }
    }

    if (loading) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
            {/* Creating a celebration background */}
            <div className="absolute inset-0 bg-[#E2F163]/10 animate-pulse" />
            <h1 className="text-5xl font-bold text-white mb-4 relative z-10">ברוכה הבאה! 🎉</h1>
            <p className="text-neutral-400 text-lg relative z-10">המנוי שלך הוגדר בהצלחה</p>
        </div>
    );

    return (
        <div className="min-h-[100dvh] bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-[#E2F163] selection:text-black">
            {/* Ambient Backgrounds based on step */}
            <div className={`absolute inset-0 transition-colors duration-1000 ${step === 4 ? "bg-red-900/5" : "bg-[#E2F163]/5"}`} />
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#E2F163]/10 blur-[150px] rounded-full pointer-events-none animate-pulse" />

            <div className="w-full max-w-xl relative z-10">
                {/* Progress Bar */}
                <div className="flex gap-2 mb-12 justify-center">
                    {STEPS.map((s, i) => (
                        <div key={s.id} className={`h-1.5 rounded-full transition-all duration-500 ${i + 1 <= step ? "w-8 bg-[#E2F163]" : "w-2 bg-neutral-800"}`} />
                    ))}
                </div>

                <motion.div
                    key={step}
                    custom={direction}
                    initial={{ x: direction * 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: direction * -50, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="onboarding-card"
                >
                    <div className="text-center mb-10">
                        <motion.h2 className="text-4xl md:text-5xl font-bold text-white mb-3" layoutId="title">
                            {STEPS[step - 1].title}
                        </motion.h2>
                        <p className="text-neutral-500 text-lg font-medium">{STEPS[step - 1].description}</p>
                    </div>

                    <div className="min-h-[200px] flex flex-col justify-center">
                        {renderStepContent()}
                    </div>
                </motion.div>

                <div className="flex justify-between items-center mt-12 px-4">
                    <button
                        onClick={handleBack}
                        className={`text-neutral-500 font-bold hover:text-white transition-colors flex items-center gap-2 ${step === 1 ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                    >
                        <ArrowRight className="w-5 h-5" />
                        חזרה
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={!isStepValid()}
                        className={`group flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-bold text-lg shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all ${!isStepValid() ? "opacity-50 cursor-not-allowed grayscale" : "hover:scale-105 hover:bg-[#E2F163] hover:shadow-[0_0_40px_rgba(226,241,99,0.4)]"}`}
                    >
                        {step === STEPS.length ? "סיום והרשמה" : "המשך"}
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}
