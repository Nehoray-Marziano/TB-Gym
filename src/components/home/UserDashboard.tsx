"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useEffect, useState, useRef, useLayoutEffect } from "react";
import Link from "next/link";
import { useGymStore } from "@/providers/GymStoreProvider";
import { Calendar, Home, Activity, User, CalendarDays, Ticket, Clock, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import StudioLogo from "@/components/StudioLogo";
import gsap from "gsap";
import BottomNav from "@/components/BottomNav";
import { getRelativeTimeHebrew } from "@/lib/utils";
import NotificationPermissionModal from "@/components/NotificationPermissionModal";
import { useToast } from "@/components/ui/use-toast";


// Animated counter component for tickets
function AnimatedCounter({ value, className }: { value: number; className?: string }) {
    const counterRef = useRef<HTMLSpanElement>(null);
    const prevValue = useRef(value);

    useEffect(() => {
        if (counterRef.current && prevValue.current !== value) {
            // Animate from previous value to new value
            gsap.fromTo(
                counterRef.current,
                { innerText: prevValue.current },
                {
                    innerText: value,
                    duration: 1.2,
                    ease: "power2.out",
                    snap: { innerText: 1 },
                    onUpdate: function () {
                        if (counterRef.current) {
                            counterRef.current.textContent = Math.round(
                                parseFloat(counterRef.current.textContent || "0")
                            ).toString();
                        }
                    }
                }
            );
            prevValue.current = value;
        } else if (counterRef.current) {
            counterRef.current.textContent = value.toString();
        }
    }, [value]);

    return <span ref={counterRef} className={className}>{value}</span>;
}

export default function UserDashboard({ user }: { user: any }) {
    const router = useRouter();
    const { profile, tickets, subscription, loading, refreshData, toggleDevMode } = useGymStore();
    const [upcomingSession, setUpcomingSession] = useState<any | null>(null);
    const [loadingSession, setLoadingSession] = useState(true);
    const [isAnimated, setIsAnimated] = useState(false);
    const [debugClicks, setDebugClicks] = useState(0);

    // GSAP Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const logoRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLElement>(null);
    const ticketsCardRef = useRef<HTMLDivElement>(null);
    const workoutSectionRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        if (user?.id) {
            refreshData(false, user.id);
        }

        const cached = localStorage.getItem("talia_upcoming");
        if (cached) {
            setUpcomingSession(JSON.parse(cached));
            setLoadingSession(false);
        }

        const fetchUpcoming = async () => {
            if (!user) return;
            const supabase = getSupabaseClient();

            const { data: myBookings } = await supabase
                .from("bookings")
                .select("session:gym_sessions(*)")
                .eq("user_id", user.id)
                .eq("status", "confirmed")
                .gte("session.start_time", new Date().toISOString());

            if (myBookings && myBookings.length > 0) {
                const futureBookings = myBookings
                    .map((b: any) => b.session)
                    .filter((s: any) => s && new Date(s.start_time) > new Date())
                    .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

                const nextSession = futureBookings[0] || null;
                setUpcomingSession(nextSession);
                localStorage.setItem("talia_upcoming", JSON.stringify(nextSession));
            } else {
                setUpcomingSession(null);
                localStorage.removeItem("talia_upcoming");
            }
            setLoadingSession(false);
        };
        fetchUpcoming();
    }, [user, refreshData]);


    // Confetti Logic: Check if tickets increased since last load
    const { toast } = useToast();
    useEffect(() => {
        if (loading) return; // Wait for tickets to be loaded

        const storedTickets = localStorage.getItem('talia_tickets_count');
        const currentTicketsNr = tickets || 0;

        if (storedTickets !== null) {
            const prevTickets = parseInt(storedTickets);
            if (currentTicketsNr > prevTickets) {
                // Celebration!
                toast({
                    title: "קיבלת כרטיסים חדשים! 🎉",
                    description: "הכרטיסים נוספו לחשבון שלך בהצלחה.",
                    type: "success"
                });

                import('canvas-confetti').then((confettiModule) => {
                    const confetti = confettiModule.default;
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#E2F163', '#00b0ba', '#ffffff'] // Brand colors
                    });
                });
            }
        }

        // Always update to current
        localStorage.setItem('talia_tickets_count', currentTicketsNr.toString());
    }, [tickets, loading, toast]);

    // Prefetch routes
    useEffect(() => {
        router.prefetch('/subscription');
        router.prefetch('/book');
        router.prefetch('/profile');
        router.prefetch('/admin/schedule');
    }, [router]);


    // GSAP Entrance Animations
    useLayoutEffect(() => {
        if (loading || isAnimated) return;

        const ctx = gsap.context(() => {
            // Set initial states
            gsap.set([logoRef.current, headerRef.current, ticketsCardRef.current, workoutSectionRef.current], {
                opacity: 0,
                y: 30
            });


            // Create master timeline
            const tl = gsap.timeline({
                defaults: { ease: "power3.out" },
                onComplete: () => setIsAnimated(true)
            });

            // Logo drops in with bounce
            tl.to(logoRef.current, {
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: "back.out(1.7)"
            })
                // Header slides in
                .to(headerRef.current, {
                    opacity: 1,
                    y: 0,
                    duration: 0.5
                }, "-=0.3")
                // Tickets card with special effect
                .to(ticketsCardRef.current, {
                    opacity: 1,
                    y: 0,
                    duration: 0.6,
                    ease: "power4.out"
                }, "-=0.2")
                // Add shimmer effect to tickets card
                .fromTo(ticketsCardRef.current,
                    { backgroundPosition: "-200% 0" },
                    {
                        backgroundPosition: "200% 0",
                        duration: 1.5,
                        ease: "power2.inOut"
                    },
                    "-=0.3"
                )
                // Workout section
                .to(workoutSectionRef.current, {
                    opacity: 1,
                    y: 0,
                    duration: 0.5
                }, "-=1");

        }, containerRef);

        return () => ctx.revert();
    }, [loading, isAnimated]);

    // Loading skeleton with shimmer effect
    if (loading) {
        return (
            <div className="fixed inset-0 bg-background text-foreground overflow-hidden font-sans">
                <div className="p-6 space-y-6">
                    {/* Logo skeleton */}
                    <div className="flex justify-center pt-4 mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-muted/20 shimmer-skeleton" />
                    </div>

                    {/* Header skeleton */}
                    <div className="flex justify-between items-start mb-8">
                        <div className="space-y-2">
                            <div className="h-4 w-20 bg-muted/20 rounded-lg shimmer-skeleton" />
                            <div className="h-10 w-40 bg-muted/20 rounded-xl shimmer-skeleton" />
                        </div>
                        <div className="w-12 h-12 rounded-full bg-muted/20 shimmer-skeleton" />
                    </div>

                    {/* Tickets card skeleton */}
                    <div className="h-44 rounded-[2rem] bg-muted/10 shimmer-skeleton" />

                    {/* Workout section skeleton */}
                    <div className="space-y-4">
                        <div className="h-6 w-28 bg-muted/20 rounded-lg shimmer-skeleton" />
                        <div className="h-28 rounded-[2rem] bg-muted/10 shimmer-skeleton" />
                    </div>
                </div>

                {/* Nav skeleton */}
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm">
                    <div className="h-16 rounded-full bg-muted/10 shimmer-skeleton" />
                </div>

                {/* Shimmer animation styles */}
                <style jsx>{`
                    .shimmer-skeleton {
                        position: relative;
                        overflow: hidden;
                    }
                    .shimmer-skeleton::after {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: linear-gradient(
                            90deg,
                            transparent,
                            rgba(255, 255, 255, 0.05),
                            transparent
                        );
                        animation: shimmer 1.5s infinite;
                    }
                    @keyframes shimmer {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                    }
                `}</style>
            </div>
        );
    }

    const firstName = profile?.full_name?.split(" ")[0] || "מתאמנת";
    const greeting = getGreeting();

    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return "בוקר טוב";
        if (hour < 18) return "צהריים טובים";
        return "ערב טוב";
    }

    const formatExpiryDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat("he-IL", {
            day: "numeric",
            month: "short",
        }).format(date);
    };

    return (
        <div ref={containerRef} className="fixed inset-0 bg-background text-foreground overflow-hidden font-sans">
            {/* OneSignal Initialization */}
            {/* OneSignal Initialization is now handled globally in RootLayout */}



            {/* Animated gradient background */}
            <div className="fixed top-0 right-0 w-[250px] h-[250px] bg-primary/5 rounded-full pointer-events-none blur-3xl animate-pulse" />
            <div className="fixed bottom-1/3 left-0 w-[200px] h-[200px] bg-primary/3 rounded-full pointer-events-none blur-3xl" />

            <div className="h-full overflow-hidden pb-24">
                <div className="p-6 relative z-10 h-full">
                    {/* Logo Header with animation */}
                    <div ref={logoRef} className="flex justify-center pb-4 pt-4 mb-2">
                        <div
                            className="relative cursor-pointer active:scale-95 transition-transform"
                            onClick={() => {
                                const newCount = debugClicks + 1;
                                setDebugClicks(newCount);
                                if (newCount >= 10) {
                                    toggleDevMode(true);
                                    toast({
                                        title: "👨‍💻 Developer Mode Enabled",
                                        description: "Debug tools are now visible on the right.",
                                        type: "success"
                                    });
                                    setDebugClicks(0);
                                }
                            }}
                        >
                            <StudioLogo className="w-16 h-16" />
                            {/* Subtle glow effect */}
                            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl -z-10 animate-pulse" />
                        </div>
                    </div>

                    {/* Header */}
                    <header ref={headerRef} className="flex justify-between items-start mb-8">
                        <div>
                            <p className="text-muted-foreground text-sm font-medium mb-1">{greeting},</p>
                            <h1 className="text-4xl font-bold text-foreground tracking-tight">
                                {firstName} <span className="inline-block animate-wave">👋</span>
                            </h1>
                        </div>

                        <div className="flex items-center gap-3">
                            {profile?.role === 'administrator' && (
                                <Link href="/admin/schedule" prefetch={true}>
                                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 text-black active:scale-95 transition-transform hover:shadow-primary/50 hover:shadow-xl">
                                        <Activity className="w-6 h-6" />
                                    </div>
                                </Link>
                            )}
                        </div>
                    </header>

                    {/* Tickets Card - Premium Design */}
                    <div ref={ticketsCardRef} className="mb-8">
                        <Link href="/subscription" prefetch={true}>
                            <div className="group relative bg-gradient-to-br from-[#E2F163] via-[#d9e85a] to-[#c8d64a] rounded-[2rem] p-6 text-black shadow-lg shadow-primary/20 active:scale-[0.98] transition-all duration-300 hover:shadow-primary/40 hover:shadow-xl overflow-hidden">
                                {/* Animated shine effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

                                {/* Sparkle decorations */}
                                <Sparkles className="absolute top-4 left-4 w-4 h-4 text-black/20 animate-pulse" />
                                <Sparkles className="absolute bottom-12 right-20 w-3 h-3 text-black/15 animate-pulse delay-300" />

                                <div className="flex justify-between items-start mb-8 relative z-10">
                                    <div>
                                        <p className="font-bold text-black/60 text-sm mb-1 uppercase tracking-wider">הכרטיסים שלך</p>
                                        <h2 className="text-5xl font-bold tracking-tighter">
                                            <AnimatedCounter value={tickets} />
                                        </h2>
                                    </div>
                                    <div className="bg-black/10 p-3 rounded-xl group-hover:bg-black/20 transition-colors">
                                        <Ticket className="w-6 h-6 text-black" />
                                    </div>
                                </div>

                                <div className="flex justify-between items-end relative z-10">
                                    <div className="flex items-center gap-2">
                                        {subscription?.is_active && (
                                            <>
                                                <span className="bg-black/20 text-black px-3 py-1 rounded-full text-xs font-bold">
                                                    {subscription.tier_display_name}
                                                </span>
                                                <span className="flex items-center gap-1 text-xs text-black/70">
                                                    <Clock className="w-3 h-3" />
                                                    עד {formatExpiryDate(subscription.expires_at)}
                                                </span>
                                            </>
                                        )}
                                        {!subscription?.is_active && (
                                            <span className="text-sm text-black/70 font-medium">אימונים זמינים</span>
                                        )}
                                    </div>
                                    <span className="bg-black text-[#E2F163] px-4 py-2 rounded-xl text-xs font-bold group-hover:scale-105 transition-transform">
                                        {subscription?.is_active ? "עוד כרטיסים +" : "רכישת מנוי +"}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    </div>

                    {/* Next Workout */}
                    <div ref={workoutSectionRef} className="mb-8">
                        <div className="flex justify-between items-end mb-4 px-1">
                            <h2 className="text-xl font-bold text-foreground">האימון הבא</h2>
                            {upcomingSession && <Link href="/my-bookings" prefetch={true} className="text-primary text-xs font-bold hover:underline">לאימונים שלי</Link>}
                        </div>

                        {loadingSession ? (
                            <div className="bg-card/50 border border-border rounded-[2rem] p-1 flex items-center pr-2 h-28">
                                <div className="bg-muted/20 w-20 h-20 rounded-[1.5rem] shrink-0 ml-4 shimmer-skeleton" />
                                <div className="flex-1 py-4 space-y-2">
                                    <div className="h-6 w-3/4 bg-muted/20 rounded-lg shimmer-skeleton" />
                                    <div className="h-4 w-1/2 bg-muted/20 rounded-lg shimmer-skeleton" />
                                </div>
                            </div>
                        ) : upcomingSession ? (
                            <div className="bg-card/50 border border-border rounded-[2rem] p-1 flex items-center pr-2">
                                <div className="bg-gradient-to-br from-primary/20 to-primary/10 w-20 h-20 rounded-[1.5rem] flex flex-col items-center justify-center text-center shrink-0 ml-4">
                                    <span className="text-primary font-bold text-xl leading-none">
                                        {new Date(upcomingSession.start_time).getDate()}
                                    </span>
                                    <span className="text-muted-foreground text-xs font-medium uppercase mt-1">
                                        {new Date(upcomingSession.start_time).toLocaleDateString('he-IL', { month: 'short' })}
                                    </span>
                                </div>
                                <div className="py-4">
                                    <h3 className="font-bold text-lg text-foreground mb-1">{upcomingSession.title}</h3>
                                    <p className="text-muted-foreground text-sm">
                                        {new Date(upcomingSession.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} • {getRelativeTimeHebrew(upcomingSession.start_time)}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <Link href="/book" className="block">
                                <div className="group bg-card/30 border border-dashed border-border rounded-[2rem] p-8 text-center active:scale-[0.98] transition-all duration-300 hover:border-primary/50 hover:bg-card/40">
                                    <div className="mx-auto w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                                        <Activity className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                    <p className="text-muted-foreground text-sm font-medium">לא נרשמת לאימונים קרובים</p>
                                    <span className="text-primary text-sm font-bold mt-2 inline-block group-hover:translate-x-1 transition-transform">זה הזמן להירשם →</span>
                                </div>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Navigation */}
            <BottomNav />

            {/* Notification Permission Modal */}
            <NotificationPermissionModal />

            {/* CSS for wave animation */}
            <style jsx>{`
                @keyframes wave {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(20deg); }
                    75% { transform: rotate(-10deg); }
                }
                .animate-wave {
                    display: inline-block;
                    animation: wave 2s ease-in-out infinite;
                    transform-origin: 70% 70%;
                }
                .shimmer-skeleton {
                    position: relative;
                    overflow: hidden;
                }
                .shimmer-skeleton::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(255, 255, 255, 0.05),
                        transparent
                    );
                    animation: shimmer 1.5s infinite;
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}
