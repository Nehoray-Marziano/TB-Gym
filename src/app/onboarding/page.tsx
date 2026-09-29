"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import StudioLogo from "@/components/StudioLogo";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Minus, Plus } from "lucide-react";

type FormData = {
    fullName: string;
    age: string;
    phone: string;
    isHealthy: boolean | null;
    medicalConditions: string;
};

const STEPS = [
    { title: "איך קוראים לך?", description: "ככה נפנה אלייך בסטודיו." },
    { title: "בת כמה את?", description: "עוד פרט קטן לפני שמתחילות." },
    { title: "איך אפשר להשיג אותך?", description: "נשמור את המספר שלך בפרטי החשבון." },
    { title: "לפני שמתחילות.", description: "יש משהו שחשוב שנדע לקראת האימונים?" },
];

export default function OnboardingPage() {
    const router = useRouter();
    const supabase = getSupabaseClient();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        fullName: "",
        age: "",
        phone: "",
        isHealthy: null,
        medicalConditions: "",
    });

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
            setStep((current) => current + 1);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            await supabase.from("profiles").update({
                full_name: formData.fullName,
                age: parseInt(formData.age),
                phone: formData.phone,
                onboarding_completed: true,
                updated_at: new Date().toISOString(),
            }).eq("id", user.id);

            await supabase.from("health_declarations").upsert({
                id: user.id,
                is_healthy: formData.isHealthy,
                medical_conditions: formData.isHealthy ? null : formData.medicalConditions,
            });

            setTimeout(() => {
                router.push("/");
                router.refresh();
            }, 2500);
        } catch (error) {
            console.error(error);
            alert("לא הצלחנו לשמור את הפרטים. נסי שוב.");
            setLoading(false);
        }
    };

    const fieldClass = "min-h-16 w-full rounded-[1.25rem] border border-[#1b251c]/20 bg-white px-5 text-xl font-bold text-[#1b251c] outline-none placeholder:font-normal placeholder:text-[#899284] focus:border-[#829044]";

    return (
        <main className="min-h-dvh bg-[#f1f0e8] text-[#1b251c]">
            <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-7">
                <header className="flex items-center justify-between border-b border-[#1b251c]/15 pb-5">
                    <div className="flex items-center gap-3">
                        <StudioLogo className="h-9 w-9 bg-[#1b251c]" />
                        <span className="border-s border-[#1b251c]/20 ps-3 text-xs font-bold leading-tight">סטודיו<br />טליה</span>
                    </div>
                    <span className="text-xs font-bold text-[#5d6958]">נעים להכיר</span>
                </header>

                {loading ? (
                    <div className="flex flex-1 flex-col justify-center py-10">
                        <span className="mb-5 inline-flex h-3 w-3 animate-pulse rounded-full bg-[#829044]" />
                        <h1 className="text-[clamp(3rem,13vw,4.5rem)] font-bold leading-[1.02] tracking-tight">כמעט<br /><span className="text-[#829044]">מוכנות.</span></h1>
                        <p className="mt-5 text-sm text-[#5d6958]">מסדרות לך מקום בסטודיו...</p>
                    </div>
                ) : (
                    <>
                        <div className="pt-7">
                            <div className="mb-3 flex items-center justify-between text-xs font-bold">
                                <span>קצת עלייך</span>
                                <span className="text-[#5d6958]">{step} מתוך {STEPS.length}</span>
                            </div>
                            <div aria-label={`שלב ${step} מתוך ${STEPS.length}`} className="flex gap-1.5">
                                {STEPS.map((_, index) => (
                                    <span key={index} className={`h-1.5 flex-1 rounded-full ${index < step ? "bg-[#829044]" : "bg-[#1b251c]/15"}`} />
                                ))}
                            </div>
                        </div>

                        <motion.section
                            key={step}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22 }}
                            aria-labelledby="onboarding-title"
                            className="flex-1 pb-10 pt-11"
                        >
                            <p className="mb-4 flex items-center gap-2 text-xs font-bold text-[#5d6958]"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#829044]" />הפרטים שלך בסטודיו</p>
                            <h1 id="onboarding-title" className="max-w-[18rem] text-[clamp(2.8rem,12vw,4.1rem)] font-bold leading-[1.03] tracking-tight">{STEPS[step - 1].title}</h1>
                            <p className="mt-4 text-sm leading-relaxed text-[#5d6958]">{STEPS[step - 1].description}</p>

                            <div className="mt-12">
                                {step === 1 && (
                                    <div>
                                        <label htmlFor="onboarding-name" className="mb-2 block text-xs font-bold">שם מלא</label>
                                        <input
                                            id="onboarding-name"
                                            type="text"
                                            autoComplete="name"
                                            value={formData.fullName}
                                            onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
                                            onKeyDown={(event) => event.key === "Enter" && handleNext()}
                                            placeholder="השם שלך"
                                            className={fieldClass}
                                        />
                                    </div>
                                )}

                                {step === 2 && (
                                    <div>
                                        <label htmlFor="onboarding-age" className="mb-2 block text-xs font-bold">גיל</label>
                                        <div className="flex items-center gap-2">
                                            <button type="button" aria-label="להפחית שנה" onClick={() => setFormData({ ...formData, age: String(Math.max(16, (parseInt(formData.age) || 25) - 1)) })} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#1b251c]/15 bg-white"><Minus aria-hidden="true" className="h-5 w-5" /></button>
                                            <input
                                                id="onboarding-age"
                                                type="number"
                                                inputMode="numeric"
                                                value={formData.age}
                                                onChange={(event) => setFormData({ ...formData, age: event.target.value })}
                                                placeholder="25"
                                                className={`${fieldClass} min-w-0 text-center tabular-nums`}
                                            />
                                            <button type="button" aria-label="להוסיף שנה" onClick={() => setFormData({ ...formData, age: String(Math.min(100, (parseInt(formData.age) || 25) + 1)) })} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#1b251c]/15 bg-white"><Plus aria-hidden="true" className="h-5 w-5" /></button>
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div>
                                        <label htmlFor="onboarding-phone" className="mb-2 block text-xs font-bold">מספר נייד</label>
                                        <input
                                            id="onboarding-phone"
                                            type="tel"
                                            inputMode="tel"
                                            autoComplete="tel"
                                            dir="ltr"
                                            value={formData.phone}
                                            onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                                            onKeyDown={(event) => event.key === "Enter" && handleNext()}
                                            placeholder="050-0000000"
                                            className={`${fieldClass} text-center tabular-nums`}
                                        />
                                    </div>
                                )}

                                {step === 4 && (
                                    <div className="space-y-3">
                                        <button
                                            type="button"
                                            aria-pressed={formData.isHealthy === true}
                                            onClick={() => setFormData({ ...formData, isHealthy: true, medicalConditions: "" })}
                                            className={`flex min-h-20 w-full items-center justify-between rounded-[1.25rem] border px-5 text-right text-sm font-bold ${formData.isHealthy === true ? "border-[#829044] bg-[#dce780]" : "border-[#1b251c]/15 bg-white"}`}
                                        >
                                            אין משהו מיוחד שצריך לדעת
                                            <span aria-hidden="true" className={`h-5 w-5 shrink-0 rounded-full border-2 ${formData.isHealthy === true ? "border-[#1b251c] bg-[#1b251c] shadow-[inset_0_0_0_4px_#dce780]" : "border-[#1b251c]/30"}`} />
                                        </button>
                                        <button
                                            type="button"
                                            aria-pressed={formData.isHealthy === false}
                                            onClick={() => setFormData({ ...formData, isHealthy: false })}
                                            className={`flex min-h-20 w-full items-center justify-between rounded-[1.25rem] border px-5 text-right text-sm font-bold ${formData.isHealthy === false ? "border-[#829044] bg-[#dce780]" : "border-[#1b251c]/15 bg-white"}`}
                                        >
                                            יש משהו שחשוב שתדעו
                                            <span aria-hidden="true" className={`h-5 w-5 shrink-0 rounded-full border-2 ${formData.isHealthy === false ? "border-[#1b251c] bg-[#1b251c] shadow-[inset_0_0_0_4px_#dce780]" : "border-[#1b251c]/30"}`} />
                                        </button>
                                        {formData.isHealthy === false && (
                                            <div className="pt-3">
                                                <label htmlFor="onboarding-health" className="mb-2 block text-xs font-bold">ספרי לנו בקצרה</label>
                                                <textarea
                                                    id="onboarding-health"
                                                    value={formData.medicalConditions}
                                                    onChange={(event) => setFormData({ ...formData, medicalConditions: event.target.value })}
                                                    placeholder="מה חשוב שנדע?"
                                                    className="min-h-28 w-full resize-none rounded-[1.25rem] border border-[#1b251c]/20 bg-white p-4 text-sm outline-none placeholder:text-[#899284] focus:border-[#829044]"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.section>

                        <footer className="flex items-center gap-3 border-t border-[#1b251c]/15 pt-5">
                            {step > 1 && (
                                <button type="button" onClick={() => setStep((current) => current - 1)} className="flex min-h-14 items-center gap-1 rounded-full px-3 text-sm font-bold text-[#5d6958]"><ArrowRight aria-hidden="true" className="h-4 w-4" />חזרה</button>
                            )}
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={!isStepValid()}
                                className="flex min-h-14 flex-1 items-center justify-between rounded-full bg-[#1b251c] px-6 text-sm font-bold text-[#f6f6ed] disabled:opacity-40"
                            >
                                {step === STEPS.length ? "סיום" : "המשך"}
                                <ArrowLeft aria-hidden="true" className="h-5 w-5" />
                            </button>
                        </footer>
                    </>
                )}
            </div>
        </main>
    );
}
