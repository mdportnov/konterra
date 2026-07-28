/**
 * Product funnel events. Names are stable identifiers — renaming one breaks historical
 * comparison in GA, so treat this list as an append-only contract.
 */
export const ANALYTICS_EVENTS = {
  registerStarted: 'register_started',
  registerCompleted: 'register_completed',
  loginCompleted: 'login_completed',

  onboardingShown: 'onboarding_shown',
  onboardingStep: 'onboarding_step',
  onboardingSkipped: 'onboarding_skipped',
  onboardingCompleted: 'onboarding_completed',

  firstContactCreated: 'first_contact_created',
  contactCreated: 'contact_created',
  interactionLogged: 'interaction_logged',
  quickLogUsed: 'quick_log_used',

  tripCreated: 'trip_created',
  visitedCountryToggled: 'visited_country_toggled',
  importStarted: 'import_started',
  importCompleted: 'import_completed',

  atlasPublished: 'atlas_published',
  atlasShared: 'atlas_shared',
  inviteCreated: 'invite_created',

  daysTableViewed: 'days_table_viewed',
  overlapsViewed: 'overlaps_viewed',
  searchUsed: 'search_used',
  mcpTokenCreated: 'mcp_token_created',

  exportDownloaded: 'export_downloaded',
  digestOpened: 'digest_opened',
} as const

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

type EventParams = Record<string, string | number | boolean | undefined>

type GtagWindow = Window & { gtag?: (...args: unknown[]) => void }

/**
 * Fire-and-forget. Analytics must never be able to break a user flow, so every failure
 * mode here is a silent no-op.
 */
export function track(event: AnalyticsEvent, params: EventParams = {}) {
  if (typeof window === 'undefined') return
  try {
    const w = window as GtagWindow
    if (typeof w.gtag !== 'function') return
    w.gtag('event', event, params)
  } catch {
    // ignore
  }
}

/**
 * Marks a milestone that should only ever be reported once per browser (first contact,
 * first trip). Returns whether the event was actually sent.
 */
export function trackOnce(event: AnalyticsEvent, params: EventParams = {}): boolean {
  if (typeof window === 'undefined') return false
  const key = `konterra-analytics-once-${event}`
  try {
    if (localStorage.getItem(key) === '1') return false
    localStorage.setItem(key, '1')
  } catch {
    // Private mode without storage: still send, just without the guarantee.
  }
  track(event, params)
  return true
}
