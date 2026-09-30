import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "סטודיו טליה",
        short_name: "טליה",
        description: "האימונים, ההרשמות והיתרה שלך במקום אחד.",
        lang: "he",
        dir: "rtl",
        start_url: "/dashboard",
        scope: "/",
        id: "/",
        display: "standalone",
        background_color: "#162218",
        theme_color: "#162218",
        orientation: "portrait",
        icons: [
            {
                src: "/pwa-icon-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any"
            },
            {
                src: "/pwa-icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any"
            },
            {
                src: "/pwa-icon-maskable-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable"
            }
        ],

    };
}
