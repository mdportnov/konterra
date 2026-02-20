# Country Wishlist — Implementation Plan

## Concept

A country can independently have two flags: **visited** (been there) and **wishlisted** (want to go).
They are NOT mutually exclusive — a visited country can also be wishlisted (want to return / deeper exploration).
The wishlist entry carries planning metadata (notes, priority, status).

### Country lifecycle on the globe:

```
Nothing → Wishlist (idea) → Wishlist (planning) → Wishlist (ready)
                                                        ↓
                                                   Visited + Wishlist
                                                        ↓
                                                    Visited only
```

User can freely toggle both states independently.

---

## 1. Database

### New enum + table in `lib/db/schema.ts`

```
wishlistPriorityEnum: 'dream' | 'high' | 'medium' | 'low'
wishlistStatusEnum:   'idea' | 'researching' | 'planning' | 'ready'

countryWishlist:
  id            text PK (UUID)
  userId        text FK → users (cascade delete)
  country       text NOT NULL (normalized globe name)
  priority      wishlistPriorityEnum  default 'medium'
  status        wishlistStatusEnum    default 'idea'
  notes         text                  (free-form planning notes)
  createdAt     timestamp
  updatedAt     timestamp

  index(userId)
  unique(userId, country)
```

Exported types: `CountryWishlistEntry`, `NewCountryWishlistEntry`

**Why separate table, not extending visitedCountries?**
- `visitedCountries` is a simple boolean flag — clean, fast, no migration risk
- Wishlist needs richer fields (notes, priority, status) and different semantics
- Independence: toggling one doesn't affect the other
- Later, we can add child tables (e.g. `wishlistItems` for cities/activities) linked to wishlist entry

---

## 2. DB Queries — `lib/db/queries.ts`

```
getWishlistCountries(userId)         → CountryWishlistEntry[]
addWishlistCountry(userId, country)  → CountryWishlistEntry
updateWishlistCountry(id, patch)     → CountryWishlistEntry
removeWishlistCountry(id)            → void
getWishlistCountry(userId, country)  → CountryWishlistEntry | null
```

---

## 3. API Routes

| Route | Methods | Purpose |
|---|---|---|
| `/api/wishlist-countries` | GET, POST | List all / add new |
| `/api/wishlist-countries/[id]` | GET, PATCH, DELETE | Read / update / remove |

POST body: `{ country: string, priority?: string, notes?: string }`
PATCH body: `{ priority?, status?, notes? }`

---

## 4. Client Data Layer — `hooks/use-globe-data.ts`

- Add state: `wishlistCountries: Map<string, CountryWishlistEntry>` (keyed by normalized country name for O(1) lookup)
- Fetch on mount alongside other data via `fetchWishlistCountries()`
- Add `handleWishlistToggle(country)` — optimistic add/remove, same pattern as `handleCountryVisitToggle`
- Add `handleWishlistUpdate(country, patch)` — for updating notes/priority/status
- Export `reloadWishlistCountries()`

`lib/api.ts` — add `fetchWishlistCountries()` function.

---

## 5. Globe Visualization — `GlobeCanvas.tsx`

### New polygon colors in `globe-colors.ts`

```
wishlistOnly:        rose/pink — rgba(244, 63, 94, 0.20)   (dark) / rgba(244, 63, 94, 0.12) (light)
wishlistStroke:      rose/pink — rgba(244, 63, 94, 0.50)   (dark) / rgba(244, 63, 94, 0.35) (light)
wishlistVisited:     warm rose — rgba(220, 80, 80, 0.35)   (dark) / rgba(220, 80, 80, 0.25) (light)
wishlistContacts:    (blend)   — wishlist + contacts = slightly different shade
```

Rose/pink chosen to be visually distinct from:
- Teal = visited
- Orange = contacts
- Purple = indirect ties
- Green = user location
- Blue = past travel

### Polygon color priority (updated)

```
if contacts > 0 AND visited AND wishlisted → warm gold + rose accent (or reuse visitedContact colors)
if contacts > 0 AND visited                → visitedContactLow/Med/High (existing)
if contacts > 0 AND wishlisted             → wishlistContacts
if contacts > 0                            → contactLow/Med/High (existing)
if visited AND wishlisted                  → wishlistVisited
if visited                                 → visitedOnly (existing teal)
if wishlisted                              → wishlistOnly (new rose)
if indirect                                → indirect (existing purple)
if userCountry                             → userCountry (existing green)
else                                       → default
```

### Display toggle

Add `showWishlist: boolean` to `DisplayOptions` in `types/display.ts` (default: `true`).
Toggle in `GlobeViewToggle.tsx` or in display options.

---

