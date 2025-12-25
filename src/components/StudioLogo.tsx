import { cn } from "@/lib/utils";

export default function StudioLogo({ className }: { className?: string }) {
    return (
        <div
            className={cn("bg-foreground w-12 h-12", className)}
            style={{
                maskImage: 'url(/initials_logo.svg)',
                maskSize: 'contain',
                maskPosition: 'center',
                maskRepeat: 'no-repeat',
                WebkitMaskImage: 'url(/initials_logo.svg)',
                WebkitMaskSize: 'contain',
                WebkitMaskPosition: 'center',
                WebkitMaskRepeat: 'no-repeat',
            }}
        />
    );
}
