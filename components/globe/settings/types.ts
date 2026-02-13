import type { DisplayOptions } from '@/types/display'

export interface SessionUser {
  name?: string | null
  email?: string | null
  image?: string | null
}

export const TABS = [
  { value: 'profile', label: 'Profile' },
  { value: 'settings', label: 'Settings' },
  { value: 'countries', label: 'Countries' },
] as const

export type Tab = (typeof TABS)[number]['value']

export function isTab(v: string): v is Tab {
  return TABS.some((t) => t.value === v)
}

export interface ProfileTabProps {
  open: boolean
}

export interface SettingsTabProps {
  displayOptions: DisplayOptions
  onDisplayChange: (opts: DisplayOptions) => void
  onOpenImport?: () => void
  onOpenExport?: () => void
  onOpenDuplicates?: () => void
  onDeleteAllContacts?: () => void
}

export interface CountriesTabProps {
  visitedCountries?: Set<string>
  onToggleVisitedCountry?: (country: string) => void
}
