import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                    })
                    response = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) => {
                        // Force persistence for Supabase cookies
                        const newOptions = { ...options };
                        if (name.startsWith('sb-')) {
                            newOptions.maxAge = 60 * 60 * 24 * 30; // 30 days
                        }
                        response.cookies.set(name, value, newOptions)
                    })
                },
            },
        }
    )

    // IMPORTANT: Doing this in middleware ensures the user's session remains invalid
    // if the token is expired/invalid.
    await supabase.auth.getUser()

    return response
}
