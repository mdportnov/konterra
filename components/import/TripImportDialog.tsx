'use client'

import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { parseNomadListCSV } from '@/lib/import/parse-nomadlist'
import type { ParsedTrip } from '@/lib/import/parse-nomadlist'

interface TripImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
}

type Step = 'upload' | 'importing' | 'done'

export default function TripImportDialog({ open, onOpenChange, onImportComplete }: TripImportDialogProps) {
  const [step, setStep] = useState<Step>('upload')
  const [parsed, setParsed] = useState<ParsedTrip[]>([])
  const [error, setError] = useState<string | null>(null)
  const [importCount, setImportCount] = useState(0)

  const reset = useCallback(() => {
    setStep('upload')
    setParsed([])
    setError(null)
    setImportCount(0)
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const trips = parseNomadListCSV(text)
      if (trips.length === 0) {
        setError('No valid trips found in file. Check that the CSV has columns: Arrival date, City, Country.')
        return
      }
      setParsed(trips)
    }
    reader.onerror = () => setError('Failed to read file')
    reader.readAsText(file)
  }, [])

  const handleImport = useCallback(async () => {
    if (parsed.length === 0) return
    setStep('importing')

    try {
      const res = await fetch('/api/trips', {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to clear existing trips')

      const importRes = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trips: parsed }),
      })
      if (!importRes.ok) throw new Error('Failed to import trips')

      const result = await importRes.json()
      setImportCount(result.created)
      setStep('done')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
      setStep('upload')
    }
  }, [parsed])

  const handleClose = useCallback((val: boolean) => {
    if (!val) {
      if (step === 'done') onImportComplete()
      reset()
    }
    onOpenChange(val)
  }, [step, onImportComplete, reset, onOpenChange])

  const countries = new Set(parsed.map((t) => t.country))
  const dateRange = parsed.length > 0
    ? `${parsed[parsed.length - 1].arrivalDate} — ${parsed[0].arrivalDate}`
    : ''

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Travel History</DialogTitle>
          <DialogDescription>Import trips from a NomadList CSV export</DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {parsed.length > 0 ? `${parsed.length} trips parsed` : 'Choose CSV file'}
              </span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-500 bg-red-500/10 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {parsed.length > 0 && (
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2 bg-muted/50 rounded-lg p-3">
                  <div>
                    <span className="text-muted-foreground text-xs">Trips</span>
                    <p className="font-medium">{parsed.length}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Countries</span>
                    <p className="font-medium">{countries.size}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground text-xs">Date range</span>
                    <p className="font-medium">{dateRange}</p>
                  </div>
                </div>
                <Button onClick={handleImport} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                  Import {parsed.length} trips
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'importing' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-muted-foreground">Importing trips...</p>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <p className="text-sm font-medium">Imported {importCount} trips</p>
            <Button variant="outline" onClick={() => handleClose(false)}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
