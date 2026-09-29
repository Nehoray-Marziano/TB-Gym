"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut, Phone, Zap, Bell, Shield, Edit2, Check, Moon, Sun, Palette } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { useTheme } from "next-themes";
import StudioLogo from "@/components/StudioLogo";


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
    login: (userId: string) => Promise<void>;
    User: {
        addTag: (key: string, value: string) => Promise<void>;
        addEmail: (email: string) => Promise<void>;
        PushSubscription: { optedIn: boolean; id: string | null };
    };
};

export default function ProfileClient({ initialProfile, initialHealth }: ProfileClientProps) {
    const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
    const [health, setHealth] = useState<HealthDeclaration>(initialHealth);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const reduceMotion = useReducedMotion();

    const { setTheme, theme } = useTheme();

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

    const handleSave = async () => {
        if (!profile) return;
        setLoading(true);

        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(10);

        try {
            // Update Profile
            await supabase.from("profiles").update({
                full_name: formData.full_name,
                phone: formData.phone,
                updated_at: new Date().toISOString()
            }).eq("id", profile.id);

            // Update Health
            await supabase.from("health_declarations").upsert({
                id: profile.id,
                is_healthy: formData.is_healthy,
                medical_conditions: formData.is_healthy ? null : formData.medical_conditions
            });

            // Refresh Local State
            setProfile(prev => prev ? ({ ...prev, full_name: formData.full_name, phone: formData.phone }) : null);
            setHealth({ is_healthy: formData.is_healthy, medical_conditions: formData.medical_conditions });
            setIsEditing(false);

            // Success haptic
            if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
            toast({ title: "הפרטים עודכנו! ✨", type: "success" });

            // Optional: Refresh server data to ensure consistency on navigation
            router.refresh();
        } catch (error) {
            console.error(error);
            toast({ title: "שגיאה בעדכון פרטים", description: "אנא נסי שוב מאוחר יותר", type: "error" });
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        if (navigator.vibrate) navigator.vibrate(10);
        await supabase.auth.signOut();
        router.push("/auth/login");
    };

    if (!profile) return null; // Should not happen with server data, but safety check

    return (
        <div className="min-h-dvh overflow-x-hidden bg-[var(--studio-canvas)] text-[var(--studio-ink)]">
            <main className="mx-auto max-w-lg pb-[calc(4rem+env(safe-area-inset-bottom))]">
            <header className="relative isolate overflow-hidden bg-[var(--studio-deep)] px-5 pb-20 pt-5 text-[var(--studio-deep-contrast)] sm:px-7">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#e9f2ce_1px,transparent_1px),linear-gradient(90deg,#e9f2ce_1px,transparent_1px)] [background-size:28px_28px]" />
                <StudioLogo className="pointer-events-none absolute -bottom-14 -left-12 h-64 w-64 bg-[var(--studio-accent-bg)]/10" />
                <div className="mb-9 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        aria-label="חזרה"
                        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/25 text-[var(--studio-accent-text)] transition-colors active:bg-white/10"
                    >
                        <ChevronRight aria-hidden="true" className="h-5 w-5" />
                    </button>

                <button
                    type="button"
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    disabled={loading}
                    className={`relative flex min-h-11 items-center gap-2 rounded-full px-4 text-xs font-bold transition-colors disabled:opacity-50 ${isEditing ? "bg-[var(--studio-accent-bg)] text-[var(--studio-ink)]" : "border border-white/25 text-[var(--studio-deep-contrast)] active:bg-white/10"}`}
                >
                    {loading ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : isEditing ? <Check aria-hidden="true" className="h-4 w-4" /> : <Edit2 aria-hidden="true" className="h-4 w-4" />}
                    {loading ? "שומרת..." : isEditing ? "שמירה" : "עריכה"}
                </button>
                </div>
                <motion.div initial={reduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="relative">
                    <p className="mb-4 flex items-center gap-2 text-xs font-bold text-[var(--studio-accent-text)]"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--studio-coral-bg)]" />האזור שלי</p>
                    <h1 className="text-[clamp(3.5rem,15vw,5rem)] font-bold leading-[0.9] tracking-[-0.06em]">הפרופיל<br /><span className="text-[var(--studio-accent-text)]">שלי.</span></h1>
                </motion.div>
            </header>

            <div className="relative -mt-8 rounded-t-[2rem] bg-[var(--studio-canvas)] px-5 pt-8 sm:px-7">

            <div className="mb-7 flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.4rem] bg-[var(--studio-coral-bg)] text-[2.5rem] font-bold text-[var(--studio-ink)]">
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
                <p className="mt-1 text-xs text-[var(--studio-muted)]">{profile?.role === 'administrator' ? 'מנהלת הסטודיו' : 'מתאמנת בסטודיו'}</p>
                </div>
            </div>

            {!isEditing && (
                <div className="relative mb-10 overflow-hidden rounded-[1.85rem] bg-[var(--studio-accent-bg)] p-6 text-[var(--studio-ink)]">
                    <StudioLogo className="pointer-events-none absolute -bottom-12 -left-10 h-48 w-48 bg-[var(--studio-deep)]/10" />
                    <div className="relative flex items-center justify-between gap-3">
                        <div>
                            <p className="mb-3 text-xs font-bold">יתרת האימונים שלך</p>
                            <h3 className="text-6xl font-bold leading-none tabular-nums">{profile?.balance} <span className="text-base font-medium">אימונים</span></h3>
                        </div>
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--studio-deep)] text-[var(--studio-accent-text)]">
                            <Zap aria-hidden="true" className="h-5 w-5" />
                        </div>
                    </div>
                </div>
            )}

            {/* Details List */}
            <section className="mb-10">
                <h3 className="mb-4 border-b border-[#162218]/25 pb-3 text-[1.65rem] font-bold">פרטים אישיים.</h3>

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
                                            className={`min-h-11 rounded-full border px-4 text-xs font-bold transition-colors ${!formData.is_healthy ? "border-[#a53d35] bg-[#a53d35]/10 text-[#a53d35]" : "border-[#162218]/15 text-[var(--studio-muted)]"}`}
                                        >
                                            יש מגבלות
                                        </button>
                                    </div>
                                ) : (
                                    <p className={`font-bold ${health.is_healthy ? "text-[#4e652c]" : "text-[#a53d35]"}`}>
                                        {health.is_healthy ? "תקינה" : "קיימות מגבלות רפואיות"}
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
            </section>

            <section className="space-y-3">
                <h3 className="mb-4 border-b border-[#162218]/25 pb-3 text-[1.65rem] font-bold">העדפות.</h3>
                <div className="space-y-4 rounded-[1.75rem] border border-[#162218]/10 bg-[var(--studio-card)] p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--studio-canvas)] text-[var(--studio-subtle)]">
                            <Palette aria-hidden="true" className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-[var(--studio-ink)]">ערכת נושא</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {/* Dark Theme */}
                        <button
                            type="button"
                            aria-pressed={theme === 'dark'}
                            onClick={() => { if (navigator.vibrate) navigator.vibrate(10); setTheme('dark'); }}
                            className={`relative flex min-h-20 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 transition-colors ${theme === 'dark' ? 'border-[#d1e78d]' : 'border-[#162218]/15'}`}
                            style={{ background: '#101a18' }}
                        >
                            <Moon className="w-5 h-5 text-white" />
                            <span className="text-xs font-bold text-white">כהה</span>
                            {/* Neon Accent */}
                            <div className="absolute bottom-0 w-full h-1 bg-[#d1e78d]" />
                        </button>

                        {/* Classic Theme */}
                        <button
                            type="button"
                            aria-pressed={theme === 'classic'}
                            onClick={() => { if (navigator.vibrate) navigator.vibrate(10); setTheme('classic'); }}
                            className={`relative flex min-h-20 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 transition-colors ${theme === 'classic' ? 'border-[#8c9070]' : 'border-[#162218]/15'}`}
                            style={{ background: '#e9eadc' }}
                        >
                            <Palette className="w-5 h-5 text-black" />
                            <span className="text-xs font-bold text-black">קלאסי</span>
                            {/* Olive Accent */}
                            <div className="absolute bottom-0 w-full h-1 bg-[#dce780]" />
                        </button>

                        {/* Light Theme */}
                        <button
                            type="button"
                            aria-pressed={theme === 'light'}
                            onClick={() => { if (navigator.vibrate) navigator.vibrate(10); setTheme('light'); }}
                            className={`relative flex min-h-20 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 transition-colors ${theme === 'light' ? 'border-[#b7e8dc]' : 'border-[#162218]/15'}`}
                            style={{ background: '#f6f7f5' }}
                        >
                            <Sun className="w-5 h-5 text-black" />
                            <span className="text-xs font-bold text-black">בהיר</span>
                            {/* Yellow Accent */}
                            <div className="absolute bottom-0 w-full h-1 bg-[#b7e8dc]" />
                        </button>
                    </div>
                </div>

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
                    onClick={async () => {
                        if (navigator.vibrate) navigator.vibrate(10);
                        const oneSignal = (window as Window & { OneSignal?: BrowserOneSignal }).OneSignal;
                        if (oneSignal) {
                            try {
                                const userId = profile?.id;
                                const role = profile?.role || "trainee";

                                if (userId) {
                                    await oneSignal.login(userId);
                                    await oneSignal.User.addTag("role", role.toLowerCase());
                                    if (profile?.email) await oneSignal.User.addEmail(profile.email);

                                    const pushSub = oneSignal.User.PushSubscription;
                                    alert(`ההתראות סונכרנו.\nמזהה משתמש: ${userId}\nתפקיד: ${role === "administrator" ? "מנהלת" : "מתאמנת"}\nהתראות פעילות: ${pushSub.optedIn ? "כן" : "לא"}\nמזהה הרשמה: ${pushSub.id}`);
                                } else {
                                    alert("שגיאה: פרטי משתמש חסרים");
                                }
                            } catch (e) {
                                console.error("Sync error:", e);
                                alert("לא הצלחנו לסנכרן את ההתראות.");
                            }
                        } else {
                            alert("שירות ההתראות לא נטען. נסי לרענן את העמוד.");
                        }
                    }}
                    className="flex min-h-20 w-full items-center justify-between gap-3 rounded-[1.5rem] border border-[#162218]/10 bg-[var(--studio-card)] p-5 text-start transition-colors active:bg-[var(--studio-accent-bg)]/20"
                >
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--studio-canvas)] text-[var(--studio-subtle)]">
                            <Zap aria-hidden="true" className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-bold">סנכרון התראות לבדיקה</span>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-full border border-[#a53d35]/25 bg-[#a53d35]/10 px-4 text-sm font-bold text-[#a53d35] transition-colors active:bg-[#a53d35]/20"
                >
                    <LogOut aria-hidden="true" className="h-4 w-4" />
                    התנתקות
                </button>
            </section>

            <p className="mt-12 text-center text-xs text-[var(--studio-muted)]">סטודיו טליה</p>
            </div>
            </main>
        </div>
    );
}
