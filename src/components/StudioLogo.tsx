import { cn } from "@/lib/utils";

export default function StudioLogo({ className, tight = false }: { className?: string; tight?: boolean }) {
    const maskUrl = tight ? '/tb_logo.svg' : '/initials_logo.svg';
    return (
        <div
            className={cn("bg-foreground", !className?.includes("w-") && !className?.includes("h-") && !className?.includes("emblem") && "w-12 h-12", className)}
            style={{
                maskImage: `url(${maskUrl})`,
                maskSize: 'contain',
                maskPosition: 'center',
                maskRepeat: 'no-repeat',
                WebkitMaskImage: `url(${maskUrl})`,
                WebkitMaskSize: 'contain',
                WebkitMaskPosition: 'center',
                WebkitMaskRepeat: 'no-repeat',
            }}
        />
    );
}
