import { describe, expect, it } from 'vitest'
import { isRightDockOpen, nextRightDockAction, type RightDockMemory } from '@/lib/dock'

const settingsMemory: RightDockMemory = { panel: 'settings', tab: 'profile' }

describe('isRightDockOpen', () => {
  it('is closed only when nothing occupies the right side', () => {
    expect(isRightDockOpen(null, false)).toBe(false)
    expect(isRightDockOpen('settings', false)).toBe(true)
    expect(isRightDockOpen('insights', false)).toBe(true)
    expect(isRightDockOpen('edit', false)).toBe(true)
    expect(isRightDockOpen(null, true)).toBe(true)
  })
})

describe('nextRightDockAction', () => {
  it('opens settings on the profile tab from cold', () => {
    expect(
      nextRightDockAction({ activePanel: null, wishlistOpen: false, memory: settingsMemory }),
    ).toEqual({ type: 'openSettings', tab: 'profile' })
  })

  it('closes settings when settings is what is open', () => {
    const action = nextRightDockAction({
      activePanel: 'settings',
      wishlistOpen: false,
      memory: { panel: 'settings', tab: 'countries' },
    })
    expect(action).toEqual({ type: 'closeSettings', remember: { panel: 'settings', tab: 'countries' } })
  })

  it('reopens the tab that was last closed rather than resetting', () => {
    const closed = nextRightDockAction({
      activePanel: 'settings',
      wishlistOpen: false,
      memory: { panel: 'settings', tab: 'countries' },
    })
    if (closed.type !== 'closeSettings') throw new Error('expected a close')

    expect(
      nextRightDockAction({ activePanel: null, wishlistOpen: false, memory: closed.remember }),
    ).toEqual({ type: 'openSettings', tab: 'countries' })
  })

  it('round-trips insights', () => {
    const closed = nextRightDockAction({
      activePanel: 'insights',
      wishlistOpen: false,
      memory: settingsMemory,
    })
    if (closed.type !== 'closeInsights') throw new Error('expected a close')
    expect(closed.remember.panel).toBe('insights')

    expect(
      nextRightDockAction({ activePanel: null, wishlistOpen: false, memory: closed.remember }),
    ).toEqual({ type: 'openInsights' })
  })

  it('dismisses an edit without ever offering to restore it', () => {
    expect(
      nextRightDockAction({ activePanel: 'edit', wishlistOpen: false, memory: settingsMemory }),
    ).toEqual({ type: 'cancelEdit' })

    // The memory is untouched by an edit, so the next press reopens what came before it.
    expect(
      nextRightDockAction({ activePanel: null, wishlistOpen: false, memory: settingsMemory }),
    ).toEqual({ type: 'openSettings', tab: 'profile' })
  })

  it('closes the wishlist panel before anything else', () => {
    expect(
      nextRightDockAction({ activePanel: 'settings', wishlistOpen: true, memory: settingsMemory }),
    ).toEqual({ type: 'closeWishlist' })
  })

  it('always toggles: a close is followed by an open', () => {
    let memory = settingsMemory
    const first = nextRightDockAction({ activePanel: 'settings', wishlistOpen: false, memory })
    expect(first.type).toBe('closeSettings')
    if (first.type === 'closeSettings') memory = first.remember

    const second = nextRightDockAction({ activePanel: null, wishlistOpen: false, memory })
    expect(second.type).toBe('openSettings')
  })
})
