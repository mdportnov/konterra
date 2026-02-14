export const TRAVEL_COLORS = {
  pastPoint: '#3b82f6',
  futurePoint: '#22c55e',
  pastArc: 'rgba(96, 165, 250, 0.6)',
  futureArc: 'rgba(74, 222, 128, 0.6)',
  pastCountry: { dark: 'rgba(59, 130, 246, 0.35)', light: 'rgba(59, 130, 246, 0.2)' },
  futureCountry: { dark: 'rgba(74, 222, 128, 0.25)', light: 'rgba(74, 222, 128, 0.15)' },
  pastStroke: { dark: 'rgba(59, 130, 246, 0.6)', light: 'rgba(59, 130, 246, 0.4)' },
  futureStroke: { dark: 'rgba(74, 222, 128, 0.5)', light: 'rgba(74, 222, 128, 0.35)' },
} as const

export const NETWORK_COLORS = {
  point: '#f97316',
  pointHighlighted: '#38bdf8',
  pointClusterPartial: '#7dd3fc',
  pointCluster: '#fb923c',
  userPoint: '#22c55e',
  selectedArc: 'rgba(56, 189, 248, 0.6)',
  defaultArc: 'rgba(251, 146, 60, 0.4)',
  countryArcSelected: 'rgba(56, 189, 248, 0.35)',
  countryArcDefault: 'rgba(168, 85, 247, 0.25)',
} as const

export const CONNECTION_COLORS: Record<string, string> = {
  knows: 'rgba(251, 146, 60, 0.5)',
  introduced_by: 'rgba(168, 85, 247, 0.5)',
  works_with: 'rgba(59, 130, 246, 0.5)',
  reports_to: 'rgba(239, 68, 68, 0.5)',
  invested_in: 'rgba(34, 197, 94, 0.5)',
  referred_by: 'rgba(236, 72, 153, 0.5)',
}

export const POLYGON_COLORS = {
  defaultCap: { dark: 'rgba(15, 25, 55, 0.85)', light: 'rgba(180, 195, 220, 0.7)' },
  defaultSide: { dark: 'rgba(10, 18, 40, 0.6)', light: 'rgba(160, 180, 210, 0.5)' },
  defaultStroke: { dark: 'rgba(40, 70, 130, 0.35)', light: 'rgba(100, 130, 180, 0.3)' },
  contactLow: { dark: 'rgba(234, 88, 12, 0.35)', light: 'rgba(234, 88, 12, 0.25)' },
  contactMed: { dark: 'rgba(234, 88, 12, 0.55)', light: 'rgba(234, 88, 12, 0.4)' },
  contactHigh: { dark: 'rgba(234, 88, 12, 0.75)', light: 'rgba(234, 88, 12, 0.55)' },
  contactStroke: { dark: 'rgba(234, 88, 12, 0.5)', light: 'rgba(234, 88, 12, 0.35)' },
  visitedOnly: { dark: 'rgba(20, 184, 166, 0.25)', light: 'rgba(20, 184, 166, 0.15)' },
  visitedStroke: { dark: 'rgba(20, 184, 166, 0.6)', light: 'rgba(20, 184, 166, 0.45)' },
  visitedContactsStroke: { dark: 'rgba(20, 184, 166, 0.8)', light: 'rgba(20, 184, 166, 0.6)' },
  visitedContactLow: { dark: 'rgba(180, 120, 40, 0.4)', light: 'rgba(180, 120, 40, 0.3)' },
  visitedContactMed: { dark: 'rgba(200, 100, 20, 0.55)', light: 'rgba(200, 100, 20, 0.4)' },
  visitedContactHigh: { dark: 'rgba(200, 100, 20, 0.75)', light: 'rgba(200, 100, 20, 0.55)' },
  indirect: { dark: 'rgba(168, 85, 247, 0.2)', light: 'rgba(168, 85, 247, 0.12)' },
  indirectStroke: { dark: 'rgba(168, 85, 247, 0.5)', light: 'rgba(168, 85, 247, 0.35)' },
  userCountry: { dark: 'rgba(34, 197, 94, 0.25)', light: 'rgba(34, 197, 94, 0.15)' },
  userCountryStroke: { dark: 'rgba(34, 197, 94, 0.6)', light: 'rgba(34, 197, 94, 0.45)' },
} as const

export const TENSE_COLORS = {
  past: { icon: 'bg-blue-500/10', iconText: 'text-blue-400', hover: 'hover:bg-blue-500/5', arrow: 'text-blue-400/50' },
  current: { icon: 'bg-red-500/10', iconText: 'text-red-400', hover: 'hover:bg-red-500/5', arrow: 'text-red-400/50' },
  future: { icon: 'bg-green-500/10', iconText: 'text-green-400', hover: 'hover:bg-green-500/5', arrow: 'text-green-400/50' },
} as const
