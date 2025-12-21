export default function Loading() {
    return (
        <div className="min-h-screen bg-background p-6 pb-20 space-y-8 overflow-hidden">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center mb-8 sticky top-0 py-4 bg-background/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-muted/20 rounded-full animate-pulse" />
                    <div className="h-8 w-32 bg-muted/20 rounded-xl animate-pulse" />
                </div>
                <div className="w-24 h-10 bg-muted/20 rounded-full animate-pulse" />
            </div>

            {/* Profile Avatar Skeleton */}
            <div className="flex flex-col items-center mb-10">
                <div className="w-32 h-32 bg-muted/20 blur-[50px] rounded-full absolute top-20" />
                <div className="w-28 h-28 bg-muted/20 rounded-[2rem] border-2 border-muted/10 animate-pulse relative z-10 mb-4" />
                <div className="h-8 w-40 bg-muted/20 rounded-xl animate-pulse mb-2" />
                <div className="h-6 w-24 bg-muted/20 rounded-full animate-pulse" />
            </div>

            {/* Details Skeleton */}
            <div className="space-y-4">
                <div className="bg-card/50 border border-border rounded-3xl p-1 h-32 animate-pulse" />
                <div className="bg-card/50 border border-border rounded-3xl p-1 h-24 animate-pulse" />
            </div>

            {/* Actions Skeleton */}
            <div className="space-y-3">
                <div className="w-full h-20 bg-muted/10 rounded-3xl animate-pulse" />
                <div className="w-full h-20 bg-muted/10 rounded-3xl animate-pulse" />
            </div>
        </div>
    );
}
