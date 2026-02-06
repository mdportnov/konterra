import type { Contact, Interaction } from './db/schema'

export function totalContacts(contacts: Contact[]): number {
  return contacts.length
}

export function countriesCovered(contacts: Contact[]): number {
  return new Set(contacts.map((c) => c.country).filter(Boolean)).size
}

export function citiesCovered(contacts: Contact[]): number {
  return new Set(contacts.map((c) => c.city).filter(Boolean)).size
}

export function topCountries(contacts: Contact[], n: number = 10): { country: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const c of contacts) {
    if (c.country) counts.set(c.country, (counts.get(c.country) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

export function staleContacts(contacts: Contact[], days: number): Contact[] {
  const cutoff = Date.now() - days * 86400000
  return contacts
    .filter((c) => {
      const last = c.lastContactedAt ? new Date(c.lastContactedAt).getTime() : 0
      return last < cutoff
    })
    .sort((a, b) => {
      const aLast = a.lastContactedAt ? new Date(a.lastContactedAt).getTime() : 0
      const bLast = b.lastContactedAt ? new Date(b.lastContactedAt).getTime() : 0
      return aLast - bLast
    })
}

export function overdueFollowUps(contacts: Contact[]): Contact[] {
  const now = Date.now()
  return contacts
    .filter((c) => c.nextFollowUp && new Date(c.nextFollowUp).getTime() < now)
    .sort((a, b) => new Date(a.nextFollowUp!).getTime() - new Date(b.nextFollowUp!).getTime())
}

export function ratingDistribution(contacts: Contact[]): Record<number, number> {
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const c of contacts) {
    if (c.rating && c.rating >= 1 && c.rating <= 5) dist[c.rating]++
  }
  return dist
}

export function relationshipBreakdown(contacts: Contact[]): { type: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const c of contacts) {
    if (c.relationshipType) counts.set(c.relationshipType, (counts.get(c.relationshipType) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
}

export function recentActivity(interactions: Interaction[], limit: number = 15): Interaction[] {
  return [...interactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
}

export function networkHealthScore(contacts: Contact[], _interactions: Interaction[]): number {
  if (contacts.length === 0) return 0

  const now = Date.now()
  const ninetyDays = 90 * 86400000

  const activeCount = contacts.filter((c) => {
    const last = c.lastContactedAt ? new Date(c.lastContactedAt).getTime() : 0
    return now - last < ninetyDays
  }).length
  const activeRatio = activeCount / contacts.length

  const ratedContacts = contacts.filter((c) => c.rating && c.rating > 0)
  const avgRating = ratedContacts.length > 0
    ? ratedContacts.reduce((s, c) => s + (c.rating || 0), 0) / ratedContacts.length / 5
    : 0

  const countries = new Set(contacts.map((c) => c.country).filter(Boolean)).size
  const diversityScore = Math.min(countries / 10, 1)

  const overdueCount = contacts.filter((c) =>
    c.nextFollowUp && new Date(c.nextFollowUp).getTime() < now
  ).length
  const noOverdueRatio = 1 - Math.min(overdueCount / Math.max(contacts.length, 1), 1)

  return Math.round(
    activeRatio * 40 +
    avgRating * 30 +
    diversityScore * 20 +
    noOverdueRatio * 10
  )
}

export function monthlyTrend(interactions: Interaction[], months: number = 6): { month: string; count: number }[] {
  const now = new Date()
  const result: { month: string; count: number }[] = []

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const start = d.getTime()
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
    const count = interactions.filter((x) => {
      const t = new Date(x.date).getTime()
      return t >= start && t < end
    }).length
    result.push({ month: key, count })
  }

  return result
}
