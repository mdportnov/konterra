const FLAG_COLORS: Record<string, string> = {
  'Angola': '#cc2229',
  'Argentina': '#6cace4',
  'Australia': '#4a7dc9',
  'Brunei': '#c9a30e',
  'Chile': '#d52b1e',
  'China': '#de2910',
  'Côte d\'Ivoire': '#f77f00',
  'Ethiopia': '#078930',
  'Hong Kong': '#de2910',
  'Iraq': '#c4161c',
  'Jordan': '#007a3d',
  'Kenya': '#bb0000',
  'Kurdistan': '#c9a30e',
  'Morocco': '#c1272d',
  'New Zealand': '#4a7dc9',
  'Peru': '#d91023',
  'Rwanda': '#20603d',
  'Senegal': '#00853f',
  'South Africa': '#007a4d',
  'South Korea': '#4a7dc9',
  'Taiwan': '#fe0000',
  'Tanzania': '#1eb53a',
  'Thailand': '#5b52a0',
  'United Arab Emirates': '#00a34d',
  'UAE': '#00a34d',
  'USA': '#6b6abf',
  'United States': '#6b6abf',
  'UK': '#4a7dc9',
  'United Kingdom': '#4a7dc9',
  'France': '#4a6fcf',
  'Germany': '#dd0000',
  'Italy': '#008c45',
  'Spain': '#c60b1e',
  'Japan': '#bc002d',
  'India': '#ff9933',
  'Brazil': '#009c3b',
  'Mexico': '#006847',
  'Canada': '#ff0000',
  'Russia': '#4a7dc9',
  'Turkey': '#e30a17',
  'Egypt': '#c8102e',
  'Indonesia': '#ce1126',
  'Vietnam': '#da251d',
  'Philippines': '#4a7dc9',
  'Colombia': '#c9a30e',
  'Nigeria': '#008751',
  'Pakistan': '#1a8a4a',
  'Bangladesh': '#008a5e',
  'Ukraine': '#3a8fd4',
  'Poland': '#dc143c',
  'Netherlands': '#ae1c28',
  'Belgium': '#c9a30e',
  'Sweden': '#3a8fd4',
  'Norway': '#ba0c2f',
  'Denmark': '#c8102e',
  'Finland': '#4a7dc9',
  'Switzerland': '#ff0000',
  'Austria': '#ed2939',
  'Portugal': '#008800',
  'Greece': '#3a8fd4',
  'Czechia': '#d7141a',
  'Romania': '#c9a30e',
  'Hungary': '#5a9070',
  'Ireland': '#169b62',
  'Singapore': '#ee2536',
  'Malaysia': '#4a5ac9',
  'Cambodia': '#4a6fcf',
  'Myanmar': '#c9a30e',
  'Laos': '#4a7dc9',
  'Nepal': '#dc143c',
  'Sri Lanka': '#8d153a',
  'Saudi Arabia': '#006c35',
  'Qatar': '#8a1538',
  'Kuwait': '#007a3d',
  'Oman': '#db161b',
  'Lebanon': '#00a650',
  'Israel': '#4a7dc9',
  'Iran': '#239f40',
  'Cuba': '#4a6fcf',
  'Jamaica': '#009b3a',
  'Costa Rica': '#4a6fcf',
  'Panama': '#da121a',
  'Guatemala': '#4997d0',
  'Ecuador': '#c9a30e',
  'Venezuela': '#cf142b',
  'Bolivia': '#007934',
  'Paraguay': '#d52b1e',
  'Uruguay': '#4a5ac9',
  'Ghana': '#006b3f',
  'Cameroon': '#007a5e',
  'Madagascar': '#fc3d32',
  'Mozambique': '#009739',
  'Namibia': '#4a7dc9',
  'Botswana': '#75aadb',
  'Zimbabwe': '#228b22',
  'Zambia': '#198a00',
  'Uganda': '#d90000',
  'Somalia': '#4189dd',
  'Sudan': '#d21034',
  'Libya': '#239f40',
  'Tunisia': '#e70013',
  'Algeria': '#008833',
  'Syria': '#ce1126',
  'S. Korea': '#4a7dc9',
  'N. Korea': '#cc0000',
}

const FALLBACK_COLORS = [
  '#3b82f6', '#10b981', '#f97316', '#8b5cf6',
  '#f43f5e', '#06b6d4', '#f59e0b', '#6366f1',
  '#14b8a6', '#ec4899', '#84cc16', '#d946ef',
  '#0ea5e9', '#ef4444', '#22c55e', '#a855f7',
]

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function getCountryColor(country: string, fallbackIndex: number): string {
  return FLAG_COLORS[country] ?? FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length]
}

export function getCountryTextColor(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  const lum = relativeLuminance(r, g, b)
  if (lum < 0.15) {
    const factor = 1.8
    const nr = Math.min(255, Math.round(r * factor + 40))
    const ng = Math.min(255, Math.round(g * factor + 40))
    const nb = Math.min(255, Math.round(b * factor + 40))
    return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`
  }
  if (lum > 0.5) {
    const factor = 0.6
    const nr = Math.round(r * factor)
    const ng = Math.round(g * factor)
    const nb = Math.round(b * factor)
    return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`
  }
  return hex
}

export function getMondayStart(year: number, month: number): Date {
  const first = new Date(year, month, 1)
  const dow = first.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  return new Date(year, month, 1 + diff)
}
