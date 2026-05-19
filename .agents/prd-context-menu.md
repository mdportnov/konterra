# PRD: Right-Click Context Menus

## Problem

Actions on entities (contacts, trips, interactions, favors, connections) are scattered across icon buttons, detail panels, and popups. Users must open a panel or hover over icons to discover available actions. No right-click support exists — the browser default menu appears.

## Goals

- Single right-click surface per entity with all relevant actions
- Consistent keyboard shortcut hints in menu items
- Works on both dashboard lists and globe markers
- Nested submenus for grouped actions (e.g. "Add..." → interaction / favor / connection)
- Separator-grouped sections: primary actions, secondary, destructive

## Non-Goals

- Touch/long-press support (mobile — deferred)
- Custom context menu on empty space (canvas right-click)
- Replacing existing buttons/icons — context menu is additive

---

## Entity Action Map

### Contact (list row / grid card / compact row / globe marker)

| Section | Action | Shortcut | Notes |
|---------|--------|----------|-------|
| Primary | Open detail | `Enter` | Same as click |
| Primary | Edit contact | `E` | Opens ContactEditPanel |
| Primary | View insights | `I` | Opens ContactInsights |
| Add... | Add interaction | | Submenu: meeting, call, message, email, event, note |
| Add... | Add favor | | Opens favor dialog |
| Add... | Add connection | | Opens connection picker |
| Clipboard | Copy name | | |
| Clipboard | Copy email | | If exists |
| Clipboard | Copy location | | City, Country |
| Navigation | Show on globe | | Centers globe + highlights marker |
| Navigation | Open public profile | | `/u/[username]` if applicable |
| Selection | Select / Deselect | `Space` | Toggles multi-select |
| Destructive | Delete contact | `Del` | Confirmation dialog |

### Trip (journey card / globe marker / TripPopup)

| Section | Action | Shortcut | Notes |
|---------|--------|----------|-------|
| Primary | Edit trip | `E` | Opens TripEditDialog |
| Primary | Show on globe | | Centers globe on trip location |
| Add | Add next trip | | Pre-fills arrival from departure |
| Add | Duplicate trip | | Copies all fields, clears dates |
| Clipboard | Copy location | | City, Country |
| Clipboard | Copy dates | | "Jan 5 – Jan 12, 2025" |
| Compare | Add to comparison | | Enables compare mode + selects |
| Destructive | Delete trip | `Del` | With undo toast |

### Interaction (list item in contact detail)

| Section | Action | Shortcut | Notes |
|---------|--------|----------|-------|
| Primary | Edit interaction | `E` | Inline edit |
| Clipboard | Copy notes | | If notes exist |
| Destructive | Delete interaction | `Del` | Immediate with undo toast |

### Favor (list item in contact detail)

| Section | Action | Shortcut | Notes |
|---------|--------|----------|-------|
| Primary | Edit favor | `E` | |
| Status | Mark resolved | | If pending |
| Status | Mark repaid | | If given + resolved |
| Clipboard | Copy description | | |
| Destructive | Delete favor | `Del` | |

### Connection (list item in contact detail)

| Section | Action | Shortcut | Notes |
|---------|--------|----------|-------|
| Primary | View connected contact | | Opens their detail |
| Primary | Edit connection | `E` | Type, strength |
| Destructive | Delete connection | `Del` | |

### Tag (badge in filter bar / contact detail)

| Section | Action | Shortcut | Notes |
|---------|--------|----------|-------|
| Primary | Filter by this tag | | Applies tag filter |
| Primary | Rename tag | | Inline rename |
| Destructive | Remove from contact | | Only in contact detail context |
| Destructive | Delete tag globally | | Confirmation — removes from all contacts |

### Country (globe country surface / country list)

| Section | Action | Shortcut | Notes |
|---------|--------|----------|-------|
| Primary | View contacts here | | Filters contact list by country |
| Primary | View trips here | | Filters travel timeline |
| Wishlist | Add to wishlist | | If not visited/wishlisted |
| Wishlist | Remove from wishlist | | If wishlisted |

