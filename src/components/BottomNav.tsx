"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, UserRound } from "lucide-react";

const items = [
    { href: "/dashboard", label: "היום", icon: House },
    { href: "/book", label: "אימונים", icon: CalendarDays },
    { href: "/profile", label: "חשבון", icon: UserRound },
] as const;

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav
            aria-label="ניווט ראשי"
            className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--studio-ink)]/10 bg-[var(--studio-card)]/95 pb-[env(safe-area-inset-bottom)] text-[var(--studio-ink)] shadow-[0_-10px_32px_rgba(12,25,13,0.06)] backdrop-blur-xl"
        >
            <div className="mx-auto grid h-[4.5rem] max-w-lg grid-cols-3 px-3">
                {items.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || (href === "/dashboard" && pathname === "/my-bookings");
                    return (
                        <Link
                            key={href}
                            href={href}
                            prefetch
                            aria-current={active ? "page" : undefined}
                            className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--studio-accent-text)] ${active ? "studio-nav-current text-[var(--studio-ink)]" : "text-[var(--studio-muted)] active:bg-[var(--studio-canvas)]"}`}
                        >
                            <span className={`absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-[var(--studio-accent-text)] transition-transform duration-200 ${active ? "scale-x-100" : "scale-x-0"}`} />
                            <Icon aria-hidden="true" className="h-[1.3rem] w-[1.3rem]" strokeWidth={active ? 2.3 : 1.8} />
                            <span>{label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
