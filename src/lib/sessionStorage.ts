// Session caches are optional. Private browsing, quota limits and disabled
// storage must never turn a successful booking or sign-in into an error.
export const sessionCache = {
    getItem(key: string): string | null {
        try {
            return sessionStorage.getItem(key);
        } catch {
            return null;
        }
    },
    setItem(key: string, value: string): void {
        try {
            sessionStorage.setItem(key, value);
        } catch {
            /* Optional cache. */
        }
    },
    removeItem(key: string): void {
        try {
            sessionStorage.removeItem(key);
        } catch {
            /* Optional cache. */
        }
    }
};
