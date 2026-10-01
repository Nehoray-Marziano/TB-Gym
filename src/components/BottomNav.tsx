"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, UserRound } from "lucide-react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { LiquidGlass } from "@/components/ui/LiquidGlass";

const items = [
    { href: "/dashboard", label: "בית", icon: House },
    { href: "/book", label: "לוח אימונים", icon: CalendarDays },
    { href: "/profile", label: "חשבון", icon: UserRound },
] as const;

export default function BottomNav() {
    const pathname = usePathname();
    return <MemberNavigation pathname={pathname} />;
}

export function MemberNavigation({ pathname }: { pathname: string }) {
    const reduceMotion = useReducedMotion();

    return (
        <nav
            aria-label="ניווט ראשי"
            className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-1/2 z-50 w-[calc(100%-2rem)] max-w-[23rem] -translate-x-1/2 text-[var(--studio-ink)]"
        >
            <LiquidGlass radius={9999} blur={18} refraction={0} frost={0.8} saturation={1.15} specular={0.2} elevated={false} profile="convex" className="studio-navigation-glass w-full" contentClassName="grid grid-cols-3 gap-1 p-1.5">
                <LayoutGroup id="studio-bottom-navigation">
                {items.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || (href === "/dashboard" && pathname === "/my-bookings");
                    return (
                        <Link
                            key={href}
                            href={href}
                            prefetch
                            aria-current={active ? pathname === href ? "page" : "location" : undefined}
                            className={`relative isolate flex min-h-[3.75rem] cursor-pointer flex-col items-center justify-center gap-1 rounded-full px-1 py-2 text-[11px] font-bold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--studio-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--studio-card)] ${active ? "studio-navigation-selected" : "text-[#182816] hover:bg-[#182816]/10 active:bg-[#182816]/15"}`}
                        >
                            {active && <motion.span aria-hidden="true" layoutId="selected-tab" className="studio-navigation-highlight absolute inset-0 -z-10 rounded-full" transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }} />}
                            <Icon aria-hidden="true" className="h-[1.35rem] w-[1.35rem]" strokeWidth={active ? 2.5 : 2.2} />
                            <span className="leading-4 font-bold">{label}</span>
                        </Link>
                    );
                })}
                </LayoutGroup>
            </LiquidGlass>
        </nav>
    );
}
