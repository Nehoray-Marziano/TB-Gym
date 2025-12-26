import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, useMemo } from 'react'

// Singleton pattern managed by @supabase/ssr with isSingleton option
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Get the Supabase client singleton for client-side usage.
 * Uses @supabase/ssr's built-in cookie handling for session persistence.
 */
export function getSupabaseClient() {
    if (typeof window === 'undefined') {
        // During SSR, return a placeholder that will be replaced on client
        console.warn('[Supabase] getSupabaseClient called during SSR - returning placeholder');
        return null as any;
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
                    // Let @supabase/ssr manage as singleton
                    isSingleton: true,
                    // Cookie options for persistence
                    cookieOptions: {
                        maxAge: 60 * 60 * 24 * 30, // 30 days
                        path: '/',
                        sameSite: 'lax',
                        secure: process.env.NODE_ENV === 'production',
                    },
                    // Explicitly configure auth for persistence
                    auth: {
                        persistSession: true,
                        detectSessionInUrl: true,
                        autoRefreshToken: true,
                        // Use default storage (cookies handled by @supabase/ssr)
                    },
                }
            );
            console.log('[Supabase] Browser client initialized with persistent session');
        } catch (error) {
            console.error("[Supabase] Failed to initialize client:", error);
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

