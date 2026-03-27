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
  const rectRef = useRef<Rect | null>(null)
  const dragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const overlayRef = useRef<HTMLDivElement>(null)

  const getPos = useCallback((clientX: number, clientY: number) => {
    const bounds = overlayRef.current?.getBoundingClientRect()
    return {
      x: clientX - (bounds?.left ?? 0),
      y: clientY - (bounds?.top ?? 0),
    }
  }, [])

  const startDraw = useCallback((clientX: number, clientY: number) => {
    dragging.current = true
    const pos = getPos(clientX, clientY)
    startPos.current = pos
    const initial = { x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y }
    rectRef.current = initial
    setRect(initial)
  }, [getPos])

  const moveDraw = useCallback((clientX: number, clientY: number) => {
    if (!dragging.current) return
    const pos = getPos(clientX, clientY)
    setRect((prev) => {
      if (!prev) return null
      const next = { ...prev, x2: pos.x, y2: pos.y }
      rectRef.current = next
      return next
    })
  }, [getPos])

  const endDraw = useCallback(() => {
    const currentRect = rectRef.current
    if (!dragging.current || !currentRect) {
      dragging.current = false
      rectRef.current = null
      setRect(null)
      return
    }
    dragging.current = false

    const minX = Math.min(currentRect.x1, currentRect.x2)
    const maxX = Math.max(currentRect.x1, currentRect.x2)
    const minY = Math.min(currentRect.y1, currentRect.y2)
    const maxY = Math.max(currentRect.y1, currentRect.y2)

    const width = maxX - minX
    const height = maxY - minY
    if (width < 5 || height < 5) {
      rectRef.current = null
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

    rectRef.current = null
    setRect(null)
    if (selected.length > 0) {
      onSelect(selected)
    }
    onDeactivate()
  }, [contacts, getScreenCoords, onSelect, onDeactivate])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    startDraw(e.clientX, e.clientY)
  }, [startDraw])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    moveDraw(e.clientX, e.clientY)
  }, [moveDraw])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    e.preventDefault()
    const touch = e.touches[0]
    startDraw(touch.clientX, touch.clientY)
  }, [startDraw])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    e.preventDefault()
    const touch = e.touches[0]
    moveDraw(touch.clientX, touch.clientY)
  }, [moveDraw])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    endDraw()
  }, [endDraw])

  useEffect(() => {
    if (!active) {
      rectRef.current = null
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
      style={{ zIndex: Z.controls + 1, cursor: 'crosshair', touchAction: 'none' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={endDraw}
      onMouseLeave={() => {
        if (dragging.current) endDraw()
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
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
