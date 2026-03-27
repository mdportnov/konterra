'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const shortcuts = [
  { key: '\u2318K / \u2318F', label: 'Search / Command menu' },
  { key: '\u2318N', label: 'New contact' },
  { key: '\u2318J / \u2318P', label: 'New trip' },
  { key: '\u2318I', label: 'Network insights' },
  { key: 'R', label: 'Toggle region select' },
  { key: 'Escape', label: 'Close panel' },
  { key: '[', label: 'Toggle left sidebar' },
  { key: ']', label: 'Close right panel' },
  { key: '?', label: 'Show this dialog' },
]

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
      {children}
    </kbd>
  )
}

export default function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription className="sr-only">Available keyboard shortcuts</DialogDescription>
        </DialogHeader>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Navigation</p>
          <div className="space-y-0">
            {shortcuts.map((s) => (
              <div key={s.key} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-foreground">{s.label}</span>
                <Kbd>{s.key}</Kbd>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
