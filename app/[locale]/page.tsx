import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import LandingContent from '@/components/landing/LandingContent'
import { getLandingTranslations } from '@/lib/i18n/landing'
import { isValidLocale, LOCALES, LOCALE_CONFIG, getLocalePath, DEFAULT_LOCALE } from '@/lib/i18n/locales'

interface Props {
  params: Promise<{ locale: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isValidLocale(locale) || locale === DEFAULT_LOCALE) return {}
  const t = getLandingTranslations(locale)
  return {
    title: { absolute: t.meta.title },
    description: t.meta.description,
    alternates: {
      canonical: `https://konterra.space/${locale}`,
      languages: Object.fromEntries(
        LOCALES.map((l) => [LOCALE_CONFIG[l].hreflang, `https://konterra.space${getLocalePath(l)}`])
      ),
    },
  }
}

function buildJsonLd(locale: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Konterra',
    url: `https://konterra.space/${locale}`,
    inLanguage: locale,
    description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InviteOnly',
    },
  }
}

export default async function LocaleLandingPage({ params }: Props) {
  const { locale } = await params
  if (!isValidLocale(locale) || locale === DEFAULT_LOCALE) notFound()
  const t = getLandingTranslations(locale)
  const jsonLd = buildJsonLd(locale, t.meta.description)
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingContent t={t} locale={locale} />
    </>
  )
}
