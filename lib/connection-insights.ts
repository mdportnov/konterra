import type { Contact, ContactConnection, Interaction, Favor } from './db/schema'

export interface NetworkMetrics {
  totalConnections: number
  networkDensity: number
  averageStrength: number
  bidirectionalRatio: number
  connectedContactsRatio: number
}

export interface Hub {
  contact: Contact
  degree: number
  avgStrength: number
  connectionTypes: string[]
}

export interface Cluster {
  id: number
  contacts: Contact[]
  internalConnections: number
  avgStrength: number
  dominantType: string | null
  sharedTags: string[]
  sharedCountry: string | null
}

export interface IntroductionSuggestion {
  contactA: Contact
  contactB: Contact
  reasons: string[]
  score: number
}

export interface WeakConnectionAlert {
  connection: ContactConnection
  source: Contact
  target: Contact
  issue: 'low_strength' | 'no_recent_interaction' | 'one_directional'
  detail: string
}

export interface BridgeContact {
  contact: Contact
  clustersConnected: number
  degree: number
}

export interface RiskAlert {
  type: 'single_point_of_failure' | 'cooling_hub' | 'unbalanced_favor' | 'isolated_high_value'
  severity: 'high' | 'medium' | 'low'
  contact: Contact
  description: string
}

export interface ConnectionTypeStats {
  type: string
  count: number
  avgStrength: number
}

export interface StrengthDistribution {
  strength: number
  count: number
}

export interface InsightsSummary {
  metrics: NetworkMetrics
  topInsight: string
  actionableCount: number
  healthTrend: 'improving' | 'stable' | 'declining'
}

type AdjacencyMap = Map<string, Set<string>>

function buildAdjacencyMap(connections: ContactConnection[]): AdjacencyMap {
  const adj: AdjacencyMap = new Map()
  for (const conn of connections) {
    if (!adj.has(conn.sourceContactId)) adj.set(conn.sourceContactId, new Set())
    if (!adj.has(conn.targetContactId)) adj.set(conn.targetContactId, new Set())
    adj.get(conn.sourceContactId)!.add(conn.targetContactId)
    if (conn.bidirectional) {
      adj.get(conn.targetContactId)!.add(conn.sourceContactId)
    }
  }
  return adj
}

function buildDegreeMap(connections: ContactConnection[]): Map<string, number> {
  const degrees = new Map<string, number>()
  for (const conn of connections) {
    degrees.set(conn.sourceContactId, (degrees.get(conn.sourceContactId) || 0) + 1)
    degrees.set(conn.targetContactId, (degrees.get(conn.targetContactId) || 0) + 1)
  }
  return degrees
}

export function computeNetworkMetrics(contacts: Contact[], connections: ContactConnection[]): NetworkMetrics {
  const n = contacts.length
  const maxPossible = n > 1 ? (n * (n - 1)) / 2 : 1
  const totalConnections = connections.length
  const networkDensity = totalConnections / maxPossible

  const strengths = connections.map((c) => c.strength || 3)
  const averageStrength = strengths.length > 0
    ? strengths.reduce((a, b) => a + b, 0) / strengths.length
    : 0

  const bidirectionalCount = connections.filter((c) => c.bidirectional).length
  const bidirectionalRatio = totalConnections > 0 ? bidirectionalCount / totalConnections : 0

  const connectedIds = new Set<string>()
  for (const conn of connections) {
    connectedIds.add(conn.sourceContactId)
    connectedIds.add(conn.targetContactId)
  }
  const connectedContactsRatio = n > 0 ? connectedIds.size / n : 0

  return {
    totalConnections,
    networkDensity,
    averageStrength,
    bidirectionalRatio,
    connectedContactsRatio,
  }
}

