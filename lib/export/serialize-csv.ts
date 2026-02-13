import type { Contact } from '@/lib/db/schema'

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

function fmt(v: string | null | undefined): string {
  return v ?? ''
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return ''
  const date = d instanceof Date ? d : new Date(d)
  if (isNaN(date.getTime())) return ''
  return date.toISOString().split('T')[0]
}

const HEADERS = [
  'First Name',
  'Middle Name',
  'Last Name',
  'E-mail 1 - Value',
  'Phone 1 - Value',
  'Organization 1 - Name',
  'Organization 1 - Title',
  'Address 1 - City',
  'Address 1 - Country',
  'Address 1 - Formatted',
  'Birthday',
  'Website 1 - Value',
  'Notes',
  'Group Membership',
]

function splitName(name: string): { first: string; middle: string; last: string } {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return { first: parts[0], middle: '', last: '' }
  if (parts.length === 2) return { first: parts[0], middle: '', last: parts[1] }
  return { first: parts[0], middle: parts.slice(1, -1).join(' '), last: parts[parts.length - 1] }
}

export function serializeCSV(contacts: Contact[]): string {
  const rows = [HEADERS.map(escapeCSV).join(',')]

  for (const c of contacts) {
    const { first, middle, last } = splitName(c.name)
    const tags = (c.tags ?? []).join(' ::: ')
    const membership = tags ? `${tags} ::: * myContacts` : '* myContacts'

    const row = [
      first,
      middle,
      last,
      fmt(c.email),
      fmt(c.phone),
      fmt(c.company),
      fmt(c.role),
      fmt(c.city),
      fmt(c.country),
      fmt(c.address),
      fmtDate(c.birthday),
      fmt(c.website),
      fmt(c.notes),
      membership,
    ]
    rows.push(row.map(escapeCSV).join(','))
  }

  return rows.join('\n')
}
