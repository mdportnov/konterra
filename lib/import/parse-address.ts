import { resolveCountry, isCityCountry } from './countries'
import type { ParsedContact } from './types'

function splitAddress(address: string): string[] {
  return address
    .split(/[,\-–—]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseAddressString(address: string): { city?: string; country?: string } {
  if (!address) return {}

  const primary = address.includes(':::') ? address.split(':::')[0].trim() : address

  const cityCountry = isCityCountry(primary)
  if (cityCountry) return { country: cityCountry }

  const whole = resolveCountry(primary)
  if (whole) return { country: whole }

  const parts = splitAddress(primary)
  if (parts.length === 0) return {}

  for (let i = parts.length - 1; i >= 0; i--) {
    const country = resolveCountry(parts[i])
    if (country) {
      const cityParts = parts.slice(0, i).filter((p) => !resolveCountry(p))
      const city = cityParts.length > 0 ? cityParts[0] : undefined
      return { city, country }
    }
  }

  return {}
}

export function enrichLocationFields(contacts: ParsedContact[]): ParsedContact[] {
  return contacts.map((c) => {
    let updated = { ...c }

    if (updated.country) {
      const resolved = resolveCountry(updated.country)
      if (resolved) updated.country = resolved
    }

    if (updated.city && updated.country) return updated

    if (!updated.city || !updated.country) {
      const fromAddress = updated.address ? parseAddressString(updated.address) : null
      if (fromAddress) {
        if (!updated.country && fromAddress.country) updated.country = fromAddress.country
        if (!updated.city && fromAddress.city) updated.city = fromAddress.city
      }
    }

    return updated
  })
}
