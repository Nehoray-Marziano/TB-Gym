import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
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
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // 1. Get User
    const { data: { user } } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname

    // Public paths that don't need protection
    if (path.startsWith('/auth') || path === '/auth/login' || path === '/') {
        return supabaseResponse
    }

    // 2. Protect Routes
    if (!user) {
        // Redirect unauthenticated users to login
        const url = request.nextUrl.clone()
        url.pathname = '/auth/login'
        return NextResponse.redirect(url)
    }

    // 3. Check Onboarding Status
    // We fetch the profile to see if they completed onboarding
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()

    if (profileError) {
        console.error("Middleware: Error fetching profile:", profileError)
    } else {
        console.log("Middleware: Profile found:", profile)
    }

    const isOnboarding = path === '/onboarding'
    const isCompleted = profile?.onboarding_completed

    console.log(`Middleware Path: ${path}, isOnboarding: ${isOnboarding}, isCompleted: ${isCompleted}`)

    // Scenario A: User HAS NOT completed onboarding, but tries to go elsewhere
    if (!isCompleted && !isOnboarding) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
    }

    // Scenario B: User HAS completed onboarding, but tries to go back to /onboarding
    if (isCompleted && isOnboarding) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    // 4. Admin Route Protection
    if (path.startsWith('/admin')) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'administrator') {
            const url = request.nextUrl.clone()
            url.pathname = '/'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
