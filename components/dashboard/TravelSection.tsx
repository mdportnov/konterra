import { useState } from 'react'
import { List, CalendarDays } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import TravelJourney from './widgets/TravelJourney'
import TripCalendar from './widgets/TripCalendar'
import type { Trip } from '@/lib/db/schema'

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
}

export default function TravelSection({ trips, tripsLoading, onImportTrips, onTripClick, onAddTrip, onEditTrip, onDeleteTrip, compareMode, selectedCompareIds, onToggleCompareTrip, canOpenCompare, onOpenCompare, onToggleCompareMode }: TravelSectionProps) {
  const [view, setView] = useState<'list' | 'calendar'>('list')

  return (
    <div className="p-4 md:p-5">
      {trips.length > 0 && !tripsLoading && (
        <div className="flex justify-end mb-3">
          <div className="flex items-center bg-muted/40 rounded-md p-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setView('list')}
                    className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${
                      view === 'list'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground/50 hover:text-muted-foreground'
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Timeline view</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setView('calendar')}
                    className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${
                      view === 'calendar'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground/50 hover:text-muted-foreground'
                    }`}
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Calendar view</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}

      {view === 'calendar' && trips.length > 0 && !tripsLoading ? (
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
