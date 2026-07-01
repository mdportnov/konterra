import Link from 'next/link'
import AtlasBackground from '@/components/branding/AtlasBackground'
import AtlasGlobe from '@/components/branding/AtlasGlobe'
import Wordmark from '@/components/branding/Wordmark'
import LocaleSwitcher from '@/components/landing/LocaleSwitcher'
import type { LandingTranslations } from '@/lib/i18n/landing'
import type { Locale } from '@/lib/i18n/locales'

const COORDINATES = [
  'BERLIN 52.5200°N 13.4050°E',
  'TOKYO 35.6762°N 139.6503°E',
  'NEW YORK 40.7128°N 74.0060°W',
  'SINGAPORE 1.3521°N 103.8198°E',
  'LISBON 38.7223°N 9.1393°W',
  'DUBAI 25.2048°N 55.2708°E',
  'MEXICO CITY 19.4326°N 99.1332°W',
  'NAIROBI 1.2921°S 36.8219°E',
  'SEOUL 37.5665°N 126.9780°E',
  'BUENOS AIRES 34.6037°S 58.3816°W',
]

function ArrowRight() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-3.5" aria-hidden="true">
      <path d="M2 8h11M9 3.5 13.5 8 9 12.5" />
    </svg>
  )
}

function SectionRule({ index, badge }: { index: string; badge?: string }) {
  return (
    <div className="flex items-center gap-5 mb-12 sm:mb-16">
      <span className="k-meta k-meta-terra">{index}</span>
      <span className="h-px flex-1" style={{ background: 'var(--hairline)' }} />
      {badge && <span className="k-meta">{badge}</span>}
    </div>
  )
}

interface LandingContentProps {
  t: LandingTranslations
  locale: Locale
}