export function connectionTypeBreakdown(connections: ContactConnection[]): ConnectionTypeStats[] {
  const groups = new Map<string, { count: number; totalStrength: number }>()
  for (const conn of connections) {
    const entry = groups.get(conn.connectionType) || { count: 0, totalStrength: 0 }
    entry.count++
    entry.totalStrength += conn.strength || 3
    groups.set(conn.connectionType, entry)
  }
  return Array.from(groups.entries())
    .map(([type, { count, totalStrength }]) => ({
      type,
      count,
      avgStrength: count > 0 ? totalStrength / count : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

export function strengthDistribution(connections: ContactConnection[]): StrengthDistribution[] {
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const conn of connections) {
    const s = conn.strength || 3
    if (s >= 1 && s <= 5) dist[s]++
  }
  return [1, 2, 3, 4, 5].map((strength) => ({ strength, count: dist[strength] }))
}

export function findHubs(contacts: Contact[], connections: ContactConnection[], n: number = 5): Hub[] {
  const degrees = buildDegreeMap(connections)
  const contactMap = new Map(contacts.map((c) => [c.id, c]))

  const strengthByContact = new Map<string, number[]>()
  const typesByContact = new Map<string, Set<string>>()

  for (const conn of connections) {
    for (const id of [conn.sourceContactId, conn.targetContactId]) {
      if (!strengthByContact.has(id)) strengthByContact.set(id, [])
      strengthByContact.get(id)!.push(conn.strength || 3)
      if (!typesByContact.has(id)) typesByContact.set(id, new Set())
      typesByContact.get(id)!.add(conn.connectionType)
    }
  }

  return Array.from(degrees.entries())
    .filter(([id]) => contactMap.has(id))
    .map(([id, degree]) => ({
      contact: contactMap.get(id)!,
      degree,
      avgStrength: strengthByContact.has(id)
        ? strengthByContact.get(id)!.reduce((a, b) => a + b, 0) / strengthByContact.get(id)!.length
        : 0,
      connectionTypes: typesByContact.has(id) ? Array.from(typesByContact.get(id)!) : [],
    }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, n)
}

export function detectClusters(contacts: Contact[], connections: ContactConnection[]): Cluster[] {
  const contactMap = new Map(contacts.map((c) => [c.id, c]))
  const parent = new Map<string, string>()
  const rank = new Map<string, number>()

  for (const c of contacts) {
    parent.set(c.id, c.id)
    rank.set(c.id, 0)
  }

  function find(x: string): string {
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)!))
    }
    return parent.get(x)!
  }

  function union(a: string, b: string) {
    const ra = find(a)
    const rb = find(b)
    if (ra === rb) return
    const rankA = rank.get(ra) || 0
    const rankB = rank.get(rb) || 0
    if (rankA < rankB) parent.set(ra, rb)
    else if (rankA > rankB) parent.set(rb, ra)
    else {
      parent.set(rb, ra)
      rank.set(ra, rankA + 1)
    }
  }

  for (const conn of connections) {
    if (contactMap.has(conn.sourceContactId) && contactMap.has(conn.targetContactId)) {
      union(conn.sourceContactId, conn.targetContactId)
    }
  }

  const clusterMembers = new Map<string, string[]>()
  for (const c of contacts) {
    const root = find(c.id)
    if (!clusterMembers.has(root)) clusterMembers.set(root, [])
    clusterMembers.get(root)!.push(c.id)
  }

  let clusterId = 0
  const clusters: Cluster[] = []

  for (const [, memberIds] of clusterMembers) {
    if (memberIds.length < 2) continue

    const members = memberIds.map((id) => contactMap.get(id)!).filter(Boolean)
    const memberSet = new Set(memberIds)

    const internalConns = connections.filter(
      (c) => memberSet.has(c.sourceContactId) && memberSet.has(c.targetContactId)
    )

    const avgStrength = internalConns.length > 0
      ? internalConns.reduce((s, c) => s + (c.strength || 3), 0) / internalConns.length
      : 0

    const typeCounts = new Map<string, number>()
    for (const c of internalConns) {
      typeCounts.set(c.connectionType, (typeCounts.get(c.connectionType) || 0) + 1)
    }
    let dominantType: string | null = null
    let maxCount = 0
    for (const [type, count] of typeCounts) {
      if (count > maxCount) {
        maxCount = count
        dominantType = type
      }
    }

    const tagCounts = new Map<string, number>()
    for (const m of members) {
      m.tags?.forEach((t) => tagCounts.set(t, (tagCounts.get(t) || 0) + 1))
    }
    const sharedTags = Array.from(tagCounts.entries())
      .filter(([, count]) => count >= Math.ceil(members.length * 0.5))
      .map(([tag]) => tag)

    const countryCounts = new Map<string, number>()
    for (const m of members) {
      if (m.country) countryCounts.set(m.country, (countryCounts.get(m.country) || 0) + 1)
    }
    let sharedCountry: string | null = null
    for (const [country, count] of countryCounts) {
      if (count >= Math.ceil(members.length * 0.6)) {
        sharedCountry = country
        break
      }
    }

    clusters.push({
      id: clusterId++,
      contacts: members,
      internalConnections: internalConns.length,
      avgStrength,
      dominantType,
      sharedTags,
      sharedCountry,
    })
  }

  return clusters.sort((a, b) => b.contacts.length - a.contacts.length)
}

