import { cn } from "@/lib/utils";

export default function StudioLogo({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 100 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn("w-12 h-12 text-foreground", className)}
        >
            {/* T */}
            <path
                d="M5 5 H45 V15 H30 V75 H20 V15 H5 V5 Z"
                fill="currentColor"
            />
            {/* B */}
            <path
                d="M55 5 H85 C95 5 95 20 85 25 C95 30 95 45 90 60 C80 80 55 75 55 75 V5 Z M65 15 V35 H80 C85 35 85 20 80 15 H65 Z M65 45 V65 H80 C85 65 85 50 80 45 H65 Z"
                fill="currentColor"
            />
        </svg>
    );
}
