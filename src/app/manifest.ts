import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Talia Gym | Premium Fitness',
        short_name: 'Talia Gym',
        description: 'A premium fitness experience managed by Talia.',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#E2F163', // Primary Lime/Gold
        icons: [
            {
                src: '/icon.png',
                sizes: 'any',
                type: 'image/png',
            },
            {
                src: '/apple-icon.png',
                sizes: 'any',
                type: 'image/png',
            },
        ],
    }
}
