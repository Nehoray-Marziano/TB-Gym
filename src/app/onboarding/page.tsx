"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { AnimatePresence, motion } from "framer-motion";

type FormData = {
    fullName: string;
    age: string;
    phone: string;
    isHealthy: boolean | null;
    medicalConditions: string;
};

type FormErrors = {
    fullName?: string;
    age?: string;
    phone?: string;
    medicalConditions?: string;
    healthStatus?: string;
};

// Input Helper Component (Moved Outside)
interface InputFieldProps {
    label: string;
    name: keyof FormData;
    type?: string;
    placeholder?: string;
    dir?: string;
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    touched: Record<string, boolean>;
    errors: FormErrors;
    handleBlur: (field: string) => void;
    handlePhoneChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const InputField = ({
    label,
    name,
    type = "text",
    placeholder,
    dir = "rtl",
    formData,
    setFormData,
    touched,
    errors,
    handleBlur,
    handlePhoneChange,
}: InputFieldProps) => (
    <div className="relative group">
        <label className="block text-sm font-medium mb-1.5 text-neutral-400 ml-1">
            {label}
        </label>
        <input
            type={type}
            name={name}
            placeholder={placeholder}
            value={formData[name] as string}
            dir={dir}
            onChange={
                name === "phone" && handlePhoneChange
                    ? handlePhoneChange
                    : (e) => setFormData({ ...formData, [name]: e.target.value })
            }
            onBlur={() => handleBlur(name)}
            className={`w-full bg-neutral-900/50 border rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none [&::-webkit-inner-spin-button]:appearance-none
        ${touched[name] && errors[name as keyof FormErrors]
                    ? "border-red-500/50 focus:border-red-500 text-red-100 placeholder:text-red-900/50"
                    : "border-neutral-800 focus:border-primary text-white placeholder:text-neutral-700"
                }`}
        />
        <AnimatePresence>
            {touched[name] && errors[name as keyof FormErrors] && (
                <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-red-500 text-xs mt-1 absolute right-1"
                >
                    {errors[name as keyof FormErrors]}
                </motion.p>
            )}
        </AnimatePresence>
    </div>
);

export default function OnboardingPage() {
    const router = useRouter();
    const supabase = createClient();
    const containerRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        fullName: "",
        age: "",
        phone: "",
        isHealthy: true,
        medicalConditions: "",
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Validation Logic
    const validate = (data: FormData): FormErrors => {
        const newErrors: FormErrors = {};
        if (!data.fullName.trim()) newErrors.fullName = "אנא הזיני שם מלא";

        if (!data.age) newErrors.age = "אנא הזיני גיל";
        else {
            const ageNum = parseInt(data.age);
            if (isNaN(ageNum) || ageNum < 16 || ageNum > 120)
                newErrors.age = "גיל חייב להיות בין 16 ל-120";
        }

        // Phone validation: numbers/dashes, started with 05
        const phoneRegex = /^05\d-?\d{7}$/;
        // This allows 0501234567 or 050-1234567

        if (!data.phone.trim()) newErrors.phone = "אנא הזיני מספר טלפון";
        else if (!phoneRegex.test(data.phone.replace(/-/g, ""))) {
            newErrors.phone = "מספר טלפון תקין (050-0000000)";
        }

        if (data.isHealthy === false && !data.medicalConditions.trim()) {
            newErrors.medicalConditions = "אנא פרטי את המגבלות הרפואיות";
        }
        return newErrors;
    };

    const isValid = Object.keys(validate(formData)).length === 0;

    // Real-time validation
    useEffect(() => {
        setErrors(validate(formData));
    }, [formData]);

    // Auth check only (removed name pre-fill)
    useEffect(() => {
        const checkUser = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                router.push("/auth/login");
            }
        };
        checkUser();
    }, [router, supabase]);

    // Animation
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(
                formRef.current,
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.2 }
            );
        }, containerRef);
        return () => ctx.revert();
    }, []);

    const handleBlur = (field: string) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^\d-]/g, "");
        setFormData({ ...formData, phone: val });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        setLoading(true);
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            const { error: profileError } = await supabase
                .from("profiles")
                .update({
                    full_name: formData.fullName,
                    age: parseInt(formData.age),
                    phone: formData.phone,
                    onboarding_completed: true,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", user.id);

            if (profileError) throw profileError;

            const { error: healthError } = await supabase
                .from("health_declarations")
                .upsert({
                    id: user.id,
                    is_healthy: formData.isHealthy,
                    medical_conditions: formData.isHealthy
                        ? null
                        : formData.medicalConditions,
                });

            if (healthError) throw healthError;

            router.push("/");
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("שגיאה בשמירה. אנא נסי שוב.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            ref={containerRef}
            className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
        >
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/20 blur-[128px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 blur-[128px] rounded-full pointer-events-none" />

            <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="w-full max-w-lg bg-[#0A0A0A] border border-neutral-800 p-8 md:p-10 rounded-3xl shadow-2xl relative z-10"
                noValidate
            >
                <div className="mb-8 text-center sm:text-right">
                    <h1 className="text-3xl font-bold mb-2 text-white">נעים להכיר 👋</h1>
                    <p className="text-neutral-500">
                        נשמח להכיר אותך קצת יותר לפני שמתחילים.
                    </p>
                </div>

                <div className="space-y-6">
                    <InputField
                        label="שם מלא"
                        name="fullName"
                        placeholder="ישראל ישראלי"
                        formData={formData}
                        setFormData={setFormData}
                        touched={touched}
                        errors={errors}
                        handleBlur={handleBlur}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <InputField
                            label="גיל"
                            name="age"
                            type="number"
                            placeholder="25"
                            formData={formData}
                            setFormData={setFormData}
                            touched={touched}
                            errors={errors}
                            handleBlur={handleBlur}
                        />
                        <InputField
                            label="טלפון"
                            name="phone"
                            type="tel"
                            placeholder="050-0000000"
                            dir="ltr"
                            formData={formData}
                            setFormData={setFormData}
                            touched={touched}
                            errors={errors}
                            handleBlur={handleBlur}
                            handlePhoneChange={handlePhoneChange}
                        />
                    </div>

                    <div className="pt-2">
                        <label className="block text-sm font-medium mb-3 text-neutral-400">
                            הצהרת בריאות
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div
                                onClick={() =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        isHealthy: true,
                                        medicalConditions: "",
                                    }))
                                }
                                className={`relative p-4 rounded-2xl cursor-pointer border transition-all duration-300 flex flex-col items-center justify-center text-center gap-2 group
                        ${formData.isHealthy
                                        ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                                        : "bg-neutral-900 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800"
                                    }`}
                            >
                                <span className="text-2xl mb-1">💪</span>
                                <span
                                    className={`text-sm font-semibold transition-colors ${formData.isHealthy ? "text-primary" : "text-neutral-300"
                                        }`}
                                >
                                    בריאה וכשירה
                                </span>
                                {formData.isHealthy && (
                                    <motion.div
                                        layoutId="check"
                                        className="absolute top-2 left-2 text-primary"
                                    >
                                        <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                    </motion.div>
                                )}
                            </div>

                            <div
                                onClick={() =>
                                    setFormData((prev) => ({ ...prev, isHealthy: false }))
                                }
                                className={`relative p-4 rounded-2xl cursor-pointer border transition-all duration-300 flex flex-col items-center justify-center text-center gap-2 group
                        ${formData.isHealthy === false
                                        ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                                        : "bg-neutral-900 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800"
                                    }`}
                            >
                                <span className="text-2xl mb-1">🩺</span>
                                <span
                                    className={`text-sm font-semibold transition-colors ${formData.isHealthy === false
                                        ? "text-primary"
                                        : "text-neutral-300"
                                        }`}
                                >
                                    יש לי רגישויות
                                </span>
                                {formData.isHealthy === false && (
                                    <motion.div
                                        layoutId="check"
                                        className="absolute top-2 left-2 text-primary"
                                    >
                                        <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        <AnimatePresence>
                            {formData.isHealthy === false && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden mt-3 relative"
                                >
                                    <textarea
                                        value={formData.medicalConditions}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                medicalConditions: e.target.value,
                                            }))
                                        }
                                        className={`w-full bg-neutral-900/50 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none h-28
                                ${touched.medicalConditions &&
                                                errors.medicalConditions
                                                ? "border-red-500/50 focus:border-red-500"
                                                : "border-neutral-800 focus:border-primary"
                                            }`}
                                        placeholder="פרטי לנו בקצרה על המגבלות הרפואיות..."
                                    />
                                    {touched.medicalConditions && errors.medicalConditions && (
                                        <p className="text-red-500 text-xs mt-1 absolute right-1">
                                            {errors.medicalConditions}
                                        </p>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <button
                        type="submit"
                        disabled={!isValid || loading}
                        className={`w-full font-bold py-4 rounded-xl transition-all duration-300 text-lg
                ${isValid && !loading
                                ? "bg-primary text-black hover:bg-amber-400 hover:shadow-[0_4px_24px_rgba(245,158,11,0.4)] translate-y-0"
                                : "bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-50"
                            }`}
                    >
                        {loading ? "שומר נתונים..." : "בואי נתחיל!"}
                    </button>
                </div>
            </form>
        </div>
    );
}
