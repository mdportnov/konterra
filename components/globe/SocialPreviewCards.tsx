'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import Image from 'next/image'
import { RefreshCw, ExternalLink, Github, Linkedin, Twitter, Send, Instagram, Globe, Users, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { fetchSocialPreviews, enrichContact } from '@/lib/api'
import type { SocialPreview } from '@/lib/db/schema'

const PLATFORM_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  github: { icon: Github, label: 'GitHub', color: 'text-[#333] dark:text-[#f0f0f0]' },
  linkedin: { icon: Linkedin, label: 'LinkedIn', color: 'text-[#0a66c2]' },
  twitter: { icon: Twitter, label: 'X / Twitter', color: 'text-[#1da1f2]' },
  telegram: { icon: Send, label: 'Telegram', color: 'text-[#0088cc]' },
  instagram: { icon: Instagram, label: 'Instagram', color: 'text-[#e4405f]' },
  website: { icon: Globe, label: 'Website', color: 'text-muted-foreground' },
}

interface SocialPreviewCardsProps {
  contactId: string
  hasSocialLinks: boolean
}

export default function SocialPreviewCards({ contactId, hasSocialLinks }: SocialPreviewCardsProps) {
  const [previews, setPreviews] = useState<SocialPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [enriching, setEnriching] = useState(false)

  const loadPreviews = useCallback(async () => {
    try {
      const data = await fetchSocialPreviews(contactId)
      setPreviews(data)
    } catch {
      setPreviews([])
    } finally {
      setLoading(false)
    }
  }, [contactId])

  useEffect(() => {
    setLoading(true)
    setPreviews([])
    loadPreviews()
  }, [loadPreviews])

  const handleEnrich = async () => {
    setEnriching(true)
    try {
      const results = await enrichContact(contactId)
      setPreviews(results)
      const successes = results.filter((r) => r.status === 'success').length
      if (successes > 0) {
        toast.success(`Fetched data from ${successes} profile${successes > 1 ? 's' : ''}`)
      } else {
        toast.info('No public data found')
      }
    } catch {
      toast.error('Failed to fetch social data')
    } finally {
      setEnriching(false)
    }
  }

  if (!hasSocialLinks) return null

  const successPreviews = previews.filter((p) => p.status === 'success')

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    )
  }

  if (successPreviews.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={handleEnrich}
              disabled={enriching}
              className="text-xs h-7 gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${enriching ? 'animate-spin' : ''}`} />
              {enriching ? 'Fetching...' : 'Fetch social data'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Scrape public data from linked social profiles</TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Social Profiles</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleEnrich}
              disabled={enriching}
              className="h-6 w-6"
            >
              <RefreshCw className={`h-3 w-3 ${enriching ? 'animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh social data</TooltipContent>
        </Tooltip>
      </div>

      <div className="space-y-2">
        {successPreviews.map((preview) => (
          <SocialCard key={preview.id} preview={preview} />
        ))}
      </div>
    </div>
  )
}

function SocialCard({ preview }: { preview: SocialPreview }) {
  const config = PLATFORM_CONFIG[preview.platform] ?? PLATFORM_CONFIG.website
  const Icon = config.icon
  const extra = preview.extra as Record<string, unknown> | null

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-border/50 bg-card/50 hover:bg-accent/30 transition-colors p-3 group"
    >
      <div className="flex items-start gap-3">
        {preview.avatarUrl ? (
          <Image
            src={preview.avatarUrl}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-md object-cover shrink-0"
            unoptimized
          />
        ) : (
          <div className={`h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0 ${config.color}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Icon className={`h-3.5 w-3.5 shrink-0 ${config.color}`} />
            <span className="text-sm font-medium text-foreground truncate">
              {preview.title || config.label}
            </span>
            <ExternalLink className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>

          {preview.bio && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {preview.bio}
            </p>
          )}

          <div className="flex items-center gap-3 mt-1.5">
            {preview.followers != null && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {formatNumber(preview.followers)}
              </span>
            )}
            {extra?.publicRepos != null && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {String(extra.publicRepos)} repos
              </span>
            )}
            {preview.description && !preview.bio && (
              <span className="text-xs text-muted-foreground truncate">
                {preview.description}
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  )
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}
