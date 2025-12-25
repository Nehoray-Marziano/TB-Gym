"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function AuthCodeErrorPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">שגיאה בהתחברות</h1>
            <p className="text-muted-foreground mb-8 max-w-sm">
                אירעה שגיאה בתהליך ההתחברות. נסי שוב או פני לתמיכה.
            </p>
            <Link
                href="/"
                className="bg-primary text-black px-6 py-3 rounded-full font-bold hover:opacity-90 transition-opacity"
            >
                חזרה לדף הבית
            </Link>
        </div>
    );
}
