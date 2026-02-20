export const GLASS = {
  panel: 'bg-card/80 backdrop-blur-xl border border-border',
  control: 'bg-card/70 backdrop-blur-xl border border-border',
  heavy: 'bg-card/90 backdrop-blur-2xl border border-border',
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
  panel: 'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
  fade: 'transition-opacity duration-200 ease-out',
  color: 'transition-colors duration-150',
  layout: 'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
} as const

export const PANEL_WIDTH = {
  sidebar: 320,
  detail: 400,
  dashboard: { min: 480, max: 720, collapsed: 380 },
} as const
