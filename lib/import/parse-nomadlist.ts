export interface ParsedTrip {
  arrivalDate: string
  departureDate: string | null
  durationDays: number | null
  city: string
  country: string
}

export function parseNomadListCSV(csvText: string): ParsedTrip[] {
  const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const header = parseCSVLine(lines[0])
  const arrivalIdx = header.findIndex((h) => h.toLowerCase().includes('arrival'))
  const departureIdx = header.findIndex((h) => h.toLowerCase().includes('departure'))
  const durationIdx = header.findIndex((h) => h.toLowerCase().includes('duration'))
  const cityIdx = header.findIndex((h) => h.toLowerCase().includes('city'))
  const countryIdx = header.findIndex((h) => h.toLowerCase().includes('country'))

  if (arrivalIdx === -1 || cityIdx === -1 || countryIdx === -1) return []

  const trips: ParsedTrip[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    const arrival = cols[arrivalIdx]?.trim()
    const city = cols[cityIdx]?.trim()
    const country = cols[countryIdx]?.trim()
    if (!arrival || !city || !country) continue

    const departure = departureIdx >= 0 ? cols[departureIdx]?.trim() || null : null
    const durationRaw = durationIdx >= 0 ? cols[durationIdx]?.trim() : null
    const duration = durationRaw ? parseInt(durationRaw, 10) : null

    trips.push({
      arrivalDate: normalizeDate(arrival),
      departureDate: departure ? normalizeDate(departure) : null,
      durationDays: duration && !isNaN(duration) ? duration : null,
      city,
      country,
    })
  }
  return trips
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function normalizeDate(raw: string): string {
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return raw
  const d = new Date(raw + 'T00:00:00Z')
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  const fallback = new Date(raw)
  if (!isNaN(fallback.getTime())) return fallback.toISOString().split('T')[0]
  return raw
}
