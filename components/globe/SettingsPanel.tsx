'use client'

import { useState, useEffect, useCallback } from 'react'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { User, Settings, Globe } from 'lucide-react'
import GlobePanel from '@/components/globe/GlobePanel'
import { PANEL_WIDTH } from '@/lib/constants/ui'
import { ProfileTab, SettingsTab, CountriesTab, TABS, isTab } from '@/components/globe/settings'
import { saveDefaultTab } from '@/hooks/use-dashboard-routing'
import type { DashboardTab } from '@/hooks/use-dashboard-routing'
import type { Tab } from '@/components/globe/settings'
import type { DisplayOptions } from '@/types/display'
import type { CountryWishlistEntry } from '@/lib/db/schema'

const TAB_ICONS = { profile: User, settings: Settings, countries: Globe } as const

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  initialTab?: Tab
  displayOptions: DisplayOptions
  onDisplayChange: (opts: DisplayOptions) => void
  defaultTab: DashboardTab
  onDefaultTabChange: (tab: DashboardTab) => void
  visitedCountries?: Set<string>
  onToggleVisitedCountry?: (country: string) => void
  wishlistCountries?: Map<string, CountryWishlistEntry>
  onToggleWishlistCountry?: (country: string) => void
  onOpenWishlistDetail?: (country: string) => void
  onOpenImport?: () => void
  onOpenExport?: () => void
  onOpenDuplicates?: () => void
  onDeleteAllContacts?: () => void
  contactCount: number
  connectionCount: number
  visitedCountryCount: number
  visitedCityCount: number
  contactCountsByCountry: Map<string, number>
}

export default function SettingsPanel({
  open,
  onClose,
  initialTab,
  displayOptions,
  onDisplayChange,
  defaultTab,
  onDefaultTabChange,
  visitedCountries,
  onToggleVisitedCountry,
  wishlistCountries,
  onToggleWishlistCountry,
  onOpenWishlistDetail,
  onOpenImport,
  onOpenExport,
  onOpenDuplicates,
  onDeleteAllContacts,
  contactCount,
  connectionCount,
  visitedCountryCount,
  visitedCityCount,
  contactCountsByCountry,
}: SettingsPanelProps) {
  const [tab, setTab] = useState<Tab>(initialTab ?? 'settings')

  useEffect(() => {
    if (open && initialTab) setTab(initialTab)
  }, [open, initialTab])

  const handleDefaultTabChange = useCallback((t: DashboardTab) => {
    saveDefaultTab(t)
    onDefaultTabChange(t)
  }, [onDefaultTabChange])

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
            <ProfileTab
              open={open}
              contactCount={contactCount}
              connectionCount={connectionCount}
              visitedCountryCount={visitedCountryCount}
              visitedCityCount={visitedCityCount}
            />
          )}
          {tab === 'settings' && (
            <SettingsTab
              displayOptions={displayOptions}
              onDisplayChange={onDisplayChange}
              defaultTab={defaultTab}
              onDefaultTabChange={handleDefaultTabChange}
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
              wishlistCountries={wishlistCountries}
              onToggleWishlistCountry={onToggleWishlistCountry}
              onOpenWishlistDetail={onOpenWishlistDetail}
              contactCountsByCountry={contactCountsByCountry}
            />
          )}
        </div>
      </div>
    </GlobePanel>
  )
}