export function findIsolatedContacts(contacts: Contact[], connections: ContactConnection[]): Contact[] {
  const connectedIds = new Set<string>()
  for (const conn of connections) {
    connectedIds.add(conn.sourceContactId)
    connectedIds.add(conn.targetContactId)
  }
  return contacts.filter((c) => !connectedIds.has(c.id))
}

export function findBridgeContacts(contacts: Contact[], connections: ContactConnection[]): BridgeContact[] {
  const clusters = detectClusters(contacts, connections)
  if (clusters.length < 2) return []

  const contactToCluster = new Map<string, number>()
  for (const cluster of clusters) {
    for (const c of cluster.contacts) {
      contactToCluster.set(c.id, cluster.id)
    }
  }

  const contactMap = new Map(contacts.map((c) => [c.id, c]))
  const bridgeCandidates = new Map<string, Set<number>>()
  const degrees = buildDegreeMap(connections)

  for (const conn of connections) {
    const clusterA = contactToCluster.get(conn.sourceContactId)
    const clusterB = contactToCluster.get(conn.targetContactId)
    if (clusterA !== undefined && clusterB !== undefined && clusterA !== clusterB) {
      for (const id of [conn.sourceContactId, conn.targetContactId]) {
        if (!bridgeCandidates.has(id)) bridgeCandidates.set(id, new Set())
        bridgeCandidates.get(id)!.add(clusterA)
        bridgeCandidates.get(id)!.add(clusterB)
      }
    }
  }

  return Array.from(bridgeCandidates.entries())
    .filter(([id]) => contactMap.has(id))
    .map(([id, clusterSet]) => ({
      contact: contactMap.get(id)!,
      clustersConnected: clusterSet.size,
      degree: degrees.get(id) || 0,
    }))
    .sort((a, b) => b.clustersConnected - a.clustersConnected || b.degree - a.degree)
}

