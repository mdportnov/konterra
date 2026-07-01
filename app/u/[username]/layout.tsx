'use client'

import Link from 'next/link'
import Wordmark from '@/components/branding/Wordmark'
import { ThemeToggle } from '@/components/theme-toggle'

export default function PublicProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Konterra" className="text-foreground hover:opacity-80 transition-opacity">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-full border border-border px-3.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>
      {children}
    </div>
  )
}
