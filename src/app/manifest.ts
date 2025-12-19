import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Talia Gym | Premium Fitness',
        short_name: 'Talia Gym',
        description: 'A premium fitness experience managed by Talia.',
        start_url: '/',
        display: 'standalone',
        background_color: '#131512',
        theme_color: '#E2F163',
        scope: '/',
        prefer_related_applications: false,
        icons: [
            {
                src: '/icon.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable'
            },
            {
                src: '/icon.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
            },
            {
                src: '/apple-icon.png',
                sizes: '180x180',
                type: 'image/png',
            },
        ],
    }
}
