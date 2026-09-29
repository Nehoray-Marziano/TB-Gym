
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
    const { error } = await supabase.auth.getClaims();
    if (error) console.log("[Proxy] Auth verification failed:", error.message);

    return response;
}

export const config = {
    matcher: [
        /*
         * Admin pages still use the proxy for token refresh. The shared
         * trainee layout verifies claims once for dashboard, book, profile,
         * and bookings, then stays mounted during tab navigation.
         */
        "/admin/:path*",
    ],
};
