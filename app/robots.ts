import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        // /u/ stays crawlable so individually opted-in atlases can be indexed; profiles
        // that did not opt in emit `noindex` in their own metadata, which is a per-page
        // control robots.txt cannot express.
        allow: ['/', '/u/', '/privacy', '/terms'],
        disallow: [
          '/app/',
          '/admin/',
          '/api/',
          '/login',
          '/reset-password',
          '/verify-email',
          '/unsubscribe',
        ],
      },
    ],
    sitemap: 'https://konterra.space/sitemap.xml',
    host: 'https://konterra.space',
  }
}
