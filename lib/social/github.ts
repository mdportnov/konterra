import type { SocialScrapedData } from './types'

function extractUsername(value: string): string | null {
  if (value.includes('github.com/')) {
    const match = value.match(/github\.com\/([a-zA-Z0-9_-]+)/)
    return match?.[1] ?? null
  }
  if (/^[a-zA-Z0-9_-]+$/.test(value)) return value
  return null
}

export async function scrapeGitHub(value: string): Promise<SocialScrapedData> {
  const username = extractUsername(value)
  const url = `https://github.com/${username ?? value}`

  if (!username) {
    return { platform: 'github', url, title: null, description: null, imageUrl: null, avatarUrl: null, followers: null, bio: null, extra: null, status: 'failed' }
  }

  try {
    const res = await fetch(`https://api.github.com/users/${username}`, {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Konterra/1.0' },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return { platform: 'github', url, title: null, description: null, imageUrl: null, avatarUrl: null, followers: null, bio: null, extra: null, status: 'failed' }
    }

    const data = await res.json()
    return {
      platform: 'github',
      url: data.html_url ?? url,
      title: data.name ?? username,
      description: data.company ? `${data.company}` : null,
      imageUrl: null,
      avatarUrl: data.avatar_url ?? null,
      followers: data.followers ?? null,
      bio: data.bio ?? null,
      extra: {
        login: data.login,
        publicRepos: data.public_repos,
        following: data.following,
        location: data.location,
        blog: data.blog || null,
        twitterUsername: data.twitter_username || null,
        hireable: data.hireable,
      },
      status: 'success',
    }
  } catch {
    return { platform: 'github', url, title: null, description: null, imageUrl: null, avatarUrl: null, followers: null, bio: null, extra: null, status: 'failed' }
  }
}
