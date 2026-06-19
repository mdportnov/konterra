import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toDateStr(d: Date | string | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function utcDateParts(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

/**
 * Canonical `YYYY-MM-DD` for date-only values (PostgreSQL `date` columns).
 * Such values arrive as UTC-midnight Dates or ISO strings ending in `Z`; reading
 * their calendar day in the local timezone shifts it by one for users west of UTC.
 * This reads the day in UTC (or passes a plain `YYYY-MM-DD` through unchanged), so
 * the round-trip is timezone-independent. Do NOT use for `timestamp` columns.
 */
export function toDateOnlyStr(d: Date | string | number | null | undefined): string {
  if (d == null || d === '') return ''
  if (typeof d === 'string') {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return `${m[1]}-${m[2]}-${m[3]}`
    const parsed = new Date(d)
    return isNaN(parsed.getTime()) ? '' : utcDateParts(parsed)
  }
  const date = typeof d === 'number' ? new Date(d) : d
  return isNaN(date.getTime()) ? '' : utcDateParts(date)
}

/** Calendar arithmetic on date-only values, timezone-independent. Returns `YYYY-MM-DD`. */
export function addDays(value: Date | string | null | undefined, n: number): string {
  const s = toDateOnlyStr(value)
  if (!s) return ''
  const d = new Date(s + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return utcDateParts(d)
}

/** The user's local calendar day as `YYYY-MM-DD` — the correct "today" for comparing against date-only trip dates. */
export function todayDateOnlyStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Classify a trip as past / current / future by comparing calendar days (not instants),
 * so a trip is never mis-tensed near midnight by a UTC-vs-local offset.
 */
export function tripTense(
  arrival: Date | string | null | undefined,
  departure: Date | string | null | undefined,
): 'past' | 'current' | 'future' {
  const today = todayDateOnlyStr()
  const arrivalStr = toDateOnlyStr(arrival)
  const departureStr = toDateOnlyStr(departure) || arrivalStr
  if (arrivalStr > today) return 'future'
  if (departureStr >= today) return 'current'
  return 'past'
}

/** Human display (`Jun 19, 2026`) for date-only values, timezone-independent. */
export function formatDateOnly(d: Date | string | number | null | undefined, opts: { year?: boolean } = {}): string {
  const s = toDateOnlyStr(d)
  if (!s) return ''
  const [y, m, day] = s.split('-')
  const label = `${MONTHS_SHORT[parseInt(m, 10) - 1]} ${parseInt(day, 10)}`
  return opts.year === false ? label : `${label}, ${y}`
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
