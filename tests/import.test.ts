import { describe, expect, it } from 'vitest'
import { parseCSV } from '@/lib/import/parse-google-csv'
import { parseVCards } from '@/lib/import/parse-vcard'
import { deduplicateParsed, findDuplicates } from '@/lib/import/dedup'
import { namesMatch, normalizeName, normalizePhone, levenshtein } from '@/lib/import/normalize'
import { makeContact } from './factories'
import type { ParsedContact } from '@/lib/import/types'

function parsed(partial: Partial<ParsedContact> & { name: string }): ParsedContact {
  return { ...partial } as ParsedContact
}

describe('parseCSV', () => {
  it('parses a simple table', () => {
    expect(parseCSV('Name,Email\nAna,ana@example.com')).toEqual([
      { Name: 'Ana', Email: 'ana@example.com' },
    ])
  })

  it('respects quoted fields containing commas', () => {
    const rows = parseCSV('Name,Notes\n"Lopez, Ana","Met in Lisbon, briefly"')
    expect(rows[0].Name).toBe('Lopez, Ana')
    expect(rows[0].Notes).toBe('Met in Lisbon, briefly')
  })

  it('unescapes doubled quotes', () => {
    expect(parseCSV('Name\n"She said ""hi"""')[0].Name).toBe('She said "hi"')
  })

  it('handles CRLF line endings', () => {
    expect(parseCSV('Name,Email\r\nAna,a@b.co')).toEqual([{ Name: 'Ana', Email: 'a@b.co' }])
  })

  it('skips fully blank rows', () => {
    expect(parseCSV('Name\nAna\n\nBen')).toHaveLength(2)
  })

  it('returns nothing for a header-only or empty file', () => {
    expect(parseCSV('Name,Email')).toEqual([])
    expect(parseCSV('')).toEqual([])
  })
})

describe('parseVCards', () => {
  it('extracts the basics from a vCard', () => {
    const vcf = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:Ana Lopez',
      'EMAIL:ana@example.com',
      'TEL:+351 912 345 678',
      'ORG:Acme',
      'END:VCARD',
    ].join('\n')
    const [contact] = parseVCards(vcf)
    expect(contact.name).toBe('Ana Lopez')
    expect(contact.email).toBe('ana@example.com')
  })

  it('parses several cards in one file', () => {
    const vcf = ['BEGIN:VCARD', 'FN:A', 'END:VCARD', 'BEGIN:VCARD', 'FN:B', 'END:VCARD'].join('\n')
    expect(parseVCards(vcf)).toHaveLength(2)
  })

  it('returns nothing for junk input', () => {
    expect(parseVCards('not a vcard at all')).toEqual([])
  })
})

describe('normalizeName', () => {
  it('strips accents, punctuation and case', () => {
    expect(normalizeName('José  O’Brien-Smith')).toBe('jose obriensmith')
  })

  it('collapses whitespace', () => {
    expect(normalizeName('  Ana   Lopez ')).toBe('ana lopez')
  })
})

describe('normalizePhone', () => {
  it('keeps the leading plus and drops formatting', () => {
    expect(normalizePhone('+351 912-345 678')).toBe('+351912345678')
    expect(normalizePhone('(912) 345 678')).toBe('912345678')
  })
})

describe('levenshtein', () => {
  it('measures edit distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3)
    expect(levenshtein('abc', 'abc')).toBe(0)
    expect(levenshtein('', 'abc')).toBe(3)
  })
})

describe('namesMatch', () => {
  it('matches identical and differently-cased names', () => {
    expect(namesMatch('Ana Lopez', 'ana lopez')).toBe(true)
  })

  it('tolerates a small typo', () => {
    expect(namesMatch('Alexander Petrov', 'Alexandr Petrov')).toBe(true)
  })

  it('does not match different people', () => {
    expect(namesMatch('Ana Lopez', 'Ben Carter')).toBe(false)
  })

  it('returns false for empty input', () => {
    expect(namesMatch('', 'Ana')).toBe(false)
  })
})

describe('deduplicateParsed', () => {
  it('collapses rows sharing an email', () => {
    const result = deduplicateParsed([
      parsed({ name: 'Ana', email: 'ana@example.com' }),
      parsed({ name: 'Ana Lopez', email: 'ANA@example.com' }),
    ])
    expect(result.unique).toHaveLength(1)
    expect(result.removedCount).toBe(1)
  })

  it('collapses rows sharing a phone number written differently', () => {
    const result = deduplicateParsed([
      parsed({ name: 'Ana', phone: '+351 912345678' }),
      parsed({ name: 'Ana L', phone: '+351912345678' }),
    ])
    expect(result.unique).toHaveLength(1)
  })

  it('falls back to the name only when there is no email or phone', () => {
    const result = deduplicateParsed([parsed({ name: 'Ana Lopez' }), parsed({ name: 'ana lopez' })])
    expect(result.unique).toHaveLength(1)
  })

  it('keeps distinct people', () => {
    const result = deduplicateParsed([
      parsed({ name: 'Ana', email: 'ana@example.com' }),
      parsed({ name: 'Ben', email: 'ben@example.com' }),
    ])
    expect(result.unique).toHaveLength(2)
    expect(result.removedCount).toBe(0)
  })

  it('handles an empty import', () => {
    expect(deduplicateParsed([])).toEqual({ unique: [], removedCount: 0 })
  })
})

describe('findDuplicates', () => {
  it('flags an incoming row that matches an existing contact by email', () => {
    const entries = findDuplicates(
      [parsed({ name: 'Ana', email: 'ana@example.com' })],
      [makeContact({ id: 'c1', name: 'Ana Lopez', email: 'ana@example.com' })],
    )
    expect(entries[0].match).toBeTruthy()
  })

  it('leaves a genuinely new contact unflagged', () => {
    const entries = findDuplicates(
      [parsed({ name: 'Zoe', email: 'zoe@example.com' })],
      [makeContact({ id: 'c1', name: 'Ana', email: 'ana@example.com' })],
    )
    expect(entries[0].match).toBeFalsy()
  })

  it('handles an empty existing address book', () => {
    const entries = findDuplicates([parsed({ name: 'Ana' })], [])
    expect(entries).toHaveLength(1)
    expect(entries[0].match).toBeFalsy()
  })
})