export function suggestIntroductions(
  contacts: Contact[],
  connections: ContactConnection[],
  maxSuggestions: number = 10
): IntroductionSuggestion[] {
  const existingPairs = new Set<string>()
  for (const conn of connections) {
    existingPairs.add(`${conn.sourceContactId}:${conn.targetContactId}`)
    existingPairs.add(`${conn.targetContactId}:${conn.sourceContactId}`)
  }

  const adj = buildAdjacencyMap(connections)
  const suggestions: IntroductionSuggestion[] = []

  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const a = contacts[i]
      const b = contacts[j]

      if (existingPairs.has(`${a.id}:${b.id}`)) continue

      const reasons: string[] = []
      let score = 0

      const sharedTags = a.tags?.filter((t) => b.tags?.includes(t)) || []
      if (sharedTags.length > 0) {
        reasons.push(`Shared tags: ${sharedTags.join(', ')}`)
        score += sharedTags.length * 15
      }

      if (a.company && b.company && a.company === b.company) {
        reasons.push(`Same company: ${a.company}`)
        score += 25
      }

      if (a.city && b.city && a.city === b.city) {
        reasons.push(`Same city: ${a.city}`)
        score += 20
      } else if (a.country && b.country && a.country === b.country) {
        reasons.push(`Same country: ${a.country}`)
        score += 10
      }

      const sharedInterests = a.personalInterests?.filter(
        (i) => b.personalInterests?.includes(i)
      ) || []
      if (sharedInterests.length > 0) {
        reasons.push(`Shared interests: ${sharedInterests.join(', ')}`)
        score += sharedInterests.length * 10
      }

      const sharedGoals = a.professionalGoals?.filter(
        (g) => b.professionalGoals?.includes(g)
      ) || []
      if (sharedGoals.length > 0) {
        reasons.push(`Aligned goals: ${sharedGoals.join(', ')}`)
        score += sharedGoals.length * 12
      }

      if (a.relationshipType && b.relationshipType && a.relationshipType === b.relationshipType) {
        reasons.push(`Same relationship type: ${a.relationshipType}`)
        score += 5
      }

      const aNeighbors = adj.get(a.id) || new Set()
      const bNeighbors = adj.get(b.id) || new Set()
      let mutualCount = 0
      for (const n of aNeighbors) {
        if (bNeighbors.has(n)) mutualCount++
      }
      if (mutualCount > 0) {
        reasons.push(`${mutualCount} mutual connection${mutualCount > 1 ? 's' : ''}`)
        score += mutualCount * 20
      }

      if (reasons.length >= 2 || score >= 25) {
        suggestions.push({ contactA: a, contactB: b, reasons, score })
      }
    }
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, maxSuggestions)
}

export function findWeakConnections(
  contacts: Contact[],
  connections: ContactConnection[],
  interactions: Interaction[]
): WeakConnectionAlert[] {
  const contactMap = new Map(contacts.map((c) => [c.id, c]))
  const alerts: WeakConnectionAlert[] = []

  const now = Date.now()
  const ninetyDays = 90 * 86400000
  const interactionsByContact = new Map<string, Interaction[]>()
  for (const i of interactions) {
    if (!interactionsByContact.has(i.contactId)) interactionsByContact.set(i.contactId, [])
    interactionsByContact.get(i.contactId)!.push(i)
  }

  for (const conn of connections) {
    const source = contactMap.get(conn.sourceContactId)
    const target = contactMap.get(conn.targetContactId)
    if (!source || !target) continue

    if ((conn.strength || 3) <= 2) {
      alerts.push({
        connection: conn,
        source,
        target,
        issue: 'low_strength',
        detail: `Connection strength is only ${conn.strength || 3}/5`,
      })
    }

    if ((conn.strength || 3) >= 4) {
      const sourceInteractions = interactionsByContact.get(conn.sourceContactId) || []
      const targetInteractions = interactionsByContact.get(conn.targetContactId) || []
      const sourceRecent = sourceInteractions.some((i) => now - new Date(i.date).getTime() < ninetyDays)
      const targetRecent = targetInteractions.some((i) => now - new Date(i.date).getTime() < ninetyDays)

      if (!sourceRecent && !targetRecent) {
        alerts.push({
          connection: conn,
          source,
          target,
          issue: 'no_recent_interaction',
          detail: `Strong connection (${conn.strength}/5) but no interaction with either contact in 90 days`,
        })
      }
    }

    if (!conn.bidirectional) {
      alerts.push({
        connection: conn,
        source,
        target,
        issue: 'one_directional',
        detail: `One-directional ${conn.connectionType} connection`,
      })
    }
  }

  return alerts.sort((a, b) => {
    const priority = { no_recent_interaction: 0, low_strength: 1, one_directional: 2 }
    return priority[a.issue] - priority[b.issue]
  })
}

