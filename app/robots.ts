import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/u/', '/privacy'],
        disallow: ['/app/', '/admin/', '/api/', '/login'],
      },
    ],
    sitemap: 'https://konterra.space/sitemap.xml',
    host: 'https://konterra.space',
  }
}
