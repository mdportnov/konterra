export type ArcMode = 'animated' | 'static' | 'off'

export interface DisplayOptions {
  arcMode: ArcMode
}

export const displayDefaults: DisplayOptions = {
  arcMode: 'static',
}
