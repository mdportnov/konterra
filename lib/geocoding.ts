interface GeocodingResult {
  lat: number
  lng: number
  formatted: string
}

const GEOCODE_TIMEOUT = 5000

export async function geocode(query: string): Promise<GeocodingResult | null> {
  const apiKey = process.env.OPENCAGE_API_KEY
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
