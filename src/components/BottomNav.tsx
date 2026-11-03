"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, UserRound } from "lucide-react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { LiquidGlass } from "@/components/ui/LiquidGlass";
import { useMemberNavigation } from "@/hooks/useMemberNavigation";
import { isNavigationItemActive, memberNavigationItems } from "@/lib/navigation";

const icons = { "/dashboard": House, "/book": CalendarDays, "/profile": UserRound };

export default function BottomNav() {
    const pathname = usePathname();
    return <MemberNavigation pathname={pathname} />;
}

export function MemberNavigation({ pathname }: { pathname: string }) {
    const reduceMotion = useReducedMotion();
    const navRef = useMemberNavigation(pathname);

    return (
        <nav
            ref={navRef}
            aria-label="ניווט ראשי"
            className="studio-member-navigation text-[var(--studio-ink)]"
        >
            <LiquidGlass radius={9999} blur={3} refraction={18} bezel={10} frost={0.86} saturation={1.35} specular={0.78} elevated={false} profile="convex" className="studio-navigation-glass w-full" contentClassName="grid grid-cols-3 gap-1 p-1.5">
                <LayoutGroup id="studio-bottom-navigation">
                {memberNavigationItems.map(item => {
                    const { href, label } = item;
                    const Icon = icons[href];
                    const active = isNavigationItemActive(pathname, item);
                    return (
                        <Link
                            key={href}
                            href={href}
                            prefetch
                            aria-current={active ? pathname === href ? "page" : "location" : undefined}
                            className={`relative isolate flex min-h-[3.75rem] cursor-pointer flex-col items-center justify-center gap-1 rounded-full px-1 py-2 text-[11px] font-bold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--studio-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--studio-card)] ${active ? "studio-navigation-selected" : "studio-navigation-idle hover:bg-[var(--studio-card)]/15 active:bg-[var(--studio-card)]/20"}`}
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
