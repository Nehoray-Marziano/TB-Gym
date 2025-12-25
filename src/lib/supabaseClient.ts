import { createBrowserClient } from '@supabase/ssr'

// Singleton pattern for the browser Supabase client
// This ensures we only create one instance per browser session
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
    if (typeof window === 'undefined') {
        // Server-side: always create a new instance (will be handled by server.ts)
        throw new Error('getSupabaseClient should only be called on the client side. Use createClient from @/utils/supabase/server for server components.');
    }

    if (!supabaseInstance) {
        supabaseInstance = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }

    return supabaseInstance;
}

// Re-export for backward compatibility during migration
export { getSupabaseClient as createClient };
