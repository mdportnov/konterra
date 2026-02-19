'use client'

import { useState, useRef, useCallback, type KeyboardEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, ChevronRight, X, Check } from 'lucide-react'

export function SectionLabel({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{text}</span>
    </div>
  )
}

export function FieldRow({
  label,
  name,
  value,
  onChange,
  placeholder,
  required,
  type,
}: {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  required?: boolean
  type?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-xs text-muted-foreground">{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="bg-muted/50 border-input text-foreground placeholder:text-muted-foreground/40 h-8 text-sm focus-visible:ring-orange-500/30 focus-visible:border-orange-500/50"
      />
    </div>
  )
}

export function SelectField({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string
  name: string
  value: string
  onChange: (name: string, value: string) => void
  options: readonly string[]
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-xs text-muted-foreground">{label}</Label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="flex h-8 w-full rounded-md border border-input bg-muted/50 px-3 py-1 text-sm text-foreground cursor-pointer"
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-popover text-popover-foreground">{opt}</option>
        ))}
      </select>
    </div>
  )
}

export function MultiSelectField({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string
  name: string
  value: string
  onChange: (name: string, value: string) => void
  options: readonly string[]
}) {
  const [open, setOpen] = useState(false)
  const selected = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : []

  const toggle = (opt: string) => {
    const next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt]
    onChange(name, next.join(', '))
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-xs text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-auto min-h-8 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-1 text-sm cursor-pointer hover:bg-accent/50 transition-colors text-left"
          >
            {selected.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selected.map((s) => (
                  <span key={s} className="inline-flex items-center gap-0.5 rounded-md bg-accent px-1.5 py-0.5 text-xs text-foreground">
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground/40">Select...</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" side="bottom" align="start">
          {options.map((opt) => {
            const active = selected.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors cursor-pointer"
              >
                <div className={`h-3.5 w-3.5 rounded-sm border flex items-center justify-center ${active ? 'bg-orange-500 border-orange-500' : 'border-muted-foreground/30'}`}>
                  {active && <Check className="h-2.5 w-2.5 text-white" />}
                </div>
                {opt}
              </button>
            )
          })}
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function ChipInput({
  label,
  name,
  value,
  onChange,
  placeholder,
}: {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const chips = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : []

  const fireChange = useCallback((next: string[]) => {
    const synthetic = {
      target: { name, value: next.join(', ') },
    } as React.ChangeEvent<HTMLInputElement>
    onChange(synthetic)
  }, [name, onChange])

  const addChip = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || chips.includes(trimmed)) {
      setInput('')
      return
    }
    fireChange([...chips, trimmed])
    setInput('')
  }, [input, chips, fireChange])

  const removeChip = useCallback((chip: string) => {
    fireChange(chips.filter((c) => c !== chip))
  }, [chips, fireChange])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addChip()
    }
    if (e.key === 'Backspace' && !input && chips.length > 0) {
      removeChip(chips[chips.length - 1])
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-xs text-muted-foreground">{label}</Label>
      <div
        className="flex flex-wrap gap-1 min-h-8 w-full rounded-md border border-input bg-muted/50 px-2 py-1 text-sm focus-within:ring-1 focus-within:ring-orange-500/30 focus-within:border-orange-500/50 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {chips.map((chip) => (
          <span key={chip} className="inline-flex items-center gap-0.5 rounded-md bg-accent px-1.5 py-0.5 text-xs text-foreground">
            {chip}
            <button type="button" onClick={(e) => { e.stopPropagation(); removeChip(chip) }} className="hover:text-destructive transition-colors">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={name}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addChip}
          placeholder={chips.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[60px] bg-transparent text-foreground placeholder:text-muted-foreground/40 h-6 text-sm outline-none"
        />
      </div>
    </div>
  )
}

export function RangeField({
  label,
  name,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  name: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={name} className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-xs text-muted-foreground tabular-nums">{value}/{max}</span>
      </div>
      <input
        id={name}
        name={name}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-orange-500"
      />
    </div>
  )
}

export function PrefixInput({
  id,
  prefix,
  value,
  onChange,
  placeholder,
}: {
  id: string
  prefix: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text')
    if (pasted && pasted !== value) {
      e.preventDefault()
      onChange(pasted)
    }
  }

  return (
    <div className="flex h-8 w-full rounded-md border border-input bg-muted/50 text-sm focus-within:ring-1 focus-within:ring-orange-500/30 focus-within:border-orange-500/50 overflow-hidden">
      <span className="flex items-center pl-2.5 text-muted-foreground/50 text-sm select-none shrink-0 pointer-events-none">
        {prefix}
      </span>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/40 h-full pr-2.5 text-sm outline-none min-w-0"
      />
    </div>
  )
}

export function DatePickerField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)

  const date = value ? new Date(value + 'T00:00:00') : undefined
  const valid = date && !isNaN(date.getTime()) ? date : undefined

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-3 text-sm cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <span className={valid ? 'text-foreground' : 'text-muted-foreground/40'}>
              {valid ? formatDate(valid) : 'Pick a date...'}
            </span>
            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 ml-1" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" side="bottom" align="start">
          <Calendar
            mode="single"
            selected={valid}
            defaultMonth={valid || new Date()}
            onSelect={(d) => {
              if (d) {
                const y = d.getFullYear()
                const m = String(d.getMonth() + 1).padStart(2, '0')
                const day = String(d.getDate()).padStart(2, '0')
                onChange(`${y}-${m}-${day}`)
              } else {
                onChange('')
              }
              setOpen(false)
            }}
            captionLayout="dropdown"
            fromYear={1930}
            toYear={2035}
          />
          {value && (
            <div className="border-t border-border px-3 py-2">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear date
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function CollapsibleSection({
  title,
  icon: Icon,
  expanded,
  onToggle,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 py-1 hover:opacity-80 transition-opacity cursor-pointer"
      >
        <ChevronRight className={`h-3 w-3 text-muted-foreground/60 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
      </button>
      <div
        className="grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          gridTemplateRows: expanded ? '1fr' : '0fr',
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          <div className="mt-2">{children}</div>
        </div>
      </div>
    </div>
  )
}
