import Link from 'next/link'
import { Particles } from '@/components/magicui/particles'
import LocaleSwitcher from '@/components/landing/LocaleSwitcher'
import type { LandingTranslations } from '@/lib/i18n/landing'
import type { Locale } from '@/lib/i18n/locales'

const PILLAR_ICONS = [
  <svg key="map" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6">
    <circle cx="12" cy="12" r="10" />
    <ellipse cx="12" cy="12" rx="4" ry="10" />
    <path d="M2 12h20" />
  </svg>,
  <svg key="measure" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6">
    <path d="M3 3v18h18" />
    <path d="M7 16l4-8 4 4 5-9" />
  </svg>,
  <svg key="mobilize" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
  </svg>,
]

const CATEGORY_COLORS = ['oklch(0.6 0.2 250)', 'oklch(0.65 0.15 55)']

interface LandingContentProps {
  t: LandingTranslations
  locale: Locale
}

export default function LandingContent({ t, locale }: LandingContentProps) {
  return (
    <div lang={locale} className="relative min-h-dvh overflow-x-hidden" style={{ background: 'oklch(0.06 0.01 260)' }}>
      <Particles
        className="fixed inset-0"
        quantity={120}
        staticity={40}
        ease={60}
        size={0.5}
        color="#4db8a4"
        vx={0}
        vy={-0.02}
      />

      <div className="relative z-10">
        <header className="landing-header fixed top-0 inset-x-0 z-50">
          <nav className="mx-auto max-w-6xl px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
            <span className="font-mono tracking-[0.3em] uppercase text-sm text-white/90">
              Konterra
            </span>
            <div className="flex items-center gap-2 sm:gap-4">
              <LocaleSwitcher current={locale} />
              <Link
                href="/login"
                className="font-mono text-xs text-white/50 hover:text-white/80 transition-colors py-2 px-2"
              >
                {t.nav.signIn}
              </Link>
              <Link
                href="/login"
                className="landing-cta-button"
              >
                {t.nav.requestAccess}
              </Link>
            </div>
          </nav>
        </header>

        <main>
          <section className="relative min-h-dvh flex items-center justify-center px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center pt-14">
              <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[oklch(0.6_0.2_250)] mb-4 sm:mb-6">
                {t.hero.badge}
              </p>
              <h1 className="text-[1.75rem] sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.15] sm:leading-[1.1] text-white tracking-tight">
                {t.hero.titleStart}{' '}
                <span className="landing-gradient-text">
                  {t.hero.titleHighlight}
                </span>
              </h1>
              <p className="mt-5 sm:mt-6 text-sm sm:text-base md:text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
                {t.hero.subtitle}
              </p>
              <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="landing-cta-button-lg w-full sm:w-auto justify-center"
                >
                  {t.hero.cta}
                </Link>
                <a
                  href="#why"
                  className="font-mono text-xs text-white/40 hover:text-white/70 transition-colors py-2 px-4"
                >
                  {t.hero.learnMore}
                </a>
              </div>
            </div>
            <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
              <svg viewBox="0 0 24 24" fill="none" stroke="oklch(0.6 0.2 250 / 40%)" strokeWidth="1.5" className="size-5">
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </div>
          </section>

          <section id="why" className="scroll-mt-16 py-16 sm:py-24 md:py-32 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto">
              <div className="landing-glass-panel p-6 sm:p-8 md:p-12 rounded-xl sm:rounded-2xl">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white leading-snug mb-4 sm:mb-6">
                  {t.problem.title}
                </h2>
                <p className="text-sm sm:text-base text-white/50 leading-relaxed mb-3 sm:mb-4">
                  {t.problem.p1}
                </p>
                <p className="text-sm sm:text-base text-white/50 leading-relaxed mb-6 sm:mb-8">
                  {t.problem.p2}
                </p>
                <div className="grid grid-cols-3 gap-3 sm:gap-6">
                  {t.problem.stats.map((stat) => (
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

          <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10 sm:mb-16">
                <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[oklch(0.6_0.2_250)] mb-3 sm:mb-4">
                  {t.pillars.badge}
                </p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white">
                  {t.pillars.title}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {t.pillars.items.map((pillar, i) => (
                  <div key={pillar.title} className="landing-glass-panel p-6 sm:p-8 rounded-xl group">
                    <div className="size-10 sm:size-12 rounded-lg bg-[oklch(0.6_0.2_250/10%)] border border-[oklch(0.6_0.2_250/20%)] flex items-center justify-center text-[oklch(0.6_0.2_250)] mb-4 sm:mb-5 group-hover:bg-[oklch(0.6_0.2_250/15%)] transition-colors">
                      {PILLAR_ICONS[i]}
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
                      {pillar.title}
                    </h3>
                    <p className="text-[10px] sm:text-xs font-mono text-[oklch(0.6_0.2_250)] mb-2 sm:mb-3">
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

          <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                <div>
                  <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[oklch(0.6_0.2_250)] mb-3 sm:mb-4">
                    {t.thesis.badge}
                  </p>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white leading-snug mb-4 sm:mb-6">
                    {t.thesis.title}
                  </h2>
                  <p className="text-sm sm:text-base text-white/50 leading-relaxed mb-3 sm:mb-4">
                    {t.thesis.p1}
                  </p>
                  <p className="text-sm sm:text-base text-white/50 leading-relaxed">
                    {t.thesis.p2}
                  </p>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <div className="landing-glass-panel p-4 sm:p-5 rounded-xl">
                    <p className="text-xs sm:text-sm text-white/60 mb-2">{t.thesis.commoditizes}</p>
                    <div className="space-y-1.5 sm:space-y-2">
                      {t.thesis.commoditizesList.map((item) => (
                        <div key={item} className="flex items-center gap-2 text-xs sm:text-sm text-white/35">
                          <span className="size-1.5 rounded-full bg-white/20 shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="landing-glass-panel landing-glass-panel-accent p-4 sm:p-5 rounded-xl">
                    <p className="text-xs sm:text-sm text-[oklch(0.7_0.18_240)] mb-2">{t.thesis.remains}</p>
                    <div className="space-y-1.5 sm:space-y-2">
                      {t.thesis.remainsList.map((item) => (
                        <div key={item} className="flex items-center gap-2 text-xs sm:text-sm text-white/60">
                          <span className="size-1.5 rounded-full bg-[oklch(0.6_0.2_250)] shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10 sm:mb-16">
                <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[oklch(0.6_0.2_250)] mb-3 sm:mb-4">
                  {t.features.badge}
                </p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white">
                  {t.features.title}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {t.features.categories.map((category, ci) => (
                  <div key={category.label} className="space-y-3 sm:space-y-4">
                    <p
                      className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em]"
                      style={{ color: CATEGORY_COLORS[ci] }}
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

          <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white leading-snug mb-4 sm:mb-6">
                {t.antiCrm.title}
              </h2>
              <p className="text-sm sm:text-base text-white/50 leading-relaxed mb-6 sm:mb-8 max-w-2xl mx-auto">
                {t.antiCrm.description}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-2xl mx-auto">
                {t.antiCrm.diffs.map((diff) => (
                  <div key={diff.label} className="text-center py-2">
                    <p className="text-sm font-medium text-white mb-0.5">{diff.label}</p>
                    <p className="text-[10px] sm:text-[11px] text-white/35">{diff.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
            <div className="max-w-2xl mx-auto text-center">
              <div className="landing-glass-panel landing-glass-panel-accent p-8 sm:p-10 md:p-14 rounded-xl sm:rounded-2xl">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white mb-3 sm:mb-4">
                  {t.cta.title}
                  <br />
                  <span className="landing-gradient-text">{t.cta.highlight}</span>
                </h2>
                <p className="text-white/45 text-xs sm:text-sm mb-6 sm:mb-8 max-w-md mx-auto">
                  {t.cta.description}
                </p>
                <Link
                  href="/login"
                  className="landing-cta-button-lg w-full sm:w-auto justify-center"
                >
                  {t.cta.button}
                </Link>
              </div>
            </div>
          </section>

          <footer className="py-8 sm:py-12 px-4 sm:px-6 border-t border-white/5">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono tracking-[0.2em] uppercase text-xs text-white/40">
                  Konterra
                </span>
                <span className="text-white/10">|</span>
                <span className="font-mono text-[10px] text-white/25">
                  {t.footer.tagline}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/privacy" className="font-mono text-[10px] text-white/30 hover:text-white/50 transition-colors">
                  {t.footer.privacy}
                </Link>
                <p className="font-mono text-[10px] text-white/20">
                  {t.footer.rights}
                </p>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
