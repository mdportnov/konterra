import { NextResponse } from 'next/server'
import { withAuth, badRequest } from '@/lib/api-utils'
import { safeParseBody } from '@/lib/validation'
import {
  getAllContactsByUserId,
  getOrCreateSelfContact,
  createConnectionsBulk,
  createInteractionsBulk,
  createFavorsBulk,
  createIntroductionsBulk,
  createCountryConnectionsBulk,
  createTagsBulk,
  addVisitedCountriesBulk,
} from '@/lib/db/queries'
import type { KonterraExport } from '@/lib/export/types'
import type { NewContactConnection, NewFavor, NewIntroduction, NewContactCountryConnection } from '@/lib/db/schema'

function buildRefToIdMap(
  exportData: KonterraExport,
  dbContacts: { id: string; name: string; email: string | null; isSelf: boolean | null }[],
  selfContactId: string,
): Map<string, string> {
  const refMap = new Map<string, string>()

  const selfRef = exportData.contacts.find((c) => c.isSelf)?._ref
  if (selfRef) {
    refMap.set(selfRef, selfContactId)
  }

  const dbByNameEmail = new Map<string, string>()
  const dbByName = new Map<string, string>()
  for (const c of dbContacts) {
    if (c.isSelf) continue
    const key = c.email ? `${c.name.toLowerCase()}|${c.email.toLowerCase()}` : null
    if (key) dbByNameEmail.set(key, c.id)
    const nameKey = c.name.toLowerCase()
    if (!dbByName.has(nameKey)) {
      dbByName.set(nameKey, c.id)
    }
  }

  for (const ec of exportData.contacts) {
    if (ec.isSelf || refMap.has(ec._ref)) continue
    const nameEmailKey = ec.email ? `${ec.name.toLowerCase()}|${ec.email.toLowerCase()}` : null
    if (nameEmailKey && dbByNameEmail.has(nameEmailKey)) {
      refMap.set(ec._ref, dbByNameEmail.get(nameEmailKey)!)
    } else {
      const nameKey = ec.name.toLowerCase()
      if (dbByName.has(nameKey)) {
        refMap.set(ec._ref, dbByName.get(nameKey)!)
      }
    }
  }

  return refMap
}

export const POST = withAuth(async (req, userId) => {
  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid request body')

  const exportData = body as unknown as KonterraExport
  if (exportData.version !== 1 || !Array.isArray(exportData.contacts)) {
    return badRequest('Invalid Konterra export data')
  }

  const [dbContacts, selfContact] = await Promise.all([
    getAllContactsByUserId(userId),
    getOrCreateSelfContact(userId, 'Me'),
  ])

  const refMap = buildRefToIdMap(exportData, dbContacts, selfContact.id)

  const resolveRef = (ref: string): string | null => refMap.get(ref) ?? null

  let connectionsCreated = 0
  let interactionsCreated = 0
  let favorsCreated = 0
  let introductionsCreated = 0
  let countryConnectionsCreated = 0
  let tagsCreated = 0
  let visitedCountriesAdded = 0
  const errors: string[] = []

  if (exportData.connections?.length) {
    try {
      const connData: NewContactConnection[] = []
      for (const c of exportData.connections) {
        const sourceId = resolveRef(c.source)
        const targetId = resolveRef(c.target)
        if (!sourceId || !targetId) continue
        connData.push({
          userId,
          sourceContactId: sourceId,
          targetContactId: targetId,
          connectionType: c.connectionType as NewContactConnection['connectionType'],
          strength: c.strength ?? undefined,
          bidirectional: c.bidirectional ?? undefined,
          notes: c.notes ?? undefined,
        })
      }
      const result = await createConnectionsBulk(connData)
      connectionsCreated = result.length
    } catch (e) {
      errors.push(`Connections: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  if (exportData.interactions?.length) {
    try {
      const intData: { contactId: string; type: string; date: Date; location: string | null; notes: string | null }[] = []
      for (const i of exportData.interactions) {
        const contactId = resolveRef(i.contact)
        if (!contactId) continue
        const date = new Date(i.date)
        if (isNaN(date.getTime())) continue
        intData.push({
          contactId,
          type: i.type,
          date,
          location: i.location ?? null,
          notes: i.notes ?? null,
        })
      }
      const result = await createInteractionsBulk(intData)
      interactionsCreated = result.length
    } catch (e) {
      errors.push(`Interactions: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  if (exportData.favors?.length) {
    try {
      const favData: NewFavor[] = []
      for (const f of exportData.favors) {
        const contactId = resolveRef(f.contact)
        if (!contactId) continue
        favData.push({
          userId,
          contactId,
          direction: f.direction as NewFavor['direction'],
          type: f.type as NewFavor['type'],
          description: f.description ?? null,
          value: f.value as NewFavor['value'],
          status: f.status as NewFavor['status'],
          date: f.date ? new Date(f.date) : null,
          resolvedAt: f.resolvedAt ? new Date(f.resolvedAt) : null,
        })
      }
      const result = await createFavorsBulk(favData)
      favorsCreated = result.length
    } catch (e) {
      errors.push(`Favors: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  if (exportData.introductions?.length) {
    try {
      const introData: NewIntroduction[] = []
      for (const i of exportData.introductions) {
        const contactAId = resolveRef(i.contactA)
        const contactBId = resolveRef(i.contactB)
        if (!contactAId || !contactBId) continue
        introData.push({
          userId,
          contactAId,
          contactBId,
          initiatedBy: i.initiatedBy,
          status: i.status as NewIntroduction['status'],
          date: i.date ? new Date(i.date) : null,
          outcome: i.outcome ?? null,
          notes: i.notes ?? null,
        })
      }
      const result = await createIntroductionsBulk(introData)
      introductionsCreated = result.length
    } catch (e) {
      errors.push(`Introductions: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  if (exportData.countryConnections?.length) {
    try {
      const ccData: NewContactCountryConnection[] = []
      for (const cc of exportData.countryConnections) {
        const contactId = resolveRef(cc.contact)
        if (!contactId) continue
        ccData.push({
          userId,
          contactId,
          country: cc.country,
          notes: cc.notes ?? null,
          tags: cc.tags ?? null,
        })
      }
      const result = await createCountryConnectionsBulk(ccData)
      countryConnectionsCreated = result.length
    } catch (e) {
      errors.push(`Country connections: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  if (exportData.tags?.length) {
    try {
      const result = await createTagsBulk(userId, exportData.tags)
      tagsCreated = result.length
    } catch (e) {
      errors.push(`Tags: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  if (exportData.visitedCountries?.length) {
    try {
      await addVisitedCountriesBulk(userId, exportData.visitedCountries)
      visitedCountriesAdded = exportData.visitedCountries.length
    } catch (e) {
      errors.push(`Visited countries: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  return NextResponse.json({
    connectionsCreated,
    interactionsCreated,
    favorsCreated,
    introductionsCreated,
    countryConnectionsCreated,
    tagsCreated,
    visitedCountriesAdded,
    errors,
  })
})
