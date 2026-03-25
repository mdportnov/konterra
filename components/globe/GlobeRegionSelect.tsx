'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Z } from '@/lib/constants/ui'

interface Rect {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface GlobeRegionSelectProps {
  active: boolean
  contacts: { id: string; lat: number | null; lng: number | null }[]
  getScreenCoords: (lat: number, lng: number) => { x: number; y: number } | null
  onSelect: (ids: string[]) => void
  onDeactivate: () => void
}

export default function GlobeRegionSelect({
  active,
  contacts,
  getScreenCoords,
  onSelect,
  onDeactivate,
}: GlobeRegionSelectProps) {
  const [rect, setRect] = useState<Rect | null>(null)
  const dragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    dragging.current = true
    const bounds = overlayRef.current?.getBoundingClientRect()
    const x = e.clientX - (bounds?.left ?? 0)
    const y = e.clientY - (bounds?.top ?? 0)
    startPos.current = { x, y }
    setRect({ x1: x, y1: y, x2: x, y2: y })
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    const bounds = overlayRef.current?.getBoundingClientRect()
    const x = e.clientX - (bounds?.left ?? 0)
    const y = e.clientY - (bounds?.top ?? 0)
    setRect((prev) => prev ? { ...prev, x2: x, y2: y } : null)
  }, [])

  const handleMouseUp = useCallback(() => {
    if (!dragging.current || !rect) {
      dragging.current = false
      setRect(null)
      return
    }
    dragging.current = false

    const minX = Math.min(rect.x1, rect.x2)
    const maxX = Math.max(rect.x1, rect.x2)
    const minY = Math.min(rect.y1, rect.y2)
    const maxY = Math.max(rect.y1, rect.y2)

    const width = maxX - minX
    const height = maxY - minY
    if (width < 5 || height < 5) {
      setRect(null)
      return
    }

    const selected: string[] = []
    for (const contact of contacts) {
      if (contact.lat == null || contact.lng == null) continue
      const screen = getScreenCoords(contact.lat, contact.lng)
      if (!screen) continue
      if (screen.x >= minX && screen.x <= maxX && screen.y >= minY && screen.y <= maxY) {
        selected.push(contact.id)
      }
    }

    setRect(null)
    if (selected.length > 0) {
      onSelect(selected)
    }
    onDeactivate()
  }, [rect, contacts, getScreenCoords, onSelect, onDeactivate])

  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRect(null)
      dragging.current = false
    }
  }, [active])

  if (!active) return null

  const drawRect = rect
    ? {
        left: Math.min(rect.x1, rect.x2),
        top: Math.min(rect.y1, rect.y2),
        width: Math.abs(rect.x2 - rect.x1),
        height: Math.abs(rect.y2 - rect.y1),
      }
    : null

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0"
      style={{ zIndex: Z.controls + 1, cursor: 'crosshair' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (dragging.current) handleMouseUp()
      }}
    >
      {drawRect && drawRect.width > 2 && drawRect.height > 2 && (
        <div
          className="absolute border-2 border-dashed border-orange-500 bg-orange-500/10 rounded-sm pointer-events-none"
          style={{
            left: drawRect.left,
            top: drawRect.top,
            width: drawRect.width,
            height: drawRect.height,
          }}
        />
      )}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-xl border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground pointer-events-none select-none">
        Draw a rectangle to select contacts
      </div>
    </div>
  )
}
