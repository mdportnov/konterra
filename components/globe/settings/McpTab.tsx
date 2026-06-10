'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Loader2, Plus, Trash2, Copy, Check, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { MCP_SCOPES, MCP_SCOPE_LABELS, type McpScope } from '@/lib/mcp/scopes'

const CARD = 'rounded-lg border border-border bg-muted/20 p-4'
const SECTION_LABEL = 'text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider'
const CODE_BLOCK = 'rounded-md bg-muted/60 border border-border p-3 text-[11px] font-mono whitespace-pre-wrap break-all leading-relaxed'

interface TokenRow {
  id: string
  name: string
  tokenPrefix: string
  scopes: string[]
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

const EXPIRY_OPTIONS = [
  { value: 'never', label: 'Never expires' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
] as const

const CLIENTS = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'claude-desktop', label: 'Claude Desktop' },
  { value: 'codex', label: 'Codex' },
  { value: 'gemini', label: 'Gemini CLI' },
] as const

type ClientId = (typeof CLIENTS)[number]['value']

function buildTemplate(client: ClientId, url: string, token: string): { snippet: string; hint: string } {
  switch (client) {
    case 'claude-code':
      return {
        snippet: `claude mcp add --transport http konterra ${url} \\\n  --header "Authorization: Bearer ${token}"`,
        hint: 'Run in your terminal. Verify with /mcp inside Claude Code.',
      }
    case 'claude-desktop':
      return {
        snippet: JSON.stringify(
          { mcpServers: { konterra: { type: 'http', url, headers: { Authorization: `Bearer ${token}` } } } },
          null,
          2
        ),
        hint: 'Add to claude_desktop_config.json (Settings → Developer → Edit Config), then restart Claude Desktop.',
      }
    case 'codex':
      return {
        snippet: `# ~/.codex/config.toml\n[mcp_servers.konterra]\nurl = "${url}"\nbearer_token_env_var = "KONTERRA_MCP_TOKEN"\n\n# then export the token in your shell profile:\n# export KONTERRA_MCP_TOKEN="${token}"`,
        hint: 'Codex reads the token from the environment variable, so the secret stays out of config.toml.',
      }
    case 'gemini':
      return {
        snippet: JSON.stringify(
          { mcpServers: { konterra: { httpUrl: url, headers: { Authorization: `Bearer ${token}` } } } },
          null,
          2
        ),
        hint: 'Add to ~/.gemini/settings.json, then restart Gemini CLI and check with /mcp.',
      }
  }
}

function formatDate(value: string | null): string {
  if (!value) return 'never'
  return new Date(value).toLocaleDateString()
}

