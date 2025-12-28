import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    // Get the actual origin from the host header
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const origin = `${protocol}://${host}`

    if (code) {
        const cookieStore = await cookies()

        // Create the redirect response FIRST
        const redirectUrl = `${origin}${next}`
        const redirectResponse = NextResponse.redirect(redirectUrl)

        // Create Supabase client that sets cookies on the REDIRECT response
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        // Set cookies on the REDIRECT response, not the implicit response
                        cookiesToSet.forEach(({ name, value, options }) => {
                            redirectResponse.cookies.set(name, value, {
                                ...options,
                                maxAge: 60 * 60 * 24 * 30, // 30 days
                                path: '/',
                                sameSite: 'lax',
                                secure: process.env.NODE_ENV === 'production',
                            })
                        })
                    },
                },
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                },
                cookieOptions: {
                    maxAge: 60 * 60 * 24 * 30,
                    path: '/',
                    sameSite: 'lax',
                    secure: process.env.NODE_ENV === 'production',
                }
            }
        )

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            console.log("[AuthCallback] Session exchange successful, redirecting to:", redirectUrl)
            // Return the redirect response that NOW has the cookies attached
            return redirectResponse
        } else {
            console.error("[AuthCallback] Code exchange error:", error.message)
            const errorUrl = new URL(`${origin}/auth/auth-code-error`)
            errorUrl.searchParams.set('error', error.message || 'Unknown error')
            return NextResponse.redirect(errorUrl.toString())
        }
    }

    console.error("[AuthCallback] No code provided in callback")
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_code`)
}
