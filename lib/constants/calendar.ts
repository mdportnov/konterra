export const COUNTRY_COLORS_BG = [
  'bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-violet-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500',
  'bg-teal-500', 'bg-pink-500', 'bg-lime-500', 'bg-fuchsia-500',
  'bg-sky-500', 'bg-red-500', 'bg-green-500', 'bg-purple-500',
] as const

export const COUNTRY_COLORS_TEXT = [
  'text-blue-500', 'text-emerald-500', 'text-orange-500', 'text-violet-500',
  'text-rose-500', 'text-cyan-500', 'text-amber-500', 'text-indigo-500',
  'text-teal-500', 'text-pink-500', 'text-lime-500', 'text-fuchsia-500',
  'text-sky-500', 'text-red-500', 'text-green-500', 'text-purple-500',
] as const

export function getMondayStart(year: number, month: number): Date {
  const first = new Date(year, month, 1)
  const dow = first.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  return new Date(year, month, 1 + diff)
}
