export default function StudioBotanical({ className = "", sun = true }: { className?: string; sun?: boolean }) {
    return (
        <svg aria-hidden="true" viewBox="0 0 360 240" fill="none" className={className}>
            <path d="M-12 224C62 195 114 147 170 131c61-18 105-63 132-125" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M79 180c-33 3-52-10-59-38 31-3 50 10 59 38ZM133 145c-11-30-2-52 25-66 12 30 3 52-25 66ZM209 109c-28 1-46-13-53-40 29-1 46 12 53 40ZM260 65c-9-25-1-45 21-58 10 25 3 44-21 58Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M22 142c21 7 37 20 57 38M158 79c-10 21-17 42-25 66M156 69c19 12 35 26 53 40M281 7c-9 22-16 41-21 58" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".55" />
            {sun && <circle cx="292" cy="129" r="38" fill="var(--studio-coral-bg)" stroke="none" />}
            <path d="M-12 236c91-32 151-75 220-102 64-25 105-64 150-121" stroke="currentColor" strokeWidth="1" opacity=".3" />
        </svg>
    );
}
