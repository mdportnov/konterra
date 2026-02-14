'use client'

import { useState, useCallback, useEffect } from 'react'
import type { DisplayOptions, GlobeLayer } from '@/types/display'

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

export function useDashboardRouting({ initialSlug, setDisplayOptions }: UseDashboardRoutingOptions) {
  const initialTab = initialSlug?.[0] === 'travel' ? 'travel' as const : 'connections' as const
  const [dashboardTab, setDashboardTabRaw] = useState<'connections' | 'travel'>(initialTab)

  useEffect(() => {
    const parsed = parseViewParam(window.location.search)
    if (parsed) {
      setDisplayOptions((prev) => ({ ...prev, showNetwork: parsed.showNetwork, showTravel: parsed.showTravel }))
    } else if (initialTab === 'travel') {
      setDisplayOptions((prev) => ({ ...prev, showNetwork: false, showTravel: true }))
    }
  }, [initialTab, setDisplayOptions])

  const setDashboardTab = useCallback((tab: 'connections' | 'travel') => {
    setDashboardTabRaw(tab)
    if (tab === 'travel') {
      setDisplayOptions((prev) => {
        const next = { ...prev, showTravel: true }
        const viewParam = buildViewParam(next.showNetwork, next.showTravel)
        const url = `/app/travel?view=${viewParam}`
        if (window.location.pathname + window.location.search !== url) {
          window.history.pushState(null, '', url)
        }
        return next
      })
    } else {
      setDisplayOptions((prev) => {
        const viewParam = buildViewParam(prev.showNetwork, prev.showTravel)
        const search = viewParam !== 'network' ? `?view=${viewParam}` : ''
        const url = `/app${search}`
        if (window.location.pathname + window.location.search !== url) {
          window.history.pushState(null, '', url)
        }
        return prev
      })
    }
  }, [setDisplayOptions])

  const handleLayerToggle = useCallback((layer: GlobeLayer) => {
    setDisplayOptions((prev) => {
      let showNetwork = prev.showNetwork
      let showTravel = prev.showTravel
      if (layer === 'network') showNetwork = !showNetwork
      else showTravel = !showTravel
      if (!showNetwork && !showTravel) {
        if (layer === 'network') showTravel = true
        else showNetwork = true
      }
      const viewParam = buildViewParam(showNetwork, showTravel)
      const pathname = window.location.pathname
      const search = (showNetwork && !showTravel && pathname === '/app') ? '' : `?view=${viewParam}`
      window.history.replaceState(null, '', pathname + search)
      return { ...prev, showNetwork, showTravel }
    })
  }, [setDisplayOptions])

  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname
      const parsed = parseViewParam(window.location.search)
      if (path === '/app/travel') {
        setDashboardTabRaw('travel')
        if (parsed) {
          setDisplayOptions((prev) => ({ ...prev, showNetwork: parsed.showNetwork, showTravel: parsed.showTravel }))
        } else {
          setDisplayOptions((prev) => ({ ...prev, showNetwork: false, showTravel: true }))
        }
      } else {
        setDashboardTabRaw('connections')
        if (parsed) {
          setDisplayOptions((prev) => ({ ...prev, showNetwork: parsed.showNetwork, showTravel: parsed.showTravel }))
        } else {
          setDisplayOptions((prev) => ({ ...prev, showNetwork: true, showTravel: false }))
        }
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [setDisplayOptions])

  return {
    dashboardTab,
    setDashboardTab,
    handleLayerToggle,
  }
}
