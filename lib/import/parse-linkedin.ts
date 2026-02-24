import type { ParsedContact } from './types'
import { parseCSV } from './parse-google-csv'

function stripNotes(text: string): string {
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    if (/First Name/i.test(lines[i])) {
      return lines.slice(i).join('\n')
    }
  }
  return text
}

function stripBOM(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) return text.slice(1)
  return text
}

function parseDate(raw: string): string {
  if (!raw) return ''
  const d = new Date(raw)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseLinkedInCSV(csvText: string): ParsedContact[] {
  const cleaned = stripNotes(stripBOM(csvText))
  const rows = parseCSV(cleaned)
  const results: ParsedContact[] = []

  for (const row of rows) {
    const firstName = (row['First Name'] || '').trim()
    const lastName = (row['Last Name'] || '').trim()
    const name = [firstName, lastName].filter(Boolean).join(' ')
    if (!name) continue

    const email = (row['Email Address'] || '').trim() || undefined
    const company = (row['Company'] || '').trim() || undefined
    const position = (row['Position'] || '').trim() || undefined
    const connectedOn = parseDate((row['Connected On'] || '').trim()) || undefined
    const url = (row['URL'] || '').trim()

    const contact: ParsedContact = {
      name,
      email,
      company,
      role: position,
      linkedin: url && (url.startsWith('http://') || url.startsWith('https://')) ? url : undefined,
      metDate: connectedOn,
    }

    results.push(contact)
  }

  return results
}
