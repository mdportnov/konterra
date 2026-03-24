import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { unauthorized, badRequest, serverError } from '@/lib/api-utils'
import {
  getAllContactsByUserId,
  getAllConnectionsByUserId,
  getAllInteractionsByUserId,
  getAllFavorsByUserId,
  getAllIntroductionsByUserId,
  getAllCountryConnections,
  getTagsByUserId,
  getVisitedCountries,
  getTripsByUserId,
  getWishlistCountries,
} from '@/lib/db/queries'
import { serializeKonterra } from '@/lib/export/serialize-konterra'
import { serializeCSV } from '@/lib/export/serialize-csv'
import { serializeVCards } from '@/lib/export/serialize-vcard'
import { serializeTravelJSON, serializeTravelCSV } from '@/lib/export/serialize-travel'
import type { ExportFormat, TravelSection } from '@/lib/export/types'

const VALID_FORMATS: ExportFormat[] = ['konterra', 'csv', 'vcard', 'travel-json', 'travel-csv']
const VALID_SECTIONS: TravelSection[] = ['trips', 'visited', 'wishlist']

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const userId = session.user.id
    const { searchParams } = new URL(req.url)
    const format = (searchParams.get('format') || 'konterra') as ExportFormat
    if (!VALID_FORMATS.includes(format)) return badRequest('Invalid format')

    const now = new Date().toISOString().split('T')[0]

    if (format === 'konterra') {
      const [allContacts, connections, interactions, favors, intros, countryConns, userTags, visited] =
        await Promise.all([
          getAllContactsByUserId(userId),
          getAllConnectionsByUserId(userId),
          getAllInteractionsByUserId(userId),
          getAllFavorsByUserId(userId),
          getAllIntroductionsByUserId(userId),
          getAllCountryConnections(userId),
          getTagsByUserId(userId),
          getVisitedCountries(userId),
        ])

      const data = serializeKonterra(allContacts, connections, interactions, favors, intros, countryConns, userTags, visited)
      const body = JSON.stringify(data, null, 2)

      return new NextResponse(body, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="konterra-export-${now}.konterra.json"`,
        },
      })
    }

    if (format === 'travel-json') {
      const raw = searchParams.get('sections')
      const sections = new Set<TravelSection>(
        raw ? (raw.split(',').filter((s) => VALID_SECTIONS.includes(s as TravelSection)) as TravelSection[]) : VALID_SECTIONS,
      )

      const [tripsData, visited, wishlist] = await Promise.all([
        sections.has('trips') ? getTripsByUserId(userId) : Promise.resolve([]),
        sections.has('visited') ? getVisitedCountries(userId) : Promise.resolve([]),
        sections.has('wishlist') ? getWishlistCountries(userId) : Promise.resolve([]),
      ])

      const body = serializeTravelJSON(tripsData, visited, wishlist, sections)
      return new NextResponse(body, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="travel-export-${now}.json"`,
        },
      })
    }

    if (format === 'travel-csv') {
      const tripsData = await getTripsByUserId(userId)
      const body = serializeTravelCSV(tripsData)
      return new NextResponse(body, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="trips-${now}.csv"`,
        },
      })
    }

    const allContacts = await getAllContactsByUserId(userId)
    const exportable = allContacts.filter((c) => !c.isSelf)

    if (format === 'csv') {
      const body = serializeCSV(exportable)
      return new NextResponse(body, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="contacts-${now}.csv"`,
        },
      })
    }

    const body = serializeVCards(exportable)
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/vcard; charset=utf-8',
        'Content-Disposition': `attachment; filename="contacts-${now}.vcf"`,
      },
    })
  } catch (err) {
    console.error(err)
    return serverError()
  }
}
