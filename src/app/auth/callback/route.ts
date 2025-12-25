import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL, otherwise go to dashboard
    const next = searchParams.get('next') ?? '/dashboard'

    // Get the actual origin from the host header (preserves IP address on mobile)
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const origin = `${protocol}://${host}`

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development'

            // Construct the final URL properly
            let finalRedirect = ''

            if (isLocalEnv || host.includes('localhost')) {
                finalRedirect = `${origin}${next}`
            } else if (forwardedHost) {
                finalRedirect = `https://${forwardedHost}${next}`
            } else {
                finalRedirect = `${origin}${next}`
            }

            // Ensure we don't end up with just a generic error
            return NextResponse.redirect(finalRedirect)
        } else {
            console.error("[AuthCallback] Code exchange error:", error)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
