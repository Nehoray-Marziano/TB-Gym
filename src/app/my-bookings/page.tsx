"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { ChevronRight, Calendar, MapPin, Clock } from "lucide-react";
import gsap from "gsap";
import Link from "next/link";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import BottomNav from "@/components/BottomNav";
import { getRelativeTimeHebrew } from "@/lib/utils";

export default function MyBookingsPage() {
    const router = useRouter();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isAnimated, setIsAnimated] = useState(false);

    useEffect(() => {
        const fetchBookings = async () => {
            const supabase = getSupabaseClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push("/auth/login");
                return;
            }

            // Fetch COMPLETED/CONFIRMED bookings that are in the future
            const { data: myBookings, error } = await supabase
                .from("bookings")
                .select(`
                    id,
                    status,
                    created_at,
                    session:gym_sessions(*)
                `)
                .eq("user_id", user.id)

                .in("status", ["confirmed", "pending"]) // Include pending bookings too
                .order("created_at", { ascending: false });

            if (myBookings) {
                console.log("[MyBookings] Raw Data:", myBookings);

                const now = new Date();
                now.setHours(0, 0, 0, 0); // Start of today

                const sorted = (myBookings || [])
                    .map((b: any) => ({ ...b, session: Array.isArray(b.session) ? b.session[0] : b.session }))
                    .filter((b: any) => {
                        if (!b.session) return false;
                        const sessionDate = new Date(b.session.start_time);
                        return sessionDate >= now; // Show everything from today onwards
                    })
                    .sort((a: any, b: any) => new Date(a.session.start_time).getTime() - new Date(b.session.start_time).getTime());

                setBookings(sorted);
            }
            setLoading(false);
        };

        fetchBookings();
    }, [router]);

    // GSAP Animation
    useLayoutEffect(() => {
        if (loading || isAnimated || bookings.length === 0) return;

        const ctx = gsap.context(() => {
            const ctx = gsap.context(() => {
                gsap.to(".booking-card", {
                    opacity: 1,
                    y: 0,
                    duration: 0.4,
                    stagger: 0.05,
                    ease: "power2.out",
                    onComplete: () => setIsAnimated(true)
                });
            }, containerRef);
        }, containerRef);

        return () => ctx.revert();
    }, [loading, bookings.length, isAnimated]);

    return (
        <div ref={containerRef} className="min-h-screen bg-background text-foreground p-6 pb-24 font-sans" dir="rtl">

            {/* Header */}
            <header className="flex items-center gap-4 mb-8 sticky top-0 z-10 bg-background/80 backdrop-blur-md py-4 -mx-6 px-6 border-b border-white/5">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold">האימונים שלי</h1>
            </header>

            {/* List */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-28 bg-white/5 rounded-[2rem] animate-pulse" />
                    ))}
                </div>
            ) : bookings.length > 0 ? (
                <div className="space-y-4">
                    {bookings.map((booking) => {
                        const date = new Date(booking.session.start_time);
                        return (
                            <div
                                key={booking.id}
                                className={`booking-card ${!isAnimated ? 'opacity-0' : ''} group bg-card/60 border border-white/10 rounded-[2rem] p-5 relative overflow-hidden transition-all hover:bg-card/80 hover:border-primary/30`}
                            >
                                <div className="flex items-center gap-5">
                                    {/* Date Box */}
                                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex flex-col items-center justify-center text-primary shrink-0 border border-primary/20">
                                        <span className="text-xl font-bold leading-none">{format(date, "d")}</span>
                                        <span className="text-xs font-bold uppercase mt-1">{format(date, "MMM", { locale: he })}</span>
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold mb-1">{booking.session.title}</h3>
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {format(date, "HH:mm")}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {getRelativeTimeHebrew(booking.session.start_time)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-center mt-10">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <Calendar className="w-8 h-8 opacity-50" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">אין אימונים קרובים</h3>
                    <p className="text-sm max-w-[200px]">לא נרשמת לאף אימון עדיין. זה הזמן להתחיל!</p>
                    <Link href="/book" className="mt-6 px-6 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors">
                        הרשמה לאימון
                    </Link>
                </div>
            )}

            <BottomNav />
        </div>
    );
}
