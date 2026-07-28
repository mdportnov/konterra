import type { ActivePanel } from '@/hooks/use-panel-navigation'
import type { Tab } from '@/components/globe/settings'

/**
 * Which panel the right-hand dock should restore when it is reopened.
 *
 * An in-progress contact edit is deliberately absent: `]` can dismiss one, but reopening a
 * half-filled form the user just walked away from would be worse than opening nothing.
 */
export interface RightDockMemory {
  panel: 'settings' | 'insights'
  tab: Tab
}

export interface RightDockState {
  activePanel: ActivePanel
  wishlistOpen: boolean
  memory: RightDockMemory
}

export type RightDockAction =
  | { type: 'closeWishlist' }
  | { type: 'closeSettings'; remember: RightDockMemory }
  | { type: 'closeInsights'; remember: RightDockMemory }
  | { type: 'cancelEdit' }
  | { type: 'openSettings'; tab: Tab }
  | { type: 'openInsights' }

/**
 * `]` used to only ever close, which is why the right dock felt broken next to `[`. This
 * decides both directions from the current state so the two docks behave the same way.
 */
export function nextRightDockAction(
  { activePanel, wishlistOpen, memory }: RightDockState,
): RightDockAction {
  if (wishlistOpen) return { type: 'closeWishlist' }
  if (activePanel === 'settings') return { type: 'closeSettings', remember: { panel: 'settings', tab: memory.tab } }
  if (activePanel === 'insights') return { type: 'closeInsights', remember: { ...memory, panel: 'insights' } }
  if (activePanel === 'edit') return { type: 'cancelEdit' }
  if (memory.panel === 'insights') return { type: 'openInsights' }
  return { type: 'openSettings', tab: memory.tab }
}

export function isRightDockOpen(activePanel: ActivePanel, wishlistOpen: boolean): boolean {
  return wishlistOpen || activePanel !== null
}
