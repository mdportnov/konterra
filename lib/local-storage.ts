export function subscribeToStorage(callback: () => void) {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

export const RECONNECT_DAYS_KEY = 'konterra-reconnect-days'
export const PROFILE_NUDGE_KEY = 'konterra-profile-nudge-dismissed'

/**
 * Getting-started progress is derived on the server now, so only the profile nudge is
 * still local. Kept as a single call site so wiping contacts still resets what it can.
 */
export function clearOnboardingKeys() {
  try {
    localStorage.removeItem(PROFILE_NUDGE_KEY)
  } catch {}
}
