export type SocialPlatform = 'github' | 'linkedin' | 'twitter' | 'instagram' | 'telegram' | 'website'

export interface SocialScrapedData {
  platform: SocialPlatform
  url: string
  title: string | null
  description: string | null
  imageUrl: string | null
  avatarUrl: string | null
  followers: number | null
  bio: string | null
  extra: Record<string, unknown> | null
  status: 'success' | 'failed'
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = ['github', 'linkedin', 'twitter', 'instagram', 'telegram', 'website']
