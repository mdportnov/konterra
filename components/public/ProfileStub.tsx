'use client'

import { Globe, Lock } from 'lucide-react'

interface ProfileStubProps {
  type: 'not_found' | 'private'
}

export default function ProfileStub({ type }: ProfileStubProps) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
      <div className="max-w-sm w-full mx-4 rounded-xl border border-border bg-card/80 backdrop-blur-xl p-8 text-center space-y-4">
        {type === 'not_found' ? (
          <>
            <Globe className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <h2 className="text-lg font-semibold text-foreground">Profile not found</h2>
            <p className="text-sm text-muted-foreground">
              This user doesn&apos;t exist or hasn&apos;t set up their public profile yet.
            </p>
          </>
        ) : (
          <>
            <Lock className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <h2 className="text-lg font-semibold text-foreground">This profile is private</h2>
            <p className="text-sm text-muted-foreground">
              This user has chosen to keep their profile private.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
