import type { Trip, CountryWishlistEntry } from '@/lib/db/schema'
import type { KonterraTravelExport, TravelSection } from './types'
import { escapeCSV, fmtDate, CSV_BOM } from './csv-utils'

export function serializeTravelJSON(
  trips: Trip[],
  visitedCountries: string[],
  wishlist: CountryWishlistEntry[],
  sections: Set<TravelSection>,
): string {
  const data: KonterraTravelExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
  }

  if (sections.has('trips')) {
    data.trips = trips.map((t) => ({
      arrivalDate: fmtDate(t.arrivalDate),
      departureDate: t.departureDate ? fmtDate(t.departureDate) : null,
      durationDays: t.durationDays,
      city: t.city,
      country: t.country,
      lat: t.lat,
      lng: t.lng,
      notes: t.notes,
    }))
  }

  if (sections.has('visited')) {
    data.visitedCountries = visitedCountries
  }

  if (sections.has('wishlist')) {
    data.wishlist = wishlist.map((w) => ({
      country: w.country,
      priority: w.priority,
      status: w.status,
      notes: w.notes,
    }))
  }

  return JSON.stringify(data, null, 2)
}

const TRIP_HEADERS = [
  'Arrival Date',
  'Departure Date',
  'Duration',
  'City',
  'Country',
  'Lat',
  'Lng',
  'Notes',
]

export function serializeTravelCSV(trips: Trip[]): string {
  const rows = [TRIP_HEADERS.map(escapeCSV).join(',')]

  for (const t of trips) {
    const row = [
      fmtDate(t.arrivalDate),
      t.departureDate ? fmtDate(t.departureDate) : '',
      t.durationDays != null ? String(t.durationDays) : '',
      t.city,
      t.country,
      t.lat != null ? String(t.lat) : '',
      t.lng != null ? String(t.lng) : '',
      t.notes ?? '',
    ]
    rows.push(row.map(escapeCSV).join(','))
  }

  return CSV_BOM + rows.join('\n')
}
