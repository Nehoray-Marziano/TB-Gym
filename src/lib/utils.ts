import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getRelativeTimeHebrew(date: Date | string, timeZone?: string): string {
    const d = new Date(date);
    const now = new Date();
    // Reset hours to compare days
    const calendarDay = (value: Date) => {
        if (!timeZone) return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
        const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(value);
        const part = (type: string) => Number(parts.find(part => part.type === type)?.value);
        return Date.UTC(part("year"), part("month") - 1, part("day"));
    };
    const dDay = calendarDay(d);
    const nDay = calendarDay(now);

    const diffTime = dDay - nDay;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "היום";
    if (diffDays === 1) return "מחר";
    if (diffDays === 2) return "מחרתיים";
    if (diffDays < 0) return "הסתיים";
    return `בעוד ${diffDays} ימים`;
}
