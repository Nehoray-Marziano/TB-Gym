"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { ArrowRight, ArrowLeft } from "lucide-react";

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
    const supabase = getSupabaseClient();

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

    // Animation variants
    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 100 : -100,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 100 : -100,
            opacity: 0,
        }),
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
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setFormData({ ...formData, age: String(Math.max(16, (parseInt(formData.age) || 25) - 1)) })}
                                className="w-12 h-12 rounded-full border border-white/10 hover:bg-white/10 flex items-center justify-center text-white transition-colors text-2xl font-bold"
                            >-</motion.button>
                            <input
                                type="number"
                                autoFocus
                                value={formData.age}
                                onChange={e => setFormData({ ...formData, age: e.target.value })}
                                className="w-32 bg-transparent text-6xl font-bold text-white py-2 focus:outline-none text-center appearance-none"
                                placeholder="25"
                            />
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setFormData({ ...formData, age: String(Math.min(100, (parseInt(formData.age) || 25) + 1)) })}
                                className="w-12 h-12 rounded-full bg-[#E2F163] text-black flex items-center justify-center transition-colors text-2xl font-bold hover:scale-105"
                            >+</motion.button>
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
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                whileHover={{ scale: 1.02 }}
                                onClick={() => setFormData({ ...formData, isHealthy: true, medicalConditions: "" })}
                                className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 group ${formData.isHealthy === true ? "border-[#E2F163] bg-[#E2F163]/10" : "border-white/5 bg-neutral-900/50 hover:border-white/20"}`}
                            >
                                <span className="text-4xl group-hover:scale-110 transition-transform">💪</span>
                                <span className={`font-bold ${formData.isHealthy === true ? "text-[#E2F163]" : "text-neutral-400"}`}>כשירה לאימון</span>
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                whileHover={{ scale: 1.02 }}
                                onClick={() => setFormData({ ...formData, isHealthy: false })}
                                className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 group ${formData.isHealthy === false ? "border-red-400 bg-red-400/10" : "border-white/5 bg-neutral-900/50 hover:border-white/20"}`}
                            >
                                <span className="text-4xl group-hover:scale-110 transition-transform">🩺</span>
                                <span className={`font-bold ${formData.isHealthy === false ? "text-red-400" : "text-neutral-400"}`}>יש רגישויות</span>
                            </motion.button>
                        </div>

                        <AnimatePresence>
                            {formData.isHealthy === false && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
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
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden"
        >
            {/* Creating a celebration background */}
            <motion.div
                className="absolute inset-0 bg-[#E2F163]/10"
                animate={{ opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.h1
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="text-5xl font-bold text-white mb-4 relative z-10"
            >
                ברוכה הבאה! 🎉
            </motion.h1>
            <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-neutral-400 text-lg relative z-10"
            >
                המנוי שלך הוגדר בהצלחה
            </motion.p>
        </motion.div>
    );

    return (
        <div className="min-h-[100dvh] bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-[#E2F163] selection:text-black">
            {/* Ambient Backgrounds based on step */}
            <motion.div
                className="absolute inset-0"
                animate={{ backgroundColor: step === 4 ? "rgba(127, 29, 29, 0.05)" : "rgba(226, 241, 99, 0.05)" }}
                transition={{ duration: 0.5 }}
            />
            <motion.div
                className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#E2F163]/10 blur-[150px] rounded-full pointer-events-none"
                animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.15, 0.1] }}
                transition={{ duration: 4, repeat: Infinity }}
            />

            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-xl relative z-10"
            >
                {/* Progress Bar */}
                <div className="flex gap-2 mb-12 justify-center">
                    {STEPS.map((s, i) => (
                        <motion.div
                            key={s.id}
                            className="h-1.5 rounded-full bg-neutral-800"
                            animate={{
                                width: i + 1 <= step ? 32 : 8,
                                backgroundColor: i + 1 <= step ? "#E2F163" : "#262626"
                            }}
                            transition={{ duration: 0.3 }}
                        />
                    ))}
                </div>

                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={step}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                        <div className="text-center mb-10">
                            <motion.h2
                                className="text-4xl md:text-5xl font-bold text-white mb-3"
                                layoutId="title"
                            >
                                {STEPS[step - 1].title}
                            </motion.h2>
                            <p className="text-neutral-500 text-lg font-medium">{STEPS[step - 1].description}</p>
                        </div>

                        <div className="min-h-[200px] flex flex-col justify-center">
                            {renderStepContent()}
                        </div>
                    </motion.div>
                </AnimatePresence>

                <div className="flex justify-between items-center mt-12 px-4">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleBack}
                        className={`text-neutral-500 font-bold hover:text-white transition-colors flex items-center gap-2 ${step === 1 ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                    >
                        <ArrowRight className="w-5 h-5" />
                        חזרה
                    </motion.button>

                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        whileHover={isStepValid() ? { scale: 1.05 } : {}}
                        onClick={handleNext}
                        disabled={!isStepValid()}
                        className={`group flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-bold text-lg shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all ${!isStepValid() ? "opacity-50 cursor-not-allowed grayscale" : "hover:bg-[#E2F163] hover:shadow-[0_0_40px_rgba(226,241,99,0.4)]"}`}
                    >
                        {step === STEPS.length ? "סיום והרשמה" : "המשך"}
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
}
