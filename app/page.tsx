import Link from 'next/link'
import type { Metadata } from 'next'
import NetworkBackground from '@/components/auth/NetworkBackground'

export const metadata: Metadata = {
  title: {
    absolute: 'Konterra — Private Intelligence Network | Map Your Relationships & Journeys',
  },
  description:
    'Your most valuable assets aren\'t indexed by any search engine. Konterra maps, measures, and mobilizes the relationships and journeys that define your career on an interactive 3D globe.',
  alternates: {
    canonical: 'https://konterra.space',
  },
}

const STATS = [
  { value: '50%', label: 'of opportunities come through personal connections' },
  { value: '25%', label: 'faster hires when sourced through referrals' },
  { value: '80%', label: 'of deals in venture & PE come from firm networks' },
] as const

const PILLARS = [
  {
    title: 'Map',
    subtitle: 'See your world',
    description:
      'Visualize your network and travel history on an interactive 3D globe. Contacts, trips, visited countries, and wishlists — plotted, searchable, and explorable. Turn scattered data into a living topology of your social capital and journeys.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6">
        <circle cx="12" cy="12" r="10" />
        <ellipse cx="12" cy="12" rx="4" ry="10" />
        <path d="M2 12h20" />
      </svg>
    ),
  },
  {
    title: 'Measure',
    subtitle: 'Know your strength',
    description:
      'Relationship scoring, interaction tracking, and decay alerts ensure you nurture the connections that matter — before they fade. A full travel timeline tracks every trip, every country, every gap between journeys.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6">
        <path d="M3 3v18h18" />
        <path d="M7 16l4-8 4 4 5-9" />
      </svg>
    ),
  },
  {
    title: 'Mobilize',
    subtitle: 'Activate your reach',
    description:
      'Planning a trip? See which contacts live in your destination. When opportunity strikes, find the warmest path to any person through your existing connections. Track favors, introductions, and reciprocity — the currency of trust that no algorithm can replicate.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
      </svg>
    ),
  },
] as const

