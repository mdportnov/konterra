'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Download, Loader2, FileJson, FileSpreadsheet, Contact } from 'lucide-react'
import { toast } from 'sonner'
import type { ExportFormat } from '@/lib/export/types'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FORMAT_INFO: Record<ExportFormat, { label: string; description: string; icon: typeof FileJson }> = {
  konterra: { label: 'Konterra', description: 'Full backup with graph data', icon: FileJson },
  csv: { label: 'Google CSV', description: 'Contacts only, Google-compatible', icon: FileSpreadsheet },
  vcard: { label: 'vCard', description: 'Contacts only, universal format', icon: Contact },
}

export default function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('konterra')
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/export?format=${format}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="(.+)"/)
      const filename = match?.[1] || `export.${format === 'konterra' ? 'konterra.json' : format === 'csv' ? 'csv' : 'vcf'}`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      toast.success('Export downloaded')
      onOpenChange(false)
    } catch {
      toast.error('Failed to export contacts')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Contacts</DialogTitle>
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
