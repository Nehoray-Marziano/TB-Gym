"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, User } from "lucide-react";

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50">
            <div className="bg-card/95 backdrop-blur-xl border border-border rounded-full p-2 flex justify-between items-center shadow-2xl shadow-black/20 px-6">
                {/* Home */}
                <Link href="/" className={`flex flex-col items-center gap-1 ${pathname === "/" ? "text-primary" : "text-muted-foreground hover:text-primary transition-colors"}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${pathname === "/" ? "bg-primary/10" : ""}`}>
                        <Home className="w-5 h-5" />
                    </div>
                </Link>

                {/* All Sessions (Center) */}
                <Link href="/book" prefetch={true}>
                    <div className={`w-14 h-14 bg-primary rounded-full flex items-center justify-center -mt-8 shadow-lg shadow-primary/40 border-[4px] border-background active:scale-95 transition-transform hover:shadow-primary/60 hover:shadow-xl ${pathname === "/book" ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>
                        <CalendarDays className="w-7 h-7 text-black" />
                    </div>
                </Link>

                {/* Profile */}
                <Link href="/profile" className={`flex flex-col items-center gap-1 ${pathname === "/profile" ? "text-primary" : "text-muted-foreground hover:text-primary transition-colors"}`}>
                    <div className={`w-10 h-10 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors ${pathname === "/profile" ? "bg-primary/10" : ""}`}>
                        <User className="w-5 h-5" />
                    </div>
                </Link>
            </div>
        </div>
    );
}