const FEATURE_CATEGORIES = [
  {
    label: 'Network Intelligence',
    color: 'oklch(0.55 0.08 180)',
    features: [
      { title: '3D Globe Visualization', description: 'Your contacts mapped across the planet in real time' },
      { title: 'Relationship Scoring', description: 'Automated scoring based on interaction recency and depth' },
      { title: 'Connection Graph', description: 'Discover clusters, bridges, and gaps in your network' },
      { title: 'Favor & Reciprocity', description: 'Monitor the balance of social capital exchange' },
    ],
  },
  {
    label: 'Travel Intelligence',
    color: 'oklch(0.65 0.15 55)',
    features: [
      { title: 'Trip Timeline', description: 'Past, current, and future trips with gap detection' },
      { title: 'Country Map', description: 'Visited countries highlighted and color-coded on the globe' },
      { title: 'Wishlist Tracking', description: 'Prioritize and plan your dream destinations' },
      { title: 'Network Overlay', description: 'See contacts in countries you visit or plan to visit' },
    ],
  },
] as const

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
    <div className="relative min-h-dvh overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NetworkBackground />

      <div className="relative z-10">
        <header className="landing-header fixed top-0 inset-x-0 z-50">
          <nav className="mx-auto max-w-6xl px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
            <span className="font-mono tracking-[0.3em] uppercase text-sm text-white/90">
              Konterra
            </span>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/login"
                className="font-mono text-xs text-white/50 hover:text-white/80 transition-colors py-2 px-2"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="landing-cta-button"
              >
                Request Access
              </Link>
            </div>
          </nav>
        </header>

        <main>
          {/* Hero */}
          <section className="relative min-h-dvh flex items-center justify-center px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center pt-14">
              <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[oklch(0.55_0.08_180)] mb-4 sm:mb-6">
                Private Intelligence Network
              </p>
              <h1 className="text-[1.75rem] sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.15] sm:leading-[1.1] text-white tracking-tight">
                AI can replace your expertise.{' '}
                <span className="landing-gradient-text">
                  It can&apos;t replace your introductions — or your journeys.
                </span>
              </h1>
              <p className="mt-5 sm:mt-6 text-sm sm:text-base md:text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
                Your network and your travels are the last competitive advantages AI cannot commoditize.
                Konterra maps both on a single globe — a private intelligence system
                that belongs to you.
              </p>
              <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="landing-cta-button-lg w-full sm:w-auto justify-center"
                >
                  Request Early Access
                </Link>
                <a
                  href="#why"
                  className="font-mono text-xs text-white/40 hover:text-white/70 transition-colors py-2 px-4"
                >
                  Learn more
                </a>
              </div>
            </div>
            <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
              <svg viewBox="0 0 24 24" fill="none" stroke="oklch(0.55 0.08 180 / 40%)" strokeWidth="1.5" className="size-5">
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </div>
          </section>

          {/* Problem Statement */}
          <section id="why" className="scroll-mt-16 py-16 sm:py-24 md:py-32 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto">
              <div className="landing-glass-panel p-6 sm:p-8 md:p-12 rounded-xl sm:rounded-2xl">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white leading-snug mb-4 sm:mb-6">
                  In the age of AI, knowledge is free and skills are automatable.
                </h2>
                <p className="text-sm sm:text-base text-white/50 leading-relaxed mb-3 sm:mb-4">
                  The last durable competitive advantage is who you know — and who knows you.
                  Where you&apos;ve been shapes who you know, and who you know shapes where you go next.
                  Yet most people manage their most valuable assets with scattered contacts,
                  forgotten LinkedIn connections, and guesswork.
                </p>
                <p className="text-sm sm:text-base text-white/50 leading-relaxed mb-6 sm:mb-8">
                  Every year, relationships decay silently. Introductions go unmade.
                  Opportunities pass to people who simply stayed in touch.
                  The problem isn&apos;t your network — it&apos;s your visibility into it.
                </p>
                <div className="grid grid-cols-3 gap-3 sm:gap-6">
                  {STATS.map((stat) => (
                    <div key={stat.value} className="text-center">
                      <p className="text-2xl sm:text-3xl font-bold landing-gradient-text">
                        {stat.value}
                      </p>
                      <p className="text-[10px] sm:text-xs text-white/40 mt-1 leading-snug sm:leading-relaxed">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Three Pillars */}
          <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10 sm:mb-16">
                <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[oklch(0.55_0.08_180)] mb-3 sm:mb-4">
                  How it works
                </p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white">
                  Map. Measure. Mobilize.
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {PILLARS.map((pillar) => (
                  <div key={pillar.title} className="landing-glass-panel p-6 sm:p-8 rounded-xl group">
                    <div className="size-10 sm:size-12 rounded-lg bg-[oklch(0.55_0.08_180/10%)] border border-[oklch(0.55_0.08_180/20%)] flex items-center justify-center text-[oklch(0.55_0.08_180)] mb-4 sm:mb-5 group-hover:bg-[oklch(0.55_0.08_180/15%)] transition-colors">
                      {pillar.icon}
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
                      {pillar.title}
                    </h3>
                    <p className="text-[10px] sm:text-xs font-mono text-[oklch(0.55_0.08_180)] mb-2 sm:mb-3">
                      {pillar.subtitle}
                    </p>
                    <p className="text-xs sm:text-sm text-white/45 leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* AI Paradox Section */}
          <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                <div>
                  <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[oklch(0.55_0.08_180)] mb-3 sm:mb-4">
                    The social capital thesis
                  </p>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white leading-snug mb-4 sm:mb-6">
                    The more work becomes automated, the more human connection becomes a competitive advantage.
                  </h2>
                  <p className="text-sm sm:text-base text-white/50 leading-relaxed mb-3 sm:mb-4">
                    AI is commoditizing knowledge at an unprecedented rate. Research that took weeks now
                    takes seconds. Skills that took years to learn are being compressed into prompts.
                  </p>
                  <p className="text-sm sm:text-base text-white/50 leading-relaxed">
                    But AI cannot personally introduce you to a colleague, extend its social capital
                    on your behalf, or vouch for your character in a room you&apos;re not in.
                    Your relationships remain the one asset that is fundamentally non-replicable.
                  </p>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <div className="landing-glass-panel p-4 sm:p-5 rounded-xl">
                    <p className="text-xs sm:text-sm text-white/60 mb-2">What AI commoditizes</p>
                    <div className="space-y-1.5 sm:space-y-2">
                      {['Knowledge & research', 'Technical skills', 'Content creation', 'Data analysis'].map((item) => (
                        <div key={item} className="flex items-center gap-2 text-xs sm:text-sm text-white/35">
                          <span className="size-1.5 rounded-full bg-white/20 shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="landing-glass-panel landing-glass-panel-accent p-4 sm:p-5 rounded-xl">
                    <p className="text-xs sm:text-sm text-[oklch(0.65_0.08_180)] mb-2">What remains yours</p>
                    <div className="space-y-1.5 sm:space-y-2">
                      {['Trusted introductions', 'Reciprocal relationships', 'Contextual reputation', 'Your travel footprint'].map((item) => (
                        <div key={item} className="flex items-center gap-2 text-xs sm:text-sm text-white/60">
                          <span className="size-1.5 rounded-full bg-[oklch(0.55_0.08_180)] shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10 sm:mb-16">
                <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[oklch(0.55_0.08_180)] mb-3 sm:mb-4">
                  Two dimensions, one globe
                </p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white">
                  Everything you need. Nothing you don&apos;t.
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {FEATURE_CATEGORIES.map((category) => (
                  <div key={category.label} className="space-y-3 sm:space-y-4">
                    <p
                      className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em]"
                      style={{ color: category.color }}
                    >
                      {category.label}
                    </p>
                    {category.features.map((feature) => (
                      <div key={feature.title} className="landing-glass-panel p-5 sm:p-6 rounded-xl">
                        <h3 className="text-sm font-medium text-white mb-1">
                          {feature.title}
                        </h3>
                        <p className="text-xs text-white/40 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Anti-CRM Positioning */}
          <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white leading-snug mb-4 sm:mb-6">
                Konterra is not a CRM.
              </h2>
              <p className="text-sm sm:text-base text-white/50 leading-relaxed mb-6 sm:mb-8 max-w-2xl mx-auto">
                It&apos;s not a sales tool. It&apos;s not a lead tracker. It&apos;s a private intelligence
                network — a sovereign map of your social capital that belongs to you,
                not a platform. No ads. No data selling. No algorithmic feed deciding
                who you should see.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-2xl mx-auto">
                {[
                  { label: 'Private', desc: 'Your data, your network' },
                  { label: 'Sovereign', desc: 'Not a platform\'s asset' },
                  { label: 'Spatial', desc: 'Globe, not a spreadsheet' },
                  { label: 'Integrated', desc: 'Network meets travel' },
                ].map((diff) => (
                  <div key={diff.label} className="text-center py-2">
                    <p className="text-sm font-medium text-white mb-0.5">{diff.label}</p>
                    <p className="text-[10px] sm:text-[11px] text-white/35">{diff.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
            <div className="max-w-2xl mx-auto text-center">
              <div className="landing-glass-panel landing-glass-panel-accent p-8 sm:p-10 md:p-14 rounded-xl sm:rounded-2xl">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white mb-3 sm:mb-4">
                  Your network is your net worth. Your travels are your footprint.
                  <br />
                  <span className="landing-gradient-text">Start seeing both.</span>
                </h2>
                <p className="text-white/45 text-xs sm:text-sm mb-6 sm:mb-8 max-w-md mx-auto">
                  Access is by invitation only. Request early access and we&apos;ll
                  review your application personally.
                </p>
                <Link
                  href="/login"
                  className="landing-cta-button-lg w-full sm:w-auto justify-center"
                >
                  Request Early Access
                </Link>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-8 sm:py-12 px-4 sm:px-6 border-t border-white/5">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono tracking-[0.2em] uppercase text-xs text-white/40">
                  Konterra
                </span>
                <span className="text-white/10">|</span>
                <span className="font-mono text-[10px] text-white/25">
                  Network & Travel Intelligence
                </span>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/privacy" className="font-mono text-[10px] text-white/30 hover:text-white/50 transition-colors">
                  Privacy Policy
                </Link>
                <p className="font-mono text-[10px] text-white/20">
                  All rights reserved.
                </p>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
