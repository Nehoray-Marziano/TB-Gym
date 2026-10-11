// OAuth return destinations must stay on this app's origin, including after
// the browser normalizes backslashes and encoded path characters.
export function getAuthRedirect(next: string | null, origin: string): string {
    const fallback = new URL("/dashboard", origin).toString();
    if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
    try {
        const decoded = decodeURIComponent(next);
        if (/[\\\x00-\x1f\x7f]/.test(decoded) || decoded.startsWith("//")) return fallback;
        const destination = new URL(next, origin);
        return destination.origin === new URL(origin).origin ? destination.toString() : fallback;
    } catch {
        return fallback;
    }
}
