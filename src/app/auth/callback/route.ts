import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthRedirect } from "@/lib/authRedirect";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const next = requestUrl.searchParams.get("next");

    // Use the request URL origin directly - most reliable
    const origin = requestUrl.origin;

    if (code) {
        const cookieStore = await cookies();

        // Create the redirect response FIRST - use pathname only for next
        const redirectUrl = getAuthRedirect(next, origin);
        const redirectResponse = NextResponse.redirect(redirectUrl);

        // Create Supabase client that sets cookies on the REDIRECT response
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        // Set cookies on the REDIRECT response, not the implicit response
                        cookiesToSet.forEach(({ name, value, options }) => {
                            redirectResponse.cookies.set(name, value, {
                                ...options,
                                maxAge: 60 * 60 * 24 * 30, // 30 days
                                path: "/",
                                sameSite: "lax",
                                secure: process.env.NODE_ENV === "production"
                            });
                        });
                    }
                },
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                },
                cookieOptions: {
                    maxAge: 60 * 60 * 24 * 30,
                    path: "/",
                    sameSite: "lax",
                    secure: process.env.NODE_ENV === "production"
                }
            }
        );

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Flag that the user just logged in so the client can prompt PWA installation
            redirectResponse.cookies.set("talia_just_logged_in", "1", {
                path: "/",
                maxAge: 120, // 2 minutes
                sameSite: "lax"
            });
            // Return the redirect response that NOW has the cookies attached
            return redirectResponse;
        } else {
            console.error("[AuthCallback] Code exchange error:", error.message);
            return NextResponse.redirect(new URL("/auth/auth-code-error", origin));
        }
    }

    console.error("[AuthCallback] No code provided in callback");
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_code`);
}
