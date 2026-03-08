import type { Metadata } from 'next'
import LandingContent from '@/components/landing/LandingContent'
import { getLandingTranslations } from '@/lib/i18n/landing'
import { LOCALE_CONFIG, getLocalePath, LOCALES } from '@/lib/i18n/locales'

const t = getLandingTranslations('en')

export const metadata: Metadata = {
  title: { absolute: t.meta.title },
  description: t.meta.description,
  alternates: {
    canonical: 'https://konterra.space',
    languages: Object.fromEntries(
      LOCALES.map((l) => [LOCALE_CONFIG[l].hreflang, `https://konterra.space${getLocalePath(l)}`])
    ),
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Konterra',
  url: 'https://konterra.space',
  description: 'Private Intelligence Network — map, measure, and mobilize the relationships that define your career.',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InviteOnly',
  },
  featureList: [
    '3D Globe Visualization',
    'Relationship Intelligence',
    'Connection Insights',
    'Favor & Reciprocity Tracking',
    'Trip Tracking & Travel Timeline',
    'Country Wishlist',
    'Public Travel Profile',
    'Private & Sovereign Data',
  ],
}

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingContent t={t} locale="en" />
    </>
  )
}
