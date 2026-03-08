import { env } from '@/lib/env'

interface GeocodingResult {
  lat: number
  lng: number
  formatted: string
}

const GEOCODE_TIMEOUT = 5000

export async function geocode(query: string): Promise<GeocodingResult | null> {
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
          formatted: data.results[0].formatted
        }
      }
    } else {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { 'User-Agent': 'NetworkGlobeCRM/1.0' }, signal: controller.signal }
      )
      const data = await response.json()

      if (data[0]) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          formatted: data[0].display_name
        }
      }
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }

  return null
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

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { 'User-Agent': 'NetworkGlobeCRM/1.0' }, signal: controller.signal }
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
