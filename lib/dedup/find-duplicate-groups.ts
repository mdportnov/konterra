import type { Contact } from '@/lib/db/schema'
import { normalizePhone, namesMatch } from '@/lib/import/normalize'

export interface DuplicateGroup {
  id: string
  contacts: Contact[]
  confidence: 'exact' | 'possible'
  matchField: 'email' | 'phone' | 'name'
}

class UnionFind {
  parent: Map<string, string>
  rank: Map<string, number>

  constructor() {
    this.parent = new Map()
    this.rank = new Map()
  }

  make(x: string) {
    if (!this.parent.has(x)) {
      this.parent.set(x, x)
      this.rank.set(x, 0)
    }
  }

  find(x: string): string {
    const p = this.parent.get(x)
    if (p !== x) {
      const root = this.find(p!)
      this.parent.set(x, root)
      return root
    }
    return x
  }

  union(a: string, b: string) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra === rb) return
    const rankA = this.rank.get(ra)!
    const rankB = this.rank.get(rb)!
    if (rankA < rankB) {
      this.parent.set(ra, rb)
    } else if (rankA > rankB) {
      this.parent.set(rb, ra)
    } else {
      this.parent.set(rb, ra)
      this.rank.set(ra, rankA + 1)
    }
  }
}

interface PairInfo {
  confidence: 'exact' | 'possible'
  matchField: 'email' | 'phone' | 'name'
}

export function findDuplicateGroups(contacts: Contact[]): DuplicateGroup[] {
  const uf = new UnionFind()
  const pairInfo = new Map<string, PairInfo>()
  const matched = new Set<string>()

  for (const c of contacts) uf.make(c.id)

  const emailMap = new Map<string, Contact[]>()
  const phoneMap = new Map<string, Contact[]>()

  for (const c of contacts) {
    if (c.email) {
      const key = c.email.toLowerCase()
      const arr = emailMap.get(key)
      if (arr) arr.push(c)
      else emailMap.set(key, [c])
    }
    if (c.phone) {
      const key = normalizePhone(c.phone)
      if (key.length >= 7) {
        const arr = phoneMap.get(key)
        if (arr) arr.push(c)
        else phoneMap.set(key, [c])
      }
    }
  }

  for (const group of emailMap.values()) {
    if (group.length < 2) continue
    for (let i = 1; i < group.length; i++) {
      uf.union(group[0].id, group[i].id)
      matched.add(group[0].id)
      matched.add(group[i].id)
      const pairKey = [group[0].id, group[i].id].sort().join(':')
      if (!pairInfo.has(pairKey)) {
        pairInfo.set(pairKey, { confidence: 'exact', matchField: 'email' })
      }
    }
  }

  for (const group of phoneMap.values()) {
    if (group.length < 2) continue
    for (let i = 1; i < group.length; i++) {
      uf.union(group[0].id, group[i].id)
      matched.add(group[0].id)
      matched.add(group[i].id)
      const pairKey = [group[0].id, group[i].id].sort().join(':')
      if (!pairInfo.has(pairKey)) {
        pairInfo.set(pairKey, { confidence: 'exact', matchField: 'phone' })
      }
    }
  }

  const unmatched = contacts.filter((c) => !matched.has(c.id))
  for (let i = 0; i < unmatched.length; i++) {
    for (let j = i + 1; j < unmatched.length; j++) {
      if (namesMatch(unmatched[i].name, unmatched[j].name)) {
        uf.union(unmatched[i].id, unmatched[j].id)
        const pairKey = [unmatched[i].id, unmatched[j].id].sort().join(':')
        if (!pairInfo.has(pairKey)) {
          pairInfo.set(pairKey, { confidence: 'possible', matchField: 'name' })
        }
      }
    }
  }

  const groups = new Map<string, Contact[]>()
  for (const c of contacts) {
    const root = uf.find(c.id)
    const arr = groups.get(root)
    if (arr) arr.push(c)
    else groups.set(root, [c])
  }

  const result: DuplicateGroup[] = []
  for (const [, members] of groups) {
    if (members.length < 2) continue

    let bestConfidence: 'exact' | 'possible' = 'possible'
    let bestField: 'email' | 'phone' | 'name' = 'name'

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const key = [members[i].id, members[j].id].sort().join(':')
        const info = pairInfo.get(key)
        if (info?.confidence === 'exact') {
          bestConfidence = 'exact'
          bestField = info.matchField
        } else if (info && bestConfidence !== 'exact') {
          bestField = info.matchField
        }
      }
    }

    result.push({
      id: members.map((m) => m.id).sort().join('-'),
      contacts: members,
      confidence: bestConfidence,
      matchField: bestField,
    })
  }

  return result.sort((a, b) => b.contacts.length - a.contacts.length)
}
