import type { SocialScrapedData, SocialPlatform } from './types'

function extractOgTags(html: string): Record<string, string> {
  const tags: Record<string, string> = {}
  const ogRegex = /<meta\s+(?:property|name)=["'](og:[^"']+)["']\s+content=["']([^"']*)["']/gi
  const ogRegex2 = /<meta\s+content=["']([^"']*)["']\s+(?:property|name)=["'](og:[^"']+)["']/gi

  let match: RegExpExecArray | null
  while ((match = ogRegex.exec(html)) !== null) {
    tags[match[1]] = match[2]
  }
  while ((match = ogRegex2.exec(html)) !== null) {
    tags[match[2]] = match[1]
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch && !tags['og:title']) {
    tags['og:title'] = titleMatch[1].trim()
  }

  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)
  if (descMatch && !tags['og:description']) {
    tags['og:description'] = descMatch[1]
  }

  return tags
}

export async function scrapeOpenGraph(value: string, platform: SocialPlatform): Promise<SocialScrapedData> {
  const url = resolveUrl(value, platform)
  const failed: SocialScrapedData = { platform, url, title: null, description: null, imageUrl: null, avatarUrl: null, followers: null, bio: null, extra: null, status: 'failed' }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Konterra/1.0; +https://konterra.app)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) return failed

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) return failed

    const html = await res.text()
    const og = extractOgTags(html)

    const title = og['og:title'] || null
    const description = og['og:description'] || null
    const imageUrl = og['og:image'] || null

    if (!title && !description && !imageUrl) return failed

    return {
      platform,
      url,
      title,
      description,
      imageUrl,
      avatarUrl: imageUrl,
      followers: null,
      bio: description,
      extra: Object.keys(og).length > 0 ? og : null,
      status: 'success',
    }
  } catch {
    return failed
  }
}

function resolveUrl(value: string, platform: SocialPlatform): string {
  if (/^https?:\/\//.test(value)) return value

  const prefixMap: Record<string, string> = {
    linkedin: 'https://linkedin.com/in/',
    twitter: 'https://x.com/',
    instagram: 'https://instagram.com/',
    telegram: 'https://t.me/',
    website: 'https://',
  }

  const prefix = prefixMap[platform]
  if (!prefix) return value

  const clean = value.replace(/^@/, '')
  return prefix + clean
}