export function computeRiskAlerts(
  contacts: Contact[],
  connections: ContactConnection[],
  interactions: Interaction[],
  favors: Favor[]
): RiskAlert[] {
  const alerts: RiskAlert[] = []
  const contactMap = new Map(contacts.map((c) => [c.id, c]))
  const degrees = buildDegreeMap(connections)
  const now = Date.now()
  const thirtyDays = 30 * 86400000
  const sixtyDays = 60 * 86400000

  const bridges = findBridgeContacts(contacts, connections)
  for (const bridge of bridges) {
    if (bridge.clustersConnected >= 2) {
      alerts.push({
        type: 'single_point_of_failure',
        severity: bridge.clustersConnected >= 3 ? 'high' : 'medium',
        contact: bridge.contact,
        description: `Bridges ${bridge.clustersConnected} clusters. If this connection weakens, parts of your network become disconnected.`,
      })
    }
  }

  const hubs = findHubs(contacts, connections, 10)
  const interactionsByContact = new Map<string, Interaction[]>()
  for (const i of interactions) {
    if (!interactionsByContact.has(i.contactId)) interactionsByContact.set(i.contactId, [])
    interactionsByContact.get(i.contactId)!.push(i)
  }

  for (const hub of hubs) {
    if (hub.degree < 3) continue
    const hubInteractions = interactionsByContact.get(hub.contact.id) || []
    const recent = hubInteractions.filter((i) => now - new Date(i.date).getTime() < thirtyDays).length
    const previous = hubInteractions.filter((i) => {
      const t = now - new Date(i.date).getTime()
      return t >= thirtyDays && t < sixtyDays
    }).length

    if (recent < previous && previous > 0) {
      alerts.push({
        type: 'cooling_hub',
        severity: hub.degree >= 5 ? 'high' : 'medium',
        contact: hub.contact,
        description: `Key hub (${hub.degree} connections) shows declining engagement: ${recent} interactions this month vs ${previous} last month.`,
      })
    }
  }

  const favorByContact = new Map<string, { given: number; received: number }>()
  for (const f of favors) {
    const entry = favorByContact.get(f.contactId) || { given: 0, received: 0 }
    if (f.direction === 'given') entry.given++
    else entry.received++
    favorByContact.set(f.contactId, entry)
  }

  for (const [contactId, balance] of favorByContact) {
    const contact = contactMap.get(contactId)
    if (!contact) continue
    const degree = degrees.get(contactId) || 0
    if (degree < 2) continue

    const imbalance = Math.abs(balance.given - balance.received)
    if (imbalance >= 3) {
      const direction = balance.given > balance.received ? 'giving' : 'receiving'
      alerts.push({
        type: 'unbalanced_favor',
        severity: imbalance >= 5 ? 'high' : 'medium',
        contact,
        description: `Significant favor imbalance with a well-connected contact: ${direction} ${imbalance} more than ${direction === 'giving' ? 'receiving' : 'giving'}.`,
      })
    }
  }

  const isolated = findIsolatedContacts(contacts, connections)
  for (const c of isolated) {
    if ((c.rating || 0) >= 4 || (c.influenceLevel || 0) >= 4) {
      alerts.push({
        type: 'isolated_high_value',
        severity: 'medium',
        contact: c,
        description: `High-value contact (rating ${c.rating}/5) has no connections to your network. Consider introducing them.`,
      })
    }
  }

  return alerts.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
}

