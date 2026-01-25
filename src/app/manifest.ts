import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Talia Gym App",
        short_name: "Talia",
        description: "אפליקציית הכושר של טליה - הזמנת אימונים, מעקב קרדיטים וניהול פרופיל",
        start_url: "/dashboard",
        scope: "/",
        id: "/",
        display: "fullscreen",
        display_override: ["window-controls-overlay", "fullscreen", "standalone"],
        background_color: "#0A0A0A",
        theme_color: "#E2F163",
        orientation: "portrait",
        categories: ["fitness", "health", "sports"],
        launch_handler: {
            client_mode: ["navigate-existing", "auto"]
        },
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
