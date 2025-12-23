"use client";

import { useTheme } from "next-themes";

export default function OfflineFallback() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6 text-center font-sans">
            <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mb-6">
                <span className="text-4xl">📶</span>
            </div>
            <h1 className="text-3xl font-bold mb-4 tracking-tight">אין חיבור לאינטרנט</h1>
            <p className="text-muted-foreground mb-8 max-w-md">
                נראה שאת במצב לא מקוון. חלק מהאפליקציה עשוי שלא לעבוד. אנא בדקי את החיבור שלך ונסי שוב.
            </p>
            <button
                onClick={() => window.location.reload()}
                className="bg-primary text-black font-bold py-3 px-8 rounded-full shadow-[0_0_20px_rgba(226,241,99,0.3)] hover:opacity-90 transition-all hover:scale-105 active:scale-95"
            >
                נסה להתחבר שוב
            </button>
        </div>
    );
}
