export const memberNavigationItems = [
    { href: "/dashboard", label: "בית", aliases: ["/my-bookings"] },
    { href: "/book", label: "לוח אימונים", aliases: [] },
    { href: "/profile", label: "חשבון", aliases: [] },
] as const;

export const adminNavigationItems = [
    { href: "/admin", label: "סקירה" },
    { href: "/admin/schedule", label: "יומן" },
    { href: "/admin/trainees", label: "מתאמנות" },
    { href: "/dashboard", label: "האפליקציה" },
] as const;

type NavigationItem = { href: string; aliases?: readonly string[] };

export function isNavigationItemActive(pathname: string, item: NavigationItem) {
    return pathname === item.href ||
        (item.href !== "/admin" && pathname.startsWith(`${item.href}/`)) ||
        Boolean(item.aliases?.includes(pathname));
}

export function getPageEntranceDirection(previousPathname: string, pathname: string) {
    for (const items of [memberNavigationItems, adminNavigationItems]) {
        const previousIndex = items.findIndex(item => isNavigationItemActive(previousPathname, item));
        const nextIndex = items.findIndex(item => isNavigationItemActive(pathname, item));
        if (previousIndex < 0 || nextIndex < 0) continue;

        // The app is RTL: later tabs sit physically to the left.
        if (nextIndex > previousIndex) return "left";
        if (nextIndex < previousIndex) return "right";
        return "none";
    }
    return "none";
}
