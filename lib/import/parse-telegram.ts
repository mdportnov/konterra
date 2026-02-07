import type { ParsedContact } from './types'

interface TelegramContact {
  first_name?: string
  last_name?: string
  phone_number?: string
  date?: string
}

interface TelegramExport {
  contacts?: {
    list?: TelegramContact[]
  }
}

export function parseTelegramJSON(jsonText: string): ParsedContact[] {
  let data: TelegramExport
  try {
    data = JSON.parse(jsonText)
  } catch {
    throw new Error('Invalid JSON file')
  }

  const list = data?.contacts?.list
  if (!Array.isArray(list)) {
    throw new Error('No contacts found in Telegram export')
  }

  const results: ParsedContact[] = []

  for (const entry of list) {
    const nameParts = [entry.first_name, entry.last_name].filter(Boolean)
    const name = nameParts.join(' ').trim()
    if (!name) continue

    results.push({
      name,
      phone: entry.phone_number || undefined,
    })
  }

  return results
}
