import "server-only";
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { loadGymSnapshot } from "@/lib/gym-data";

// React cache is request-scoped: authenticated data is never shared across users.
export const getGymIdentity = cache(async () => {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    return { supabase, userId: data?.claims?.sub as string | undefined, email: typeof data?.claims?.email === "string" ? data.claims.email : "" };
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
