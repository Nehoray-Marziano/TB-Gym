"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { CalendarDays, UsersRound, ArrowRight, type LucideIcon } from "lucide-react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        let active = true;
        const checkAdmin = async () => {
            const supabase = getSupabaseClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!active) return;
            if (!user) {
                router.replace("/");
                return;
            }
            const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
            if (!active) return;
            if (profile?.role !== "administrator") {
                router.replace("/dashboard");
                return;
            }
            setAuthorized(true);
        };
        checkAdmin();
        return () => { active = false; };
    }, [router]);

    if (!authorized) {
        return <div className="min-h-dvh bg-[#111a12]" />;
    }

    return (
        <div className="min-h-dvh overflow-x-hidden bg-[#111a12] text-[var(--studio-deep-contrast)]">
            <main className="mx-auto max-w-lg px-5 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-6 sm:px-7">
                {children}
            </main>

            <nav aria-label="ניווט ניהול" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#111a12]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
                <div className="mx-auto grid max-w-lg grid-cols-3 gap-2 px-5 py-2 sm:px-7">
                    <NavIcon href="/admin/schedule" icon={CalendarDays} label="יומן" isActive={pathname.startsWith("/admin/schedule")} />
                    <NavIcon href="/admin/trainees" icon={UsersRound} label="מתאמנות" isActive={pathname.startsWith("/admin/trainees")} />
                    <NavIcon href="/" icon={ArrowRight} label="לאפליקציה" isActive={false} />
                </div>
            </nav>
        </div>
    );
}

function NavIcon({ href, icon: Icon, label, isActive }: { href: string; icon: LucideIcon; label: string; isActive?: boolean }) {
    return (
        <Link href={href} aria-current={isActive ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold transition-colors ${isActive ? "bg-[var(--studio-accent-bg)] text-[var(--studio-ink)]" : "text-[#aebbad] active:bg-white/10"}`}>
            <Icon aria-hidden="true" className="h-5 w-5" />
            {label}
        </Link>
    );
}
