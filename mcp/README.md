# Konterra MCP Server

Konterra exposes its data to AI assistants (Claude Code, Claude Desktop, Codex, Gemini CLI, and any other MCP client) over the [Model Context Protocol](https://modelcontextprotocol.io): contacts, interactions, favors, trips, visited countries, and the travel wishlist.

There are two ways to connect:

| Mode | Transport | Auth | Best for |
|---|---|---|---|
| **Remote (recommended)** | Streamable HTTP at `https://<your-deployment>/api/mcp` | API token with scopes | Any client, no local setup |
| Local stdio | `npm run mcp` from this repo | `KONTERRA_USER_EMAIL` env + direct DB access | Development |

Both modes share the same tool registry (`lib/mcp/tools.ts`) and query layer as the app, so writes go through identical ownership scoping, validation, and side effects (e.g. past trips auto-mark countries as visited).

## Remote mode (HTTPS + API tokens)

1. In the app, open **Settings → MCP**.
2. Create an API token, choosing the scopes it should have:
   - `contacts:read` — list/get contacts, recent interactions, network stats
   - `contacts:write` — create/update/delete contacts, log interactions and favors
   - `travel:read` — trips, travel summary
   - `travel:write` — create/delete trips, visited countries, wishlist
3. Copy the token (shown once) and use one of the ready-made client templates in the same settings tab. They look like this:

**Claude Code**

```sh
claude mcp add --transport http konterra https://<your-deployment>/api/mcp \
  --header "Authorization: Bearer ktr_..."
```

**Claude Desktop** (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "konterra": {
      "type": "http",
      "url": "https://<your-deployment>/api/mcp",
      "headers": { "Authorization": "Bearer ktr_..." }
    }
  }
}
```

**Codex** (`~/.codex/config.toml`)

```toml
[mcp_servers.konterra]
url = "https://<your-deployment>/api/mcp"
bearer_token_env_var = "KONTERRA_MCP_TOKEN"
```

**Gemini CLI** (`~/.gemini/settings.json`)

```json
{
  "mcpServers": {
    "konterra": {
      "httpUrl": "https://<your-deployment>/api/mcp",
      "headers": { "Authorization": "Bearer ktr_..." }
    }
  }
}
```

### Token security

- Tokens are stored as SHA-256 hashes; the plaintext is shown exactly once at creation.
- `tools/list` only advertises tools the token's scopes allow; calls outside the granted scopes are rejected.
- Tokens can be given an expiry and revoked at any time in Settings → MCP.
- Token creation and revocation are recorded in the audit log (`token_create` / `token_revoke`).
- The endpoint is stateless JSON-RPC over Streamable HTTP (POST only); sessions and SSE streaming are not used.

### Endpoint behavior

- **Transport:** Streamable HTTP, stateless. `POST` carries JSON-RPC; `OPTIONS` is a CORS preflight; `GET`/`DELETE` return `405` (no server-initiated SSE stream).
- **CORS:** open (`Access-Control-Allow-Origin: *`) so browser-based clients and the MCP Inspector can connect; auth is Bearer-only, never cookie-based, so this is safe.
- **Rate limit:** 240 requests/minute per IP; exceeding it returns HTTP `429` with `Retry-After`.
- **Content-Type:** requests must be `application/json` (otherwise `415`).
- **Error codes:** `-32001` unauthorized/expired token or missing scope, `-32000` rate limited, `-32700` parse/content-type error, `-32600` invalid request, `-32601` unknown method, `-32602` invalid params, `-32603` internal error. Tool-level failures return a normal result with `isError: true`.
- **Protocol versions:** negotiates `2025-06-18`, `2025-03-26`, or `2024-11-05`; unknown requests fall back to the newest supported.

## Local stdio mode

Requirements: the repo checked out, `npm install` done, `.env.local` with `DATABASE_URL` (and `AUTH_SECRET`), and a reachable Postgres.

```sh
KONTERRA_USER_EMAIL=you@example.com npm run mcp
```

Claude Code:

```sh
claude mcp add konterra \
  --env KONTERRA_USER_EMAIL=you@example.com \
  -- npx tsx /path/to/konterra/mcp/server.ts
```

Local mode has full access (no scope restrictions) and is meant for trusted development use over stdio only.

## Tools

| Tool | Scope | What it does |
|---|---|---|
| `list_contacts` | contacts:read | Search/filter contacts (free text, tag, country) with pagination |
| `get_contact` | contacts:read | Full contact profile + interactions, favors, connections, country ties |
| `create_contact` | contacts:write | Create a contact (name required, all profile fields supported) |
| `update_contact` | contacts:write | Partial update; pass `null` to clear a field |
| `delete_contact` | contacts:write | Delete a contact (requires `confirm: true`) |
| `log_interaction` | contacts:write | Record a meeting/call/message; updates last-contacted automatically |
| `list_recent_interactions` | contacts:read | Recent interactions across all contacts |
| `log_favor` | contacts:write | Record a favor given/received (social-capital ledger) |
| `network_stats` | contacts:read | Counts by country/tag, overdue follow-ups, favor balance |
| `list_trips` | travel:read | All trips, newest first |
| `create_trip` | travel:write | Add a trip; past trips mark the country visited |
| `delete_trip` | travel:write | Delete a trip; derived visited status recalculated |
| `travel_summary` | travel:read | Visited countries, wishlist, upcoming trips |
| `set_visited_country` | travel:write | Mark/unmark a country as visited |
| `add_wishlist_country` / `remove_wishlist_country` | travel:write | Manage the travel wishlist |
