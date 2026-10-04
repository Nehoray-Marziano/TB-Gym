"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CalendarDays, House, UsersRound, type LucideIcon } from "lucide-react";
import PageEntrance from "@/components/PageEntrance";
import { adminNavigationItems, isNavigationItemActive } from "@/lib/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import "./admin.css";

const icons = { "/admin": House, "/admin/schedule": CalendarDays, "/admin/trainees": UsersRound, "/dashboard": ArrowRight };

export default function AdminShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    useEffect(() => {
        const item = adminNavigationItems.find(item => isNavigationItemActive(pathname, item));
        document.title = `${item?.label ?? "ניהול"} | ניהול סטודיו טליה`;
    }, [pathname]);

    return (
        <div className="studio-admin min-h-dvh overflow-x-hidden">
            <main className="studio-admin-main">
                <PageEntrance>{children}</PageEntrance>
            </main>
            <nav aria-label="ניווט ניהול" className="studio-admin-nav">
                <div className="mx-auto grid h-[4.5rem] max-w-lg grid-cols-4 px-2">
                    {adminNavigationItems.map(item => (
                        <NavIcon key={item.href} href={item.href} icon={icons[item.href]} label={item.label} isActive={isNavigationItemActive(pathname, item)} />
                    ))}
                </div>
            </nav>
        </div>
    );
}

function NavIcon({ href, icon: Icon, label, isActive }: { href: string; icon: LucideIcon; label: string; isActive: boolean }) {
    const reducedMotion = useReducedMotion();
    return (
        <Link href={href} prefetch aria-current={isActive ? "page" : undefined} className="studio-admin-nav-link relative isolate flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold active:bg-white/10">
            {isActive && <motion.span aria-hidden="true" layoutId={reducedMotion ? undefined : "admin-nav-selection"} className="studio-admin-nav-selection" transition={{ type: "spring", stiffness: 460, damping: 38 }} />}
            <span className={`absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-[var(--studio-accent-bg)] transition-transform duration-200 ${isActive ? "scale-x-100" : "scale-x-0"}`} />
            <Icon aria-hidden="true" className="h-5 w-5" />
            {label}
        </Link>
    );
}
