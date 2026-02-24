import type { ParsedContact } from './types'

function parseCSVRows(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows: string[][] = []
  let current = ''
  let inQuotes = false
  let fields: string[] = []

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < normalized.length && normalized[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(current)
        current = ''
      } else if (ch === '\n') {
        fields.push(current)
        current = ''
        rows.push(fields)
        fields = []
      } else {
        current += ch
      }
    }
  }

  fields.push(current)
  if (fields.some((f) => f !== '')) {
    rows.push(fields)
  }

  return rows
}

export function parseCSV(text: string): Record<string, string>[] {
  const allRows = parseCSVRows(text)
  if (allRows.length < 2) return []

  const headers = allRows[0]
  const rows: Record<string, string>[] = []

  for (let i = 1; i < allRows.length; i++) {
    const values = allRows[i]
    if (values.every((v) => v.trim() === '')) continue
    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j].trim()] = (values[j] || '').trim()
    }
    rows.push(row)
  }

  return rows
}

function col(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k]) return row[k].split(':::')[0].trim()
  }
  return ''
}

function normalizeBirthday(raw: string): string {
  if (!raw) return ''
  if (raw.startsWith('--')) return '1904-' + raw.slice(2)
  return raw
}

function buildAddress(row: Record<string, string>): string {
  const formatted = col(row, 'Address 1 - Formatted')
  if (formatted) return formatted
  return [
    col(row, 'Address 1 - Street'),
    col(row, 'Address 1 - PO Box'),
    col(row, 'Address 1 - City', 'City'),
    col(row, 'Address 1 - Region'),
    col(row, 'Address 1 - Postal Code'),
    col(row, 'Address 1 - Country', 'Country'),
  ].filter(Boolean).join(', ')
}

export function parseGoogleCSV(csvText: string): ParsedContact[] {
  const rows = parseCSV(csvText)
  const results: ParsedContact[] = []

  for (const row of rows) {
    const nameParts = [
      col(row, 'First Name', 'Given Name'),
      col(row, 'Middle Name', 'Additional Name'),
      col(row, 'Last Name', 'Family Name'),
    ].filter(Boolean)

    const name = nameParts.join(' ').trim()
    if (!name) continue

    const tags: string[] = []
    const groupMembership = row['Group Membership'] || row['Labels'] || ''
    if (groupMembership) {
      groupMembership
        .split(':::')
        .map((t) => t.trim())
        .filter((t) => t && t !== '* myContacts' && t !== 'myContacts')
        .forEach((t) => tags.push(t))
    }

    const contact: ParsedContact = {
      name,
      email: col(row, 'E-mail 1 - Value', 'E-mail Address', 'Email 1 - Value') || undefined,
      phone: col(row, 'Phone 1 - Value', 'Phone Number') || undefined,
      company: col(row, 'Organization 1 - Name', 'Organization Name', 'Organization', 'Company') || undefined,
      role: col(row, 'Organization 1 - Title', 'Organization Title', 'Job Title') || undefined,
      city: col(row, 'Address 1 - City', 'City') || undefined,
      country: col(row, 'Address 1 - Country', 'Country') || undefined,
      address: buildAddress(row) || undefined,
      birthday: normalizeBirthday(col(row, 'Birthday')) || undefined,
      website: col(row, 'Website 1 - Value', 'Website') || undefined,
      notes: col(row, 'Notes') || undefined,
      tags: tags.length > 0 ? tags : undefined,
    }

    results.push(contact)
  }

  return results
}
