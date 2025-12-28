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
            console.log("[AuthCallback] Session exchange successful", { code });
            const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development'

            // Construct the final URL properly using the request's origin
            // This ensures we stay on the same domain/protocol as the request
            const finalRedirect = `${origin}${next}`

            console.log("[AuthCallback] Redirecting to:", finalRedirect);
            // Ensure we don't end up with just a generic error
            return NextResponse.redirect(finalRedirect)
        } else {
            console.error("[AuthCallback] Code exchange error:", error.message, error);
            // Pass error info to the error page
            const errorUrl = new URL(`${origin}/auth/auth-code-error`);
            errorUrl.searchParams.set('error', error.message || 'Unknown error');
            return NextResponse.redirect(errorUrl.toString());
        }
    }

    // No code was provided
    console.error("[AuthCallback] No code provided in callback");
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_code`)
}
