'use client'

import { useState, useCallback } from 'react'

export interface SavedView {
  name: string
  tags: string[]
  countries: string[]
  ratings: number[]
  relTypes: string[]
  sortKey: string
}

const STORAGE_KEY = 'konterra-saved-views'
const MAX_VIEWS = 10

function loadViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persistViews(views: SavedView[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views))
  } catch {}
}

export function useSavedViews() {
  const [views, setViews] = useState<SavedView[]>(() => loadViews())

  const saveView = useCallback((name: string, filters: Omit<SavedView, 'name'>) => {
    setViews((prev) => {
      const existing = prev.filter((v) => v.name !== name)
      const next = [{ name, ...filters }, ...existing].slice(0, MAX_VIEWS)
      persistViews(next)
      return next
    })
  }, [])

  const deleteView = useCallback((name: string) => {
    setViews((prev) => {
      const next = prev.filter((v) => v.name !== name)
      persistViews(next)
      return next
    })
  }, [])

  const loadView = useCallback((name: string): SavedView | undefined => {
    return views.find((v) => v.name === name)
  }, [views])

  return { views, saveView, deleteView, loadView }
}
