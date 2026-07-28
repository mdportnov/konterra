import { useMemo, useState } from 'react'
import { List, CalendarDays, Table2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import TravelJourney from './widgets/TravelJourney'
import TripCalendar from './widgets/TripCalendar'
import TripPeriodFocus from './widgets/TripPeriodFocus'
import CountryDaysTable from './widgets/CountryDaysTable'
import CrossingsCard from './widgets/CrossingsCard'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import type { Trip } from '@/lib/db/schema'
import type { TripFocusRange } from '@/hooks/use-trip-focus'

interface TravelSectionProps {
  trips: Trip[]
  tripsLoading: boolean
  onImportTrips: () => void
  onTripClick?: (trip: Trip) => void
  onAddTrip?: (prefill?: { arrivalDate?: string; departureDate?: string }) => void
  onEditTrip?: (trip: Trip) => void
  onDeleteTrip?: (trip: Trip) => void
  compareMode?: boolean
  selectedCompareIds?: Set<string>
  onToggleCompareTrip?: (id: string) => void
  canOpenCompare?: boolean
  onOpenCompare?: () => void
  onToggleCompareMode?: () => void
  tripFocusRange?: TripFocusRange | null
  onTripFocusChange?: (range: TripFocusRange | null) => void
  focusedTripCount?: number
  onCountryClick?: (country: string) => void
  onContactClick?: (contactId: string) => void
}

type TravelView = 'list' | 'calendar' | 'days'

const VIEWS: { value: TravelView; icon: typeof List; label: string }[] = [
  { value: 'list', icon: List, label: 'Timeline view' },
  { value: 'calendar', icon: CalendarDays, label: 'Calendar view' },
  { value: 'days', icon: Table2, label: 'Days per country' },
]

export default function TravelSection({ trips, tripsLoading, onImportTrips, onTripClick, onAddTrip, onEditTrip, onDeleteTrip, compareMode, selectedCompareIds, onToggleCompareTrip, canOpenCompare, onOpenCompare, onToggleCompareMode, tripFocusRange, onTripFocusChange, focusedTripCount, onCountryClick, onContactClick }: TravelSectionProps) {
  const [view, setView] = useState<TravelView>('list')

  // Counting trips missed edits: changing a trip's dates changes who you can catch, but
  // not how many trips there are.
  const tripsSignature = useMemo(
    () => trips.map((t) => `${t.id}:${t.arrivalDate}:${t.departureDate ?? ''}`).join('|'),
    [trips],
  )

  const selectView = (next: TravelView) => {
    setView(next)
    if (next === 'days') track(ANALYTICS_EVENTS.daysTableViewed, { trips: trips.length })
  }

  return (
    <div className="p-4 md:p-5">
      {trips.length > 0 && !tripsLoading && (
        <CrossingsCard onContactClick={onContactClick} refreshKey={tripsSignature} />
      )}
      {trips.length > 0 && !tripsLoading && onTripFocusChange && (
        <TripPeriodFocus
          trips={trips}
          range={tripFocusRange ?? null}
          focusedCount={focusedTripCount ?? trips.length}
          onChange={onTripFocusChange}
        />
      )}
      {trips.length > 0 && !tripsLoading && (
        <div className="flex justify-end mb-3">
          <div className="flex items-center bg-muted/40 rounded-md p-0.5">
            <TooltipProvider>
              {VIEWS.map(({ value, icon: Icon, label }) => (
                <Tooltip key={value}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => selectView(value)}
                      aria-label={label}
                      aria-pressed={view === value}
                      className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${
                        view === value
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground/50 hover:text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">{label}</TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        </div>
      )}

      {view === 'days' && trips.length > 0 && !tripsLoading ? (
        <CountryDaysTable trips={trips} loading={tripsLoading} onCountryClick={onCountryClick} />
      ) : view === 'calendar' && trips.length > 0 && !tripsLoading ? (
        <TripCalendar
          trips={trips}
          onTripClick={onTripClick}
          onAddTrip={onAddTrip}
          onEditTrip={onEditTrip}
          onDeleteTrip={onDeleteTrip}
        />
      ) : (
        <TravelJourney
          trips={trips}
          loading={tripsLoading}
          onImport={onImportTrips}
          onTripClick={onTripClick}
          onAddTrip={onAddTrip}
          onEditTrip={onEditTrip}
          onDeleteTrip={onDeleteTrip}
          compareMode={compareMode}
          selectedCompareIds={selectedCompareIds}
          onToggleCompareTrip={onToggleCompareTrip}
          canOpenCompare={canOpenCompare}
          onOpenCompare={onOpenCompare}
          onToggleCompareMode={onToggleCompareMode}
        />
      )}
    </div>
  )
}
