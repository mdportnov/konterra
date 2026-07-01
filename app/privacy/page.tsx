import Link from 'next/link'
import type { Metadata } from 'next'
import AtlasBackground from '@/components/branding/AtlasBackground'
import Wordmark from '@/components/branding/Wordmark'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Konterra handles your data: what we collect, why, and your rights.',
  alternates: {
    canonical: '/privacy',
  },
}

const SECTIONS = [
  {
    title: 'What We Collect',
    content: [
      'Identity information: name, email address, hashed password, profile image URL, username.',
      'Contacts: names, emails, phone numbers, cities, countries, coordinates, companies, job titles, tags, notes, birthdays, communication preferences.',
      'Interactions: meeting type, date, location, notes linked to contacts.',
      'Relationships: connections between contacts, introductions, favors, and reciprocity tracking.',
      'Travel: visited countries, trip history (cities, dates, notes), country wishlist.',
      'We do not collect browsing behavior, analytics, advertising identifiers, or any data beyond what you explicitly enter.',
    ],
  },
  {
    title: 'Why We Collect It',
    content: [
      'All data exists solely to power your personal network management. Konterra does not serve ads, sell data, share data with third parties for marketing, or monetize your information in any way.',
      'Your data is used exclusively to render your dashboard, globe visualization, and network insights — visible only to you.',
    ],
  },
  {
    title: 'Where Your Data Is Stored',
    content: [
      'Database: Neon PostgreSQL hosted in EU (Frankfurt, aws-eu-central-1). Data is encrypted at rest (AES-256) and encrypted in transit (TLS/SSL).',
      'Application hosting: Vercel (edge network with global PoPs). No persistent user data is stored on Vercel — it serves as compute only.',
      'Backups are managed by Neon within the same EU region and subject to the same encryption standards.',
    ],
  },
  {
    title: 'Who Has Access',
    content: [
      'Only you, the authenticated user, can access your data through the application.',
      'Admin access exists for operational support only (e.g., debugging, account recovery). Admins cannot view passwords — they are irreversibly hashed with bcrypt.',
      'No third party has access to your personal data. Konterra has no data-sharing agreements with any external entity.',
    ],
  },
  {
    title: 'Security Measures',
    content: [
      'HTTPS enforced on all connections with HSTS preload.',
      'Passwords hashed with bcrypt (cost factor 10) — never stored in plain text.',
      'JWT-based sessions with no server-side session storage.',
      'Cascade-delete architecture: deleting your account removes all associated data immediately.',
      'Security headers: X-Frame-Options (SAMEORIGIN), X-Content-Type-Options (nosniff), Strict-Transport-Security, Referrer-Policy (strict-origin-when-cross-origin), Permissions-Policy (camera, microphone, geolocation disabled).',
      'No cookies beyond the authentication session token.',
    ],
  },
  {
    title: 'Your Data Rights',
    content: [
      'Export: you can export all your data at any time in JSON, CSV, or vCard format from the Settings panel.',
      'Deletion: you can permanently delete your entire account and all associated data from the Settings panel. Deletion is immediate and irrecoverable.',
      'Portability: exported data is in standard formats that can be imported into other tools.',
    ],
  },
  {
    title: 'Data Retention',
    content: [
      'Your data is retained for as long as your account is active.',
      'Upon account deletion, all data (contacts, interactions, connections, favors, introductions, trips, tags, visited countries, wishlist) is permanently removed from the database. There is no soft-delete or recovery period.',
    ],
  },
  {
    title: 'Third-Party Services',
    content: [
      'Neon (neon.tech): database hosting. Subject to Neon\'s privacy policy. Only stores data you enter into Konterra.',
      'Vercel (vercel.com): application hosting and serverless compute. No persistent user data stored.',
      'OpenCage (opencagedata.com): geocoding service. Only city and country names are sent for coordinate lookup — no personal data, names, emails, or identifiers are transmitted.',
    ],
  },
  {
    title: 'Contact',
    content: [
      'For data requests, questions, or concerns about your privacy, contact us at: privacy@konterra.app',
    ],
  },
] as const

export default function PrivacyPolicyPage() {
  return (
    <div className="k-page relative min-h-dvh overflow-x-hidden">
      <AtlasBackground />

      <div className="relative z-10">
        <header className="k-header fixed top-0 inset-x-0 z-50">
          <nav className="mx-auto max-w-6xl px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
            <Link href="/" aria-label="Konterra">
              <Wordmark />
            </Link>
            <Link href="/login" className="k-btn k-btn-sm">
              Sign In
            </Link>
          </nav>
        </header>

        <main className="pt-32 sm:pt-44 pb-16 sm:pb-24 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-5 mb-10">
              <span className="k-meta k-meta-terra">Legal</span>
              <span className="h-px flex-1" style={{ background: 'var(--hairline)' }} />
              <span className="k-meta">2025-02-23</span>
            </div>
            <h1 className="text-4xl sm:text-6xl tracking-[-0.03em] font-medium mb-4">
              Privacy <span className="k-serif italic tracking-normal" style={{ color: 'var(--terra)' }}>Policy</span>
            </h1>
            <p className="text-sm leading-relaxed max-w-xl mb-16 sm:mb-20" style={{ color: 'var(--bone-45)' }}>
              What we collect, why we collect it, and the rights you keep. No ads, no data selling, no third-party sharing.
            </p>

            <div className="border-t" style={{ borderColor: 'var(--hairline)' }}>
              {SECTIONS.map((section, si) => (
                <section
                  key={section.title}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-8 py-10 sm:py-12 border-b"
                  style={{ borderColor: 'var(--hairline)' }}
                >
                  <span className="k-meta k-meta-terra sm:col-span-1 pt-1">
                    {String(si + 1).padStart(2, '0')}
                  </span>
                  <h2 className="sm:col-span-3 text-lg font-medium leading-snug">
                    {section.title}
                  </h2>
                  <div className="sm:col-span-8 space-y-3">
                    {section.content.map((paragraph, i) => (
                      <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--bone-70)' }}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </main>

        <footer className="py-8 sm:py-10 px-4 sm:px-6 border-t" style={{ borderColor: 'var(--hairline)' }}>
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/" aria-label="Konterra">
                <Wordmark />
              </Link>
              <span className="k-meta hidden md:inline normal-case tracking-[0.12em]">
                Network &amp; Travel Intelligence
              </span>
            </div>
            <p className="font-mono text-[10px] tracking-[0.14em]" style={{ color: 'var(--bone-45)' }}>
              All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
