export const GLASS = {
  panel: 'bg-card/80 backdrop-blur-xl border border-border',
  control: 'bg-card/70 backdrop-blur-xl border border-border',
  heavy: 'bg-card/95 backdrop-blur-2xl border border-border',
} as const


export const Z = {
  globe: 0,
  controls: 20,
  sidebar: 20,
  sidebarToggle: 25,
  detail: 30,
  overlay: 40,
  // Above the panels so it cannot be missed, below modals and toasts so it never covers a
  // dialog the user opened or a message about what just happened.
  consent: 45,
  modal: 50,
  toast: 60,
} as const

export const TRANSITION = {
  panel: 'transition-[transform,opacity,margin] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
  fade: 'transition-opacity duration-200 ease-out',
  color: 'transition-colors duration-150',
  layout: 'transition-[transform,opacity,grid-template-rows] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
} as const

export const PANEL_WIDTH = {
  detail: 400,
  dashboard: 480,
} as const
