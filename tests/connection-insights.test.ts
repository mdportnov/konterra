import { describe, expect, it } from 'vitest'
import {
  computeNetworkMetrics,
  connectionTypeBreakdown,
  detectClusters,
  findBridgeContacts,
  findHubs,
  findIsolatedContacts,
  strengthDistribution,
  suggestIntroductions,
} from '@/lib/connection-insights'
import { makeConnection, makeContact } from './factories'

const people = ['a', 'b', 'c', 'd', 'e'].map((id) =>
  makeContact({ id, name: id.toUpperCase() }),
)

describe('computeNetworkMetrics', () => {
  it('returns zeroed metrics for an empty network', () => {
    const metrics = computeNetworkMetrics([], [])
    expect(metrics.totalConnections).toBe(0)
    expect(metrics.averageStrength).toBe(0)
    expect(metrics.bidirectionalRatio).toBe(0)
    expect(metrics.connectedContactsRatio).toBe(0)
  })

  it('computes density against the number of possible pairs', () => {
    // Four contacts allow six pairs; three edges is half of that.
    const contacts = people.slice(0, 4)
    const connections = [
      makeConnection({ id: '1', sourceContactId: 'a', targetContactId: 'b' }),
      makeConnection({ id: '2', sourceContactId: 'b', targetContactId: 'c' }),
      makeConnection({ id: '3', sourceContactId: 'c', targetContactId: 'd' }),
    ]
    expect(computeNetworkMetrics(contacts, connections).networkDensity).toBeCloseTo(0.5, 5)
  })

  it('reports the share of contacts that have any connection', () => {
    const connections = [makeConnection({ id: '1', sourceContactId: 'a', targetContactId: 'b' })]
    expect(computeNetworkMetrics(people, connections).connectedContactsRatio).toBeCloseTo(2 / 5, 5)
  })

  it('averages strength using the default when unset', () => {
    const connections = [
      makeConnection({ id: '1', sourceContactId: 'a', targetContactId: 'b', strength: 5 }),
      makeConnection({ id: '2', sourceContactId: 'b', targetContactId: 'c', strength: 1 }),
    ]
    expect(computeNetworkMetrics(people, connections).averageStrength).toBe(3)
  })

  it('reports the bidirectional share', () => {
    const connections = [
      makeConnection({ id: '1', sourceContactId: 'a', targetContactId: 'b', bidirectional: true }),
      makeConnection({ id: '2', sourceContactId: 'b', targetContactId: 'c', bidirectional: false }),
    ]
    expect(computeNetworkMetrics(people, connections).bidirectionalRatio).toBe(0.5)
  })
})

describe('connectionTypeBreakdown', () => {
  it('groups by type with per-type average strength', () => {
    const connections = [
      makeConnection({ id: '1', sourceContactId: 'a', targetContactId: 'b', connectionType: 'knows', strength: 4 }),
      makeConnection({ id: '2', sourceContactId: 'b', targetContactId: 'c', connectionType: 'knows', strength: 2 }),
      makeConnection({ id: '3', sourceContactId: 'c', targetContactId: 'd', connectionType: 'works_with', strength: 5 }),
    ]
    const breakdown = connectionTypeBreakdown(connections)
    expect(breakdown[0]).toEqual({ type: 'knows', count: 2, avgStrength: 3 })
    expect(breakdown).toHaveLength(2)
  })

  it('handles no connections', () => {
    expect(connectionTypeBreakdown([])).toEqual([])
  })
})

describe('strengthDistribution', () => {
  it('counts connections per strength level', () => {
    const connections = [
      makeConnection({ id: '1', sourceContactId: 'a', targetContactId: 'b', strength: 5 }),
      makeConnection({ id: '2', sourceContactId: 'b', targetContactId: 'c', strength: 5 }),
      makeConnection({ id: '3', sourceContactId: 'c', targetContactId: 'd', strength: 2 }),
    ]
    const dist = strengthDistribution(connections)
    expect(dist.find((d) => d.strength === 5)?.count).toBe(2)
    expect(dist.find((d) => d.strength === 2)?.count).toBe(1)
  })
})

describe('findHubs', () => {
  it('ranks the most connected contacts first', () => {
    const connections = [
      makeConnection({ id: '1', sourceContactId: 'a', targetContactId: 'b' }),
      makeConnection({ id: '2', sourceContactId: 'a', targetContactId: 'c' }),
      makeConnection({ id: '3', sourceContactId: 'a', targetContactId: 'd' }),
      makeConnection({ id: '4', sourceContactId: 'b', targetContactId: 'c' }),
    ]
    const hubs = findHubs(people, connections, 2)
    expect(hubs[0].contact.id).toBe('a')
    expect(hubs[0].degree).toBe(3)
    expect(hubs).toHaveLength(2)
  })

  it('returns nothing without connections', () => {
    expect(findHubs(people, [])).toEqual([])
  })
})

describe('findIsolatedContacts', () => {
  it('finds contacts with no edges at all', () => {
    const connections = [makeConnection({ id: '1', sourceContactId: 'a', targetContactId: 'b' })]
    expect(findIsolatedContacts(people, connections).map((c) => c.id)).toEqual(['c', 'd', 'e'])
  })

  it('returns everyone when the graph is empty', () => {
    expect(findIsolatedContacts(people, [])).toHaveLength(5)
  })
})

describe('detectClusters', () => {
  it('separates two disconnected groups', () => {
    const connections = [
      makeConnection({ id: '1', sourceContactId: 'a', targetContactId: 'b' }),
      makeConnection({ id: '2', sourceContactId: 'b', targetContactId: 'c' }),
      makeConnection({ id: '3', sourceContactId: 'd', targetContactId: 'e' }),
    ]
    const clusters = detectClusters(people, connections)
    expect(clusters).toHaveLength(2)
    expect(clusters[0].contacts.length).toBeGreaterThanOrEqual(clusters[1].contacts.length)
  })

  it('returns nothing for an empty graph', () => {
    expect(detectClusters(people, [])).toEqual([])
  })
})

describe('findBridgeContacts', () => {
  it('does not crash on a graph with a single cluster', () => {
    const connections = [
      makeConnection({ id: '1', sourceContactId: 'a', targetContactId: 'b' }),
      makeConnection({ id: '2', sourceContactId: 'b', targetContactId: 'c' }),
    ]
    expect(Array.isArray(findBridgeContacts(people, connections))).toBe(true)
  })
})

describe('suggestIntroductions', () => {
  it('never suggests a pair that is already connected', () => {
    const contacts = [
      makeContact({ id: 'a', name: 'A', country: 'Spain', tags: ['founder'] }),
      makeContact({ id: 'b', name: 'B', country: 'Spain', tags: ['founder'] }),
    ]
    const connections = [makeConnection({ id: '1', sourceContactId: 'a', targetContactId: 'b' })]
    const suggestions = suggestIntroductions(contacts, connections)
    const pair = suggestions.find(
      (s) =>
        (s.contactA.id === 'a' && s.contactB.id === 'b') ||
        (s.contactA.id === 'b' && s.contactB.id === 'a'),
    )
    expect(pair).toBeUndefined()
  })

  it('never suggests introducing someone to themselves', () => {
    const contacts = [makeContact({ id: 'a', name: 'A', country: 'Spain' })]
    for (const s of suggestIntroductions(contacts, [])) {
      expect(s.contactA.id).not.toBe(s.contactB.id)
    }
  })

  it('returns nothing when there is nobody to pair', () => {
    expect(suggestIntroductions([], [])).toEqual([])
  })
})
