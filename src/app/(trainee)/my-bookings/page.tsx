"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Clock3 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getRelativeTimeHebrew } from "@/lib/utils";
import StudioLogo from "@/components/StudioLogo";
import { useTraineeUserId } from "@/components/TraineeIdentity";

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
    const userId = useTraineeUserId();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            const supabase = getSupabaseClient();
            const { data: myBookings, error } = await supabase
                .from("bookings")
                .select("id, status, created_at, session:gym_sessions(*)")
                .eq("user_id", userId)
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
    }, [userId]);

    return (
        <div className="min-h-dvh overflow-x-hidden bg-[var(--studio-canvas)] text-[var(--studio-ink)]">
            <main className="mx-auto max-w-lg pb-[calc(8rem+env(safe-area-inset-bottom))]">
                <header className="relative flex items-center gap-3 bg-[var(--studio-accent-bg)] px-5 py-5">
                    <button type="button" onClick={() => router.back()} aria-label="חזרה" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--studio-ink)]/20"><ChevronRight aria-hidden="true" className="h-5 w-5" /></button>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-[var(--studio-subtle)]">היומן שלך</p>
                        <h1 className="text-[2rem] font-bold leading-tight tracking-tight">האימונים שלי<span className="text-[var(--studio-coral-ink)]">.</span></h1>
                    </div>
                    {!loading && <span className="text-xs font-bold">{bookings.length}</span>}
                </header>

                <div className="px-5 pt-4">

                {loading ? (
                    <div className="space-y-3" aria-busy="true">
                        {[1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-[1.75rem] bg-[var(--studio-card)]" />)}
                    </div>
                ) : bookings.length > 0 ? (
                    <div className="space-y-3">
                        {bookings.map((booking) => (
                            <article key={booking.id} className="overflow-hidden rounded-[1.35rem] border border-[var(--studio-ink)]/10 bg-[var(--studio-card)]">
                                <div className="flex gap-3 p-3.5">
                                    <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-[1.1rem] bg-[var(--studio-deep)] text-[var(--studio-accent-text)]">
                                        <span className="text-[1.85rem] font-bold leading-none tabular-nums">{formatDate(booking.session.start_time, { day: "numeric" })}</span>
                                        <span className="mt-1 text-xs font-bold">{formatDate(booking.session.start_time, { month: "short" })}</span>
                                    </div>
                                    <div className="min-w-0 flex-1 self-center">
                                        <h3 className="break-words text-lg font-bold leading-snug">{booking.session.title}</h3>
                                        <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--studio-muted)]">
                                            <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0" />
                                            {formatDate(booking.session.start_time, { weekday: "long", hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex min-h-11 items-center justify-between gap-3 border-t border-[#162218]/10 px-5 text-xs font-bold">
                                    <span className={booking.status === "pending" ? "text-[var(--studio-warning-ink)]" : "text-[var(--studio-subtle)]"}>{booking.status === "pending" ? "ממתין לאישור" : "המקום שלך שמור"}</span>
                                    <span className="text-[var(--studio-muted)]">{getRelativeTimeHebrew(booking.session.start_time)}</span>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="relative overflow-hidden rounded-[1.75rem] bg-[var(--studio-deep)] px-6 py-8 text-[var(--studio-deep-contrast)]">
                        <StudioLogo className="pointer-events-none absolute -bottom-12 -left-10 h-52 w-52 bg-[var(--studio-accent-bg)]/15" />
                        <p className="relative mb-9 text-xs font-bold text-[var(--studio-accent-text)]">יש מקום בשבילך</p>
                        <h3 className="relative mb-3 max-w-[15rem] text-[1.7rem] font-bold leading-tight">היומן מחכה לאימון הראשון שלך.</h3>
                        <p className="relative max-w-[17rem] text-sm leading-relaxed text-[#b8c7ae]">בחרי אימון, והמקום שלך יופיע כאן.</p>
                        <Link href="/book" className="relative mt-8 flex min-h-12 items-center justify-between rounded-full bg-[var(--studio-accent-bg)] px-5 text-sm font-bold text-[var(--studio-ink)] transition-colors active:bg-[#e8f29a]">
                            בואי לבחור אימון <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                        </Link>
                    </div>
                )}
                </div>
            </main>
        </div>
    );
}
