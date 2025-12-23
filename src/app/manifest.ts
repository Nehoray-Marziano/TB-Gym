import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Talia Gym App",
        short_name: "Talia",
        description: "אפליקציית הכושר של טליה - הזמנת אימונים, מעקב קרדיטים וניהול פרופיל",
        start_url: "/",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#E2F163",
        orientation: "portrait",
        icons: [
            {
                src: "/icon.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any"
            },
            {
                src: "/icon.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "maskable"
            },
            {
                src: "/icon.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any"
            },
            {
                src: "/icon.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable"
            }
        ],
        screenshots: [
            {
                src: "/screenshot-mobile.png", // We might not have this yet, but good to add structure
                type: "image/png",
                sizes: "1080x1920",
                form_factor: "narrow"
            }
        ]
    };
}
