# Konterra MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that lets AI assistants (Claude Code, Claude Desktop, and other MCP clients) read and edit your Konterra data: contacts, interactions, favors, trips, visited countries, and the travel wishlist.

It talks to the database directly through the same query layer the app uses (`lib/db/queries.ts`), so all writes go through the same ownership scoping and side effects (e.g. past trips auto-mark countries as visited).

## Setup

Requirements: the repo checked out, `npm install` done, and a reachable Postgres.

1. Make sure `.env.local` contains `DATABASE_URL` (and `AUTH_SECRET`, as the app requires it).
2. Pick the account the server should operate on and set `KONTERRA_USER_EMAIL`. All tools are scoped to this single user — the server never touches other accounts.

Run manually:

```sh
KONTERRA_USER_EMAIL=you@example.com npm run mcp
```

### Claude Code

```sh
claude mcp add konterra \
  --env KONTERRA_USER_EMAIL=you@example.com \
  -- npx tsx /path/to/konterra/mcp/server.ts
```

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "konterra": {
      "command": "npx",
      "args": ["tsx", "/path/to/konterra/mcp/server.ts"],
      "env": { "KONTERRA_USER_EMAIL": "you@example.com" }
    }
  }
}
```

The server loads `.env.local` from the working directory; if your client launches it from elsewhere, set `cwd` to the repo root or pass `DATABASE_URL` via `env` too.

## Tools

| Tool | What it does |
|---|---|
| `list_contacts` | Search/filter contacts (free text, tag, country) with pagination |
| `get_contact` | Full contact profile + interactions, favors, connections, country ties |
| `create_contact` | Create a contact (name required, all profile fields supported) |
| `update_contact` | Partial update; pass `null` to clear a field |
| `delete_contact` | Delete a contact (requires `confirm: true`) |
| `log_interaction` | Record a meeting/call/message; updates last-contacted automatically |
| `list_recent_interactions` | Recent interactions across all contacts |
| `log_favor` | Record a favor given/received (social-capital ledger) |
| `list_trips` | All trips, newest first |
| `create_trip` | Add a trip; past trips mark the country visited |
| `delete_trip` | Delete a trip; derived visited status recalculated |
| `travel_summary` | Visited countries, wishlist, upcoming trips |
| `set_visited_country` | Mark/unmark a country as visited |
| `add_wishlist_country` / `remove_wishlist_country` | Manage the travel wishlist |
| `network_stats` | Counts by country/tag, overdue follow-ups, favor balance |

## Safety notes

- Destructive tools either require explicit confirmation (`delete_contact`) or are scoped to a single row (`delete_trip`).
- Input is validated with the same rules as the HTTP API (`lib/validation.ts`).
- The server is meant for local/trusted use over stdio. Don't expose it over a network without adding authentication.
