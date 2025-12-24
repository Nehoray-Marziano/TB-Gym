import { cn } from "@/lib/utils";

export default function StudioLogo({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 120 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn("w-12 h-12 text-foreground", className)}
        >
            <g stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                {/* Left Barbell Lines (The '11' / Dumbbell motif) */}
                <line x1="15" y1="25" x2="15" y2="45" />
                <line x1="22" y1="20" x2="22" y2="50" />

                {/* Horizontal connection to T */}
                <path d="M22 25 H 55" />

                {/* The 'T' Vertical */}
                <line x1="55" y1="25" x2="55" y2="85" />

                {/* The 'B' Top Loop */}
                <path d="M55 25 H 85 C 105 25, 105 55, 85 55 H 55" />

                {/* The 'B' Bottom Loop & Leaf Connection */}
                <path d="M55 55 H 80 C 100 55, 100 85, 80 85 H 50" />

                {/* Leaves (Organic shapes) - Bottom Right */}
                <path d="M95 75 Q 110 70, 115 85 Q 100 90, 95 75 Z" />
                <path d="M92 82 Q 105 85, 100 95 Q 90 92, 92 82 Z" />

                {/* Lead stems */}
                <path d="M85 80 Q 90 78, 95 75" />
                <path d="M85 80 Q 88 84, 92 82" />
            </g>
        </svg>
    );
}
