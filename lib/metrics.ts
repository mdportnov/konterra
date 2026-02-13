import type { Contact, Interaction, Favor } from './db/schema'

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

export function computeRelationshipStrength(
  contact: Contact,
  interactions: Interaction[],
  contactFavors: Favor[]
): number {
  if (!contact) return 0

  const now = Date.now()
  const thirtyDays = 30 * 86400000
  const sixtyDays = 60 * 86400000
  const ninetyDays = 90 * 86400000

  const recent30 = interactions.filter((i) => now - new Date(i.date).getTime() < thirtyDays).length
  const recent60 = interactions.filter((i) => now - new Date(i.date).getTime() < sixtyDays).length
  const recent90 = interactions.filter((i) => now - new Date(i.date).getTime() < ninetyDays).length

  const frequencyScore = Math.min((recent30 * 3 + recent60 * 2 + recent90) / 15, 1) * 30

  const types = new Set(interactions.map((i) => i.type))
  const diversityScore = Math.min(types.size / 4, 1) * 15

  const given = contactFavors.filter((f) => f.direction === 'given').length
  const received = contactFavors.filter((f) => f.direction === 'received').length
  const favorBalance = Math.min((given + received) / 4, 1) * 15

  const lastInteraction = interactions[0]
  let recencyScore = 0
  if (lastInteraction) {
    const daysSince = (now - new Date(lastInteraction.date).getTime()) / 86400000
    if (daysSince < 7) recencyScore = 20
    else if (daysSince < 30) recencyScore = 15
    else if (daysSince < 60) recencyScore = 10
    else if (daysSince < 90) recencyScore = 5
  }

  const ratingScore = ((contact.rating || 0) / 5) * 20

  return Math.round(Math.min(frequencyScore + diversityScore + favorBalance + recencyScore + ratingScore, 100))
}

export type Trajectory = 'growing' | 'stable' | 'cooling' | 'cold'

export function computeTrajectory(interactions: Interaction[]): Trajectory {
  const now = Date.now()
  const thirtyDays = 30 * 86400000

  const recent = interactions.filter((i) => now - new Date(i.date).getTime() < thirtyDays).length
  const previous = interactions.filter((i) => {
    const t = now - new Date(i.date).getTime()
    return t >= thirtyDays && t < thirtyDays * 2
  }).length

  if (recent === 0 && previous === 0) return 'cold'
  if (recent > previous) return 'growing'
  if (recent === previous) return 'stable'
  return 'cooling'
}

export function trajectoryIcon(trajectory: Trajectory): string {
  switch (trajectory) {
    case 'growing': return '\u2191'
    case 'stable': return '\u2192'
    case 'cooling': return '\u2198'
    case 'cold': return '\u2193'
  }
}

export function trajectoryColor(trajectory: Trajectory): string {
  switch (trajectory) {
    case 'growing': return 'text-green-500'
    case 'stable': return 'text-blue-400'
    case 'cooling': return 'text-amber-500'
    case 'cold': return 'text-red-400'
  }
}

export function computeProfileCompleteness(contact: Contact): { percent: number; missing: string[] } {
  const checks: { group: string; weight: number; filled: boolean }[] = [
    { group: 'basic', weight: 5, filled: !!contact.name },
    { group: 'basic', weight: 3, filled: !!contact.company },
    { group: 'basic', weight: 3, filled: !!contact.role },
    { group: 'basic', weight: 4, filled: !!contact.country },
    { group: 'basic', weight: 3, filled: !!contact.city },
    { group: 'basic', weight: 2, filled: !!contact.photo },
    { group: 'contact', weight: 3, filled: !!contact.email },
    { group: 'contact', weight: 3, filled: !!contact.phone },
    { group: 'contact', weight: 2, filled: !!contact.preferredChannel },
    { group: 'social', weight: 2, filled: !!contact.linkedin },
    { group: 'social', weight: 2, filled: !!(contact.twitter || contact.telegram || contact.instagram) },
    { group: 'relationship', weight: 3, filled: !!contact.relationshipType },
    { group: 'relationship', weight: 3, filled: !!contact.rating && contact.rating > 0 },
    { group: 'relationship', weight: 2, filled: !!contact.metAt },
    { group: 'relationship', weight: 2, filled: !!contact.communicationStyle },
    { group: 'psychology', weight: 3, filled: !!(contact.personalInterests && contact.personalInterests.length > 0) },
    { group: 'psychology', weight: 3, filled: !!(contact.professionalGoals && contact.professionalGoals.length > 0) },
    { group: 'psychology', weight: 2, filled: !!(contact.painPoints && contact.painPoints.length > 0) },
    { group: 'strategic', weight: 2, filled: !!contact.influenceLevel && contact.influenceLevel > 0 },
    { group: 'strategic', weight: 2, filled: !!contact.trustLevel && contact.trustLevel > 0 },
    { group: 'tags', weight: 3, filled: !!(contact.tags && contact.tags.length > 0) },
  ]

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0)
  const filledWeight = checks.filter((c) => c.filled).reduce((s, c) => s + c.weight, 0)
  const percent = Math.round((filledWeight / totalWeight) * 100)

  const groupLabels: Record<string, string> = {
    basic: 'Basic info',
    contact: 'Contact info',
    social: 'Social links',
    relationship: 'Relationship details',
    psychology: 'Interests & goals',
    strategic: 'Strategic assessment',
    tags: 'Tags',
  }
  const missingGroups = new Set<string>()
  for (const c of checks) {
    if (!c.filled) missingGroups.add(c.group)
  }
  const missing = [...missingGroups].map((g) => groupLabels[g] || g)

  return { percent, missing }
}

export function upcomingBirthdays(contacts: Contact[], daysAhead: number = 7): Contact[] {
  const now = new Date()
  return contacts.filter((c) => {
    if (!c.birthday) return false
    const bd = new Date(c.birthday)
    const thisYear = new Date(now.getFullYear(), bd.getMonth(), bd.getDate())
    if (thisYear < now) thisYear.setFullYear(thisYear.getFullYear() + 1)
    const diff = (thisYear.getTime() - now.getTime()) / 86400000
    return diff >= 0 && diff <= daysAhead
  })
}
