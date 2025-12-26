"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function LoginPage() {
    const [showOptions, setShowOptions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const supabase = getSupabaseClient();

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        const redirectUrl = `${window.location.origin}/auth/callback`;
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: redirectUrl },
        });
        if (error) {
            console.error(error);
            setIsLoading(false);
        }
    };

    const handleDevLogin = async () => {
        setIsLoading(true);
        const email = `dev_${Date.now()}@test.com`;
        const password = "password123";
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: "Dev",
                    last_name: "Tester",
                }
            }
        });
        if (error) {
            console.error("Dev Signup Error", error);
            await supabase.auth.signInWithPassword({ email, password });
        }
        window.location.href = "/book";
    };

    return (
        <div className="min-h-[100dvh] bg-[#131512] flex items-center justify-center p-4">
            <div className="w-full max-w-sm space-y-6">
                {/* Logo / Title */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-[#E2F163] mb-2">טליה</h1>
                    <p className="text-neutral-400">התחברי כדי להמשיך</p>
                </div>

                {!showOptions ? (
                    /* Main Sign In Button */
                    <button
                        id="main-signin-button"
                        onClick={() => setShowOptions(true)}
                        className="w-full bg-[#E2F163] text-black font-bold py-4 px-6 rounded-xl transition-all hover:bg-[#d4e355] text-lg"
                    >
                        התחברות
                    </button>
                ) : (
                    /* Sign In Options */
                    <div className="space-y-3">
                        {/* Back button */}
                        <button
                            onClick={() => setShowOptions(false)}
                            className="text-neutral-500 hover:text-white text-sm mb-2"
                        >
                            ← חזרה
                        </button>

                        {/* Google Sign In */}
                        <button
                            id="google-signin-button"
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 px-6 rounded-xl transition-all hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Google
                                </>
                            )}
                        </button>

                        {/* Apple Sign In */}
                        <button
                            id="apple-signin-button"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 px-6 rounded-xl transition-all hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                            </svg>
                            Apple
                        </button>

                        {/* Dev Login - for testing */}
                        <div className="pt-4 border-t border-neutral-800">
                            <button
                                id="dev-login-button"
                                onClick={handleDevLogin}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 bg-red-500/20 text-red-400 font-medium py-3 px-4 rounded-lg border border-red-500/50 transition-all hover:bg-red-500/30 disabled:opacity-50"
                            >
                                Dev Login (Testing)
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
