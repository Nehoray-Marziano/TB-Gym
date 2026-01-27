import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Talia Gym App",
        short_name: "Talia",
        description: "אפליקציית הכושר של טליה - הזמנת אימונים, מעקב קרדיטים וניהול פרופיל",
        start_url: "/dashboard",
        scope: "/",
        id: "/",
        display: "standalone",
        display_override: ["standalone"],
        // CRITICAL: These are needed for proper PWA display
        background_color: "#0A0A0A",
        theme_color: "#0A0A0A", // Same as background for seamless header
        orientation: "portrait",
        icons: [
            {
                src: "/pwa-icon-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any"
            },
            {
                src: "/pwa-icon-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "maskable"
            },
            {
                src: "/pwa-icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any"
            },
            {
                src: "/pwa-icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable"
            }
        ],

    };
}
