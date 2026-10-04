import { MetadataRoute } from "next";
import { PWA_BACKGROUND } from "@/lib/pwa-startup.mjs";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "סטודיו טליה",
        short_name: "טליה",
        description: "האימונים, ההרשמות והיתרה שלך במקום אחד.",
        lang: "he",
        dir: "rtl",
        start_url: "/",
        scope: "/",
        id: "/",
        display: "standalone",
        background_color: PWA_BACKGROUND,
        theme_color: PWA_BACKGROUND,
        shortcuts: [
            { name: "לוח אימונים", short_name: "אימונים", url: "/book", icons: [{ src: "/pwa-icon-v4-192.png", sizes: "192x192", type: "image/png" }] },
            { name: "האימונים שלי", short_name: "שלי", url: "/my-bookings", icons: [{ src: "/pwa-icon-v4-192.png", sizes: "192x192", type: "image/png" }] },
        ],
        // Chromium selects MASKABLE before ANY for the splash, independently
        // of ordering and resolution. Use the transparent mark for every
        // eligible splash icon; an opaque maskable entry restores its tile.
        icons: [
            {
                src: "/pwa-icon-v4-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any"
            },
            {
                src: "/pwa-icon-v4-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any"
            }
        ],

    };
}
