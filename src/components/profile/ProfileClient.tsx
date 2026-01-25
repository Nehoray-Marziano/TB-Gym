"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useState, useRef, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut, Phone, Zap, Bell, Shield, Edit2, Check, X, User, Moon, Sun, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { useTheme } from "next-themes";
import gsap from "gsap";


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

export default function ProfileClient({ initialProfile, initialHealth }: ProfileClientProps) {
    const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
    const [health, setHealth] = useState<HealthDeclaration>(initialHealth);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isAnimated, setIsAnimated] = useState(false);

    const { setTheme, resolvedTheme } = useTheme();

    // Form State
    const [formData, setFormData] = useState({
        full_name: initialProfile?.full_name || "",
        phone: initialProfile?.phone || "",
        is_healthy: initialHealth?.is_healthy ?? true,
        medical_conditions: initialHealth?.medical_conditions || ""
    });

    // GSAP Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLElement>(null);
    const avatarRef = useRef<HTMLDivElement>(null);
    const statsCardRef = useRef<HTMLDivElement>(null);
    const detailsRef = useRef<HTMLDivElement>(null);
    const settingsRef = useRef<HTMLDivElement>(null);

    const router = useRouter();
    const supabase = getSupabaseClient();
    const { toast } = useToast();

    // GSAP Entrance Animation
    useLayoutEffect(() => {
        if (isAnimated) return;

        const ctx = gsap.context(() => {
            // Set initial states
            gsap.set(headerRef.current, { opacity: 0, y: -20 });
            gsap.set(avatarRef.current, { opacity: 0, scale: 0.8 });
            gsap.set(statsCardRef.current, { opacity: 0, y: 30 });
            gsap.set(".detail-card", { opacity: 0, x: -30 });
            gsap.set(".settings-item", { opacity: 0, y: 20 });

            // Master timeline
            const tl = gsap.timeline({
                defaults: { ease: "power3.out" },
                onComplete: () => setIsAnimated(true)
            });

            // Header slides in (faster)
            tl.to(headerRef.current, {
                opacity: 1,
                y: 0,
                duration: 0.3 // Was 0.5
            })
                // Avatar pops in (faster)
                .to(avatarRef.current, {
                    opacity: 1,
                    scale: 1,
                    duration: 0.4, // Was 0.6
                    ease: "back.out(1.5)"
                }, "-=0.2")
                // Stats card slides up (faster)
                .to(statsCardRef.current, {
                    opacity: 1,
                    y: 0,
                    duration: 0.3
                }, "-=0.2")
                // Detail cards stagger in (faster)
                .to(".detail-card", {
                    opacity: 1,
                    x: 0,
                    duration: 0.3, // Was 0.4
                    stagger: 0.05 // Was 0.1
                }, "-=0.15")
                // Settings items stagger in (faster)
                .to(".settings-item", {
                    opacity: 1,
                    y: 0,
                    duration: 0.3,
                    stagger: 0.04
                }, "-=0.2");


        }, containerRef);

        return () => ctx.revert();
    }, [isAnimated]);

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

    const toggleTheme = () => {
        if (navigator.vibrate) navigator.vibrate(10);
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    };

    if (!profile) return null; // Should not happen with server data, but safety check

    return (
        <div ref={containerRef} className="min-h-[100dvh] bg-background text-foreground p-6 pb-20 font-sans selection:bg-primary selection:text-black">
            {/* OneSignal Initialization */}
            {/* OneSignal Initialization is now handled globally in RootLayout/GymStoreProvider */}

            {/* Ambient background */}
            <div className="fixed top-0 right-0 w-[250px] h-[250px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="fixed bottom-1/3 left-0 w-[200px] h-[200px] bg-primary/3 rounded-full blur-[60px] pointer-events-none" />

            {/* Header */}
            <header ref={headerRef} className={`${!isAnimated ? 'opacity-0' : ''} flex items-center justify-between mb-8 sticky top-0 z-30 bg-background/80 backdrop-blur-xl py-4 -mx-6 px-6 border-b border-border/50`}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center hover:bg-muted/10 hover:border-primary/50 transition-all active:scale-95"
                    >
                        <ChevronRight className="w-5 h-5 text-foreground" />
                    </button>
                    <h1 className="text-2xl font-bold tracking-tight">הפרופיל שלי</h1>
                </div>

                <motion.button
                    layout
                    initial={false}
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    disabled={loading}
                    className={`h-10 rounded-full text-sm font-bold flex items-center justify-center gap-2 overflow-hidden relative transition-all border
                        ${isEditing
                            ? "bg-primary text-black border-primary shadow-[0_0_20px_rgba(226,241,99,0.3)]"
                            : "bg-black text-white border-transparent hover:opacity-80 dark:bg-card dark:text-foreground dark:border-border"}
                        ${loading ? "opacity-80 cursor-wait px-0" : "px-6"}`}
                    animate={{
                        width: loading ? 40 : "auto"
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                            >
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key={isEditing ? "save" : "edit"}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-center gap-2 whitespace-nowrap"
                            >
                                {isEditing ? (
                                    <><Check className="w-4 h-4" /> שמירה</>
                                ) : (
                                    <><Edit2 className="w-4 h-4" /> עריכה</>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.button>
            </header>

            {/* Avatar & Hero */}
            <div ref={avatarRef} className={`${!isAnimated ? 'opacity-0' : ''} flex flex-col items-center mb-10 relative`}>
                <div className="absolute top-0 w-32 h-32 bg-primary/20 blur-[50px] rounded-full pointer-events-none animate-pulse" />

                <div className="group w-28 h-28 bg-gradient-to-br from-card to-muted/20 rounded-[2rem] border-2 border-primary shadow-[0_0_30px_rgba(226,241,99,0.2)] flex items-center justify-center text-4xl font-bold mb-4 z-10 relative overflow-hidden transition-all hover:shadow-[0_0_40px_rgba(226,241,99,0.3)] hover:scale-105">
                    {formData.full_name?.charAt(0) || "?"}
                    {/* Sparkle decoration */}
                    <Sparkles className="absolute top-2 right-2 w-4 h-4 text-primary/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {isEditing ? (
                    <input
                        value={formData.full_name}
                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        className="text-2xl font-bold mb-1 bg-transparent border-b-2 border-primary text-center w-full max-w-[200px] focus:outline-none text-foreground"
                        placeholder="שם מלא"
                    />
                ) : (
                    <h2 className="text-2xl font-bold mb-1 text-foreground">{profile?.full_name || "אורחת"}</h2>
                )}

                <div className="flex items-center gap-2 mt-2">
                    <span className="text-muted-foreground text-sm font-medium bg-card px-3 py-1 rounded-full border border-border">
                        {profile?.role === 'administrator' ? '👑 מנהלת מערכת' : '💪 מתאמנת בטליה'}
                    </span>
                </div>
            </div>

            {/* Stats Card */}
            {!isEditing && (
                <div ref={statsCardRef} className={`${!isAnimated ? 'opacity-0' : ''} group bg-gradient-to-br from-[#E2F163] via-[#d9e85a] to-[#c8d64a] rounded-[2rem] p-6 text-black shadow-lg shadow-primary/20 mb-8 relative overflow-hidden transition-all hover:shadow-primary/30 hover:scale-[1.01]`}>
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

                    <div className="relative z-10 flex justify-between items-center">
                        <div>
                            <p className="font-bold text-black/60 text-xs mb-1 uppercase tracking-wider">יתרה נוכחית</p>
                            <h3 className="text-4xl font-bold tracking-tighter">{profile?.balance} שיעורים</h3>
                        </div>
                        <div className="w-12 h-12 bg-black/10 rounded-full flex items-center justify-center backdrop-blur-md group-hover:bg-black/20 transition-colors">
                            <Zap className="w-6 h-6 text-black" />
                        </div>
                    </div>
                </div>
            )}

            {/* Details List */}
            <div ref={detailsRef} className="space-y-4 mb-10">
                <h3 className="text-muted-foreground font-bold mb-2 px-1">פרטים אישיים</h3>

                {/* Phone */}
                <div className={`${!isAnimated ? 'opacity-0' : ''} detail-card bg-card/50 border border-border rounded-3xl p-1 overflow-hidden hover:border-primary/30 transition-all`}>
                    <div className="flex items-center gap-4 p-4 border-b border-border last:border-0">
                        <div className="w-10 h-10 bg-muted/20 rounded-full flex items-center justify-center shrink-0">
                            <Phone className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-muted-foreground font-medium">מספר נייד</p>
                            {isEditing ? (
                                <input
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="font-bold bg-muted/20 px-2 py-1 rounded text-foreground w-full border border-border focus:border-primary focus:outline-none"
                                />
                            ) : (
                                <p className="font-bold dir-ltr text-foreground">{profile?.phone || "-"}</p>
                            )}
                        </div>
                    </div>

                    {/* Health Declaration */}
                    <div className="flex flex-col gap-2 p-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-muted/20 rounded-full flex items-center justify-center shrink-0">
                                <Shield className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground font-medium">הצהרת בריאות</p>
                                {isEditing ? (
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={() => setFormData({ ...formData, is_healthy: true })}
                                            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${formData.is_healthy ? "bg-green-500/20 text-green-500 border-green-500/50 scale-105" : "bg-muted/10 border-border text-muted-foreground hover:border-green-500/30"}`}
                                        >
                                            תקינה
                                        </button>
                                        <button
                                            onClick={() => setFormData({ ...formData, is_healthy: false })}
                                            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${!formData.is_healthy ? "bg-red-500/20 text-red-500 border-red-500/50 scale-105" : "bg-muted/10 border-border text-muted-foreground hover:border-red-500/30"}`}
                                        >
                                            יש מגבלות
                                        </button>
                                    </div>
                                ) : (
                                    <p className={`font-bold ${health.is_healthy ? "text-green-500" : "text-yellow-500"}`}>
                                        {health.is_healthy ? "תקינה ✓" : "קיימות מגבלות רפואיות"}
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
                                    className="mt-2 pl-[3.5rem] overflow-hidden"
                                >
                                    {isEditing ? (
                                        <textarea
                                            value={formData.medical_conditions}
                                            onChange={e => setFormData({ ...formData, medical_conditions: e.target.value })}
                                            className="w-full bg-card border border-border rounded-xl p-3 text-sm focus:border-red-400/50 focus:outline-none min-h-[80px] text-foreground"
                                            placeholder="פרטי את המגבלות..."
                                        />
                                    ) : (
                                        <p className="text-sm text-muted-foreground bg-card p-3 rounded-xl border border-border">
                                            {health.medical_conditions}
                                        </p>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Theme & Settings */}
            <div ref={settingsRef} className="space-y-3">
                <button
                    onClick={toggleTheme}
                    className={`${!isAnimated ? 'opacity-0' : ''} settings-item w-full bg-card border border-border p-5 rounded-3xl flex items-center justify-between group hover:border-primary/50 transition-all active:scale-[0.98]`}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-muted/20 rounded-full flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                            {resolvedTheme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                        </div>
                        <span className="font-bold text-foreground">מצב תצוגה ({resolvedTheme === 'dark' ? 'חשוך' : 'בהיר'})</span>
                    </div>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${resolvedTheme === 'dark' ? 'bg-primary justify-end' : 'bg-muted/30 justify-start'} flex`}>
                        <motion.div
                            layout
                            transition={{ type: "spring", stiffness: 700, damping: 30 }}
                            className={`w-4 h-4 rounded-full ${resolvedTheme === 'dark' ? 'bg-black' : 'bg-white shadow-sm'}`}
                        />
                    </div>
                </button>

                <button
                    onClick={async () => {
                        if (navigator.vibrate) navigator.vibrate(10);
                        if (typeof window !== 'undefined' && (window as any).OneSignal) {
                            try {
                                const permission = await (window as any).OneSignal.Notifications.permission;
                                if (!permission) {
                                    await (window as any).OneSignal.Notifications.requestPermission();
                                    toast({ title: "התראות הופעלו! 🔔", type: "success" });
                                } else {
                                    toast({ title: "התראות כבר מופעלות ✓", description: "ניתן לשנות בהגדרות הדפדפן", type: "success" });
                                }
                            } catch (e) {
                                console.error("Notification error:", e);
                                toast({ title: "שגיאה בהפעלת התראות", type: "error" });
                            }
                        } else {
                            toast({ title: "שירות ההתראות לא זמין", description: "נסי לרענן את הדף", type: "error" });
                        }
                    }}
                    className={`${!isAnimated ? 'opacity-0' : ''} settings-item w-full bg-card border border-border p-5 rounded-3xl flex items-center justify-between group hover:border-primary/50 transition-all active:scale-[0.98]`}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:bg-primary/20 transition-all">
                            {Bell && <Bell className="w-5 h-5" />}
                        </div>
                        <span className="font-bold text-foreground">הפעלת התראות</span>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/20 px-3 py-1 rounded-full">לחצי להפעלה</div>
                </button>

                <button
                    onClick={handleLogout}
                    className={`${!isAnimated ? 'opacity-0' : ''} settings-item w-full bg-red-500/10 border border-red-500/20 p-5 rounded-3xl flex items-center justify-center gap-2 text-red-500 font-bold hover:bg-red-500/20 transition-all mt-8 active:scale-[0.98]`}
                >
                    <LogOut className="w-5 h-5" />
                    התנתקי מהמערכת
                </button>
            </div>

            <div className="text-center mt-12 mb-6">
                <p className="text-muted-foreground text-xs font-medium">Talia Gym App v1.0.0</p>
            </div>
        </div>
    );
}
