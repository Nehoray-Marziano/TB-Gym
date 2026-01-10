export default function SubscriptionLoading() {
    return (
        <div className="min-h-screen w-full bg-background py-20 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-start overflow-hidden relative" dir="rtl">
            {/* Header Skeleton */}
            <div className="text-center max-w-3xl mx-auto mb-16 animate-pulse">
                <div className="h-4 w-24 bg-muted/30 rounded-full mx-auto mb-4" />
                <div className="h-10 w-72 bg-muted/30 rounded-2xl mx-auto mb-4" />
                <div className="h-5 w-96 max-w-full bg-muted/20 rounded-full mx-auto" />
            </div>

            {/* Tier Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-7xl mx-auto items-stretch">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={`relative flex flex-col p-8 rounded-[2rem] border border-border/30 bg-background/20 animate-pulse ${i === 2 ? 'md:scale-105 shadow-xl' : ''
                            }`}
                    >
                        {/* Icon + Name */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-muted/30 rounded-xl" />
                            <div className="h-7 w-24 bg-muted/30 rounded-lg" />
                        </div>

                        {/* Price */}
                        <div className="h-12 w-32 bg-muted/30 rounded-xl mb-4" />

                        {/* Description */}
                        <div className="h-4 w-full bg-muted/20 rounded-full mb-2" />
                        <div className="h-4 w-3/4 bg-muted/20 rounded-full mb-8" />

                        {/* Features */}
                        <div className="space-y-3 flex-1 mb-8">
                            {[1, 2, 3, 4].map((j) => (
                                <div key={j} className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-muted/20 rounded-full" />
                                    <div className="h-4 flex-1 bg-muted/20 rounded-full" />
                                </div>
                            ))}
                        </div>

                        {/* CTA Button */}
                        <div className="h-14 w-full bg-muted/30 rounded-2xl" />
                    </div>
                ))}
            </div>
        </div>
    );
}
