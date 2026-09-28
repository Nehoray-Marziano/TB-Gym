"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut, Phone, Zap, Bell, Shield, Edit2, Check, Moon, Sun, Palette } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { useTheme } from "next-themes";


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

    const { setTheme, resolvedTheme } = useTheme();

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
        <div className="min-h-dvh overflow-x-hidden bg-background text-foreground">
            <main className="mx-auto max-w-lg px-5 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-5 sm:px-7">
            <header className="mb-10">
                <div className="mb-9 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        aria-label="חזרה"
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-card transition-colors active:bg-muted/40"
                    >
                        <ChevronRight aria-hidden="true" className="h-5 w-5" />
                    </button>

                <button
                    type="button"
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    disabled={loading}
                    className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-xs font-bold transition-colors disabled:opacity-50 ${isEditing ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground active:bg-muted/40"}`}
                >
                    {loading ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : isEditing ? <Check aria-hidden="true" className="h-4 w-4" /> : <Edit2 aria-hidden="true" className="h-4 w-4" />}
                    {loading ? "שומרת..." : isEditing ? "שמירה" : "עריכה"}
                </button>
                </div>
                <p className="mb-2 text-xs font-bold text-primary">האזור שלי / 04</p>
                <h1 className="text-[clamp(2.7rem,11vw,4rem)] font-bold leading-[1.08] tracking-tight">הפרופיל<br />שלי<span className="text-primary">.</span></h1>
            </header>

            <div className="mb-7 flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.4rem] bg-[#1b251c] text-[2.5rem] font-bold text-[#dce780]">
                    {formData.full_name?.charAt(0) || "?"}
                </div>
                <div className="min-w-0 flex-1">
                {isEditing ? (
                    <input
                        aria-label="שם מלא"
                        value={formData.full_name}
                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full min-h-11 border-b border-primary bg-transparent text-xl font-bold outline-none"
                        placeholder="שם מלא"
                    />
                ) : (
                    <h2 className="break-words text-xl font-bold leading-tight">{profile?.full_name || "אורחת"}</h2>
                )}
                <p className="mt-1 text-xs text-muted-foreground">{profile?.role === 'administrator' ? 'מנהלת הסטודיו' : 'מתאמנת בסטודיו'}</p>
                </div>
            </div>

            {!isEditing && (
                <div className="relative mb-10 overflow-hidden rounded-[1.85rem] bg-[#1b251c] p-6 text-[#f6f6ed]">
                    <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-16 h-56 w-56 rounded-full border-[30px] border-[#dce780]/10" />
                    <div className="relative flex items-center justify-between gap-3">
                        <div>
                            <p className="mb-1 text-xs text-[#cbd4c5]">יתרת האימונים שלך</p>
                            <h3 className="text-4xl font-bold tabular-nums">{profile?.balance} <span className="text-base font-medium text-[#cbd4c5]">אימונים</span></h3>
                        </div>
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#dce780]/15 text-[#dce780]">
                            <Zap aria-hidden="true" className="h-5 w-5" />
                        </div>
                    </div>
                </div>
            )}

            {/* Details List */}
            <section className="mb-10">
                <h3 className="mb-4 border-b border-border pb-3 text-base font-bold">פרטים אישיים</h3>

                {/* Phone */}
                <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card">
                    <div className="flex items-center gap-4 border-b border-border p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
                            <Phone aria-hidden="true" className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-muted-foreground font-medium">מספר נייד</p>
                            {isEditing ? (
                                <input
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    type="tel"
                                    aria-label="מספר נייד"
                                    className="min-h-11 w-full rounded-xl border border-border bg-background px-3 font-bold text-foreground outline-none focus:border-primary"
                                />
                            ) : (
                                <p className="font-bold text-foreground" dir="ltr">{profile?.phone || "לא הוזן"}</p>
                            )}
                        </div>
                    </div>

                    {/* Health Declaration */}
                    <div className="flex flex-col gap-2 p-5">
                        <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
                                <Shield aria-hidden="true" className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground font-medium">הצהרת בריאות</p>
                                {isEditing ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, is_healthy: true })}
                                            className={`min-h-11 rounded-full border px-4 text-xs font-bold transition-colors ${formData.is_healthy ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}
                                        >
                                            תקינה
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, is_healthy: false })}
                                            className={`min-h-11 rounded-full border px-4 text-xs font-bold transition-colors ${!formData.is_healthy ? "border-[#a53d35] bg-[#a53d35]/10 text-[#a53d35]" : "border-border text-muted-foreground"}`}
                                        >
                                            יש מגבלות
                                        </button>
                                    </div>
                                ) : (
                                    <p className={`font-bold ${health.is_healthy ? "text-primary" : "text-[#a53d35]"}`}>
                                        {health.is_healthy ? "תקינה" : "קיימות מגבלות רפואיות"}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Medical Conditions Textarea */}
                        <AnimatePresence>
                            {(!formData.is_healthy || (!isEditing && !health.is_healthy)) && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mt-3 overflow-hidden"
                                >
                                    {isEditing ? (
                                        <textarea
                                            value={formData.medical_conditions}
                                            onChange={e => setFormData({ ...formData, medical_conditions: e.target.value })}
                                            className="min-h-24 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
                                            placeholder="פרטי את המגבלות..."
                                        />
                                    ) : (
                                        <p className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
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
                <h3 className="mb-4 border-b border-border pb-3 text-base font-bold">העדפות</h3>
                <div className="space-y-4 rounded-[1.75rem] border border-border bg-card p-5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
                            <Palette aria-hidden="true" className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-foreground">ערכת נושא</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {/* Dark Theme */}
                        <button
                            type="button"
                            aria-pressed={resolvedTheme === 'dark'}
                            onClick={() => { if (navigator.vibrate) navigator.vibrate(10); setTheme('dark'); }}
                            className={`relative flex min-h-20 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 transition-colors ${resolvedTheme === 'dark' ? 'border-primary' : 'border-border'}`}
                            style={{ background: '#0A0A0A' }}
                        >
                            <Moon className="w-5 h-5 text-white" />
                            <span className="text-xs font-bold text-white">חשוך</span>
                            {/* Neon Accent */}
                            <div className="absolute bottom-0 w-full h-1 bg-[#E2F163]" />
                        </button>

                        {/* Classic Theme */}
                        <button
                            type="button"
                            aria-pressed={resolvedTheme === 'classic'}
                            onClick={() => { if (navigator.vibrate) navigator.vibrate(10); setTheme('classic'); }}
                            className={`relative flex min-h-20 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 transition-colors ${resolvedTheme === 'classic' ? 'border-[#8c9070]' : 'border-border'}`}
                            style={{ background: '#F5F5F7' }}
                        >
                            <Palette className="w-5 h-5 text-black" />
                            <span className="text-xs font-bold text-black">קלאסי</span>
                            {/* Olive Accent */}
                            <div className="absolute bottom-0 w-full h-1 bg-[#8c9070]" />
                        </button>

                        {/* Light Theme */}
                        <button
                            type="button"
                            aria-pressed={resolvedTheme === 'light'}
                            onClick={() => { if (navigator.vibrate) navigator.vibrate(10); setTheme('light'); }}
                            className={`relative flex min-h-20 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 transition-colors ${resolvedTheme === 'light' ? 'border-[#CCDB38]' : 'border-border'}`}
                            style={{ background: '#ffffff' }}
                        >
                            <Sun className="w-5 h-5 text-black" />
                            <span className="text-xs font-bold text-black">בהיר</span>
                            {/* Yellow Accent */}
                            <div className="absolute bottom-0 w-full h-1 bg-[#CCDB38]" />
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
                    className="flex min-h-20 w-full items-center justify-between gap-3 rounded-[1.5rem] border border-border bg-card p-5 text-start transition-colors active:bg-muted/40"
                >
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                            <Bell aria-hidden="true" className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-bold">הפעלת התראות</span>
                    </div>
                    <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
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
                    className="flex min-h-20 w-full items-center justify-between gap-3 rounded-[1.5rem] border border-border bg-card p-5 text-start transition-colors active:bg-muted/40"
                >
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
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

            <p className="mt-12 text-center text-xs text-muted-foreground">סטודיו טליה</p>
            </main>
        </div>
    );
}
