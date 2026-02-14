'use client'

import { useState, useCallback, useEffect } from 'react'
import type { DisplayOptions, GlobeViewMode } from '@/types/display'

interface UseDashboardRoutingOptions {
  initialSlug?: string[]
  setDisplayOptions: React.Dispatch<React.SetStateAction<DisplayOptions>>
}

export function useDashboardRouting({ initialSlug, setDisplayOptions }: UseDashboardRoutingOptions) {
  const initialTab = initialSlug?.[0] === 'travel' ? 'travel' as const : 'connections' as const
  const [dashboardTab, setDashboardTabRaw] = useState<'connections' | 'travel'>(initialTab)

  const setDashboardTab = useCallback((tab: 'connections' | 'travel') => {
    setDashboardTabRaw(tab)
    setDisplayOptions((prev) => ({
      ...prev,
      globeViewMode: tab === 'travel' ? 'travel' : 'network',
    }))
    const url = tab === 'travel' ? '/travel' : '/'
    if (window.location.pathname !== url) {
      window.history.pushState(null, '', url)
    }
  }, [setDisplayOptions])

  useEffect(() => {
    if (initialTab === 'travel') {
      setDisplayOptions((prev) => ({ ...prev, globeViewMode: 'travel' }))
    }
  }, [initialTab, setDisplayOptions])

  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname
      if (path === '/travel') {
        setDashboardTabRaw('travel')
        setDisplayOptions((prev) => ({ ...prev, globeViewMode: 'travel' }))
      } else if (path === '/' || path === '') {
        setDashboardTabRaw('connections')
        setDisplayOptions((prev) => ({ ...prev, globeViewMode: 'network' }))
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [setDisplayOptions])

  const handleViewModeChange = useCallback((mode: GlobeViewMode) => {
    setDisplayOptions((prev) => ({ ...prev, globeViewMode: mode }))
  }, [setDisplayOptions])

  return {
    dashboardTab,
    setDashboardTab,
    handleViewModeChange,
  }
}
