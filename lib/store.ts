const users = new Map<string, { name: string; image: string | null }>()

export function getUser(id: string) {
  return users.get(id) || null
}

export function updateUser(id: string, data: { name?: string; image?: string | null }) {
  const existing = users.get(id) || { name: id.split('@')[0], image: null }
  const updated = { ...existing, ...data }
  users.set(id, updated)
  return updated
}
