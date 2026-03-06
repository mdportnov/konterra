'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Sparkles, RefreshCw, ChevronRight, Send } from 'lucide-react'
import { toast } from 'sonner'
import Markdown from 'react-markdown'
import { INSIGHT_TYPES, INSIGHT_LABELS, INSIGHT_DESCRIPTIONS } from '@/lib/prompts'
import type { InsightType } from '@/lib/prompts'

interface ContactInsightsProps {
  contactId: string
  expanded: boolean
  onToggle: () => void
}

interface InsightResult {
  type: InsightType
  content: string
}

export default function ContactInsights({ contactId, expanded, onToggle }: ContactInsightsProps) {
  const [loading, setLoading] = useState<InsightType | null>(null)
  const [results, setResults] = useState<Record<string, InsightResult>>({})
  const [activeTab, setActiveTab] = useState<InsightType | null>(null)
  const [extraContext, setExtraContext] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const prevContactIdRef = useRef(contactId)

  useEffect(() => {
    if (prevContactIdRef.current !== contactId) {
      abortRef.current?.abort()
      setResults({})
      setActiveTab(null)
      setLoading(null)
      setExtraContext('')
      prevContactIdRef.current = contactId
    }
  }, [contactId])

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const generateInsight = useCallback(async (type: InsightType) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(type)
    setActiveTab(type)
    try {
      const body: Record<string, string> = { type }
      if (extraContext.trim()) body.context = extraContext.trim()

      const res = await fetch(`/api/contacts/${contactId}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data: InsightResult = await res.json()
      if (!controller.signal.aborted) {
        setResults((prev) => ({ ...prev, [type]: data }))
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      toast.error(error instanceof Error ? error.message : 'Failed to generate insight')
    } finally {
      if (!controller.signal.aborted) setLoading(null)
    }
  }, [contactId, extraContext])

  const activeResult = activeTab ? results[activeTab] : null

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
        className="w-full flex items-center gap-2 py-1 hover:opacity-80 transition-opacity cursor-pointer"
      >
        <ChevronRight className={`h-3 w-3 text-muted-foreground/60 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AI Insights</span>
      </div>
      <div
        className="grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          gridTemplateRows: expanded ? '1fr' : '0fr',
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          <div className="mt-2 space-y-2">
            <div className="relative">
              <textarea
                value={extraContext}
                onChange={(e) => setExtraContext(e.target.value)}
                placeholder="Additional context (optional): paste any unstructured info about this person..."
                rows={2}
                className="w-full text-[11px] bg-accent/30 border border-border/50 rounded-md px-2.5 py-2 pr-8 resize-none placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground"
              />
              {extraContext.trim() && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => { if (activeTab) generateInsight(activeTab) }}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Re-generate with context</TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {INSIGHT_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => results[type] ? setActiveTab(type) : generateInsight(type)}
                  disabled={loading !== null}
                  className={`text-left px-2.5 py-2 rounded-md text-[11px] transition-colors border ${
                    activeTab === type
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-accent/50 border-border/50 text-muted-foreground hover:bg-accent hover:border-border'
                  } disabled:opacity-50`}
                >
                  <div className="font-medium leading-tight">{INSIGHT_LABELS[type]}</div>
                  <div className="text-[9px] opacity-60 mt-0.5 leading-tight">{INSIGHT_DESCRIPTIONS[type]}</div>
                </button>
              ))}
            </div>

            {loading && (
              <div className="space-y-2 py-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/6" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            )}

            {!loading && activeResult && (
              <div className="relative">
                <div className="absolute top-1 right-1 z-10">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => generateInsight(activeResult.type)}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Regenerate</TooltipContent>
                  </Tooltip>
                </div>
                <div className="bg-accent/30 rounded-md border border-border/50 px-3 py-2.5 pr-8">
                  <div className="text-[11px] text-foreground leading-relaxed insight-markdown">
                    <Markdown>{activeResult.content}</Markdown>
                  </div>
                </div>
              </div>
            )}

            {!loading && !activeResult && (
              <p className="text-[10px] text-muted-foreground/50 italic py-1">
                Select an insight type above to generate AI-powered analysis
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
