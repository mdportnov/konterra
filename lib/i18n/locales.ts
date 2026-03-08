export const LOCALES = ['en', 'ru', 'es', 'zh'] as const
export type Locale = (typeof LOCALES)[number]

export const LOCALE_CONFIG: Record<Locale, { label: string; flag: string; hreflang: string }> = {
  en: { label: 'English', flag: '🇬🇧', hreflang: 'en' },
  ru: { label: 'Русский', flag: '🇷🇺', hreflang: 'ru' },
  es: { label: 'Español', flag: '🇪🇸', hreflang: 'es' },
  zh: { label: '中文', flag: '🇨🇳', hreflang: 'zh' },
}

export const DEFAULT_LOCALE: Locale = 'en'

export function isValidLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale)
}

export function getLocalePath(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '/' : `/${locale}`
}
