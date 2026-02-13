import type { Contact } from '@/lib/db/schema'

function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return ''
  const date = d instanceof Date ? d : new Date(d)
  if (isNaN(date.getTime())) return ''
  const y = date.getFullYear().toString().padStart(4, '0')
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${y}${m}${day}`
}

function splitName(name: string): { first: string; middle: string; last: string } {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return { first: parts[0], middle: '', last: '' }
  if (parts.length === 2) return { first: parts[0], middle: '', last: parts[1] }
  return { first: parts[0], middle: parts.slice(1, -1).join(' '), last: parts[parts.length - 1] }
}

function genderToVCard(g: string | null | undefined): string {
  if (g === 'male') return 'M'
  if (g === 'female') return 'F'
  return ''
}

function contactToVCard(c: Contact): string {
  const lines: string[] = ['BEGIN:VCARD', 'VERSION:4.0']
  const { first, middle, last } = splitName(c.name)

  lines.push(`FN:${escapeVCard(c.name)}`)
  lines.push(`N:${escapeVCard(last)};${escapeVCard(first)};${escapeVCard(middle)};;`)

  if (c.email) lines.push(`EMAIL:${c.email}`)
  if (c.phone) lines.push(`TEL:${c.phone}`)
  if (c.company) lines.push(`ORG:${escapeVCard(c.company)}`)
  if (c.role) lines.push(`TITLE:${escapeVCard(c.role)}`)

  if (c.city || c.country || c.address) {
    const street = c.address ? escapeVCard(c.address) : ''
    const city = c.city ? escapeVCard(c.city) : ''
    const country = c.country ? escapeVCard(c.country) : ''
    lines.push(`ADR:;;${street};${city};;;${country}`)
  }

  const bday = fmtDate(c.birthday)
  if (bday) lines.push(`BDAY:${bday}`)

  if (c.notes) lines.push(`NOTE:${escapeVCard(c.notes)}`)
  if (c.website) lines.push(`URL:${c.website}`)
  if (c.timezone) lines.push(`TZ:${c.timezone}`)

  const gender = genderToVCard(c.gender)
  if (gender) lines.push(`GENDER:${gender}`)

  if (c.tags && c.tags.length > 0) {
    lines.push(`CATEGORIES:${c.tags.map(escapeVCard).join(',')}`)
  }

  if (c.linkedin) lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${c.linkedin}`)
  if (c.twitter) lines.push(`X-SOCIALPROFILE;TYPE=twitter:${c.twitter}`)
  if (c.telegram) lines.push(`X-SOCIALPROFILE;TYPE=telegram:${c.telegram}`)
  if (c.instagram) lines.push(`X-SOCIALPROFILE;TYPE=instagram:${c.instagram}`)
  if (c.github) lines.push(`X-SOCIALPROFILE;TYPE=github:${c.github}`)

  lines.push('END:VCARD')
  return lines.join('\r\n')
}

export function serializeVCards(contacts: Contact[]): string {
  return contacts.map(contactToVCard).join('\r\n')
}
