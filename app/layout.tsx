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
  title: {
    default: 'Konterra',
    template: '%s | Konterra',
  },
  description: 'Your personal network CRM with an interactive 3D globe. Map contacts, track relationships, and grow your social capital.',
  keywords: ['CRM', 'network', 'globe', 'contacts', 'relationship management'],
  authors: [{ name: 'Konterra' }],
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.svg',
  },
  openGraph: {
    title: 'Konterra',
    description: 'Personal network CRM with an interactive 3D globe',
    siteName: 'Konterra',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Konterra',
    description: 'Personal network CRM with an interactive 3D globe',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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
