## Tech Stack
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4 (oklch color tokens, no tailwind.config — uses PostCSS plugin)
- shadcn/ui (new-york style), Lucide icons
- NextAuth v5-beta (JWT sessions, Credentials provider), Drizzle ORM, Neon PostgreSQL
- react-globe.gl + three.js for 3D visualization
- Deployed on Vercel (project: `network-globe`, team: `team_vsABc9ey80bellgNTfkA4cBV`)

## Project Structure
```
app/                    → App Router pages & API routes
  (auth)/login          → Login page
  (dashboard)/app       → Main dashboard (protected)
  (dashboard)/admin     → Admin panel (protected)
  api/                  → ~30 REST endpoints
  u/[username]          → Public profile (unprotected)
components/             → React components (ui/, globe/, dashboard/, etc.)
hooks/                  → Custom hooks (use-hotkey, use-click-outside, use-globe-data, etc.)
lib/
  constants/            → Design tokens, enums, country data
  db/                   → schema.ts, queries.ts, index.ts, migrate.ts
  validation.ts         → Input validators, enum arrays
  api-utils.ts          → Response helpers (unauthorized, badRequest, success, etc.)
drizzle/                → Generated SQL migration files + meta journal
scripts/                → Utility scripts (seed.ts)
types/                  → next-auth.d.ts, display.ts
```

## Local Development

### Prerequisites
- Docker (for local Postgres)
- Node.js

### Local Postgres
```
docker compose up -d          # starts Postgres 16 on localhost:5432
```
Credentials: `konterra / konterra / konterra` (user/password/db).
Connection string in `.env.local`: `postgresql://konterra:konterra@localhost:5432/konterra`

### Scripts
| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Run migrations + production build |
| `npm run lint` | ESLint (flat config) |
| `npm run db:generate` | Generate Drizzle migration SQL from schema diff |
| `npm run db:push` | Push schema to local DB (no migration files, fast for dev) |
| `npm run db:migrate` | Run migration files via drizzle-kit CLI |
| `npm run db:studio` | Open Drizzle Studio GUI |

### Env Loading
`drizzle.config.ts` uses `dotenv` to load `.env.local`. Next.js loads `.env.local` automatically.

## Database & Migrations

### Schema Change Workflow
1. Edit `lib/db/schema.ts`
2. **Local dev**: `npm run db:push` (applies directly, no migration files)
3. **Before commit**: `npm run db:generate` (creates SQL in `drizzle/`)
4. **Commit the migration files** in `drizzle/` — they must be in git
5. On Vercel deploy: `npm run build` runs `tsx lib/db/migrate.ts` which applies pending migrations to production Neon

### Migration Architecture
- `lib/db/migrate.ts` — programmatic migrator (runs before `next build`)
- `build` script: `tsx lib/db/migrate.ts && next build`
- Drizzle tracks applied migrations in `drizzle.__drizzle_migrations` (by `created_at` timestamp)
- Production Neon project: `tiny-shadow-42734311` (aws-eu-central-1)

### Local vs Production
| | Local | Production |
|---|---|---|
| Database | Docker Postgres 16 via `pg` | Neon PostgreSQL (serverless) |
| Connection | `lib/db/index.ts` → `pg.Pool` + `DATABASE_URL` | Same — Neon accepts standard PG protocol |
| Schema changes | `npm run db:push` (fast, no files) | Auto via `lib/db/migrate.ts` in build step |
| SSL | No | `?sslmode=require` |

## Auth
- NextAuth v5-beta, JWT strategy, Credentials provider (email + password, bcryptjs)
- Only pre-existing `users` rows can sign in (no self-registration)
- User type extended with `role` field
- `middleware.ts` protects all routes except: `/`, `/login`, `/api/auth/**`, `/api/waitlist/**`, `/api/public/**`, `/u/**`
- Config split: `auth.config.ts` (edge-compatible) + `auth.ts` (full, with DB queries)

