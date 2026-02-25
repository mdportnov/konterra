import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://konterra.space'),
  title: {
    default: 'Konterra — Private Intelligence Network',
    template: '%s | Konterra',
  },
  description: 'Your most valuable asset isn\'t indexed by any search engine. Konterra maps, measures, and mobilizes the relationships that define your career.',
  keywords: ['personal CRM', 'network intelligence', 'relationship management', '3D globe', 'contacts', 'social capital', 'networking tool', 'private CRM'],
  authors: [{ name: 'Konterra' }],
  creator: 'Konterra',
  publisher: 'Konterra',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.svg',
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Konterra — Private Intelligence Network',
    description: 'Map, measure, and mobilize the relationships that define your career. A private intelligence system for your most valuable asset — your network.',
    siteName: 'Konterra',
    url: 'https://konterra.space',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Konterra — Private Intelligence Network',
    description: 'Map, measure, and mobilize the relationships that define your career.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {},
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
}

const themeScript = `
  (function() {
    var t = localStorage.getItem('theme') || 'dark';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  })();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
