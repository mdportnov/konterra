import TravelJourney from './widgets/TravelJourney'
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
  return (
    <div className="p-4 md:p-5">
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
    </div>
  )
}
