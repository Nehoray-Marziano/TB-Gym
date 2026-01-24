"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, User } from "lucide-react";
import { motion } from "framer-motion";

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50">
            <div className="bg-card/95 backdrop-blur-xl border border-border rounded-full p-2 flex justify-between items-center shadow-2xl shadow-black/20 px-6">
                {/* Home */}
                {/* Home */}
                <Link
                    href="/"
                    className={`relative flex flex-col items-center gap-1 ${pathname === "/" ? "text-primary pointer-events-none" : "text-muted-foreground hover:text-primary transition-colors"}`}
                    aria-disabled={pathname === "/"}
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${pathname === "/" ? "bg-primary/10" : "hover:bg-primary/5"}`}>
                        <Home className={`w-5 h-5 ${pathname === "/" ? "fill-current/20" : ""}`} />
                    </div>
                    {pathname === "/" && (
                        <motion.div
                            layoutId="nav-indicator"
                            className="absolute -bottom-2 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(226,241,99,0.8)]"
                        />
                    )}
                </Link>

                {/* All Sessions (Center) */}
                <Link href="/book" prefetch={true}>
                    <div className={`w-14 h-14 bg-primary rounded-full flex items-center justify-center -mt-8 shadow-lg shadow-primary/40 border-[4px] border-background active:scale-95 transition-transform hover:shadow-primary/60 hover:shadow-xl ${pathname === "/book" ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>
                        <CalendarDays className="w-7 h-7 text-black" />
                    </div>
                </Link>

                {/* Profile */}
                {/* Profile */}
                <Link
                    href="/profile"
                    className={`relative flex flex-col items-center gap-1 ${pathname === "/profile" ? "text-primary pointer-events-none" : "text-muted-foreground hover:text-primary transition-colors"}`}
                >
                    <div className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${pathname === "/profile" ? "bg-primary/10" : "hover:bg-primary/5"}`}>
                        <User className={`w-5 h-5 ${pathname === "/profile" ? "fill-current/20" : ""}`} />
                    </div>
                    {pathname === "/profile" && (
                        <motion.div
                            layoutId="nav-indicator"
                            className="absolute -bottom-2 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(226,241,99,0.8)]"
                        />
                    )}
                </Link>
            </div>
        </div>
    );
}
