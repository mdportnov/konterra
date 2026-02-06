'use client'

import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  size?: 'sm' | 'md'
}

export function StarRating({ value, onChange, size = 'md' }: StarRatingProps) {
  const px = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const interactive = !!onChange

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star === value ? 0 : star)}
          className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
        >
          <Star
            className={`${px} ${
              star <= value
                ? 'fill-orange-400 text-orange-400'
                : 'text-muted-foreground/30'
            }`}
          />
        </button>
      ))}
    </div>
  )
}
