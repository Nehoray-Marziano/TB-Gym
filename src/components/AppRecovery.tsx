import StudioLogo from "@/components/StudioLogo";
import Link from "next/link";

export default function AppRecovery({
    title,
    message,
    retry,
    busy = false
}: {
    title: string;
    message: string;
    retry?: () => void;
    busy?: boolean;
}) {
    const actionClass =
        "studio-tap-feedback flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--studio-brand)]";
    return (
        <main
            data-member-scroll
            className="h-full min-h-0 overflow-y-auto bg-[var(--studio-canvas)] text-[var(--studio-ink)]"
        >
            <div className="mx-auto flex min-h-[70dvh] max-w-lg flex-col justify-center gap-5 px-5 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
                <StudioLogo className="h-12 w-12 bg-[var(--studio-deep)]" />
                <h1 className="text-3xl font-bold">{title}</h1>
                <p className="text-sm leading-relaxed text-[var(--studio-muted)]">{message}</p>
                {retry && (
                    <button
                        type="button"
                        onClick={retry}
                        disabled={busy}
                        aria-busy={busy}
                        className={`${actionClass} bg-[var(--studio-deep)] text-[var(--studio-deep-contrast)] disabled:opacity-60`}
                    >
                        ניסיון נוסף
                    </button>
                )}
                <Link href="/" className={`${actionClass} border border-[var(--studio-ink)]/20`}>
                    חזרה לבית
                </Link>
            </div>
        </main>
    );
}
