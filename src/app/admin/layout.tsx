"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const navItems = [
        { name: "לוח זמנים", href: "/admin/schedule", icon: "📅" },
        { name: "ניהול מתאמנות", href: "/admin/trainees", icon: "👥" },
        { name: "הגדרות", href: "/admin/settings", icon: "⚙️" },
    ];

    return (
        <div className="flex min-h-screen bg-background text-foreground dir-rtl">
            {/* Sidebar (Desktop) */}
            <aside className="w-64 bg-neutral-900 border-l border-neutral-800 p-6 hidden md:flex flex-col fixed inset-y-0 right-0 z-50">
                <div className="mb-10 flex items-center gap-2">
                    <span className="text-2xl">🔒</span>
                    <h1 className="text-xl font-bold bg-gradient-to-br from-primary to-white bg-clip-text text-transparent">
                        ניהול טליה
                    </h1>
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                  ${isActive
                                        ? "bg-primary/20 text-primary font-bold shadow-[0_0_15px_rgba(156,169,134,0.1)]"
                                        : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                                    }`}
                            >
                                <span>{item.icon}</span>
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto">
                    <Link href="/" className="flex items-center gap-2 text-sm text-neutral-500 hover:text-white">
                        <span>⬅️</span>
                        חזרה לאתר
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto pb-24 md:pb-8 md:pr-72">
                <div className="md:hidden mb-6 flex justify-between items-center">
                    <h1 className="text-xl font-bold">ניהול טליה</h1>
                </div>
                {children}
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-neutral-800 p-4 pb-6 flex justify-around z-50">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors
                    ${isActive ? "text-primary" : "text-neutral-500"}`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span>{item.name}</span>
                        </Link>
                    )
                })}
                <Link
                    href="/"
                    className="flex flex-col items-center gap-1 text-xs font-medium text-neutral-500"
                >
                    <span className="text-xl">⬅️</span>
                    <span>יציאה</span>
                </Link>
            </nav>
        </div>
    );
}
