import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, useMemo } from 'react'

// Singleton pattern for the browser Supabase client
// This ensures we only create one instance per browser session
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Get the Supabase client singleton for client-side usage.
 * IMPORTANT: This should only be called in useEffect, event handlers, or other
 * code that only runs on the client. Do NOT call at component level.
 */
export function getSupabaseClient() {
    if (typeof window === 'undefined') {
        // During SSR, return a placeholder that will be replaced on client
        // This allows "use client" components to pre-render without crashing
        console.warn('[Supabase] getSupabaseClient called during SSR - returning placeholder');
        return null as any; // Will be properly initialized on client hydration
    }

    if (!supabaseInstance) {
        supabaseInstance = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }

    return supabaseInstance;
}

/**
 * React hook for safely using Supabase in client components.
 * Returns null during SSR, then the real client after hydration.
 */
export function useSupabase() {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const client = useMemo(() => {
        if (!isClient) return null;
        return getSupabaseClient();
    }, [isClient]);

    return client;
}

// Re-export for backward compatibility during migration
export { getSupabaseClient as createClient };
