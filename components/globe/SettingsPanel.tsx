'use client'

import { useState } from 'react'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { User, Settings, Globe } from 'lucide-react'
import GlobePanel from '@/components/globe/GlobePanel'
import { PANEL_WIDTH } from '@/lib/constants/ui'
import { ProfileTab, SettingsTab, CountriesTab, TABS, isTab } from '@/components/globe/settings'
import type { Tab } from '@/components/globe/settings'
import type { DisplayOptions } from '@/types/display'

const TAB_ICONS = { profile: User, settings: Settings, countries: Globe } as const

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  displayOptions: DisplayOptions
  onDisplayChange: (opts: DisplayOptions) => void
  visitedCountries?: Set<string>
  onToggleVisitedCountry?: (country: string) => void
  onOpenImport?: () => void
  onOpenExport?: () => void
  onOpenDuplicates?: () => void
  onDeleteAllContacts?: () => void
}

export default function SettingsPanel({
  open,
  onClose,
  displayOptions,
  onDisplayChange,
  visitedCountries,
  onToggleVisitedCountry,
  onOpenImport,
  onOpenExport,
  onOpenDuplicates,
  onDeleteAllContacts,
}: SettingsPanelProps) {
  const [tab, setTab] = useState<Tab>('profile')

  const activeLabel = TABS.find((t) => t.value === tab)?.label ?? 'Profile'

  return (
    <GlobePanel
      open={open}
      side="right"
      width={PANEL_WIDTH.detail}
      glass="heavy"
      onClose={onClose}
    >
      <div className="flex flex-col h-full">
        <div className="px-6 pt-6 pb-3 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{activeLabel}</h2>
          <ToggleGroup
            type="single"
            value={tab}
            onValueChange={(v) => { if (v && isTab(v)) setTab(v) }}
            className="w-full"
          >
            {TABS.map(({ value, label }) => {
              const Icon = TAB_ICONS[value]
              return (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  className="flex-1 text-xs gap-1.5 data-[state=on]:bg-accent data-[state=on]:text-foreground text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/50"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>
        </div>

        <Separator className="bg-border" />

        <div className="flex-1 min-h-0">
          {tab === 'profile' && (
            <ProfileTab open={open} />
          )}
          {tab === 'settings' && (
            <SettingsTab
              displayOptions={displayOptions}
              onDisplayChange={onDisplayChange}
              onOpenImport={onOpenImport}
              onOpenExport={onOpenExport}
              onOpenDuplicates={onOpenDuplicates}
              onDeleteAllContacts={onDeleteAllContacts}
            />
          )}
          {tab === 'countries' && (
            <CountriesTab
              visitedCountries={visitedCountries}
              onToggleVisitedCountry={onToggleVisitedCountry}
            />
          )}
        </div>
      </div>
    </GlobePanel>
  )
}
