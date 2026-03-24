'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Download, Loader2, FileJson, FileSpreadsheet, Contact, Plane } from 'lucide-react'
import { toast } from 'sonner'
import type { ExportFormat, TravelSection } from '@/lib/export/types'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORMAT_INFO: Record<ExportFormat, { label: string; description: string; icon: typeof FileJson }> = {
  konterra: { label: 'Konterra', description: 'Full backup with graph data', icon: FileJson },
  csv: { label: 'Google CSV', description: 'Contacts only, Google-compatible', icon: FileSpreadsheet },
  vcard: { label: 'vCard', description: 'Contacts only, universal format', icon: Contact },
  'travel-json': { label: 'Travel JSON', description: 'Trips, visited countries & wishlist', icon: Plane },
  'travel-csv': { label: 'Travel CSV', description: 'Trips spreadsheet', icon: FileSpreadsheet },
}

const TRAVEL_TOGGLES: { key: TravelSection; label: string }[] = [
  { key: 'trips', label: 'Trips' },
  { key: 'visited', label: 'Visited countries' },
  { key: 'wishlist', label: 'Wishlist' },
]

export default function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('konterra')
  const [loading, setLoading] = useState(false)
  const [travelSections, setTravelSections] = useState<Set<TravelSection>>(new Set(['trips', 'visited', 'wishlist']))

  const toggleSection = (section: TravelSection) => {
    setTravelSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const handleExport = async () => {
    if (format === 'travel-json' && travelSections.size === 0) {
      toast.error('Select at least one section to export')
      return
    }

    setLoading(true)
    try {
      let url = `/api/export?format=${format}`
      if (format === 'travel-json' && travelSections.size < 3) {
        url += `&sections=${[...travelSections].join(',')}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="(.+)"/)
      const filename = match?.[1] || `export.${format}`

      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)

      toast.success('Export downloaded')
      onOpenChange(false)
    } catch {
      toast.error('Failed to export data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>Choose an export format</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <ToggleGroup
            type="single"
            value={format}
            onValueChange={(v) => { if (v) setFormat(v as ExportFormat) }}
            className="flex flex-col gap-2"
          >
            {(Object.entries(FORMAT_INFO) as [ExportFormat, typeof FORMAT_INFO.konterra][]).map(([key, info]) => {
              const Icon = info.icon
              return (
                <ToggleGroupItem
                  key={key}
                  value={key}
                  className="w-full justify-start gap-3 px-4 py-3 h-auto data-[state=on]:bg-accent data-[state=on]:text-foreground text-muted-foreground hover:bg-accent/50"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="text-left">
                    <div className="text-sm font-medium">{info.label}</div>
                    <div className="text-xs text-muted-foreground">{info.description}</div>
                  </div>
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>

          {format === 'travel-json' && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Include sections</p>
                {TRAVEL_TOGGLES.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={`toggle-${key}`} className="text-sm text-muted-foreground">{label}</Label>
                    <Switch
                      id={`toggle-${key}`}
                      checked={travelSections.has(key)}
                      onCheckedChange={() => toggleSection(key)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          <Button
            onClick={handleExport}
            disabled={loading}
            className="w-full"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
