export const RATING_LABELS: Record<number, { label: string; description: string; example: string }> = {
  1: {
    label: 'Fleeting',
    description: 'Met once briefly; exchanged contacts but unlikely to reconnect.',
    example: 'A conference attendee whose name you barely recall.',
  },
  2: {
    label: 'Acquaintance',
    description: 'A few interactions with minimal rapport; could message but no real bond.',
    example: 'A colleague from another department you have chatted with twice.',
  },
  3: {
    label: 'Warm Contact',
    description: 'Mutual interest in staying in touch; would reliably reply to a message.',
    example: 'A former coworker you occasionally grab coffee with.',
  },
  4: {
    label: 'Strong Ally',
    description: 'Real trust and mutual support; would help with introductions or advice.',
    example: 'A mentor, close business partner, or go-to career advisor.',
  },
  5: {
    label: 'Inner Circle',
    description: 'Deep trust; would go out of their way for you without hesitation.',
    example: 'A close friend, family-level bond, or longtime collaborator.',
  },
}
