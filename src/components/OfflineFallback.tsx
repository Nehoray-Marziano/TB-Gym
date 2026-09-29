"use client";

import { ArrowLeft } from "lucide-react";
import StudioLogo from "@/components/StudioLogo";

export default function OfflineFallback() {
    return (
        <main className="min-h-dvh bg-[var(--studio-sheet)] text-[var(--studio-ink)]">
            <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-7">
                <header className="flex items-center justify-between border-b border-[#1b251c]/15 pb-5">
                    <div className="flex items-center gap-3">
                        <StudioLogo className="h-9 w-9 bg-[var(--studio-deep)]" />
                        <span className="border-s border-[#1b251c]/20 ps-3 text-xs font-bold leading-tight">סטודיו<br />טליה</span>
                    </div>
                    <span className="text-xs font-bold text-[var(--studio-muted)]">האזור שלך בסטודיו</span>
                </header>

                <div className="flex flex-1 flex-col justify-center py-12">
                    <p className="mb-5 flex items-center gap-2 text-xs font-bold text-[var(--studio-muted)]"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#829044]" />מחכות לחיבור</p>
                    <h1 className="text-[clamp(3.2rem,13vw,4.7rem)] font-bold leading-[1.02] tracking-tight">אין חיבור<br /><span className="text-[#829044]">כרגע.</span></h1>
                    <p className="mt-6 max-w-[18rem] text-sm leading-relaxed text-[var(--studio-muted)]">נראה שהחיבור לרשת נותק. בדקי את החיבור ונסי שוב.</p>

                    <div aria-hidden="true" className="relative mt-12 h-36 overflow-hidden rounded-[1.75rem] bg-[var(--studio-deep)]">
                        <div className="absolute -left-28 -top-44 h-64 w-64 rounded-full border-[30px] border-[#dce780]" />
                        <div className="absolute -bottom-32 right-0 h-44 w-44 rounded-full border-[24px] border-white/15" />
                        <span className="absolute bottom-5 right-6 z-10 text-xs font-bold text-[var(--studio-accent-text)]">האימונים שלך מחכים לך.</span>
                    </div>
                </div>

                <button type="button" onClick={() => window.location.reload()} className="flex min-h-14 w-full items-center justify-between rounded-full bg-[var(--studio-deep)] px-6 text-sm font-bold text-[var(--studio-deep-contrast)]">
                    לנסות שוב <ArrowLeft aria-hidden="true" className="h-5 w-5" />
                </button>
            </div>
        </main>
    );
}
