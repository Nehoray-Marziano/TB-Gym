
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
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
                    cookiesToSet.forEach(({ name, value }) =>
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

    // Verifies the access token and refreshes it when necessary. With an
    // asymmetric signing key this avoids a remote user lookup on each route.
    await supabase.auth.getClaims();

    return response;
}

export const config = {
    matcher: [
        /*
         * Server Components cannot persist refreshed cookies. Refresh before
         * every protected document/RSC request; layouts still verify identity
         * and role before rendering any account data.
         */
        "/admin/:path*",
        "/dashboard/:path*",
        "/book/:path*",
        "/my-bookings/:path*",
        "/profile/:path*",
        "/subscription/:path*",
        "/onboarding/:path*",
    ],
};
