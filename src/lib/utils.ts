import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getRelativeTimeHebrew(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    // Reset hours to compare days
    const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const nDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffTime = dDay.getTime() - nDay.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "היום";
    if (diffDays === 1) return "מחר";
    if (diffDays === 2) return "מחרתיים";
    if (diffDays < 0) return "הסתיים";
    return `בעוד ${diffDays} ימים`;
}
