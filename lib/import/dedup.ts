import type { Contact } from '@/lib/db/schema'
import type { ParsedContact, ImportEntry, DedupMatch } from './types'
import { normalizePhone, namesMatch } from './normalize'

export function findDuplicates(parsed: ParsedContact[], existing: Contact[]): ImportEntry[] {
  const emailMap = new Map<string, Contact>()
  const phoneMap = new Map<string, Contact>()

  for (const c of existing) {
    if (c.email) emailMap.set(c.email.toLowerCase(), c)
    if (c.phone) phoneMap.set(normalizePhone(c.phone), c)
  }

  return parsed.map((p) => {
    let match: DedupMatch | undefined

    if (p.email) {
      const found = emailMap.get(p.email.toLowerCase())
      if (found) {
        match = { existingContact: found, confidence: 'exact', matchField: 'email' }
      }
    }

    if (!match && p.phone) {
      const normalized = normalizePhone(p.phone)
      if (normalized.length >= 7) {
        const found = phoneMap.get(normalized)
        if (found) {
          match = { existingContact: found, confidence: 'exact', matchField: 'phone' }
        }
      }
    }

    if (!match) {
      for (const c of existing) {
        if (namesMatch(p.name, c.name)) {
          match = { existingContact: c, confidence: 'possible', matchField: 'name' }
          break
        }
      }
    }

    return {
      parsed: p,
      match,
      action: match ? 'skip' : 'create',
    }
  })
}
