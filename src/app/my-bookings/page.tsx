"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Clock3 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getRelativeTimeHebrew } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";
import StudioLogo from "@/components/StudioLogo";

type BookedSession = {
    id: string;
    title: string;
    start_time: string;
};

type BookingRow = {
    id: string;
    status: string;
    session: BookedSession | BookedSession[] | null;
};

type Booking = Omit<BookingRow, "session"> & { session: BookedSession };

function formatDate(date: string, options: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat("he-IL", options).format(new Date(date));
}

export default function MyBookingsPage() {
    const router = useRouter();
    const reduceMotion = useReducedMotion();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            const supabase = getSupabaseClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push("/auth/login");
                return;
            }

            const { data: myBookings, error } = await supabase
                .from("bookings")
                .select("id, status, created_at, session:gym_sessions(*)")
                .eq("user_id", user.id)
                .in("status", ["confirmed", "pending"])
                .order("created_at", { ascending: false });

            if (error) console.error("Could not load bookings", error);

            if (myBookings) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const upcoming = (myBookings as unknown as BookingRow[])
                    .map((booking) => ({
                        ...booking,
                        session: Array.isArray(booking.session) ? booking.session[0] : booking.session,
                    }))
                    .filter((booking): booking is Booking => Boolean(booking.session && new Date(booking.session.start_time) >= today))
                    .sort((a, b) => new Date(a.session.start_time).getTime() - new Date(b.session.start_time).getTime());

                setBookings(upcoming);
            }
            setLoading(false);
        };

        fetchBookings();
    }, [router]);

    return (
        <div className="min-h-dvh overflow-x-hidden bg-[#e9eadc] text-[#162218]">
            <main className="mx-auto max-w-lg pb-[calc(8rem+env(safe-area-inset-bottom))]">
                <header className="relative isolate overflow-hidden bg-[#dce780] px-5 pb-20 pt-5 sm:px-7">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(#162218_1px,transparent_1px),linear-gradient(90deg,#162218_1px,transparent_1px)] [background-size:28px_28px]" />
                    <StudioLogo className="pointer-events-none absolute -bottom-16 -left-12 h-64 w-64 bg-[#162218]/10" />
                    <button
                        type="button"
                        onClick={() => router.back()}
                        aria-label="חזרה"
                        className="relative mb-12 flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[#162218]/30 transition-colors active:bg-[#162218]/10"
                    >
                        <ChevronRight aria-hidden="true" className="h-5 w-5" />
                    </button>
                    <motion.div initial={reduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="relative">
                        <p className="mb-4 flex items-center gap-2 text-xs font-bold"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#f28c69]" />היומן שלך</p>
                        <h1 className="text-[clamp(3.6rem,15vw,5.2rem)] font-bold leading-[0.9] tracking-[-0.06em]">האימונים<br /><span className="text-[#576c3a]">שלי.</span></h1>
                        <p className="mt-5 max-w-[18rem] text-sm leading-relaxed text-[#35482c]">המקומות שכבר שמורים לך בסטודיו.</p>
                    </motion.div>
                </header>

                <div className="relative -mt-8 rounded-t-[2rem] bg-[#e9eadc] px-5 pt-8 sm:px-7">
                    <div className="mb-5 border-b border-[#162218]/25 pb-4">
                        <div className="flex items-center justify-between gap-3 text-[10px] font-bold text-[#68794f]"><p>היומן שלי / 02</p>{!loading && <span>{bookings.length} {bookings.length === 1 ? "אימון" : "אימונים"}</span>}</div>
                        <h2 className="mt-2 text-[1.65rem] font-bold leading-tight">מה מחכה לך.</h2>
                    </div>

                {loading ? (
                    <div className="space-y-3" aria-busy="true">
                        {[1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-[1.75rem] bg-[#f6f6ed]" />)}
                    </div>
                ) : bookings.length > 0 ? (
                    <div className="space-y-3">
                        {bookings.map((booking, index) => (
                            <motion.article key={booking.id} initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.07, 0.28), duration: 0.45 }} className="overflow-hidden rounded-[1.75rem] border border-[#162218]/10 bg-[#f6f6ed]">
                                <div className="flex gap-4 p-5">
                                    <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-[1.1rem] bg-[#162218] text-[#dce780]">
                                        <span className="text-[1.85rem] font-bold leading-none tabular-nums">{formatDate(booking.session.start_time, { day: "numeric" })}</span>
                                        <span className="mt-1 text-xs font-bold">{formatDate(booking.session.start_time, { month: "short" })}</span>
                                    </div>
                                    <div className="min-w-0 flex-1 self-center">
                                        <h3 className="break-words text-lg font-bold leading-snug">{booking.session.title}</h3>
                                        <p className="mt-2 flex items-center gap-1.5 text-sm text-[#5d6958]">
                                            <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0" />
                                            {formatDate(booking.session.start_time, { weekday: "long", hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex min-h-11 items-center justify-between gap-3 border-t border-[#162218]/10 px-5 text-xs font-bold">
                                    <span className={booking.status === "pending" ? "text-[#90641e]" : "text-[#4e652c]"}>{booking.status === "pending" ? "ממתין לאישור" : "המקום שלך שמור"}</span>
                                    <span className="text-[#5d6958]">{getRelativeTimeHebrew(booking.session.start_time)}</span>
                                </div>
                            </motion.article>
                        ))}
                    </div>
                ) : (
                    <div className="relative overflow-hidden rounded-[1.75rem] bg-[#162218] px-6 py-8 text-[#f6f6ed]">
                        <StudioLogo className="pointer-events-none absolute -bottom-12 -left-10 h-52 w-52 bg-[#dce780]/15" />
                        <p className="relative mb-9 text-xs font-bold text-[#dce780]">יש מקום בשבילך</p>
                        <h3 className="relative mb-3 max-w-[15rem] text-[1.7rem] font-bold leading-tight">היומן מחכה לאימון הראשון שלך.</h3>
                        <p className="relative max-w-[17rem] text-sm leading-relaxed text-[#b8c7ae]">בחרי אימון, והמקום שלך יופיע כאן.</p>
                        <Link href="/book" className="relative mt-8 flex min-h-12 items-center justify-between rounded-full bg-[#dce780] px-5 text-sm font-bold text-[#162218] transition-colors active:bg-[#e8f29a]">
                            בואי לבחור אימון <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                        </Link>
                    </div>
                )}
                </div>
            </main>
            <BottomNav />
        </div>
    );
}