## UI Conventions

### Design Tokens
Always import `GLASS`, `Z`, `TRANSITION`, `PANEL_WIDTH` from `lib/constants/ui.ts`:
- **Glass morphism**: `GLASS.panel`, `GLASS.control`, `GLASS.heavy` — never ad-hoc backdrop-blur
- **Z-index**: `Z.globe`, `Z.controls`, `Z.sidebar`, `Z.sidebarToggle`, `Z.detail`, `Z.overlay`, `Z.modal`, `Z.toast` — never raw numbers
- **Transitions**: `TRANSITION.panel` (300ms), `TRANSITION.fade` (200ms), `TRANSITION.color` (150ms)
- **Panel widths**: `PANEL_WIDTH.sidebar` (320), `PANEL_WIDTH.detail` (400)

### Components
- `GlobePanel` (`components/globe/GlobePanel.tsx`) for slide-in/out overlays — never raw `fixed` + `translate-x`
- `useHotkey` and `useClickOutside` hooks — never raw `addEventListener`
- `toast()` from sonner for user feedback — never silently catch errors
- `<Tooltip>` on every icon-only button
- `<Skeleton>` for loading states
- `<Switch>` for boolean toggles, `<ToggleGroup>` for multi-option selectors
- `<Separator>` instead of ad-hoc dividers

### Theme
- ThemeProvider in `components/providers.tsx`: `'light' | 'dark' | 'system'`
- Cycle: light → dark → system
- Inline script in layout prevents flash-of-wrong-theme

### Responsive
- Overlay panels must work at 640px minimum
- Use Tailwind responsive prefixes (`sm:`, `md:`)

### API Routes
- Use helpers from `lib/api-utils.ts`: `unauthorized()`, `badRequest()`, `notFound()`, `success()`, `serverError()`
- Use `safeParseBody()` from `lib/validation.ts` for JSON parsing
- Use enum arrays from `lib/validation.ts` for input validation
- Always wrap in try/catch, return 500 on unexpected errors

## Code Style
- No inline comments unless asked
- No emojis in code
- ES modules, TypeScript types
- Minimal imports, no wildcard imports
- `@/*` path alias for all imports

## Commit & Deploy Policy
- After implementation: `npm run build` (catches type + migration errors) → `npm run lint` → commit → push
- Vercel auto-deploys from `main` branch
- Migrations run automatically during Vercel build step
- Always commit `drizzle/` migration files (SQL + meta journal)

## Validation Constants
Enums for contact fields are defined in `lib/validation.ts` (communication styles, channels, relationship types, connection types, favor types, etc.). Always reference these arrays — never hardcode enum values in API routes or components.

## Environment Variables
Runtime-validated via Zod in `lib/env.ts`. Import `env` instead of using `process.env` directly:
```
import { env } from '@/lib/env'
env.DATABASE_URL   // string (required)
env.AUTH_SECRET     // string (required)
env.OPENCAGE_API_KEY // string | undefined (optional)
```
Exception: CLI scripts (`drizzle.config.ts`, `lib/db/migrate.ts`, `scripts/seed.ts`) use `dotenv` + `process.env` directly since they run outside Next.js.

## Git Hooks
- **pre-commit**: `lint-staged` runs ESLint with `--fix` on staged `*.{ts,tsx}` files
- **pre-push**: `npm run build` (full type-check + migration dry-run)
- Managed by husky (`.husky/`)

