import type { Contact, ContactConnection, Interaction, Favor, Tag } from '@/lib/db/schema'

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

export async function fetchContacts(signal?: AbortSignal): Promise<Contact[]> {
  const res = await apiFetch<PaginatedResponse<Contact>>('/api/contacts?limit=100', signal)
  return res.data
}

export async function fetchConnections(signal?: AbortSignal): Promise<ContactConnection[]> {
  const res = await apiFetch<PaginatedResponse<ContactConnection>>('/api/connections?limit=100', signal)
  return res.data
}

export async function fetchVisitedCountries(signal?: AbortSignal): Promise<string[]> {
  return apiFetch<string[]>('/api/visited-countries', signal)
}

export async function fetchRecentInteractions(signal?: AbortSignal): Promise<InteractionWithContact[]> {
  const res = await apiFetch<{ data: InteractionWithContact[] }>('/api/interactions', signal)
  return res.data
}

export async function fetchAllFavors(signal?: AbortSignal): Promise<Favor[]> {
  const res = await apiFetch<PaginatedResponse<Favor>>('/api/favors?limit=100', signal)
  return res.data
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
