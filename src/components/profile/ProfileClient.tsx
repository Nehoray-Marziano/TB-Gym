"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, LogOut, Phone, Bell, Shield, Edit2, Check } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import StudioBotanical from "@/components/StudioBotanical";
import { useGymStore } from "@/providers/GymStoreProvider";
import InstallAppButton from "@/components/profile/InstallAppButton";


type UserProfile = {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    balance: number;
    role: string;
};

type HealthDeclaration = {
    is_healthy: boolean | null;
    medical_conditions: string | null;
};

type ProfileClientProps = {
    initialProfile: UserProfile | null;
    initialHealth: HealthDeclaration;
};

type BrowserOneSignal = {
    Notifications: { requestPermission: () => Promise<void> };
};

export default function ProfileClient({ initialProfile, initialHealth }: ProfileClientProps) {
    const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
    const [health, setHealth] = useState<HealthDeclaration>(initialHealth);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const reduceMotion = useReducedMotion();

    // Form State
    const [formData, setFormData] = useState({
        full_name: initialProfile?.full_name || "",
        phone: initialProfile?.phone || "",
        is_healthy: initialHealth?.is_healthy ?? true,
        medical_conditions: initialHealth?.medical_conditions || ""
    });

    const router = useRouter();
    const supabase = getSupabaseClient();
    const { toast } = useToast();
    const { subscription, refreshData } = useGymStore();
    const appliedProfile = useRef<UserProfile | null>(null);
    const appliedHealth = useRef<HealthDeclaration | null>(null);

    useEffect(() => {
        if (!isEditing && initialProfile && (appliedProfile.current !== initialProfile || appliedHealth.current !== initialHealth)) {
            appliedProfile.current = initialProfile;
            appliedHealth.current = initialHealth;
            setProfile(initialProfile);
            setHealth(initialHealth);
            setFormData({
                full_name: initialProfile.full_name || "",
                phone: initialProfile.phone || "",
                is_healthy: initialHealth.is_healthy ?? true,
                medical_conditions: initialHealth.medical_conditions || "",
            });
        }
    }, [initialProfile, initialHealth, isEditing]);

    const handleSave = async () => {
        if (!profile) return;
        setLoading(true);

        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(10);

        try {
            const [profileResult, healthResult] = await Promise.all([
                supabase.from("profiles").update({
                    full_name: formData.full_name,
                    phone: formData.phone,
                    updated_at: new Date().toISOString()
                }).eq("id", profile.id),
                supabase.from("health_declarations").upsert({
                    id: profile.id,
                    is_healthy: formData.is_healthy,
                    medical_conditions: formData.is_healthy ? null : formData.medical_conditions
                }),
            ]);
            if (profileResult.error || healthResult.error) throw profileResult.error || healthResult.error;

            // Refresh Local State
            setProfile(prev => prev ? ({ ...prev, full_name: formData.full_name, phone: formData.phone }) : null);
            setHealth({ is_healthy: formData.is_healthy, medical_conditions: formData.medical_conditions });
            setIsEditing(false);
            void refreshData(true, profile.id);

            // Success haptic
            if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
            toast({ title: "הפרטים עודכנו! ✨", type: "success" });

        } catch (error) {
            console.error(error);
            toast({ title: "שגיאה בעדכון פרטים", description: "אנא נסי שוב מאוחר יותר", type: "error" });
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        if (navigator.vibrate) navigator.vibrate(10);
        await supabase.auth.signOut();
        // Drop prefetched personal home payloads with the signed-out session.
        router.replace("/auth/login");
        router.refresh();
    };

    if (!profile) return null; // Should not happen with server data, but safety check

    return (
        <div data-member-scroll className="h-full w-full overflow-y-auto overscroll-contain bg-[var(--studio-canvas)] text-[var(--studio-ink)] [-webkit-overflow-scrolling:touch]">
            <main className="mx-auto max-w-lg px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
            <header className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-bold text-[var(--studio-subtle)]">סטודיו טליה</p>
                    <h1 className="mt-1 text-[clamp(2.4rem,11vw,3.3rem)] font-bold leading-none tracking-[-0.06em]">החשבון שלי<span className="text-[var(--studio-coral-text)]">.</span></h1>
                </div>
                <button type="button" onClick={() => isEditing ? handleSave() : setIsEditing(true)} disabled={loading} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-[var(--studio-ink)]/15 px-3 text-xs font-bold disabled:opacity-50">
                    {loading ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : isEditing ? <Check aria-hidden="true" className="h-4 w-4" /> : <Edit2 aria-hidden="true" className="h-4 w-4" />}
                    {loading ? "שומרת" : isEditing ? "שמירה" : "עריכה"}
                </button>
            </header>

            <div className="mt-6 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--studio-coral-bg)] text-2xl font-bold text-[var(--studio-ink)]">
                    {formData.full_name?.charAt(0) || "?"}
                </div>
                <div className="min-w-0 flex-1">
                {isEditing ? (
                    <input
                        aria-label="שם מלא"
                        value={formData.full_name}
                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full min-h-11 border-b border-[#68794f] bg-transparent text-xl font-bold outline-none"
                        placeholder="שם מלא"
                    />
                ) : (
                    <h2 className="break-words text-xl font-bold leading-tight">{profile?.full_name || "אורחת"}</h2>
                )}
                <p className="mt-0.5 text-xs text-[var(--studio-muted)]">{profile?.role === 'administrator' ? 'מנהלת הסטודיו' : 'מתאמנת בסטודיו'}</p>
                </div>
            </div>

            {!isEditing && (
                <Link href="/subscription" className="relative mb-4 mt-6 flex min-h-32 items-center gap-4 overflow-hidden rounded-[2rem_1.1rem_2rem_1.1rem] bg-[var(--studio-deep)] p-5 text-[var(--studio-deep-contrast)]">
                    <StudioBotanical sun={false} className="studio-botanical-drift pointer-events-none absolute -bottom-16 -left-20 h-44 w-72 text-[var(--studio-accent-text)]/20" />
                    <div className="relative flex-1">
                        <p className="text-xs font-bold text-[var(--studio-accent-text)]">יתרת האימונים</p>
                        <p className="mt-2 text-xs">{subscription?.is_active ? subscription.tier_display_name : "בחירת מנוי"} <ArrowLeft aria-hidden="true" className="inline h-3.5 w-3.5" /></p>
                    </div>
                    <span className="relative text-[4.5rem] font-bold leading-none tabular-nums text-[var(--studio-accent-text)]">{profile.balance}</span>
                </Link>
            )}

            {/* Details List */}
            <details className="group mb-3 overflow-hidden rounded-[1.5rem] border border-[var(--studio-ink)]/10 bg-[var(--studio-card)]">
                <summary className="flex min-h-14 cursor-pointer items-center justify-between px-5 text-sm font-bold">פרטים אישיים והצהרת בריאות <ChevronRight aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-90" /></summary>

                {/* Phone */}
                <div className="overflow-hidden rounded-[1.75rem] border border-[#162218]/10 bg-[var(--studio-card)]">
                    <div className="flex items-center gap-4 border-b border-[#162218]/10 p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--studio-canvas)] text-[var(--studio-subtle)]">
                            <Phone aria-hidden="true" className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--studio-muted)]">מספר נייד</p>
                            {isEditing ? (
                                <input
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    type="tel"
                                    aria-label="מספר נייד"
                                    className="min-h-11 w-full rounded-xl border border-[#162218]/15 bg-[var(--studio-canvas)] px-3 font-bold text-[var(--studio-ink)] outline-none focus:border-[#68794f]"
                                />
                            ) : (
                                <p className="font-bold text-[var(--studio-ink)]" dir="ltr">{profile?.phone || "לא הוזן"}</p>
                            )}
                        </div>
                    </div>

                    {/* Health Declaration */}
                    <div className="flex flex-col gap-2 p-5">
                        <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--studio-canvas)] text-[var(--studio-subtle)]">
                                <Shield aria-hidden="true" className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-[var(--studio-muted)]">הצהרת בריאות</p>
                                {isEditing ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, is_healthy: true })}
                                            className={`min-h-11 rounded-full border px-4 text-xs font-bold transition-colors ${formData.is_healthy ? "border-[#68794f] bg-[var(--studio-accent-bg)] text-[var(--studio-ink)]" : "border-[#162218]/15 text-[var(--studio-muted)]"}`}
                                        >
                                            תקינה
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, is_healthy: false })}
                                            className={`min-h-11 rounded-full border px-4 text-xs font-bold transition-colors ${!formData.is_healthy ? "border-[var(--studio-danger)] bg-[var(--studio-danger)]/10 text-[var(--studio-danger)]" : "border-[#162218]/15 text-[var(--studio-muted)]"}`}
                                        >
                                            יש מגבלות
                                        </button>
                                    </div>
                                ) : (
                                    <p className={`font-bold ${health.is_healthy === false ? "text-[var(--studio-danger)]" : "text-[var(--studio-subtle)]"}`}>
                                        {health.is_healthy === null ? "עוד לא עודכנה" : health.is_healthy ? "תקינה" : "קיימות מגבלות רפואיות"}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Medical Conditions Textarea */}
                        <AnimatePresence>
                            {(!formData.is_healthy || (!isEditing && !health.is_healthy)) && (
                                <motion.div
                                    initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mt-3 overflow-hidden"
                                >
                                    {isEditing ? (
                                        <textarea
                                            value={formData.medical_conditions}
                                            onChange={e => setFormData({ ...formData, medical_conditions: e.target.value })}
                                            className="min-h-24 w-full rounded-xl border border-[#162218]/15 bg-[var(--studio-canvas)] p-3 text-sm text-[var(--studio-ink)] outline-none focus:border-[#68794f]"
                                            placeholder="פרטי את המגבלות..."
                                        />
                                    ) : (
                                        <p className="rounded-xl bg-[var(--studio-canvas)] p-3 text-sm text-[var(--studio-muted)]">
                                            {health.medical_conditions}
                                        </p>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </details>

            <section className="space-y-3">
                <h3 className="mb-3 mt-7 text-[1.35rem] font-bold">העדפות</h3>
                <InstallAppButton />


                <button
                    type="button"
                    onClick={async () => {
                        if (navigator.vibrate) navigator.vibrate(10);

                        // Check if Notifications API is supported
                        if (!("Notification" in window)) {
                            toast({ title: "הדפדפן לא תומך בהתראות", type: "error" });
                            return;
                        }

                        // Native Permission Check
                        const permission = Notification.permission;

                        if (permission === "granted") {
                            toast({ title: "התראות כבר מופעלות ✓", description: "ניתן לשנות בהגדרות הדפדפן/אפליקציה", type: "success" });
                            return;
                        }

                        if (permission === "denied") {
                            toast({
                                title: "התראות חסומות בהגדרות 🚫",
                                description: "אנא היכנסי להגדרות המכשיר ואשרי התראות ידנית.",
                                type: "error"
                            });
                            return;
                        }

                        // Default state - Request Permission via OneSignal logic to ensure syncing
                        const oneSignal = (window as Window & { OneSignal?: BrowserOneSignal }).OneSignal;
                        if (oneSignal) {
                            try {
                                await oneSignal.Notifications.requestPermission();
                                // We don't manually toast here because the browser prompt handles the UX, 
                                // and OneSignal often triggers its own outcome events. 
                                // But we can assume if they click Allow, it works.
                            } catch (e) {
                                console.error("Notification error:", e);
                                toast({ title: "שגיאה בבקשת אישור", type: "error" });
                            }
                        }
                    }}
                    className="flex min-h-20 w-full items-center justify-between gap-3 rounded-[1.5rem] border border-[#162218]/10 bg-[var(--studio-card)] p-5 text-start transition-colors active:bg-[var(--studio-accent-bg)]/20"
                >
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--studio-accent-bg)] text-[var(--studio-ink)]">
                            <Bell aria-hidden="true" className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-bold">הפעלת התראות</span>
                    </div>
                    <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--studio-muted)]" />
                </button>

                <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-[var(--studio-danger)]/25 bg-[var(--studio-danger)]/10 px-4 text-sm font-bold text-[var(--studio-danger)] transition-colors active:bg-[var(--studio-danger)]/20"
                >
                    <LogOut aria-hidden="true" className="h-4 w-4" />
                    התנתקות
                </button>
            </section>

            <p className="mt-12 text-center text-xs text-[var(--studio-muted)]">סטודיו טליה</p>
            </main>
        </div>
    );
}
