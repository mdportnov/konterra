export type ArcMode = 'animated' | 'static' | 'off'
export type GlobeLayer = 'network' | 'travel'
export type VisualizationMode = 'heatmap' | 'hexbin'

export interface DisplayOptions {
  arcMode: ArcMode
  showNetwork: boolean
  showTravel: boolean
  autoRotate: boolean
  showHeatmap: boolean
  showHexBins: boolean
  showGraticules: boolean
}

export const displayDefaults: DisplayOptions = {
  arcMode: 'static',
  showNetwork: true,
  showTravel: false,
  autoRotate: false,
  showHeatmap: false,
  showHexBins: false,
  showGraticules: false,
}
