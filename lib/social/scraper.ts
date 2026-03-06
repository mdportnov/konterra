import type { SocialPlatform, SocialScrapedData } from './types'
import { scrapeGitHub } from './github'
import { scrapeOpenGraph } from './opengraph'
import type { Contact } from '@/lib/db/schema'

export async function scrapeProfile(platform: SocialPlatform, value: string): Promise<SocialScrapedData> {
  if (platform === 'github') {
    return scrapeGitHub(value)
  }
  return scrapeOpenGraph(value, platform)
}

export function getScrapablePlatforms(contact: Contact): { platform: SocialPlatform; value: string }[] {
  const result: { platform: SocialPlatform; value: string }[] = []

  if (contact.github) result.push({ platform: 'github', value: contact.github })
  if (contact.website) result.push({ platform: 'website', value: contact.website })
  if (contact.linkedin) result.push({ platform: 'linkedin', value: contact.linkedin })
  if (contact.twitter) result.push({ platform: 'twitter', value: contact.twitter })
  if (contact.instagram) result.push({ platform: 'instagram', value: contact.instagram })
  if (contact.telegram) result.push({ platform: 'telegram', value: contact.telegram })

  return result
}

export async function scrapeAllProfiles(contact: Contact, platforms?: SocialPlatform[]): Promise<SocialScrapedData[]> {
  const targets = getScrapablePlatforms(contact)
  const filtered = platforms
    ? targets.filter((t) => platforms.includes(t.platform))
    : targets

  const results = await Promise.allSettled(
    filtered.map((t) => scrapeProfile(t.platform, t.value))
  )

  return results
    .filter((r): r is PromiseFulfilledResult<SocialScrapedData> => r.status === 'fulfilled')
    .map((r) => r.value)
}
