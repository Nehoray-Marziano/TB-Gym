"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CalendarDays, House, UsersRound, type LucideIcon } from "lucide-react";

export default function AdminShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="min-h-dvh overflow-x-hidden bg-[#111a12] text-[var(--studio-deep-contrast)]">
            <main className="mx-auto max-w-lg px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
                {children}
            </main>
            <nav aria-label="ניווט ניהול" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#111a12]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
                <div className="mx-auto grid h-[4.5rem] max-w-lg grid-cols-4 px-2">
                    <NavIcon href="/admin" icon={House} label="סקירה" isActive={pathname === "/admin"} />
                    <NavIcon href="/admin/schedule" icon={CalendarDays} label="יומן" isActive={pathname.startsWith("/admin/schedule")} />
                    <NavIcon href="/admin/trainees" icon={UsersRound} label="מתאמנות" isActive={pathname.startsWith("/admin/trainees")} />
                    <NavIcon href="/dashboard" icon={ArrowRight} label="האפליקציה" isActive={false} />
                </div>
            </nav>
        </div>
    );
}

function NavIcon({ href, icon: Icon, label, isActive }: { href: string; icon: LucideIcon; label: string; isActive: boolean }) {
    return (
        <Link href={href} prefetch aria-current={isActive ? "page" : undefined} className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold transition-colors ${isActive ? "text-[var(--studio-accent-text)]" : "text-[#aebbad] active:bg-white/10"}`}>
            <span className={`absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-[var(--studio-accent-bg)] transition-transform duration-200 ${isActive ? "scale-x-100" : "scale-x-0"}`} />
            <Icon aria-hidden="true" className="h-5 w-5" />
            {label}
        </Link>
    );
}
