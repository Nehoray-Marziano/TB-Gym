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
            { name: "לוח אימונים", short_name: "אימונים", url: "/book", icons: [{ src: "/pwa-icon-v5-192.png", sizes: "192x192", type: "image/png" }] },
            { name: "האימונים שלי", short_name: "שלי", url: "/my-bookings", icons: [{ src: "/pwa-icon-v5-192.png", sizes: "192x192", type: "image/png" }] },
        ],
        // Opaque olive icons retain the studio color under launcher effects.
        icons: [
            {
                src: "/pwa-icon-v5-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any"
            },
            {
                src: "/pwa-icon-v5-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any"
            }
        ],

    };
}
