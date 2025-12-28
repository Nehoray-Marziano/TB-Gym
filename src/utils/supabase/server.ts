import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            // Force persistence for Supabase cookies (fix for "logout on close")
                            const newOptions = { ...options };
                            if (name.startsWith('sb-')) {
                                newOptions.maxAge = 60 * 60 * 24 * 30; // 30 days
                                newOptions.sameSite = 'lax';
                                newOptions.secure = process.env.NODE_ENV === 'production';
                            }
                            cookieStore.set(name, value, newOptions)
                        })
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
