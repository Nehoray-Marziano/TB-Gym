"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, UserRound } from "lucide-react";

const items = [
    { href: "/dashboard", label: "בית", icon: House },
    { href: "/book", label: "אימונים", icon: CalendarDays },
    { href: "/profile", label: "פרופיל", icon: UserRound },
] as const;

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav
            aria-label="ניווט ראשי"
            className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-4 right-4 z-50 mx-auto max-w-md rounded-[1.5rem] border border-border/80 bg-card/95 p-1.5 text-card-foreground shadow-[0_16px_50px_-20px_rgba(0,0,0,0.35)] backdrop-blur-xl"
        >
            <div className="grid grid-cols-3 gap-1">
                {items.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || (href === "/dashboard" && pathname === "/");
                    return (
                        <Link
                            key={href}
                            href={href}
                            prefetch
                            aria-current={active ? "page" : undefined}
                            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1.1rem] text-[11px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? "bg-primary/15 text-foreground" : "text-muted-foreground active:bg-muted/40"}`}
                        >
                            <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                            <span>{label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
