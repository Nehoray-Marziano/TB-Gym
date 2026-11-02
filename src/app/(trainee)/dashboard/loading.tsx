import StudioLogo from "@/components/StudioLogo";

export default function DashboardLoading() {
    return (
        <div data-member-scroll className="studio-home relative h-full w-full bg-[#eceee0] bg-[radial-gradient(ellipse_120%_70%_at_50%_-10%,#faf9f2_0%,#e8ebdc_55%,#dfe2ce_100%)] text-[var(--studio-ink)] selection:bg-[var(--studio-brand)]/20">
            {/* Ambient atmospheric lighting */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-24 inset-x-0 h-96 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(139,142,111,0.22)_0%,transparent_70%)]"
            />

            <main className="studio-home-main relative mx-auto">
                {/* Header + Greeting */}
                <div className="studio-home-heading flex flex-col">
                    <header className="flex shrink-0 items-center justify-center pt-0.5">
                        <div className="inline-flex items-center justify-center select-none" aria-label="סטודיו טליה">
                            <StudioLogo
                                tight
                                className="studio-home-emblem shrink-0 bg-[var(--studio-ink)] opacity-75"
                            />
                        </div>
                    </header>

                    <div className="studio-home-greeting flex items-center justify-between gap-2.5">
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-3.5 w-28 rounded-full bg-black/10 animate-pulse" />
                            <div className="h-10 w-40 rounded-xl bg-black/10 animate-pulse" />
                        </div>

                        <div
                            aria-hidden="true"
                            className="studio-home-botanical relative flex shrink-0 items-center justify-center select-none pointer-events-none"
                        >
                            <div className="h-14 w-14 rounded-full bg-black/10 animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Hero Workout Card Skeleton */}
                <div className="studio-home-workout flex flex-col justify-between rounded-[2rem] border border-[#142217]/10 bg-[#142217]/90 p-5 shadow-lg animate-pulse min-h-[12.5rem]">
                    <div className="h-4 w-28 rounded-full bg-white/20" />
                    <div className="space-y-2.5 my-3">
                        <div className="h-7 w-48 rounded-lg bg-white/20" />
                        <div className="h-4 w-32 rounded-lg bg-white/20" />
                    </div>
                    <div className="h-11 w-full rounded-full bg-white/20" />
                </div>

                {/* Balance & Schedule Quick Links Skeleton */}
                <div className="studio-home-footer grid grid-cols-2 gap-3 pt-2">
                    <div className="h-20 rounded-2xl bg-black/10 animate-pulse" />
                    <div className="h-20 rounded-2xl bg-black/10 animate-pulse" />
                </div>
            </main>
        </div>
    );
}
