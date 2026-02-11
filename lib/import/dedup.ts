import type { Contact } from '@/lib/db/schema'
import type { ParsedContact, ImportEntry, DedupMatch } from './types'
import { normalizePhone, normalizeName, namesMatch } from './normalize'

export function deduplicateParsed(parsed: ParsedContact[]): { unique: ParsedContact[]; removedCount: number } {
  const seen = new Map<string, boolean>()
  const unique = parsed.filter((p) => {
    const emailKey = p.email?.toLowerCase()
    const phoneKey = p.phone ? normalizePhone(p.phone) : undefined
    const nameKey = normalizeName(p.name)

    if (emailKey && seen.has(`e:${emailKey}`)) return false
    if (phoneKey && phoneKey.length >= 7 && seen.has(`p:${phoneKey}`)) return false
    if (!emailKey && !phoneKey && nameKey && seen.has(`n:${nameKey}`)) return false

    if (emailKey) seen.set(`e:${emailKey}`, true)
    if (phoneKey && phoneKey.length >= 7) seen.set(`p:${phoneKey}`, true)
    if (nameKey) seen.set(`n:${nameKey}`, true)
    return true
  })
  return { unique, removedCount: parsed.length - unique.length }
}

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
