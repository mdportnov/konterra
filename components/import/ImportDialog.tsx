'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import StepSourceSelect from './StepSourceSelect'
import StepFileParse from './StepFileParse'
import StepDedupReview from './StepDedupReview'
import StepImportProgress from './StepImportProgress'
import type { ImportSource } from './StepSourceSelect'
import type { ParsedContact, ImportEntry } from '@/lib/import/types'
import type { Contact } from '@/lib/db/schema'
import { findDuplicates } from '@/lib/import/dedup'

type Step = 'source' | 'parse' | 'dedup' | 'importing'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingContacts: Contact[]
  onImportComplete: () => void
}

const stepTitles: Record<Step, string> = {
  source: 'Import Contacts',
  parse: 'Upload File',
  dedup: 'Review Duplicates',
  importing: 'Importing',
}

const stepDescriptions: Record<Step, string> = {
  source: 'Choose an import source',
  parse: 'Select a file to import',
  dedup: 'Review and resolve duplicates',
  importing: 'Processing your contacts',
}

function AnimatedStep({ active, children }: { active: boolean; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(active)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (active) {
      setMounted(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
      const timer = setTimeout(() => setMounted(false), 200)
      return () => clearTimeout(timer)
    }
  }, [active])

  if (!mounted) return null

  return (
    <div
      className="transition-all duration-200 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
      }}
    >
      {children}
    </div>
  )
}

export default function ImportDialog({ open, onOpenChange, existingContacts, onImportComplete }: ImportDialogProps) {
  const [step, setStep] = useState<Step>('source')
  const [source, setSource] = useState<ImportSource | null>(null)
  const [entries, setEntries] = useState<ImportEntry[]>([])
  const contentRef = useRef<HTMLDivElement>(null)

  const reset = useCallback(() => {
    setStep('source')
    setSource(null)
    setEntries([])
  }, [])

  const handleOpenChange = useCallback((v: boolean) => {
    if (!v) reset()
    onOpenChange(v)
  }, [onOpenChange, reset])

  const handleSourceSelect = useCallback((s: ImportSource) => {
    setSource(s)
    setStep('parse')
  }, [])

  const handleParsed = useCallback((contacts: ParsedContact[]) => {
    const result = findDuplicates(contacts, existingContacts)
    setEntries(result)
    setStep('dedup')
  }, [existingContacts])

  const handleConfirm = useCallback((confirmed: ImportEntry[]) => {
    setEntries(confirmed)
    setStep('importing')
  }, [])

  const handleComplete = useCallback(() => {
    onImportComplete()
    reset()
  }, [onImportComplete, reset])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{stepTitles[step]}</DialogTitle>
          <DialogDescription>{stepDescriptions[step]}</DialogDescription>
        </DialogHeader>

        <div ref={contentRef}>
          <AnimatedStep active={step === 'source'}>
            <StepSourceSelect onSelect={handleSourceSelect} />
          </AnimatedStep>

          <AnimatedStep active={step === 'parse'}>
            {source && (
              <StepFileParse
                source={source}
                onParsed={handleParsed}
                onBack={() => setStep('source')}
              />
            )}
          </AnimatedStep>

          <AnimatedStep active={step === 'dedup'}>
            <StepDedupReview
              entries={entries}
              onConfirm={handleConfirm}
              onBack={() => setStep('parse')}
            />
          </AnimatedStep>

          <AnimatedStep active={step === 'importing'}>
            <StepImportProgress
              entries={entries}
              onComplete={handleComplete}
            />
          </AnimatedStep>
        </div>
      </DialogContent>
    </Dialog>
  )
}
