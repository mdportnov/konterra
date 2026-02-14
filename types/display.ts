export type ArcMode = 'animated' | 'static' | 'off'
export type GlobeLayer = 'network' | 'travel'

export interface DisplayOptions {
  arcMode: ArcMode
  showNetwork: boolean
  showTravel: boolean
  autoRotate: boolean
  showLabels: boolean
}

export const displayDefaults: DisplayOptions = {
  arcMode: 'static',
  showNetwork: true,
  showTravel: false,
  autoRotate: false,
  showLabels: true,
}
