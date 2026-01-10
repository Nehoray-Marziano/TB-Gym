
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
    console.log("[Proxy] Hit:", request.nextUrl.pathname);
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            },
            cookieOptions: {
                maxAge: 60 * 60 * 24 * 30, // 30 days
                path: '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
            }
        }
    );

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user) {
        console.log("[Proxy] User authenticated:", user.id);
    } else {
        // Only log if not a static asset (though matcher handles this, safe to be sure)
        console.log("[Proxy] No user found in proxy");
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match ONLY pages that actually need auth:
         * - /dashboard (user dashboard)
         * - /admin/* (admin pages)
         * - /profile (user profile)
         * 
         * Exclude static/public pages like:
         * - /subscription, /book, /auth/*, /onboarding, etc.
         */
        "/dashboard",
        "/admin/:path*",
        "/profile",
    ],
};
