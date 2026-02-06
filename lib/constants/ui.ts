export const GLASS = {
  panel: 'bg-card/80 backdrop-blur-xl border border-border',
  control: 'bg-card/70 backdrop-blur-xl border border-border',
  heavy: 'bg-card/90 backdrop-blur-2xl border border-border',
} as const

export const GLASS_DARK = {
  panel: 'bg-black/50 backdrop-blur-xl border border-white/10',
  control: 'bg-black/40 backdrop-blur-xl border border-white/10',
  heavy: 'bg-black/60 backdrop-blur-2xl border border-white/10',
} as const

export const Z = {
  globe: 0,
  controls: 20,
  sidebar: 20,
  sidebarToggle: 25,
  detail: 30,
  overlay: 40,
  modal: 50,
  toast: 60,
} as const

export const TRANSITION = {
  panel: 'transition-transform duration-300 ease-out',
  fade: 'transition-opacity duration-200 ease-out',
  color: 'transition-colors duration-150',
} as const

export const PANEL_WIDTH = {
  sidebar: 320,
  detail: 400,
  browser: 280,
  dashboard: { min: 480, max: 720 },
} as const
