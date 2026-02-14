export type ArcMode = 'animated' | 'static' | 'off'
export type GlobeViewMode = 'network' | 'travel'

export interface DisplayOptions {
  arcMode: ArcMode
  globeViewMode: GlobeViewMode
  autoRotate: boolean
  showLabels: boolean
}

export const displayDefaults: DisplayOptions = {
  arcMode: 'static',
  globeViewMode: 'network',
  autoRotate: false,
  showLabels: true,
}
