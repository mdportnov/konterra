export const WISHLIST_PRIORITIES = ['low', 'medium', 'high', 'dream'] as const
export const WISHLIST_STATUSES = ['idea', 'researching', 'planning', 'ready'] as const

export const PRIORITY_LABELS: Record<string, string> = {
  dream: 'Dream',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const STATUS_LABELS: Record<string, string> = {
  idea: 'Idea',
  researching: 'Researching',
  planning: 'Planning',
  ready: 'Ready',
}
