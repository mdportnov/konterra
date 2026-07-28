'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useAnalyticsConsent } from '@/components/analytics-consent'

const GA_ID = 'G-C717DWY96C'

export function GoogleAnalytics() {
  const pathname = usePathname()
  const isFirstRender = useRef(true)
  const { consent } = useAnalyticsConsent()

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (consent !== 'granted') return
    const w = window as Window & { gtag?: (...args: unknown[]) => void }
    if (typeof w.gtag === 'function') {
      w.gtag('event', 'page_view', {
        page_location: window.location.href,
        page_title: document.title,
      })
    }
  }, [pathname, consent])

  // Scripts only mount once consent is given, so no analytics cookie is set before then.
  if (consent !== 'granted') return null

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      <Script
        id="ga-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `,
        }}
      />
    </>
  )
}
