import Link from 'next/link'
import type { Metadata } from 'next'
import NetworkBackground from '@/components/auth/NetworkBackground'

export const metadata: Metadata = {
  title: 'Privacy Policy — Konterra',
  description: 'How Konterra handles your data: what we collect, why, and your rights.',
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
    <div className="relative min-h-dvh overflow-x-hidden">
      <NetworkBackground />

      <div className="relative z-10">
        <header className="landing-header fixed top-0 inset-x-0 z-50">
          <nav className="mx-auto max-w-6xl px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
            <Link href="/" className="font-mono tracking-[0.3em] uppercase text-sm text-white/90">
              Konterra
            </Link>
            <Link
              href="/login"
              className="landing-cta-button"
            >
              Sign In
            </Link>
          </nav>
        </header>

        <main className="pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="landing-glass-panel p-6 sm:p-8 md:p-12 rounded-xl sm:rounded-2xl">
              <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[oklch(0.55_0.08_180)] mb-3 sm:mb-4">
                Legal
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white mb-2">
                Privacy Policy
              </h1>
              <p className="text-xs sm:text-sm text-white/30 mb-8 sm:mb-10 font-mono">
                Last updated: February 23, 2025
              </p>

              <div className="space-y-8 sm:space-y-10">
                {SECTIONS.map((section) => (
                  <div key={section.title}>
                    <h2 className="text-base sm:text-lg font-semibold text-white mb-3">
                      {section.title}
                    </h2>
                    <div className="space-y-2">
                      {section.content.map((paragraph, i) => (
                        <p key={i} className="text-xs sm:text-sm text-white/50 leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        <footer className="py-8 sm:py-12 px-4 sm:px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="font-mono tracking-[0.2em] uppercase text-xs text-white/40 hover:text-white/60 transition-colors">
                Konterra
              </Link>
              <span className="text-white/10">|</span>
              <span className="font-mono text-[10px] text-white/25">
                Private Intelligence Network
              </span>
            </div>
            <p className="font-mono text-[10px] text-white/20">
              All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
