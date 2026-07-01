'use client'

import { Globe, Lock } from 'lucide-react'

interface ProfileStubProps {
  type: 'not_found' | 'private'
}

export default function ProfileStub({ type }: ProfileStubProps) {
  const Icon = type === 'not_found' ? Globe : Lock
  const title = type === 'not_found' ? 'Profile not found' : 'This profile is private'
  const description =
    type === 'not_found'
      ? "This user doesn't exist or hasn't set up their public profile yet."
      : 'This user has chosen to keep their profile private.'

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
      <div className="max-w-sm w-full mx-4 rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-10 text-center">
        <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full border border-border">
          <Icon className="size-5 text-muted-foreground/70" />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-muted-foreground/60 mb-3">
          {type === 'not_found' ? '404 / Atlas' : 'Restricted'}
        </p>
        <h2 className="text-lg font-medium text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