## 6. UI Components

### 6a. CountryPopup — extend existing

Current: header + visited toggle + contacts list + add contact button

New layout:
```
┌─────────────────────────────┐
│ 🇫🇷 France          [⋮] [×] │
├─────────────────────────────┤
│ Visited              [====] │  ← existing Switch
│ Want to visit        [====] │  ← NEW Switch
├─────────────────────────────┤
│ (if wishlisted:)            │
│ Priority: ●●●○  Status: 💡 │  ← compact inline
│ "Want to check out Nice..." │  ← notes preview (truncated)
│                    [Plan →] │  ← opens wishlist detail
├─────────────────────────────┤
│ PARIS                       │
│  👤 John Doe               │
│  👤 Jane Smith             │
│ LYON                        │
│  👤 Pierre Dupont          │
├─────────────────────────────┤
│     [+ Add contact]        │
└─────────────────────────────┘
```

Props additions:
- `wishlisted?: boolean`
- `wishlistEntry?: CountryWishlistEntry`
- `onToggleWishlist?: () => void`
- `onOpenWishlistDetail?: () => void`

### 6b. CountriesTab — extend with wishlist view

Add ToggleGroup at the top: `Visited` | `Wishlist` | `All`

- **Visited** mode: current behavior (checkboxes for visited)
- **Wishlist** mode: shows wishlisted countries with priority badges, click to edit
- **All** mode: shows all countries with both visited checkbox AND wishlist heart/star icon

### 6c. WishlistDetailPanel — NEW panel (reusing GlobePanel)

A right-side GlobePanel (like ContactEditPanel) that opens when user clicks "Plan" on a wishlist country.

```
┌─────────────────────────────────┐
│ ← Back          🇫🇷 France      │
├─────────────────────────────────┤
│ Priority    [low][med][high][★] │  ToggleGroup
│ Status      [idea][...][ready]  │  ToggleGroup
├─────────────────────────────────┤
│ Notes                           │
│ ┌─────────────────────────────┐ │
│ │ (textarea, auto-save)       │ │
│ │                             │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ CONTACTS IN FRANCE              │
│  👤 John Doe — Paris           │
│  👤 Jane Smith — Paris         │
│  ...                           │
│ CONNECTIONS TO FRANCE           │
│  👤 Pierre (indirect)          │
├─────────────────────────────────┤
│     [Remove from wishlist]      │
└─────────────────────────────────┘
```

- Priority/status changes: PATCH immediately (debounced for notes)
- Shows relevant contacts/connections (useful for trip planning)
- "Remove from wishlist" at the bottom

### 6d. Dashboard integration (optional / future)

Could add a "Wishlist" card or tab in the dashboard showing:
- Top priority wishlist countries
- Countries where you have contacts but haven't visited

This is low priority and can be added later.

---

## 7. Step-by-step Implementation Order

1. **Schema + migration**: add enum + table to `lib/db/schema.ts`, run `db:push`
2. **DB queries**: add CRUD functions to `lib/db/queries.ts`
3. **API routes**: create `/api/wishlist-countries` and `/api/wishlist-countries/[id]`
4. **Client API**: add `fetchWishlistCountries` to `lib/api.ts`
5. **Globe data hook**: wire up state + toggle + update in `use-globe-data.ts`
6. **Globe colors**: add wishlist colors to `globe-colors.ts`, update polygon color logic in `GlobeCanvas.tsx`
7. **Display toggle**: add `showWishlist` to DisplayOptions
8. **CountryPopup**: add wishlist toggle + preview section
9. **CountriesTab**: add view toggle (Visited/Wishlist/All)
10. **WishlistDetailPanel**: build the planning panel
11. **Build + lint + test**

---

## 8. Files to Create/Modify

### New files:
- `app/api/wishlist-countries/route.ts`
- `app/api/wishlist-countries/[id]/route.ts`
- `components/globe/WishlistDetailPanel.tsx`

### Modified files:
- `lib/db/schema.ts` — new enum + table + types
- `lib/db/queries.ts` — new query functions
- `lib/api.ts` — new fetch function
- `hooks/use-globe-data.ts` — wishlist state + handlers
- `lib/constants/globe-colors.ts` — wishlist polygon colors
- `types/display.ts` — showWishlist option
- `components/globe/GlobeCanvas.tsx` — polygon color logic for wishlist
- `components/globe/CountryPopup.tsx` — wishlist toggle + preview
- `components/globe/settings/CountriesTab.tsx` — view mode toggle
- `components/globe/settings/types.ts` — updated props
- `components/globe/GlobeViewToggle.tsx` — wishlist display toggle (if we add it here)
- Main page (prop wiring for new data)
