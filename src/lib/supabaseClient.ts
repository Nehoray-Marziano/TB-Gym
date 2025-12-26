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
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key) {
            console.error("[Supabase] Missing environment variables!", {
                hasUrl: !!url,
                hasKey: !!key
            });
        }

        try {
            supabaseInstance = createBrowserClient(
                url || '',
                key || '',
                {
                    cookieOptions: {
                        maxAge: 60 * 60 * 24 * 30, // 30 days - persist session across browser restarts
                        path: '/',
                        sameSite: 'lax',
                        secure: process.env.NODE_ENV === 'production',
                    },
                }
            );
        } catch (error) {
            console.error("[Supabase] Failed to initialize client:", error);
            // Return a dummy client or null if possible, but for now we let it fail gracefully or log
        }
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