### Saved View (dropdown item)

| Section | Action | Shortcut | Notes |
|---------|--------|----------|-------|
| Primary | Load view | | Applies filters |
| Primary | Rename view | | Inline rename |
| Destructive | Delete view | `Del` | |

---

## Technical Design

### Component: `useContextMenu` hook

```
hooks/use-context-menu.ts
```

Returns `{ contextMenu, onContextMenu }`:
- `onContextMenu` — attach to element's `onContextMenu` prop, captures coordinates + prevents default
- `contextMenu` — `{ x, y, open }` state for positioning the menu
- Auto-closes on scroll, resize, Escape, outside click (via `useClickOutside`)

### Component: `<EntityContextMenu>`

Wrapper around shadcn `ContextMenu` (needs `npx shadcn@latest add context-menu`).

```
components/ui/entity-context-menu.tsx
```

Props:
- `entity`: type discriminator (`'contact' | 'trip' | 'interaction' | 'favor' | 'connection' | 'tag' | 'country'`)
- `data`: the entity object
- `children`: the trigger element (wraps existing row/card/marker)
- `onAction(action: string, data)`: callback for the parent to handle

### Menu Rendering

Each entity type gets a dedicated menu builder:
- `components/context-menus/contact-menu.tsx`
- `components/context-menus/trip-menu.tsx`
- `components/context-menus/interaction-menu.tsx`
- `components/context-menus/favor-menu.tsx`
- `components/context-menus/connection-menu.tsx`
- `components/context-menus/tag-menu.tsx`
- `components/context-menus/country-menu.tsx`

Each exports `<XMenu>` that renders `ContextMenuContent` with appropriate items, separators, submenus, and shortcut hints.

### Globe Markers

Globe markers (three.js objects) don't support native DOM events. Strategy:
- Intercept `contextmenu` event on the globe canvas
- Raycast to determine which marker/country was hit
- Render a `ContextMenu` at screen coordinates using portal

### Styling

- Use `GLASS.control` backdrop for menu background (consistent with existing controls)
- `Z.modal` z-index (above everything)
- Destructive items: `text-destructive` color
- Shortcut hints: `text-muted-foreground text-xs` right-aligned
- Submenus: chevron-right icon, 200ms hover delay
- Max height with scroll for long menus

---

## Implementation Phases

### Phase 1 — Foundation + Travel Journey

1. Install shadcn `context-menu` component
2. Create `useContextMenu` hook
3. Implement trip context menu (TravelJourney cards + TripPopup)
4. Wire actions: edit, delete, duplicate, add next, copy, compare

### Phase 2 — Contact List

1. Implement contact context menu for all view modes (list, grid, compact)
2. Wire actions: open, edit, delete, select, copy, show on globe
3. Add submenu: add interaction (with type picker), add favor, add connection

### Phase 3 — Contact Detail Sub-entities

1. Interaction list items → edit, delete, copy
2. Favor list items → edit, status change, delete
3. Connection list items → view, edit, delete
4. Tag badges → filter, rename, remove, delete

### Phase 4 — Globe

1. Canvas-level contextmenu interceptor + raycast
2. Contact markers → same menu as contact list
3. Trip markers → same menu as trip cards
4. Country surfaces → view contacts/trips, wishlist actions

### Phase 5 — Polish

1. Keyboard shortcut hints in all menus
2. Saved view context menu
3. Clipboard actions (copy name, email, location, dates)
4. Accessibility: focus management, screen reader labels

---

## Open Questions

1. Should destructive actions (delete) in context menu skip confirmation for items that already have undo-toast support?
2. Should context menu respect bulk-selection mode (show bulk actions when items are selected)?
3. Globe raycast precision — should we show menu on nearest marker within N pixels, or exact hit only?
