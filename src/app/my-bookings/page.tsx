"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronRight, Clock3 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getRelativeTimeHebrew } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";

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
        <div className="min-h-dvh overflow-x-hidden bg-background text-foreground">
            <main className="mx-auto max-w-lg px-5 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-5 sm:px-7">
                <header className="mb-10">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        aria-label="חזרה"
                        className="mb-10 flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-card transition-colors active:bg-muted/40"
                    >
                        <ChevronRight aria-hidden="true" className="h-5 w-5" />
                    </button>
                    <p className="mb-2 text-xs font-bold text-primary">היומן שלך / 02</p>
                    <h1 className="text-[clamp(2.8rem,12vw,4rem)] font-bold leading-[1.08] tracking-tight">האימונים<br />שלי<span className="text-primary">.</span></h1>
                    <p className="mt-4 max-w-[19rem] text-sm leading-relaxed text-muted-foreground">כל האימונים שנרשמת אליהם, לפי הסדר.</p>
                </header>

                <div className="mb-5 flex items-center justify-between border-b border-border pb-3">
                    <h2 className="text-base font-bold">ביומן שלי</h2>
                    {!loading && <span className="text-xs font-medium text-muted-foreground">{bookings.length} {bookings.length === 1 ? "אימון" : "אימונים"}</span>}
                </div>

                {loading ? (
                    <div className="space-y-3" aria-busy="true">
                        {[1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-[1.75rem] border border-border bg-card" />)}
                    </div>
                ) : bookings.length > 0 ? (
                    <div className="space-y-3">
                        {bookings.map((booking) => (
                            <article key={booking.id} className="overflow-hidden rounded-[1.75rem] border border-border bg-card">
                                <div className="flex gap-4 p-5">
                                    <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-[1.1rem] bg-primary text-primary-foreground">
                                        <span className="text-[1.85rem] font-bold leading-none tabular-nums">{formatDate(booking.session.start_time, { day: "numeric" })}</span>
                                        <span className="mt-1 text-xs font-bold">{formatDate(booking.session.start_time, { month: "short" })}</span>
                                    </div>
                                    <div className="min-w-0 flex-1 self-center">
                                        <h3 className="break-words text-lg font-bold leading-snug">{booking.session.title}</h3>
                                        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                                            <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0" />
                                            {formatDate(booking.session.start_time, { weekday: "long", hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex min-h-11 items-center justify-between border-t border-border px-5 text-xs font-bold">
                                    <span className={booking.status === "pending" ? "text-[#90641e]" : "text-primary"}>{booking.status === "pending" ? "ממתין לאישור" : "המקום שלך שמור"}</span>
                                    <span className="text-muted-foreground">{getRelativeTimeHebrew(booking.session.start_time)}</span>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-card px-6 py-8">
                        <div aria-hidden="true" className="pointer-events-none absolute -left-10 -top-14 h-40 w-40 rounded-full border-[24px] border-primary/10" />
                        <div className="relative mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                            <CalendarDays aria-hidden="true" className="h-7 w-7" />
                        </div>
                        <h3 className="relative mb-2 text-xl font-bold">עוד אין אימונים ביומן</h3>
                        <p className="relative max-w-[17rem] text-sm leading-relaxed text-muted-foreground">כשיירשם האימון הראשון שלך, הוא יופיע כאן.</p>
                        <Link href="/book" className="relative mt-7 flex min-h-12 items-center justify-between rounded-full bg-[#1b251c] px-5 text-sm font-bold text-[#f6f6ed] transition-colors active:bg-[#334436]">
                            בואי לבחור אימון <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                        </Link>
                    </div>
                )}
            </main>
            <BottomNav />
        </div>
    );
}
