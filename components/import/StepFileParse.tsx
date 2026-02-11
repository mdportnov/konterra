'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Upload, AlertCircle } from 'lucide-react'
import type { ImportSource } from './StepSourceSelect'
import type { ParsedContact } from '@/lib/import/types'
import { parseGoogleCSV } from '@/lib/import/parse-google-csv'
import { parseTelegramJSON } from '@/lib/import/parse-telegram'
import { parseVCards } from '@/lib/import/parse-vcard'

interface StepFileParseProps {
  source: ImportSource
  onParsed: (contacts: ParsedContact[]) => void
  onBack: () => void
}

const acceptMap: Record<ImportSource, string> = {
  'google-csv': '.csv',
  'telegram-json': '.json',
  'vcard': '.vcf,.vcard',
}

const labelMap: Record<ImportSource, string> = {
  'google-csv': 'Google Contacts CSV',
  'telegram-json': 'Telegram JSON',
  'vcard': 'vCard file (.vcf)',
}

const instructions: Record<ImportSource, { steps: string[] }> = {
  'google-csv': {
    steps: [
      'Open contacts.google.com',
      'Click "Export" in the left sidebar',
      'Select "Google CSV" format',
      'Click "Export" to download the .csv file',
    ],
  },
  'telegram-json': {
    steps: [
      'Open Telegram Desktop',
      'Go to Settings \u2192 Advanced \u2192 Export Telegram data',
      'Check only "Contacts" in the list',
      'Choose "Machine-readable JSON" as the format',
      'Click "Export" and locate the result.json file',
    ],
  },
  'vcard': {
    steps: [
      'Open your contacts app (Apple Contacts, Outlook, etc.)',
      'Select the contacts you want to export',
      'Choose File \u2192 Export \u2192 Export vCard',
      'Save the .vcf file to your computer',
    ],
  },
}

function formatBirthdayPreview(raw: string): string {
  const d = new Date(raw)
  if (isNaN(d.getTime())) return raw
  if (d.getFullYear() <= 1904) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function CollapseSection({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
      style={{
        gridTemplateRows: open ? '1fr' : '0fr',
        opacity: open ? 1 : 0,
      }}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  )
}

export default function StepFileParse({ source, onParsed, onBack }: StepFileParseProps) {
  const [parsed, setParsed] = useState<ParsedContact[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.types.includes('Files')) setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) setDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleFile = useCallback((file: File) => {
    setError(null)
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = reader.result as string
        let result: ParsedContact[]

        switch (source) {
          case 'google-csv':
            result = parseGoogleCSV(text)
            break
          case 'telegram-json':
            result = parseTelegramJSON(text)
            break
          case 'vcard':
            result = parseVCards(text)
            break
        }

        if (result.length === 0) {
          setError('No contacts found in this file')
          setParsed(null)
          return
        }

        setParsed(result)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to parse file')
        setParsed(null)
      }
    }
    reader.onerror = () => {
      setError('Failed to read file')
    }
    reader.readAsText(file)
  }, [source])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    dragCounter.current = 0
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const preview = parsed?.slice(0, 50) || []

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept={acceptMap[source]}
        onChange={handleInputChange}
        className="hidden"
      />

      <CollapseSection open={!parsed}>
        <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 mb-4">
          <p className="text-xs font-medium text-muted-foreground">How to export</p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            {instructions[source].steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      </CollapseSection>

      <CollapseSection open={!parsed && !error}>
        <button
          onClick={() => inputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`w-full flex flex-col items-center gap-3 p-8 rounded-lg border-2 border-dashed transition-colors duration-200 ease-out ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/30'}`}
        >
          <Upload className={`h-8 w-8 transition-colors duration-150 ${dragging ? 'text-primary' : 'text-muted-foreground'}`} />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Upload {labelMap[source]}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {dragging ? 'Drop file here' : 'Drag & drop or click to select'}
            </p>
          </div>
        </button>
      </CollapseSection>

      <CollapseSection open={!!error}>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      </CollapseSection>

      <CollapseSection open={!!parsed}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {fileName} — {parsed?.length || 0} contact{(parsed?.length || 0) !== 1 ? 's' : ''} found
            </p>
            <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
              Change file
            </Button>
          </div>

          <ScrollArea className="h-[280px] rounded-lg border border-border">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background border-b border-border">
                <tr>
                  <th className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap">Name</th>
                  <th className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap">Email</th>
                  <th className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap">Phone</th>
                  <th className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap">Company</th>
                  <th className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap">Location</th>
                  <th className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap">Birthday</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((c, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="p-2 text-foreground truncate max-w-[140px]">{c.name}</td>
                    <td className="p-2 text-muted-foreground truncate max-w-[140px]">{c.email || '\u2014'}</td>
                    <td className="p-2 text-muted-foreground truncate max-w-[110px]">{c.phone || '\u2014'}</td>
                    <td className="p-2 text-muted-foreground truncate max-w-[110px]">{c.company || '\u2014'}</td>
                    <td className="p-2 text-muted-foreground truncate max-w-[120px]">{[c.city, c.country].filter(Boolean).join(', ') || '\u2014'}</td>
                    <td className="p-2 text-muted-foreground truncate max-w-[90px] whitespace-nowrap">{c.birthday ? formatBirthdayPreview(c.birthday) : '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {(parsed?.length || 0) > 50 && (
              <p className="p-2 text-xs text-muted-foreground text-center">
                Showing 50 of {parsed?.length}
              </p>
            )}
          </ScrollArea>
        </div>
      </CollapseSection>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={() => parsed && onParsed(parsed)} disabled={!parsed}>
          Continue
        </Button>
      </div>
    </div>
  )
}
