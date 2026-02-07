import type { ParsedContact } from './types'

function unfoldLines(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '')
}

function parseProperty(line: string): { name: string; value: string } | null {
  const colonIdx = line.indexOf(':')
  if (colonIdx < 0) return null

  let name = line.substring(0, colonIdx)
  const value = line.substring(colonIdx + 1)

  const semiIdx = name.indexOf(';')
  if (semiIdx >= 0) name = name.substring(0, semiIdx)

  return { name: name.toUpperCase(), value }
}

function parseNameFromN(nValue: string): string {
  const parts = nValue.split(';')
  const lastName = (parts[0] || '').trim()
  const firstName = (parts[1] || '').trim()
  const middle = (parts[2] || '').trim()
  return [firstName, middle, lastName].filter(Boolean).join(' ')
}

function parseADR(adrValue: string): { city?: string; country?: string } {
  const parts = adrValue.split(';')
  return {
    city: (parts[3] || '').trim() || undefined,
    country: (parts[6] || '').trim() || undefined,
  }
}

function parseGender(value: string): string | undefined {
  const v = value.split(';')[0].trim().toUpperCase()
  if (v === 'M') return 'male'
  if (v === 'F') return 'female'
  return undefined
}

export function parseVCards(vcfText: string): ParsedContact[] {
  const unfolded = unfoldLines(vcfText)
  const blocks = unfolded.split(/(?=BEGIN:VCARD)/i)
  const results: ParsedContact[] = []

  for (const block of blocks) {
    if (!block.trim().toUpperCase().startsWith('BEGIN:VCARD')) continue
    if (!block.toUpperCase().includes('END:VCARD')) continue

    const lines = block.split('\n')
    const props = new Map<string, string>()

    for (const line of lines) {
      const parsed = parseProperty(line.trim())
      if (!parsed) continue
      if (!props.has(parsed.name)) {
        props.set(parsed.name, parsed.value)
      }
    }

    let name = (props.get('FN') || '').trim()
    if (!name && props.has('N')) {
      name = parseNameFromN(props.get('N')!)
    }
    if (!name) continue

    const adr = props.has('ADR') ? parseADR(props.get('ADR')!) : {}

    const tags: string[] = []
    const categories = props.get('CATEGORIES')
    if (categories) {
      categories.split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => tags.push(t))
    }

    results.push({
      name,
      phone: props.get('TEL')?.trim() || undefined,
      email: props.get('EMAIL')?.trim() || undefined,
      company: props.get('ORG')?.split(';')[0].trim() || undefined,
      role: props.get('TITLE')?.trim() || undefined,
      city: adr.city,
      country: adr.country,
      birthday: props.get('BDAY')?.trim() || undefined,
      notes: props.get('NOTE')?.trim() || undefined,
      website: props.get('URL')?.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      timezone: props.get('TZ')?.trim() || undefined,
      gender: props.has('GENDER') ? parseGender(props.get('GENDER')!) : undefined,
    })
  }

  return results
}
