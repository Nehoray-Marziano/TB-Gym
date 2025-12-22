export default function Loading() {
    return (
        <div className="min-h-[100dvh] bg-background p-6 pb-24 space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between mb-8 sticky top-0 py-4 bg-background/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-muted/20 rounded-full animate-pulse" />
                    <div className="h-8 w-40 bg-muted/20 rounded-xl animate-pulse" />
                </div>
            </div>

            {/* Sessions Skeletons */}
            <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-5 rounded-[2rem] border border-border bg-card/40 h-40 animate-pulse flex gap-5">
                        <div className="w-16 h-16 bg-muted/20 rounded-2xl shrink-0" />
                        <div className="flex-1 space-y-3">
                            <div className="h-6 w-3/4 bg-muted/20 rounded-lg" />
                            <div className="h-4 w-1/2 bg-muted/20 rounded-lg" />
                            <div className="h-10 w-full bg-muted/20 rounded-xl mt-4" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
