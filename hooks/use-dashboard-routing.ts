'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { DisplayOptions, GlobeLayer } from '@/types/display'

const STORAGE_KEY = 'konterra-default-tab'

export type DashboardTab = 'connections' | 'travel'

function loadDefaultTab(): DashboardTab {
  if (typeof window === 'undefined') return 'connections'
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'travel' ? 'travel' : 'connections'
}

export function saveDefaultTab(tab: DashboardTab) {
  localStorage.setItem(STORAGE_KEY, tab)
}

interface UseDashboardRoutingOptions {
  initialSlug?: string[]
  setDisplayOptions: React.Dispatch<React.SetStateAction<DisplayOptions>>
}

function parseViewParam(search: string): { showNetwork: boolean; showTravel: boolean } | null {
  const params = new URLSearchParams(search)
  const view = params.get('view')
  if (!view) return null
  const layers = view.split(',') as GlobeLayer[]
  const showNetwork = layers.includes('network')
  const showTravel = layers.includes('travel')
  if (!showNetwork && !showTravel) return null
  return { showNetwork, showTravel }
}

function buildViewParam(showNetwork: boolean, showTravel: boolean): string {
  const parts: string[] = []
  if (showNetwork) parts.push('network')
  if (showTravel) parts.push('travel')
  return parts.join(',')
}

function syncUrl(showNetwork: boolean, showTravel: boolean, method: 'push' | 'replace', pathname?: string) {
  const path = pathname || window.location.pathname
  const viewParam = buildViewParam(showNetwork, showTravel)
  const search = (showNetwork && !showTravel && path === '/app') ? '' : `?view=${viewParam}`
  const url = path + search
  if (window.location.pathname + window.location.search !== url) {
    if (method === 'push') window.history.pushState(null, '', url)
    else window.history.replaceState(null, '', url)
  }
}

export function useDashboardRouting({ initialSlug, setDisplayOptions }: UseDashboardRoutingOptions) {
  const initialTab = initialSlug?.[0] === 'travel'
    ? 'travel' as const
    : initialSlug?.length
      ? 'connections' as const
      : loadDefaultTab()
  const [dashboardTab, setDashboardTabRaw] = useState<DashboardTab>(initialTab)
  const optionsRef = useRef<DisplayOptions | null>(null)

  const trackOptions = useCallback((updater: (prev: DisplayOptions) => DisplayOptions) => {
    setDisplayOptions((prev) => {
      const next = updater(prev)
      optionsRef.current = next
      return next
    })
  }, [setDisplayOptions])

  useEffect(() => {
    const parsed = parseViewParam(window.location.search)
    if (parsed) {
      trackOptions((prev) => ({ ...prev, showNetwork: parsed.showNetwork, showTravel: parsed.showTravel }))
    } else if (initialTab === 'travel') {
      trackOptions((prev) => ({ ...prev, showNetwork: false, showTravel: true }))
    }
  }, [initialTab, trackOptions])

  const setDashboardTab = useCallback((tab: DashboardTab) => {
    setDashboardTabRaw(tab)
    if (tab === 'travel') {
      trackOptions((prev) => ({ ...prev, showTravel: true }))
      queueMicrotask(() => {
        const cur = optionsRef.current
        if (cur) syncUrl(cur.showNetwork, cur.showTravel, 'push', '/app/travel')
      })
    } else {
      queueMicrotask(() => {
        const cur = optionsRef.current
        if (cur) syncUrl(cur.showNetwork, cur.showTravel, 'push', '/app')
      })
    }
  }, [trackOptions])

  const handleLayerToggle = useCallback((layer: GlobeLayer) => {
    trackOptions((prev) => {
      let showNetwork = prev.showNetwork
      let showTravel = prev.showTravel
      if (layer === 'network') showNetwork = !showNetwork
      else showTravel = !showTravel
      if (!showNetwork && !showTravel) {
        if (layer === 'network') showTravel = true
        else showNetwork = true
      }
      return { ...prev, showNetwork, showTravel }
    })
    queueMicrotask(() => {
      const cur = optionsRef.current
      if (cur) syncUrl(cur.showNetwork, cur.showTravel, 'replace')
    })
  }, [trackOptions])

  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname
      const parsed = parseViewParam(window.location.search)
      if (path === '/app/travel') {
        setDashboardTabRaw('travel')
        if (parsed) {
          trackOptions((prev) => ({ ...prev, showNetwork: parsed.showNetwork, showTravel: parsed.showTravel }))
        } else {
          trackOptions((prev) => ({ ...prev, showNetwork: false, showTravel: true }))
        }
      } else {
        setDashboardTabRaw('connections')
        if (parsed) {
          trackOptions((prev) => ({ ...prev, showNetwork: parsed.showNetwork, showTravel: parsed.showTravel }))
        } else {
          trackOptions((prev) => ({ ...prev, showNetwork: true, showTravel: false }))
        }
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [trackOptions])

  return {
    dashboardTab,
    setDashboardTab,
    handleLayerToggle,
  }
}