export function networkReachAnalysis(
  contacts: Contact[],
  connections: ContactConnection[]
): { directReach: number; secondDegree: number; thirdDegree: number } {
  const adj = buildAdjacencyMap(connections)
  const allContactIds = new Set(contacts.map((c) => c.id))

  const directIds = new Set<string>()
  for (const conn of connections) {
    directIds.add(conn.sourceContactId)
    directIds.add(conn.targetContactId)
  }

  const secondDegreeIds = new Set<string>()
  for (const id of directIds) {
    const neighbors = adj.get(id) || new Set()
    for (const n of neighbors) {
      if (!directIds.has(n) && allContactIds.has(n)) {
        secondDegreeIds.add(n)
      }
    }
  }

  const thirdDegreeIds = new Set<string>()
  for (const id of secondDegreeIds) {
    const neighbors = adj.get(id) || new Set()
    for (const n of neighbors) {
      if (!directIds.has(n) && !secondDegreeIds.has(n) && allContactIds.has(n)) {
        thirdDegreeIds.add(n)
      }
    }
  }

  return {
    directReach: directIds.size,
    secondDegree: secondDegreeIds.size,
    thirdDegree: thirdDegreeIds.size,
  }
}

export function geographicConnectionDensity(
  contacts: Contact[],
  connections: ContactConnection[]
): { country: string; contacts: number; connections: number; density: number }[] {
  const contactsByCountry = new Map<string, Contact[]>()
  for (const c of contacts) {
    if (!c.country) continue
    if (!contactsByCountry.has(c.country)) contactsByCountry.set(c.country, [])
    contactsByCountry.get(c.country)!.push(c)
  }

  const contactCountry = new Map<string, string>()
  for (const c of contacts) {
    if (c.country) contactCountry.set(c.id, c.country)
  }

  const result: { country: string; contacts: number; connections: number; density: number }[] = []

  for (const [country, countryContacts] of contactsByCountry) {
    if (countryContacts.length < 2) continue
    const ids = new Set(countryContacts.map((c) => c.id))
    const internalConns = connections.filter(
      (c) => ids.has(c.sourceContactId) && ids.has(c.targetContactId)
    ).length

    const maxPossible = (countryContacts.length * (countryContacts.length - 1)) / 2

    result.push({
      country,
      contacts: countryContacts.length,
      connections: internalConns,
      density: maxPossible > 0 ? internalConns / maxPossible : 0,
    })
  }

  return result.sort((a, b) => b.contacts - a.contacts)
}

export function computeInsightsSummary(
  contacts: Contact[],
  connections: ContactConnection[],
  interactions: Interaction[],
  favors: Favor[]
): InsightsSummary {
  const metrics = computeNetworkMetrics(contacts, connections)
  const risks = computeRiskAlerts(contacts, connections, interactions, favors)
  const suggestions = suggestIntroductions(contacts, connections, 5)

  const highRisks = risks.filter((r) => r.severity === 'high').length
  const mediumRisks = risks.filter((r) => r.severity === 'medium').length
  const actionableCount = highRisks + mediumRisks + suggestions.length

  let topInsight: string
  if (highRisks > 0) {
    topInsight = `${highRisks} high-priority risk${highRisks > 1 ? 's' : ''} detected in your network`
  } else if (suggestions.length > 0) {
    topInsight = `${suggestions.length} potential introduction${suggestions.length > 1 ? 's' : ''} could strengthen your network`
  } else if (metrics.connectedContactsRatio < 0.5) {
    topInsight = `${Math.round((1 - metrics.connectedContactsRatio) * 100)}% of contacts have no connections mapped`
  } else {
    topInsight = 'Network is well-connected with no critical issues'
  }

  const now = Date.now()
  const thirtyDays = 30 * 86400000
  const recentInteractions = interactions.filter((i) => now - new Date(i.date).getTime() < thirtyDays).length
  const previousInteractions = interactions.filter((i) => {
    const t = now - new Date(i.date).getTime()
    return t >= thirtyDays && t < thirtyDays * 2
  }).length

  let healthTrend: 'improving' | 'stable' | 'declining'
  if (recentInteractions > previousInteractions * 1.1) healthTrend = 'improving'
  else if (recentInteractions < previousInteractions * 0.9) healthTrend = 'declining'
  else healthTrend = 'stable'

  return { metrics, topInsight, actionableCount, healthTrend }
}
