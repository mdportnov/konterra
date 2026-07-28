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
    title: 'Who Is Responsible',
    content: [
      'Konterra (konterra.space) is the data controller for the personal data described below. Written requests reach us at privacy@konterra.space and are answered within 30 days.',
      'This policy covers the Konterra web application, its public atlas pages at /u/, and the Konterra MCP API.',
    ],
  },
  {
    title: 'What We Collect',
    content: [
      'Account data: name, email address, a bcrypt hash of your password, optional profile image URL, optional username and bio, sign-in timestamps, and the invite you arrived through if any.',
      'Contact records you create: names, emails, phone numbers, social handles, cities, countries, coordinates, companies, job titles, tags, free-text notes, birthdays, and the relationship attributes you choose to fill in.',
      'Activity you log: interactions (type, date, location, notes), connections between contacts, introductions, favors, and the location history you record for a contact.',
      'Travel data: visited countries, trips (city, country, arrival and departure dates, notes, coordinates), and your country wishlist.',
      'Technical data: a security audit log of sign-ins, password changes, exports, deletions and similar events, recorded with a truncated IP address; rate-limit counters; and cached geocoding lookups.',
      'Usage analytics: Google Analytics 4 records page views and product events (for example, completing onboarding or opening the days-per-country table). These events carry no contact data and no note content.',
    ],
  },
  {
    title: 'Lawful Basis',
    content: [
      'Performance of a contract (GDPR art. 6(1)(b)): running your account, storing the records you enter, and delivering the product features you asked for.',
      'Legitimate interests (art. 6(1)(f)): keeping the service secure (audit log, rate limiting), preventing abuse, and sending the product digest you can switch off at any time. We have weighed these against your rights and limited each to what the purpose needs.',
      'Consent (art. 6(1)(a)): publishing your atlas at a public URL, allowing search engines to index it, and analytics cookies. Each is off unless you turn it on, and each can be withdrawn without affecting anything else.',
    ],
  },
  {
    title: 'Data About Other People',
    content: [
      'Konterra is a personal CRM, so most of what you store is personal data about third parties who are not our users. You remain responsible for having a lawful reason to record it and for keeping it accurate and proportionate.',
      'We process that data only on your behalf: to display it back to you, to geocode a place name into coordinates, and to compute your own insights. We never contact the people in your address book, never use their data to build profiles of our own, and never share it with anyone.',
      'Contacts are never shown on your public atlas at any privacy setting. The public page exposes countries, and — only if you opt into "full travel history" — your own trips.',
      'If someone in your records asks us to erase their data, we will route the request to you as the controller of that record and help you action it.',
    ],
  },
  {
    title: 'Where Your Data Is Stored',
    content: [
      'Database: Neon PostgreSQL in the EU (Frankfurt, aws-eu-central-1), encrypted at rest and in transit. Backups stay in the same region.',
      'Application hosting: Vercel serverless compute on a global edge network. Vercel processes requests but stores no user records.',
      'Transfers outside the EEA to US-based processors (Vercel, Google Analytics, Resend, OpenRouter) rely on the EU Standard Contractual Clauses and, where applicable, the EU–US Data Privacy Framework.',
    ],
  },
  {
    title: 'Who Has Access',
    content: [
      'You, through your authenticated session or an API token you issued yourself. API tokens are scoped, hashed at rest, and revocable.',
      'Administrators, for operational support only. Passwords are never readable — they are bcrypt hashes. Administrative actions on accounts are written to the audit log.',
      'Processors listed below, each limited to the specific data their function requires.',
      'Nobody else. We do not sell data, we do not share it for advertising, and we run no advertising.',
    ],
  },
  {
    title: 'Security Measures',
    content: [
      'HTTPS everywhere with HSTS preload, and a Content-Security-Policy restricting where the page may load code and connect.',
      'Passwords hashed with bcrypt at cost factor 12. Password reset and email confirmation links are single-use, expiring, and stored only as SHA-256 hashes.',
      'Sign-in attempts are rate limited per email and per IP across all servers, and repeated failures are throttled persistently.',
      'Account deletion and full data wipes require re-entering your password. Cross-site request protection is enforced on every state-changing request.',
      'Deleting your account cascades through every table that references it, so no orphaned records survive.',
    ],
  },
  {
    title: 'Data Retention',
    content: [
      'Account and content data: kept while your account exists, and erased when you delete it. There is no soft-delete and no recovery window.',
      'Security audit log: 400 days, then automatically deleted. It is kept beyond account deletion only as evidence that the deletion happened.',
      'Password reset and email confirmation tokens: deleted as soon as they expire, at most 24 hours after issue.',
      'Rate-limit counters: deleted once their window closes.',
      'Cached geocoding results (place name to coordinates, containing no personal identifiers): 365 days.',
      'A scheduled job enforces this schedule nightly — these are the periods the system actually applies, not aspirations.',
    ],
  },
  {
    title: 'Your Rights',
    content: [
      'Access and portability: export everything from Settings in JSON, CSV or vCard at any time. No request or waiting period.',
      'Rectification: edit or correct any record directly in the app.',
      'Erasure: delete your account from Settings. It is immediate and irreversible.',
      'Restriction and objection: switch off the digest, unpublish your atlas, remove it from search engines, or decline analytics — each independently, in Settings.',
      'Withdrawing consent does not affect processing that already happened lawfully before you withdrew it.',
      'You may lodge a complaint with your local data protection supervisory authority. We would rather you write to us first at privacy@konterra.space.',
    ],
  },
  {
    title: 'Processors We Use',
    content: [
      'Neon (neon.tech) — database hosting in the EU. Holds all account and content data.',
      'Vercel (vercel.com) — application hosting and compute. Processes requests; stores no records.',
      'Resend (resend.com) — transactional and digest email. Receives your email address, your name, and the digest content itself.',
      'OpenCage (opencagedata.com) and OpenStreetMap Nominatim — geocoding. Receive only a place name such as "Lisbon, Portugal". No names, emails or identifiers are sent.',
      'OpenRouter (openrouter.ai) — the AI features you invoke explicitly, such as drafting an introduction or generating contact insights. Receives only the contact details relevant to that request, and only when you press the button.',
      'Google Analytics (google.com) — usage measurement. Receives page paths and product events, never contact data or note content.',
    ],
  },
  {
    title: 'Cookies',
    content: [
      'A session cookie keeps you signed in. It is strictly necessary and cannot be switched off while you use an account.',
      'Google Analytics cookies measure usage. They are not required for the product to work.',
      'We set no advertising cookies and no cross-site trackers.',
    ],
  },
  {
    title: 'Changes and Contact',
    content: [
      'Material changes to this policy are announced in the app before they take effect. The date at the top of this page is the last revision.',
      'Privacy questions, data requests and complaints: privacy@konterra.space.',
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
              <span className="k-meta">2026-07-28</span>
            </div>
            <h1 className="text-4xl sm:text-6xl tracking-[-0.03em] font-medium mb-4">
              Privacy <span className="k-serif italic tracking-normal" style={{ color: 'var(--terra)' }}>Policy</span>
            </h1>
            <p className="text-sm leading-relaxed max-w-xl mb-16 sm:mb-20" style={{ color: 'var(--bone-45)' }}>
              What we collect, on what legal basis, how long we keep it, and the rights you keep. No ads, no data
              selling, no third-party sharing.
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
