import TravelJourney from './widgets/TravelJourney'
import type { Trip } from '@/lib/db/schema'

interface TravelSectionProps {
  trips: Trip[]
  tripsLoading: boolean
  onImportTrips: () => void
  onTripClick?: (trip: Trip) => void
}

export default function TravelSection({ trips, tripsLoading, onImportTrips, onTripClick }: TravelSectionProps) {
  return (
    <div className="p-4 md:p-5">
      <TravelJourney
        trips={trips}
        loading={tripsLoading}
        onImport={onImportTrips}
        onTripClick={onTripClick}
      />
    </div>
  )
}