## Security Headers
Defined in `next.config.ts` and applied to all routes:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` (HSTS with preload)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: camera, microphone, geolocation disabled

## Debugging Production
- Vercel runtime logs: available via Vercel MCP tools or dashboard
- Neon project ID: `tiny-shadow-42734311`
- Neon SQL can be run directly via Neon MCP tools for production debugging

---

## Cookbook: Adding New Features

### New Database Table

1. **Define table in `lib/db/schema.ts`**:
```
export const myTable = pgTable('my_table', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('my_table_user_id_idx').on(t.userId),
])
export type MyTable = typeof myTable.$inferSelect
export type NewMyTable = typeof myTable.$inferInsert
```

2. **Add query functions in `lib/db/queries.ts`**:
   - Import the table: `import { myTable } from './schema'`
   - Write `getX(userId)`, `createX(userId, data)`, `updateX(id, userId, data)`, `deleteX(id, userId)`
   - Always filter by `userId` for row-level security
   - Use `eq()`, `and()` from `drizzle-orm`
   - Use `.onConflictDoNothing()` for upserts
   - Use `db.transaction()` for multi-step operations

3. **Apply locally**: `npm run db:push`
4. **Generate migration**: `npm run db:generate`
5. **Commit migration files** in `drizzle/`

### New API Route

Create `app/api/<resource>/route.ts`:
```
import { auth } from '@/auth'
import { unauthorized, badRequest, success } from '@/lib/api-utils'
import { safeParseBody } from '@/lib/validation'
import { getItems, createItem } from '@/lib/db/queries'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  return success(await getItems(session.user.id))
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')
  // validate fields...
  const item = await createItem(session.user.id, body)
  return success(item, 201)
}
```

For routes with dynamic `[id]`, create `app/api/<resource>/[id]/route.ts`:
```
import { type NextRequest } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // ...
}
```

Key rules:
- Always check `session?.user?.id` first
- Use `safeParseBody()` for POST/PUT/PATCH/DELETE bodies
- Validate enums against `const` arrays from `lib/validation.ts`
- Return via `success()`, `badRequest()`, `notFound()`, `unauthorized()`
- If route needs to be public, add its pattern to `middleware.ts` publicRoutes array

### New GlobePanel (Slide-in Overlay)

```
'use client'

import GlobePanel from '@/components/globe/GlobePanel'
import { PANEL_WIDTH } from '@/lib/constants/ui'
import { Separator } from '@/components/ui/separator'

interface MyPanelProps {
  open: boolean
  onClose: () => void
}

export default function MyPanel({ open, onClose }: MyPanelProps) {
  return (
    <GlobePanel open={open} side="right" width={PANEL_WIDTH.detail} glass="heavy" onClose={onClose}>
      <div className="flex flex-col h-full">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold text-foreground">Title</h2>
        </div>
        <Separator className="bg-border" />
        <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar">
          <div className="px-6 py-4 space-y-5">
            {/* content */}
          </div>
        </div>
      </div>
    </GlobePanel>
  )
}
```

GlobePanel props:
- `side`: `'left'` (sidebar-level z-index) or `'right'` (detail-level z-index)
- `width`: use `PANEL_WIDTH.sidebar` or `PANEL_WIDTH.detail`
- `glass`: `'panel'` (default), `'control'`, or `'heavy'`
- `onClose`: enables Escape key + click-outside + close chevron button
- Auto-fullscreen on mobile

### New shadcn/ui Component

```
npx shadcn@latest add <component-name>
```

Config in `components.json`. Components go to `components/ui/`. Import directly:
```
import { Button } from '@/components/ui/button'
```

### New Custom Hook

Create `hooks/use-<name>.ts`:
```
import { useState, useCallback } from 'react'

export function useMyHook(initialValue: string) {
  const [value, setValue] = useState(initialValue)
  const reset = useCallback(() => setValue(initialValue), [initialValue])
  return { value, setValue, reset }
}
```

Naming: `use-kebab-case.ts` file, `useCamelCase` export.

### New Constants / Enums

- UI tokens → `lib/constants/ui.ts`
- Feature-specific enums → `lib/constants/<feature>.ts`
- Validation enums (used in API routes) → `lib/validation.ts`
- Country/geo data → `lib/constants/country-regions.ts`

### Making a Route Public

Add pattern to the `publicRoutes` array in `middleware.ts`:
```
'/api/public/<resource>/**'
```
