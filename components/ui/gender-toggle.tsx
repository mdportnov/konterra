'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

interface GenderToggleProps {
  value: string
  onChange: (value: string) => void
}

export function GenderToggle({ value, onChange }: GenderToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => onChange(v)}
      className="w-fit"
    >
      <ToggleGroupItem
        value="male"
        className="px-3 py-1 text-xs data-[state=on]:bg-blue-500/20 data-[state=on]:text-blue-400 text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/50"
      >
        M
      </ToggleGroupItem>
      <ToggleGroupItem
        value="female"
        className="px-3 py-1 text-xs data-[state=on]:bg-pink-500/20 data-[state=on]:text-pink-400 text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/50"
      >
        F
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
