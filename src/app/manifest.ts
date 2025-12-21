import type { MetadataRoute } from 'next'

const manifestData: MetadataRoute.Manifest = {
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
            src: '/icon.jpg',
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'any'
        },
        {
            src: '/icon.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any'
        },
        {
            src: '/icon.jpg',
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'maskable'
        },
        {
            src: '/icon.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'maskable'
        },
        {
            src: '/apple-icon.jpg',
            sizes: '180x180',
            type: 'image/jpeg',
        },
    ],
}

export default function manifest(): MetadataRoute.Manifest {
    return manifestData
}
