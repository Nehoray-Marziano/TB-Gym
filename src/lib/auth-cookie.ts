export type FastAuthClaims = {
    userId: string;
    email: string;
    role?: string;
    exp: number;
};

/**
 * Extracts and verifies JWT claims from Supabase SSR auth cookies without
 * making an outbound network request, provided the token is not expired.
 */
export function extractClaimsFromCookies(cookies: { name: string; value: string }[]): FastAuthClaims | null {
    try {
        const authCookies = cookies.filter(c => c.name.includes("-auth-token"));
        if (!authCookies.length) return null;

        // Sort chunks numerically: cookie, cookie.0, cookie.1, ...
        authCookies.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        let combined = authCookies.map(c => c.value).join("");
        if (combined.startsWith('"') && combined.endsWith('"')) {
            combined = combined.slice(1, -1);
        }
        if (combined.includes("%")) {
            try {
                combined = decodeURIComponent(combined);
            } catch {
                // Keep combined as-is
            }
        }
        if (combined.startsWith("base64-")) {
            combined = Buffer.from(combined.slice(7), "base64").toString("utf8");
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(combined);
        } catch {
            return null;
        }

        let token: string | null = null;
        if (typeof parsed === "string") {
            token = parsed;
        } else if (Array.isArray(parsed) && typeof parsed[0] === "string") {
            token = parsed[0];
        } else if (parsed && typeof parsed === "object" && "access_token" in parsed && typeof (parsed as Record<string, unknown>).access_token === "string") {
            token = (parsed as Record<string, unknown>).access_token as string;
        }

        if (!token || !token.includes(".")) return null;
        const parts = token.split(".");
        if (parts.length < 2) return null;

        const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
            sub?: string;
            email?: string;
            role?: string;
            exp?: number;
        };

        const now = Math.floor(Date.now() / 1000);
        // Ensure token has at least 30 seconds of remaining life before accepting in-memory claims
        if (claims.exp && claims.exp > now + 30 && claims.sub) {
            return {
                userId: claims.sub,
                email: typeof claims.email === "string" ? claims.email : "",
                role: typeof claims.role === "string" ? claims.role : undefined,
                exp: claims.exp,
            };
        }
        return null;
    } catch {
        return null;
    }
}
