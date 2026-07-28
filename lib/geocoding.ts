import { env } from '@/lib/env'
import { db } from '@/lib/db'
import { geocodeCache } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

interface GeocodingResult {
  lat: number
  lng: number
  formatted: string
}

const GEOCODE_TIMEOUT = 5000
const NOMINATIM_MIN_INTERVAL_MS = 1100
const USER_AGENT = 'Konterra/1.0 (https://konterra.space)'

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ')
}

let nominatimNextAllowedAt = 0

/**
 * Nominatim's usage policy caps us at one request per second. Serialize calls in-process
 * so batch jobs cannot burst past it; the cache below keeps the actual call volume low.
 */
async function throttleNominatim() {
  const now = Date.now()
  const wait = nominatimNextAllowedAt - now
  nominatimNextAllowedAt = Math.max(now, nominatimNextAllowedAt) + NOMINATIM_MIN_INTERVAL_MS
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
}

async function readCache(key: string): Promise<{ hit: true; value: GeocodingResult | null } | { hit: false }> {
  try {
    const row = await db.query.geocodeCache.findFirst({ where: eq(geocodeCache.query, key) })
    if (!row) return { hit: false }
    db.update(geocodeCache)
      .set({ hits: sql`${geocodeCache.hits} + 1` })
      .where(eq(geocodeCache.query, key))
      .catch(() => {})
    if (row.lat == null || row.lng == null) return { hit: true, value: null }
    return { hit: true, value: { lat: row.lat, lng: row.lng, formatted: row.formatted ?? key } }
  } catch {
    return { hit: false }
  }
}

async function writeCache(key: string, value: GeocodingResult | null) {
  try {
    await db
      .insert(geocodeCache)
      .values({
        query: key,
        lat: value?.lat ?? null,
        lng: value?.lng ?? null,
        formatted: value?.formatted ?? null,
      })
      .onConflictDoNothing({ target: geocodeCache.query })
  } catch {
    // A cache write failure must never fail the caller.
  }
}

async function geocodeUpstream(query: string): Promise<GeocodingResult | null> {
  const apiKey = env.OPENCAGE_API_KEY
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT)

  try {
    if (apiKey) {
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${apiKey}&limit=1`,
        { signal: controller.signal }
      )
      const data = await response.json()

      if (data.results?.[0]) {
        return {
          lat: data.results[0].geometry.lat,
          lng: data.results[0].geometry.lng,
          formatted: data.results[0].formatted,
        }
      }
      return null
    }

    await throttleNominatim()
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal }
    )
    const data = await response.json()

    if (data[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        formatted: data[0].display_name,
      }
    }
    return null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Cached forward geocoding. Negative results are cached too: an unresolvable place would
 * otherwise be retried on every batch run forever, keeping `remaining` permanently above
 * zero and re-triggering the client geocoding loop on each page load.
 */
export async function geocode(query: string): Promise<GeocodingResult | null> {
  const key = normalizeQuery(query)
  if (!key) return null

  const cached = await readCache(key)
  if (cached.hit) return cached.value

  const result = await geocodeUpstream(key)
  await writeCache(key, result)
  return result
}

export async function reverseGeocode(lat: number, lng: number): Promise<{ city: string; country: string } | null> {
  const apiKey = env.OPENCAGE_API_KEY
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT)

  try {
    if (apiKey) {
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${apiKey}&limit=1`,
        { signal: controller.signal }
      )
      const data = await response.json()
      const components = data.results?.[0]?.components
      if (components) {
        const city = components.city || components.town || components.village || components.state
        const country = components.country
        if (city && country) return { city, country }
      }
    }

    await throttleNominatim()
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal }
    )
    const data = await response.json()
    const addr = data.address
    if (addr) {
      const city = addr.city || addr.town || addr.village || addr.state
      const country = addr.country
      if (city && country) return { city, country }
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }

  return null
}
