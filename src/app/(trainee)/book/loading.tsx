export default function Loading() {
    return (
        <div className="studio-book-page relative h-full w-full overflow-y-auto bg-[var(--studio-canvas)] text-[var(--studio-ink)] pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
            <div className="relative mx-auto flex min-h-full max-w-lg flex-col">
                {/* Header Skeleton */}
                <header className="sticky top-0 z-30 border-b border-[var(--studio-ink)]/8 bg-[var(--studio-canvas)]/92 px-4.5 pb-3.5 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="h-8.5 w-8.5 rounded-xl bg-black/10 animate-pulse" />
                            <div className="space-y-1">
                                <div className="h-3 w-16 rounded-full bg-black/10 animate-pulse" />
                                <div className="h-5 w-24 rounded-lg bg-black/10 animate-pulse" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-7 w-24 rounded-full bg-black/10 animate-pulse" />
                            <div className="h-8.5 w-8.5 rounded-full bg-black/10 animate-pulse" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                        <div className="h-3 w-40 rounded-full bg-black/10 animate-pulse" />
                        <div className="h-3 w-16 rounded-full bg-black/10 animate-pulse" />
                    </div>
                </header>

                <div className="px-4.5 pt-3 space-y-4">
                    {/* Day Strip Skeleton */}
                    <div className="flex items-center gap-2 overflow-x-hidden py-1">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div
                                key={i}
                                className="h-[4.2rem] min-w-[3.5rem] rounded-[1.2rem] bg-black/10 animate-pulse"
                            />
                        ))}
                    </div>

                    {/* Filter Pills Skeleton */}
                    <div className="h-10 w-full rounded-2xl bg-black/10 animate-pulse" />

                    {/* Cards Skeletons */}
                    <div className="space-y-3.5 pt-1">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-44 rounded-[1.75rem] border border-[var(--studio-ink)]/6 bg-[var(--studio-card)] p-4.5 animate-pulse"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="h-5 w-28 rounded-full bg-black/10" />
                                    <div className="h-5 w-20 rounded-full bg-black/10" />
                                </div>
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="h-6 w-3/4 rounded-lg bg-black/10" />
                                        <div className="h-4 w-1/2 rounded-lg bg-black/10" />
                                    </div>
                                    <div className="h-12 w-14 rounded-2xl bg-black/10" />
                                </div>
                                <div className="h-11 w-full rounded-2xl bg-black/10" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
