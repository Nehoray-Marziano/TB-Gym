import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import StudioLogo from "@/components/StudioLogo";

export default function AuthCodeErrorPage() {
    return (
        <main className="min-h-dvh bg-[var(--studio-sheet)] text-[var(--studio-ink)]">
            <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-7">
                <header className="flex items-center justify-between border-b border-[#1b251c]/15 pb-5">
                    <div className="flex items-center gap-3">
                        <StudioLogo className="h-9 w-9 bg-[var(--studio-deep)]" />
                        <span className="border-s border-[#1b251c]/20 ps-3 text-xs font-bold leading-tight">סטודיו<br />טליה</span>
                    </div>
                    <span className="text-xs font-bold text-[var(--studio-muted)]">הכניסה לאזור שלך</span>
                </header>

                <div className="flex flex-1 flex-col justify-center py-12">
                    <p className="mb-5 flex items-center gap-2 text-xs font-bold text-[var(--studio-muted)]"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--studio-accent-text)]" />משהו עצר בדרך</p>
                    <h1 className="text-[clamp(3.2rem,13vw,4.7rem)] font-bold leading-[1.02] tracking-tight">הכניסה<br /><span className="text-[var(--studio-subtle)]">לא הושלמה.</span></h1>
                    <p className="mt-6 max-w-[18rem] text-sm leading-relaxed text-[var(--studio-muted)]">אפשר לנסות להיכנס שוב. אם זה קורה שוב, חכי רגע ונסי מחדש.</p>

                    <div aria-hidden="true" className="relative mt-12 h-36 overflow-hidden rounded-[1.75rem] bg-[var(--studio-deep)]">
                        <div className="absolute -bottom-28 -left-8 h-64 w-64 rounded-full border-[34px] border-[#dce780]" />
                        <div className="absolute right-7 top-7 flex gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--studio-accent-bg)]" /><span className="h-1.5 w-1.5 rounded-full bg-white/30" /><span className="h-1.5 w-1.5 rounded-full bg-white/30" /></div>
                        <span className="absolute bottom-5 right-6 text-xs font-bold text-[var(--studio-accent-text)]">עוד רגע חוזרות למסלול.</span>
                    </div>
                </div>

                <Link href="/" className="flex min-h-14 items-center justify-between rounded-full bg-[var(--studio-deep)] px-6 text-sm font-bold text-[var(--studio-deep-contrast)]">
                    חזרה לכניסה <ArrowLeft aria-hidden="true" className="h-5 w-5" />
                </Link>
            </div>
        </main>
    );
}
