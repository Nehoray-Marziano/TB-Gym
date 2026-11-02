import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { loadGymSnapshot } from "@/lib/gym-data";
import { extractClaimsFromCookies } from "@/lib/auth-cookie";

const onboardedUserCache = new Set<string>();

// React cache is request-scoped: authenticated data is never shared across users.
export const getGymIdentity = cache(async () => {
    const supabase = await createClient();
    try {
        const cookieStore = await cookies();
        const fastClaims = extractClaimsFromCookies(cookieStore.getAll());
        if (fastClaims?.userId) {
            return { supabase, userId: fastClaims.userId, email: fastClaims.email };
        }
    } catch {
        // Fall back to standard getClaims
    }
    const { data } = await supabase.auth.getClaims();
    return { supabase, userId: data?.claims?.sub as string | undefined, email: typeof data?.claims?.email === "string" ? data.claims.email : "" };
});

/**
 * Lightweight check for onboarding completion without triggering the full
 * balance and subscription stored procedures. Uses in-memory and cookie
 * hints to bypass remote Supabase DB queries on subsequent navigations.
 */
export const getTraineeOnboardingStatus = cache(async (userId: string) => {
    if (onboardedUserCache.has(userId)) {
        return { role: "trainee", onboarding_completed: true };
    }
    try {
        const cookieStore = await cookies();
        if (cookieStore.get("tb-onboarded")?.value === "1") {
            onboardedUserCache.add(userId);
            return { role: "trainee", onboarding_completed: true };
        }
    } catch {
        // Fall back to DB query
    }
    const { supabase } = await getGymIdentity();
    const signal = AbortSignal.timeout(5000);
    try {
        const { data, error } = await supabase
            .from("profiles")
            .select("role, onboarding_completed")
            .eq("id", userId)
            .abortSignal(signal)
            .maybeSingle();
        if (error || !data) return null;
        if (data.onboarding_completed !== false) {
            onboardedUserCache.add(userId);
        }
        return data as { role?: string; onboarding_completed?: boolean };
    } catch {
        return null;
    }
});

export const getGymBootstrap = cache(async () => {
    const { supabase, userId, email } = await getGymIdentity();
    if (!userId) return null;
    try {
        return await loadGymSnapshot(supabase, userId, email);
    } catch {
        // The client retains an explicit loading/error state and can retry.
        return undefined;
    }
});
