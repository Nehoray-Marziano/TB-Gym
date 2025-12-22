export default function Loading() {
    return (
        <div className="min-h-[100dvh] bg-background p-6 space-y-8 pb-32 overflow-hidden">
            {/* Header Skeleton */}
            <div className="flex justify-between items-start mb-8 animate-pulse">
                <div>
                    <div className="h-4 w-24 bg-muted/20 rounded-full mb-2" />
                    <div className="h-10 w-48 bg-muted/20 rounded-2xl" />
                </div>
                <div className="w-12 h-12 bg-muted/20 rounded-full" />
            </div>

            {/* Stats Card Skeleton */}
            <div className="rounded-[2rem] p-6 h-48 bg-muted/10 animate-pulse relative overflow-hidden">
                <div className="h-full w-full flex flex-col justify-between">
                    <div className="h-4 w-20 bg-muted/20 rounded-full" />
                    <div className="h-16 w-32 bg-muted/20 rounded-3xl" />
                    <div className="flex justify-between items-end">
                        <div className="h-4 w-24 bg-muted/20 rounded-full" />
                        <div className="h-8 w-28 bg-muted/20 rounded-xl" />
                    </div>
                </div>
            </div>

            {/* Next Workout Skeleton */}
            <div className="space-y-4">
                <div className="h-6 w-32 bg-muted/20 rounded-full" />
                <div className="h-32 bg-muted/10 rounded-[2rem] w-full animate-pulse" />
            </div>

            {/* Quick Actions Skeleton */}
            <div className="grid grid-cols-2 gap-4">
                <div className="h-32 bg-muted/10 rounded-[2rem] animate-pulse" />
                <div className="h-32 bg-muted/10 rounded-[2rem] animate-pulse" />
            </div>
        </div>
    );
}
