import { cn } from '@/lib/utils'

export default function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 20 20" fill="none" className="size-[15px] shrink-0" aria-hidden="true">
        <circle cx="10" cy="10" r="8.5" stroke="var(--terra)" strokeWidth="1.25" />
        <ellipse cx="10" cy="10" rx="3.6" ry="8.5" stroke="oklch(0.7 0.16 45 / 55%)" strokeWidth="1" />
        <path d="M1.5 10h17" stroke="oklch(0.7 0.16 45 / 55%)" strokeWidth="1" />
        <circle cx="13.8" cy="6.4" r="1.8" fill="var(--terra)" />
      </svg>
      <span className="font-mono text-xs tracking-[0.32em] uppercase">
        Konterra
      </span>
    </span>
  )
}
