"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
    const searchParams = useSearchParams();
    const errorMessage = searchParams.get('error');

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">שגיאה בהתחברות</h1>
            <p className="text-muted-foreground mb-4 max-w-sm">
                אירעה שגיאה בתהליך ההתחברות. נסי שוב או פני לתמיכה.
            </p>
            {errorMessage && (
                <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg mb-8 max-w-sm break-all">
                    Error: {errorMessage}
                </p>
            )}
            <Link
                href="/"
                className="bg-primary text-black px-6 py-3 rounded-full font-bold hover:opacity-90 transition-opacity"
            >
                חזרה לדף הבית
            </Link>
        </div>
    );
}

export default function AuthCodeErrorPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
            <ErrorContent />
        </Suspense>
    );
}
