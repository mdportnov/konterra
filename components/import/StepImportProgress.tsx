'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import type { ImportEntry, BulkImportItem } from '@/lib/import/types'
import type { KonterraExport } from '@/lib/export/types'
import type { ImportSource } from './StepSourceSelect'

interface StepImportProgressProps {
  entries: ImportEntry[]
  source: ImportSource | null
  konterraData?: KonterraExport | null
  onComplete: () => void
}

interface ImportResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
  relationsImported?: boolean
}

const BATCH_SIZE = 100

const MERGE_FIELDS = [
  'name', 'email', 'phone', 'company', 'role', 'city', 'country',
  'website', 'notes', 'birthday', 'telegram', 'linkedin', 'twitter',
  'instagram', 'github', 'timezone', 'gender', 'tags',
  'photo', 'metAt', 'metDate', 'lastContactedAt', 'nextFollowUp',
  'communicationStyle', 'preferredChannel', 'responseSpeed', 'language',
  'personalInterests', 'professionalGoals', 'painPoints',
  'influenceLevel', 'networkReach', 'trustLevel',
  'loyaltyIndicator', 'financialCapacity', 'motivations',
  'secondaryLocations', 'rating', 'relationshipType',
] as const

function entriesToBulkItems(entries: ImportEntry[], importSource: string | null): BulkImportItem[] {
  return entries.map((e) => {
    if (e.action === 'skip') {
      return { action: 'skip' as const, contact: { name: e.parsed.name } }
    }

    if (e.action === 'merge' && e.match) {
      const existing = e.match.existingContact
      const merged: Record<string, unknown> = {}
      const choices = e.mergeFields || {}

      for (const field of MERGE_FIELDS) {
        const src = choices[field] || 'existing'
        if (src === 'imported') {
          merged[field] = (e.parsed as unknown as Record<string, unknown>)[field]
        } else {
          const existingVal = (existing as Record<string, unknown>)[field]
          const importedVal = (e.parsed as unknown as Record<string, unknown>)[field]
          merged[field] = existingVal ?? importedVal
        }
      }

      if (!merged.name) merged.name = existing.name

      return {
        action: 'update' as const,
        contact: merged as BulkImportItem['contact'],
        existingId: existing.id,
      }
    }

    return {
      action: 'create' as const,
      contact: { ...e.parsed, importSource } as BulkImportItem['contact'],
    }
  })
}

export default function StepImportProgress({ entries, source, konterraData, onComplete }: StepImportProgressProps) {
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [resultVisible, setResultVisible] = useState(false)
  const started = useRef(false)

  const items = useMemo(() => entriesToBulkItems(entries, source), [entries, source])
  const batches = useMemo(() => {
    const b: BulkImportItem[][] = []
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      b.push(items.slice(i, i + BATCH_SIZE))
    }
    return b
  }, [items])
  const hasRelations = !!konterraData
  const total = batches.length + (hasRelations ? 1 : 0)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const agg: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] }

    ;(async () => {
      for (let i = 0; i < batches.length; i++) {
        setStatusText(`Importing contacts... batch ${i + 1} of ${batches.length}`)
        try {
          const res = await fetch('/api/contacts/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: batches[i] }),
          })

          if (!res.ok) {
            const body = await res.json().catch(() => ({ error: 'Request failed' }))
            agg.errors.push(body.error || `Batch ${i + 1} failed`)
          } else {
            const data = await res.json()
            agg.created += data.created || 0
            agg.updated += data.updated || 0
            agg.skipped += data.skipped || 0
            if (data.errors?.length) agg.errors.push(...data.errors)
          }
        } catch {
          agg.errors.push(`Batch ${i + 1} network error`)
        }
        setProgress(i + 1)
      }

      if (hasRelations) {
        setStatusText('Importing connections, interactions, and other data...')
        try {
          const res = await fetch('/api/import/konterra-relations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(konterraData),
          })

          if (!res.ok) {
            const body = await res.json().catch(() => ({ error: 'Request failed' }))
            agg.errors.push(body.error || 'Relations import failed')
          } else {
            const data = await res.json()
            agg.relationsImported = true
            if (data.errors?.length) agg.errors.push(...data.errors)
          }
        } catch {
          agg.errors.push('Relations import network error')
        }
        setProgress(total)
      }

      setResult(agg)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setResultVisible(true))
      })
    })()
  }, [batches, hasRelations, total, konterraData])

  const pct = total > 0 ? Math.round((progress / total) * 100) : 0

  if (result) {
    const hasErrors = result.errors.length > 0

    return (
      <div
        className="space-y-4 text-center transition-all duration-300 ease-out"
        style={{
          opacity: resultVisible ? 1 : 0,
          transform: resultVisible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
        }}
      >
        {hasErrors ? (
          <AlertCircle className="h-10 w-10 text-orange-500 mx-auto" />
        ) : (
          <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
        )}

        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Import Complete</p>
          <p className="text-xs text-muted-foreground">
            {result.created} created, {result.updated} updated, {result.skipped} skipped
          </p>
          {result.relationsImported && (
            <p className="text-xs text-muted-foreground">
              Connections, interactions, and other data restored
            </p>
          )}
        </div>

        {hasErrors && (
          <div className="text-left rounded-lg bg-destructive/10 p-3 max-h-[120px] overflow-auto">
            {result.errors.map((e, i) => (
              <p key={i} className="text-xs text-destructive">{e}</p>
            ))}
          </div>
        )}

        <Button onClick={onComplete} className="w-full">Done</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 text-center py-4">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
      <p className="text-sm text-muted-foreground">
        {statusText}
      </p>
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="bg-foreground h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
