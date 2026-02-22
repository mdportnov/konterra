import type { DisplayOptions } from '@/types/display'
import type { DashboardTab } from '@/hooks/use-dashboard-routing'

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
  contactCount: number
  connectionCount: number
  visitedCountryCount: number
  visitedCityCount: number
}

export interface SettingsTabProps {
  displayOptions: DisplayOptions
  onDisplayChange: (opts: DisplayOptions) => void
  defaultTab: DashboardTab
  onDefaultTabChange: (tab: DashboardTab) => void
  onOpenImport?: () => void
  onOpenExport?: () => void
  onOpenDuplicates?: () => void
  onDeleteAllContacts?: () => void
}

export interface CountriesTabProps {
  visitedCountries?: Set<string>
  onToggleVisitedCountry?: (country: string) => void
  wishlistCountries?: Map<string, import('@/lib/db/schema').CountryWishlistEntry>
  onToggleWishlistCountry?: (country: string) => void
  onOpenWishlistDetail?: (country: string) => void
  contactCountsByCountry: Map<string, number>
}
