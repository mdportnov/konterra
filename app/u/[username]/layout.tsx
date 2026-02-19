import type { Metadata } from 'next'
import Link from 'next/link'
import { Globe } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Public Profile',
}

export default function PublicProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-xl flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity">
          <Globe className="h-5 w-5 text-orange-500" />
          <span className="font-semibold text-sm">Konterra</span>
        </Link>
        <Link
          href="/login"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign in
        </Link>
      </header>
      {children}
    </div>
  )
}
