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
        display_override: ["standalone", "minimal-ui"],
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
