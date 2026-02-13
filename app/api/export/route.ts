import { NextResponse } from 'next/server'
import { withAuth, badRequest } from '@/lib/api-utils'
import {
  getAllContactsByUserId,
  getAllConnectionsByUserId,
  getAllInteractionsByUserId,
  getAllFavorsByUserId,
  getAllIntroductionsByUserId,
  getAllCountryConnections,
  getTagsByUserId,
  getVisitedCountries,
} from '@/lib/db/queries'
import { serializeKonterra } from '@/lib/export/serialize-konterra'
import { serializeCSV } from '@/lib/export/serialize-csv'
import { serializeVCards } from '@/lib/export/serialize-vcard'
import type { ExportFormat } from '@/lib/export/types'

const VALID_FORMATS: ExportFormat[] = ['konterra', 'csv', 'vcard']

export const GET = withAuth(async (req, userId) => {
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
})
