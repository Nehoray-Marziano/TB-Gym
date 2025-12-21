"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Users, Settings, ArrowRight, LogOut } from "lucide-react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-foreground font-sans relative overflow-x-hidden selection:bg-[#E2F163] selection:text-black">
            {/* Background Ambient Light */}
            <div className="fixed top-0 left-0 w-[400px] h-[400px] bg-red-500/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="fixed bottom-0 right-0 w-[300px] h-[300px] bg-[#E2F163]/5 blur-[100px] rounded-full pointer-events-none" />

            {/* Main Content */}
            <main className="p-6 pb-32 max-w-5xl mx-auto relative z-10">
                {children}
            </main>

            {/* Floating Admin Navigation */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50">
                <div className="bg-[#131512]/90 backdrop-blur-xl border border-white/10 rounded-full p-2 flex justify-between items-center shadow-2xl shadow-black/50">

                    <NavIcon href="/admin/schedule" icon={Calendar} isActive={pathname.startsWith("/admin/schedule")} />

                    <div className="w-px h-8 bg-white/10" /> {/* Divider */}

                    <NavIcon href="/admin/trainees" icon={Users} isActive={pathname.startsWith("/admin/trainees")} />

                    <div className="w-px h-8 bg-white/10" /> {/* Divider */}

                    <NavIcon href="/" icon={ArrowRight} isActive={false} /> {/* Back to App */}

                </div>
            </div>
        </div>
    );
}

function NavIcon({ href, icon: Icon, isActive }: { href: string; icon: any; isActive?: boolean }) {
    return (
        <Link href={href} className={`w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300 ${isActive ? "bg-[#E2F163] text-black shadow-[0_0_20px_rgba(226,241,99,0.3)] scale-110" : "text-neutral-500 hover:text-white hover:bg-white/5"}`}>
            <Icon className="w-6 h-6" />
        </Link>
    );
}
