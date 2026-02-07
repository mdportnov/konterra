## Tech Stack
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4 (oklch color tokens)
- shadcn/ui (new-york style), Lucide icons
- NextAuth v5, Drizzle ORM, Neon PostgreSQL
- react-globe.gl + three.js for 3D visualization

## Local Development

### Prerequisites
- Docker (for local Postgres)
- Node.js

### Local Postgres
```
docker compose up -d          # starts Postgres 16 on localhost:5432
```
Credentials: `konterra / konterra / konterra` (user/password/db).
Connection string is in `.env.local`: `postgresql://konterra:konterra@localhost:5432/konterra`

### Database Commands
- `npm run db:generate` — generate Drizzle migration SQL from schema changes
- `npm run db:push` — push schema directly to local DB (skips migration files, fast for dev)
- `npm run db:migrate` — run generated migration files against DB
- `npm run db:studio` — open Drizzle Studio GUI

After schema changes: run `npm run db:push` to apply to local DB immediately.
`db:generate` + `db:migrate` is for tracked migrations (production).

### Build & Dev
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — eslint

### Env Loading
`drizzle.config.ts` uses `dotenv` to load `.env.local` so all `npm run db:*` commands work without manual env setup. Next.js loads `.env.local` automatically for `dev`/`build`/`start`.

### Local vs Production
| | Local | Production |
|---|---|---|
| Database | Docker Postgres 16 via `pg` (node-postgres) | Neon PostgreSQL (serverless) |
| DB connection | `lib/db/index.ts` uses `pg.Pool` with `DATABASE_URL` | Same code, Neon accepts standard PG connections |
| Schema changes | `npm run db:push` (direct, no migration files) | `npm run db:generate` then `npm run db:migrate` |
| Auth | Credentials provider (email + password, bcryptjs) | Will add Google OAuth via `GOOGLE_CLIENT_ID/SECRET` |
| SSL | No (`localhost`) | `?sslmode=require` in connection string |
| Auth gating | Only pre-existing `users` rows can sign in | Same — unknown emails are rejected |

## UI Conventions

### Design Tokens
Always import `GLASS`, `Z`, `TRANSITION`, `PANEL_WIDTH` from `lib/constants/ui.ts`:
- **Glass morphism**: use `GLASS.panel`, `GLASS.control`, or `GLASS.heavy` — never ad-hoc backdrop-blur classes
- **Z-index**: use `Z.globe`, `Z.controls`, `Z.sidebar`, `Z.sidebarToggle`, `Z.detail`, `Z.overlay`, `Z.modal`, `Z.toast` — never raw z-index numbers
- **Transitions**: use `TRANSITION.panel` (300ms ease-out), `TRANSITION.fade` (200ms), `TRANSITION.color` (150ms)
- **Panel widths**: use `PANEL_WIDTH.sidebar` (320) and `PANEL_WIDTH.detail` (400)

### Components
- Use `GlobePanel` (`components/globe/GlobePanel.tsx`) for any slide-in/out overlay — never raw `fixed` + `translate-x`
- Use `useHotkey` (`hooks/use-hotkey.ts`) and `useClickOutside` (`hooks/use-click-outside.ts`) — never raw `addEventListener`
- Use `toast()` from sonner for user feedback — never silently catch errors
- Use `<Tooltip>` on every icon-only button
- Use `<Skeleton>` for loading states
- Use `<Switch>` for boolean toggles, `<ToggleGroup>` for multi-option selectors
- Use `<Separator>` instead of ad-hoc divider elements

### Theme
- ThemeProvider in `components/providers.tsx` supports `'light' | 'dark' | 'system'`
- Theme toggle cycles: light -> dark -> system
- Inline script in layout handles flash-of-wrong-theme

### Responsive
- All overlay panels must work at 640px width minimum
- Use Tailwind responsive prefixes (`sm:`, `md:`) for breakpoints

### Code Style
- No inline comments unless explicitly asked
- No emojis in code
- Prefer ES modules and TypeScript types
- Keep import lists minimal