export default function LandingContent({ t, locale }: LandingContentProps) {
  return (
    <div lang={locale} className="k-page relative min-h-dvh overflow-x-hidden">
      <AtlasBackground />

      <div className="relative z-10">
        <header className="k-header fixed top-0 inset-x-0 z-50">
          <nav className="mx-auto max-w-6xl px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
            <Link href="/" aria-label="Konterra">
              <Wordmark />
            </Link>
            <div className="flex items-center gap-1.5 sm:gap-3">
              <LocaleSwitcher current={locale} />
              <Link
                href="/login"
                className="hidden sm:inline-block text-[0.8125rem] px-3 py-2 transition-colors"
                style={{ color: 'var(--bone-70)' }}
              >
                {t.nav.signIn}
              </Link>
              <Link href="/login" className="k-btn k-btn-sm">
                {t.nav.requestAccess}
              </Link>
            </div>
          </nav>
        </header>

        <main>
          <section className="relative min-h-dvh flex flex-col justify-center px-4 sm:px-6 pt-20 sm:pt-24">
            <AtlasGlobe className="pointer-events-none absolute top-1/2 -translate-y-1/2 -right-40 sm:-right-24 lg:right-[-4%] w-[560px] sm:w-[640px] max-w-none opacity-60 sm:opacity-80" />

            <div className="mx-auto w-full max-w-6xl relative">
              <div className="max-w-3xl">
                <div className="flex items-center gap-3 mb-8">
                  <span className="k-dot" />
                  <p className="k-meta">{t.hero.badge}</p>
                </div>
                <h1 className="text-[2.35rem] sm:text-6xl lg:text-7xl leading-[1.04] tracking-[-0.03em] font-medium text-balance">
                  {t.hero.titleStart}
                  <br />
                  <span className="k-serif italic tracking-normal" style={{ color: 'var(--terra)' }}>
                    {t.hero.titleHighlight}
                  </span>
                </h1>
                <p
                  className="mt-7 sm:mt-8 text-[0.9375rem] sm:text-lg leading-relaxed max-w-xl"
                  style={{ color: 'var(--bone-70)' }}
                >
                  {t.hero.subtitle}
                </p>
                <div className="mt-9 sm:mt-11 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  <Link href="/login" className="k-btn">
                    {t.hero.cta}
                    <ArrowRight />
                  </Link>
                  <a href="#why" className="k-btn-ghost">
                    {t.hero.learnMore}
                  </a>
                </div>
              </div>
            </div>

            <div
              className="k-marquee absolute bottom-0 inset-x-0 border-t py-3.5"
              style={{ borderColor: 'var(--hairline)' }}
              aria-hidden="true"
            >
              <div className="k-marquee-track">
                {[0, 1].map((copy) => (
                  <div key={copy} className="flex shrink-0">
                    {COORDINATES.map((c) => (
                      <span
                        key={`${copy}-${c}`}
                        className="font-mono text-[10px] tracking-[0.18em] whitespace-nowrap px-6 flex items-center gap-6"
                        style={{ color: 'var(--bone-45)' }}
                      >
                        {c}
                        <span style={{ color: 'oklch(0.7 0.16 45 / 50%)' }}>+</span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="why" className="scroll-mt-20 py-24 sm:py-36 px-4 sm:px-6">
            <div className="mx-auto max-w-6xl">
              <SectionRule index="01" />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 k-reveal">
                <h2 className="lg:col-span-5 text-2xl sm:text-3xl lg:text-[2.5rem] leading-[1.15] tracking-[-0.02em] font-medium text-balance">
                  {t.problem.title}
                </h2>
                <div className="lg:col-span-6 lg:col-start-7 space-y-5">
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--bone-70)' }}>
                    {t.problem.p1}
                  </p>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--bone-70)' }}>
                    {t.problem.p2}
                  </p>
                </div>
              </div>
              <div
                className="mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-3 border-t k-reveal"
                style={{ borderColor: 'var(--hairline)' }}
              >
                {t.problem.stats.map((stat, i) => (
                  <div
                    key={stat.value}
                    className={`py-8 sm:py-10 sm:px-8 ${i > 0 ? 'border-t sm:border-t-0 sm:border-l' : ''}`}
                    style={{ borderColor: 'var(--hairline)' }}
                  >
                    <p className="text-5xl sm:text-6xl font-light tracking-[-0.03em] tabular-nums">
                      {stat.value}
                    </p>
                    <p className="mt-3 text-xs leading-relaxed max-w-[26ch]" style={{ color: 'var(--bone-45)' }}>
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-24 sm:py-36 px-4 sm:px-6">
            <div className="mx-auto max-w-6xl">
              <SectionRule index="02" badge={t.pillars.badge} />
              <h2 className="text-3xl sm:text-5xl lg:text-6xl tracking-[-0.03em] font-medium mb-14 sm:mb-20 k-reveal">
                {t.pillars.title}
              </h2>
              <div className="border-t" style={{ borderColor: 'var(--hairline)' }}>
                {t.pillars.items.map((pillar, i) => (
                  <div
                    key={pillar.title}
                    className="group grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 py-10 sm:py-14 border-b transition-colors hover:bg-[oklch(0.93_0.012_85/2%)] k-reveal"
                    style={{ borderColor: 'var(--hairline)' }}
                  >
                    <span className="k-meta k-meta-terra lg:col-span-1 pt-2">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="lg:col-span-4">
                      <h3 className="text-2xl sm:text-4xl tracking-[-0.02em] font-medium">
                        {pillar.title}
                      </h3>
                      <p className="k-serif italic text-base sm:text-lg mt-1.5" style={{ color: 'var(--bone-45)' }}>
                        {pillar.subtitle}
                      </p>
                    </div>
                    <p
                      className="lg:col-span-6 lg:col-start-7 text-sm sm:text-[0.9375rem] leading-relaxed"
                      style={{ color: 'var(--bone-70)' }}
                    >
                      {pillar.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-24 sm:py-36 px-4 sm:px-6">
            <div className="mx-auto max-w-6xl">
              <SectionRule index="03" badge={t.thesis.badge} />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
                <div className="lg:col-span-6 k-reveal">
                  <h2 className="k-serif italic text-3xl sm:text-4xl lg:text-[2.75rem] leading-[1.18] text-balance">
                    {t.thesis.title}
                  </h2>
                  <p className="mt-8 text-sm sm:text-base leading-relaxed" style={{ color: 'var(--bone-70)' }}>
                    {t.thesis.p1}
                  </p>
                  <p className="mt-4 text-sm sm:text-base leading-relaxed" style={{ color: 'var(--bone-70)' }}>
                    {t.thesis.p2}
                  </p>
                </div>
                <div className="lg:col-span-5 lg:col-start-8 k-reveal">
                  <div className="k-card rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--hairline)' }}>
                      <p className="k-meta">{t.thesis.commoditizes}</p>
                    </div>
                    <div>
                      {t.thesis.commoditizesList.map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-4 px-6 py-3.5 border-b text-sm"
                          style={{ borderColor: 'var(--hairline)', color: 'var(--bone-45)' }}
                        >
                          <span className="font-mono text-[10px]" style={{ color: 'var(--bone-45)' }}>—</span>
                          <span className="line-through decoration-[oklch(0.93_0.012_85/25%)]">{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--hairline)' }}>
                      <p className="k-meta k-meta-terra">{t.thesis.remains}</p>
                    </div>
                    <div>
                      {t.thesis.remainsList.map((item, i, arr) => (
                        <div
                          key={item}
                          className={`flex items-center gap-4 px-6 py-3.5 text-sm ${i < arr.length - 1 ? 'border-b' : ''}`}
                          style={{ borderColor: 'var(--hairline)' }}
                        >
                          <span className="font-mono text-[10px]" style={{ color: 'var(--terra)' }}>+</span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-24 sm:py-36 px-4 sm:px-6">
            <div className="mx-auto max-w-6xl">
              <SectionRule index="04" badge={t.features.badge} />
              <h2 className="text-3xl sm:text-5xl tracking-[-0.03em] font-medium mb-14 sm:mb-20 max-w-2xl text-balance k-reveal">
                {t.features.title}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-12">
                {t.features.categories.map((category, ci) => (
                  <div key={category.label} className="k-reveal">
                    <p className="k-meta k-meta-terra mb-2">{category.label}</p>
                    <div className="border-t" style={{ borderColor: 'var(--hairline)' }}>
                      {category.features.map((feature, fi) => (
                        <div
                          key={feature.title}
                          className="grid grid-cols-[3.5rem_1fr] gap-4 py-6 border-b"
                          style={{ borderColor: 'var(--hairline)' }}
                        >
                          <span className="font-mono text-[10px] pt-1" style={{ color: 'var(--bone-45)' }}>
                            {ci + 1}.{String(fi + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <h3 className="text-[0.9375rem] font-medium">{feature.title}</h3>
                            <p className="mt-1 text-[0.8125rem] leading-relaxed" style={{ color: 'var(--bone-45)' }}>
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-24 sm:py-36 px-4 sm:px-6">
            <div className="mx-auto max-w-6xl">
              <SectionRule index="05" />
              <div className="max-w-3xl k-reveal">
                <h2 className="k-serif italic text-4xl sm:text-5xl lg:text-6xl leading-[1.1]">
                  {t.antiCrm.title}
                </h2>
                <p className="mt-8 text-sm sm:text-base leading-relaxed" style={{ color: 'var(--bone-70)' }}>
                  {t.antiCrm.description}
                </p>
              </div>
              <div
                className="mt-14 sm:mt-20 grid grid-cols-2 lg:grid-cols-4 border-t k-reveal"
                style={{ borderColor: 'var(--hairline)' }}
              >
                {t.antiCrm.diffs.map((diff, i) => (
                  <div
                    key={diff.label}
                    className={`py-7 sm:py-9 pr-4 ${i % 2 === 1 ? 'border-l pl-6' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} ${i >= 2 ? 'lg:border-l lg:pl-6' : ''}`}
                    style={{ borderColor: 'var(--hairline)' }}
                  >
                    <p className="k-meta k-meta-terra mb-2.5">{diff.label}</p>
                    <p className="text-[0.8125rem]" style={{ color: 'var(--bone-70)' }}>{diff.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-24 sm:py-40 px-4 sm:px-6">
            <div className="mx-auto max-w-4xl">
              <div className="k-corners relative border px-6 py-16 sm:px-16 sm:py-24 text-center k-reveal" style={{ borderColor: 'var(--hairline-strong)' }}>
                <h2 className="text-2xl sm:text-4xl lg:text-[2.75rem] leading-[1.15] tracking-[-0.02em] font-medium text-balance">
                  {t.cta.title}
                  <br />
                  <span className="k-serif italic tracking-normal" style={{ color: 'var(--terra)' }}>
                    {t.cta.highlight}
                  </span>
                </h2>
                <p className="mt-6 text-sm max-w-md mx-auto leading-relaxed" style={{ color: 'var(--bone-45)' }}>
                  {t.cta.description}
                </p>
                <div className="mt-10">
                  <Link href="/login" className="k-btn">
                    {t.cta.button}
                    <ArrowRight />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <footer className="border-t px-4 sm:px-6 pt-16 sm:pt-20 pb-10 overflow-hidden" style={{ borderColor: 'var(--hairline)' }}>
            <div className="mx-auto max-w-6xl">
              <p
                className="k-outline-text font-semibold leading-none select-none text-[17.5vw] lg:text-[11.5rem] text-center"
                aria-hidden="true"
              >
                KONTERRA
              </p>
              <div
                className="mt-12 sm:mt-16 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4"
                style={{ borderColor: 'var(--hairline)' }}
              >
                <div className="flex items-center gap-4">
                  <Wordmark />
                  <span className="k-meta hidden md:inline normal-case tracking-[0.12em]">{t.footer.tagline}</span>
                </div>
                <div className="flex items-center gap-6">
                  <Link
                    href="/privacy"
                    className="font-mono text-[10px] tracking-[0.14em] uppercase transition-colors hover:text-[var(--bone)]"
                    style={{ color: 'var(--bone-45)' }}
                  >
                    {t.footer.privacy}
                  </Link>
                  <p className="font-mono text-[10px] tracking-[0.14em]" style={{ color: 'var(--bone-45)' }}>
                    {t.footer.rights}
                  </p>
                </div>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
