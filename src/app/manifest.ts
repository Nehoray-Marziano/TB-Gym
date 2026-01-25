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
                src: "/icon.jpg",
                sizes: "192x192",
                type: "image/jpeg",
                purpose: "any"
            },
            {
                src: "/icon.jpg",
                sizes: "192x192",
                type: "image/jpeg",
                purpose: "maskable"
            },
            {
                src: "/icon.jpg",
                sizes: "512x512",
                type: "image/jpeg",
                purpose: "any"
            },
            {
                src: "/icon.jpg",
                sizes: "512x512",
                type: "image/jpeg",
                purpose: "maskable"
            }
        ],
    };
}