export function McpTab({ open }: { open: boolean }) {
  const [tokens, setTokens] = useState<TokenRow[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<Set<McpScope>>(new Set(MCP_SCOPES))
  const [expiry, setExpiry] = useState<string>('never')
  const [newToken, setNewToken] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [client, setClient] = useState<ClientId>('claude-code')
  const [copied, setCopied] = useState<string | null>(null)

  const loadTokens = useCallback(() => {
    fetch('/api/me/tokens')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTokens(data) })
      .catch(() => toast.error('Failed to load API tokens'))
  }, [])

  useEffect(() => {
    if (open) loadTokens()
  }, [open, loadTokens])

  const copyText = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500)
    }).catch(() => toast.error('Failed to copy'))
  }, [])

  const toggleScope = (scope: McpScope) => {
    setScopes((prev) => {
      const next = new Set(prev)
      if (next.has(scope)) next.delete(scope)
      else next.add(scope)
      return next
    })
  }

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Give the token a name'); return }
    if (scopes.size === 0) { toast.error('Select at least one scope'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/me/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          scopes: [...scopes],
          ...(expiry !== 'never' ? { expiresInDays: parseInt(expiry, 10) } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to create token'); return }
      setNewToken(data.token)
      setShowForm(false)
      setName('')
      loadTokens()
      toast.success('Token created')
    } catch {
      toast.error('Failed to create token')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    setRevoking(id)
    try {
      const res = await fetch(`/api/me/tokens/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setTokens((prev) => prev?.filter((t) => t.id !== id) ?? null)
      toast.success('Token revoked')
    } catch {
      toast.error('Failed to revoke token')
    } finally {
      setRevoking(null)
    }
  }

  const mcpUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/mcp` : '/api/mcp'
  const templateToken = newToken ?? '<YOUR_TOKEN>'
  const { snippet, hint } = buildTemplate(client, mcpUrl, templateToken)

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-4">
        <div className={CARD}>
          <div className="space-y-3">
            <span className={SECTION_LABEL}>MCP server</span>
            <p className="text-sm text-muted-foreground">
              Connect AI assistants to your Konterra data over the Model Context Protocol.
              They get exactly the permissions you grant via API tokens — nothing more.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted/60 border border-border px-2.5 py-1.5 text-[11px] font-mono truncate">{mcpUrl}</code>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyText(mcpUrl, 'url')}>
                    {copied === 'url' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy endpoint URL</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className={CARD}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={SECTION_LABEL}>API tokens</span>
              {!showForm && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowForm(true); setNewToken(null) }}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Create token</TooltipContent>
                </Tooltip>
              )}
            </div>

            {newToken && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs font-medium">Copy this token now — it won&apos;t be shown again</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-muted/60 border border-border px-2.5 py-1.5 text-[11px] font-mono break-all">{newToken}</code>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyText(newToken, 'token')}>
                        {copied === 'token' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy token</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}

            {showForm && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                <Input
                  placeholder="Token name (e.g. Claude Desktop)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowForm(false) }}
                  className="h-8 text-sm"
                  autoFocus
                />
                <div className="space-y-2">
                  <span className="text-[11px] text-muted-foreground/70">Permissions</span>
                  {MCP_SCOPES.map((scope) => (
                    <label key={scope} className="flex items-start gap-2 cursor-pointer">
                      <Checkbox
                        checked={scopes.has(scope)}
                        onCheckedChange={() => toggleScope(scope)}
                        className="mt-0.5"
                      />
                      <span className="space-y-0">
                        <span className="block text-xs font-medium text-foreground">{scope}</span>
                        <span className="block text-[11px] text-muted-foreground/60">{MCP_SCOPE_LABELS[scope]}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground/70">Expiry</span>
                  <Select value={expiry} onValueChange={setExpiry}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRY_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={creating}>
                    {creating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                    Create
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {tokens === null ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : tokens.length === 0 && !showForm ? (
              <p className="text-sm text-muted-foreground/60">No tokens yet. Create one to connect an AI client.</p>
            ) : (
              <div className="space-y-2">
                {tokens.map((t) => (
                  <div key={t.id} className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block text-sm font-medium text-foreground truncate">{t.name}</span>
                        <span className="block text-[11px] font-mono text-muted-foreground/60">{t.tokenPrefix}…</span>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRevoke(t.id)}
                            disabled={revoking === t.id}
                          >
                            {revoking === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Revoke token</TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {t.scopes.map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">{s}</Badge>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground/60">
                      Last used: {formatDate(t.lastUsedAt)} · Expires: {formatDate(t.expiresAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={CARD}>
          <div className="space-y-3">
            <span className={SECTION_LABEL}>Connect your AI client</span>
            <ToggleGroup
              type="single"
              value={client}
              onValueChange={(v) => { if (v) setClient(v as ClientId) }}
              className="w-full flex-wrap"
            >
              {CLIENTS.map(({ value, label }) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  className="flex-1 text-xs data-[state=on]:bg-accent data-[state=on]:text-foreground text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/50"
                >
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <div className="relative">
              <div className={CODE_BLOCK}>{snippet}</div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1.5 right-1.5 h-7 w-7 bg-background/60"
                    onClick={() => copyText(snippet, `tpl-${client}`)}
                  >
                    {copied === `tpl-${client}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy config</TooltipContent>
              </Tooltip>
            </div>
            <p className="text-[11px] text-muted-foreground/60">{hint}</p>
            {!newToken && (
              <p className="text-[11px] text-muted-foreground/60">
                Create a token above and the templates will include it automatically.
              </p>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
