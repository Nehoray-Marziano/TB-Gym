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
            { name: "לוח אימונים", short_name: "אימונים", url: "/book", icons: [{ src: "/pwa-icon-v6-192.png", sizes: "192x192", type: "image/png" }] },
            { name: "האימונים שלי", short_name: "שלי", url: "/my-bookings", icons: [{ src: "/pwa-icon-v6-192.png", sizes: "192x192", type: "image/png" }] },
        ],
        // Chrome Android selects separate 48dp primary and 128dp splash icons.
        // Keep the green 192px launcher and transparent dark 512px splash apart.
        // Maskable entries would take priority for BOTH and restore the tile.
        icons: [
            {
                src: "/pwa-splash-v6-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any"
            },
            {
                src: "/pwa-icon-v6-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any"
            }
        ],

    };
}
