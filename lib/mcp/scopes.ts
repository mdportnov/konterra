export const MCP_SCOPES = ['contacts:read', 'contacts:write', 'travel:read', 'travel:write'] as const

export type McpScope = (typeof MCP_SCOPES)[number]

export const MCP_SCOPE_LABELS: Record<McpScope, string> = {
  'contacts:read': 'Read contacts, interactions, favors, and network stats',
  'contacts:write': 'Create and edit contacts, log interactions and favors',
  'travel:read': 'Read trips, visited countries, and wishlist',
  'travel:write': 'Create and edit trips, visited countries, and wishlist',
}

export function isValidScopes(value: unknown): value is McpScope[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((s) => typeof s === 'string' && (MCP_SCOPES as readonly string[]).includes(s))
  )
}
