import type { Contact, ContactConnection, ContactCountryConnection, Interaction, Favor, Tag, Trip } from '@/lib/db/schema'

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

type InteractionWithContact = Interaction & { contactName: string }

async function apiFetch<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

async function fetchAllPages<T>(baseUrl: string, signal?: AbortSignal): Promise<T[]> {
  const first = await apiFetch<PaginatedResponse<T>>(`${baseUrl}?page=1&limit=100`, signal)
  if (first.total <= first.data.length) return first.data

  const totalPages = Math.min(Math.ceil(first.total / 100), 50)
  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      apiFetch<PaginatedResponse<T>>(`${baseUrl}?page=${i + 2}&limit=100`, signal)
    )
  )
  return [first, ...remaining].flatMap((r) => r.data)
}

export async function fetchContacts(signal?: AbortSignal): Promise<Contact[]> {
  const all = await fetchAllPages<Contact>('/api/contacts', signal)
  const seen = new Set<string>()
  return all.filter((c) => {
    if (seen.has(c.id)) return false
    seen.add(c.id)
    return true
  })
}

export async function fetchConnections(signal?: AbortSignal): Promise<ContactConnection[]> {
  return fetchAllPages<ContactConnection>('/api/connections', signal)
}

export async function fetchVisitedCountries(signal?: AbortSignal): Promise<string[]> {
  return apiFetch<string[]>('/api/visited-countries', signal)
}

export async function fetchRecentInteractions(signal?: AbortSignal): Promise<InteractionWithContact[]> {
  const res = await apiFetch<{ data: InteractionWithContact[] }>('/api/interactions', signal)
  return res.data
}

export async function fetchAllFavors(signal?: AbortSignal): Promise<Favor[]> {
  return fetchAllPages<Favor>('/api/favors', signal)
}

export async function fetchContactInteractions(contactId: string, signal?: AbortSignal): Promise<Interaction[]> {
  return apiFetch<Interaction[]>(`/api/contacts/${contactId}/interactions`, signal)
}

export async function fetchContactConnections(contactId: string, signal?: AbortSignal): Promise<ContactConnection[]> {
  return apiFetch<ContactConnection[]>(`/api/contacts/${contactId}/connections`, signal)
}

export async function fetchContactFavors(contactId: string, signal?: AbortSignal): Promise<Favor[]> {
  return apiFetch<Favor[]>(`/api/contacts/${contactId}/favors`, signal)
}

export async function fetchTags(signal?: AbortSignal): Promise<Tag[]> {
  return apiFetch<Tag[]>('/api/tags', signal)
}

export async function fetchAllCountryConnections(signal?: AbortSignal): Promise<ContactCountryConnection[]> {
  return apiFetch<ContactCountryConnection[]>('/api/country-connections', signal)
}

export async function fetchContactCountryConnections(contactId: string, signal?: AbortSignal): Promise<ContactCountryConnection[]> {
  return apiFetch<ContactCountryConnection[]>(`/api/contacts/${contactId}/country-connections`, signal)
}

export async function bulkDeleteContacts(ids: string[]): Promise<{ deleted: number }> {
  const res = await fetch('/api/contacts/bulk', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
  if (!res.ok) throw new Error('Bulk delete failed')
  return res.json()
}

export async function bulkTagContacts(ids: string[], action: 'addTag' | 'removeTag', tag: string): Promise<{ updated: number }> {
  const res = await fetch('/api/contacts/bulk', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, action, tag }),
  })
  if (!res.ok) throw new Error('Bulk tag operation failed')
  return res.json()
}

export async function fetchTrips(signal?: AbortSignal): Promise<Trip[]> {
  return apiFetch<Trip[]>('/api/trips', signal)
}
