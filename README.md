# Konterra

Personal network CRM with interactive 3D globe — visualize, manage, and grow your social capital worldwide.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-06b6d4?logo=tailwindcss)

## Features

- **3D Globe** — interactive WebGL globe powered by `react-globe.gl` and Three.js with contact pins, clusters, country density heatmap, and animated connection arcs
- **Contact Management** — full CRUD for contacts with name, company, role, location, tags, rating (1-5 tier system), relationship types, social links, and notes
- **Country & City Browsing** — drill-down from countries to cities to contacts; click any country on the globe to view, mark as visited, or add contacts
- **Visited Countries** — track countries you've visited with teal highlights on the globe and a toggle in settings
- **Advanced Filtering** — filter contacts on the globe by rating, tags, relationship type, and country; collapsible filter panel with badge counts
- **Contacts Browser** — slide-in panel with Contacts/Places tabs, search, tag/rating/relationship filters
- **Dashboard** — stat cards, network health score with arc gauge, reconnect alerts for stale contacts and overdue follow-ups, top countries chart, activity timeline
- **Contact Detail** — full profile view with interactions history, connected contacts graph, edit/delete
- **Profile Management** — inline-editable display name in settings
- **Dark/Light/System Theme** — glass-morphism UI with oklch color tokens
- **Responsive** — works down to 640px viewport width

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4, shadcn/ui (new-york) |
| 3D | react-globe.gl, Three.js |
| Auth | NextAuth.js v5 (Credentials) |
| Database | Neon PostgreSQL, Drizzle ORM |
| Geocoding | Nominatim (free, no API key) |
| Icons | Lucide |

## Getting Started

### Prerequisites

- Node.js 20+
- Neon database ([neon.tech](https://neon.tech))

### Setup

```bash
git clone <repo-url> && cd konterra
npm install
```

Create `.env.local` from the example:

```bash
cp .env.example .env.local
```

Fill in the environment variables:

```
DATABASE_URL=postgresql://...
AUTH_SECRET=<generate with `npx auth secret`>
```

Push the database schema and start:

```bash
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:push` | Push schema to database |

## Project Structure

```
app/
  (auth)/          Login page
  (dashboard)/     Main globe page
  api/             REST endpoints (contacts, interactions, profile, visited-countries)
components/
  dashboard/       Dashboard panel + widgets (stats, chart, timeline, health, alerts)
  globe/           Globe canvas, panels (detail, edit, settings, browser, popup), controls
  ui/              shadcn/ui primitives
lib/
  constants/       UI tokens (glass, z-index, transitions), rating labels
  db/              Drizzle schema
  store.ts         In-memory data store (contacts, interactions, users, visited countries)
  metrics.ts       Network health score, stale contacts, follow-up calculations
hooks/             useHotkey, useClickOutside
types/             Display options
```

## License

Private.
