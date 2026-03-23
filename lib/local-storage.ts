export function subscribeToStorage(callback: () => void) {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

export const RECONNECT_DAYS_KEY = 'konterra-reconnect-days'
export const CHECKLIST_DONE_KEY = 'konterra-checklist-done'
export const PROFILE_NUDGE_KEY = 'konterra-profile-nudge-dismissed'

export function clearOnboardingKeys() {
  try {
    localStorage.removeItem(CHECKLIST_DONE_KEY)
    localStorage.removeItem(PROFILE_NUDGE_KEY)
  } catch {}
}
