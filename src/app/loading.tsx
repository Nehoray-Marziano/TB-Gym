export default function Loading() {
    return (
        <div className="min-h-[100dvh] bg-background p-6 space-y-8 pb-32 overflow-hidden relative">
            {/* Animated ambient background */}
            <div className="fixed top-0 right-0 w-[200px] h-[200px] bg-primary/5 rounded-full blur-[60px] pointer-events-none" />

            {/* Header Skeleton */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <div className="h-4 w-24 bg-muted/20 rounded-full mb-2 animate-pulse" />
                    <div className="h-10 w-48 bg-muted/20 rounded-2xl animate-pulse" />
                </div>
                <div className="w-12 h-12 bg-muted/20 rounded-full animate-pulse" />
            </div>

            {/* Stats Card Skeleton - Premium look */}
            <div className="rounded-[2rem] p-6 h-48 bg-gradient-to-br from-muted/10 to-muted/5 relative overflow-hidden animate-pulse">
                <div className="h-full w-full flex flex-col justify-between relative z-10">
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
                <div className="h-6 w-32 bg-muted/20 rounded-full animate-pulse" />
                <div className="h-28 bg-muted/10 rounded-[2rem] w-full animate-pulse flex items-center pr-2">
                    <div className="bg-muted/20 w-20 h-20 rounded-[1.5rem] shrink-0 ml-4" />
                    <div className="flex-1 py-4 space-y-2">
                        <div className="h-6 w-3/4 bg-muted/20 rounded-lg" />
                        <div className="h-4 w-1/2 bg-muted/20 rounded-lg" />
                    </div>
                </div>
            </div>

            {/* Bottom Nav Skeleton */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm">
                <div className="h-16 rounded-full bg-muted/10 animate-pulse" />
            </div>
        </div>
    );
}
