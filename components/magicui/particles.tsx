"use client"

import { useEffect, useRef, useCallback, type ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

interface ParticlesProps extends ComponentPropsWithoutRef<"div"> {
  className?: string
  quantity?: number
  staticity?: number
  ease?: number
  size?: number
  refresh?: boolean
  color?: string
  vx?: number
  vy?: number
}

function hexToRgb(hex: string): number[] {
  hex = hex.replace("#", "")
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("")
  }
  const hexInt = parseInt(hex, 16)
  const red = (hexInt >> 16) & 255
  const green = (hexInt >> 8) & 255
  const blue = hexInt & 255
  return [red, green, blue]
}

type Circle = {
  x: number
  y: number
  translateX: number
  translateY: number
  size: number
  alpha: number
  targetAlpha: number
  dx: number
  dy: number
  magnetism: number
}

export function Particles({
  className = "",
  quantity = 100,
  staticity = 50,
  ease = 50,
  size = 0.4,
  refresh = false,
  color = "#ffffff",
  vx = 0,
  vy = 0,
  ...props
}: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const context = useRef<CanvasRenderingContext2D | null>(null)
  const circles = useRef<Circle[]>([])
  const mouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const canvasSize = useRef<{ w: number; h: number }>({ w: 0, h: 0 })
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1
  const rafID = useRef<number | null>(null)
  const resizeTimeout = useRef<NodeJS.Timeout | null>(null)

  const rgb = hexToRgb(color)

  const circleParams = useCallback((): Circle => {
    const x = Math.floor(Math.random() * canvasSize.current.w)
    const y = Math.floor(Math.random() * canvasSize.current.h)
    const pSize = Math.floor(Math.random() * 2) + size
    const alpha = 0
    const targetAlpha = parseFloat((Math.random() * 0.6 + 0.1).toFixed(1))
    const dx = (Math.random() - 0.5) * 0.1
    const dy = (Math.random() - 0.5) * 0.1
    const magnetism = 0.1 + Math.random() * 4
    return { x, y, translateX: 0, translateY: 0, size: pSize, alpha, targetAlpha, dx, dy, magnetism }
  }, [size])

  const drawCircle = useCallback((circle: Circle, update = false) => {
    if (context.current) {
      const { x, y, translateX, translateY, size: s, alpha } = circle
      context.current.translate(translateX, translateY)
      context.current.beginPath()
      context.current.arc(x, y, s, 0, 2 * Math.PI)
      context.current.fillStyle = `rgba(${rgb.join(", ")}, ${alpha})`
      context.current.fill()
      context.current.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!update) {
        circles.current.push(circle)
      }
    }
  }, [rgb, dpr])

  const clearContext = useCallback(() => {
    if (context.current) {
      context.current.clearRect(0, 0, canvasSize.current.w, canvasSize.current.h)
    }
  }, [])

  const initCanvas = useCallback(() => {
    if (canvasContainerRef.current && canvasRef.current && context.current) {
      canvasSize.current.w = canvasContainerRef.current.offsetWidth
      canvasSize.current.h = canvasContainerRef.current.offsetHeight
      canvasRef.current.width = canvasSize.current.w * dpr
      canvasRef.current.height = canvasSize.current.h * dpr
      canvasRef.current.style.width = `${canvasSize.current.w}px`
      canvasRef.current.style.height = `${canvasSize.current.h}px`
      context.current.scale(dpr, dpr)
      circles.current = []
      clearContext()
      for (let i = 0; i < quantity; i++) {
        const circle = circleParams()
        drawCircle(circle)
      }
    }
  }, [dpr, quantity, circleParams, drawCircle, clearContext])

  const remapValue = (
    value: number,
    start1: number,
    end1: number,
    start2: number,
    end2: number
  ): number => {
    const remapped = ((value - start1) * (end2 - start2)) / (end1 - start1) + start2
    return remapped > 0 ? remapped : 0
  }

  useEffect(() => {
    if (canvasRef.current) {
      context.current = canvasRef.current.getContext("2d")
    }
    initCanvas()

    const handleMouseMove = (event: MouseEvent) => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const { w, h } = canvasSize.current
        const x = event.clientX - rect.left - w / 2
        const y = event.clientY - rect.top - h / 2
        const inside = x < w / 2 && x > -w / 2 && y < h / 2 && y > -h / 2
        if (inside) {
          mouse.current.x = x
          mouse.current.y = y
        }
      }
    }

    const handleResize = () => {
      if (resizeTimeout.current) {
        clearTimeout(resizeTimeout.current)
      }
      resizeTimeout.current = setTimeout(() => {
        initCanvas()
      }, 200)
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    window.addEventListener("resize", handleResize)

    const animate = () => {
      clearContext()
      const arr = circles.current
      const w = canvasSize.current.w
      const h = canvasSize.current.h
      const mx = mouse.current.x
      const my = mouse.current.y
      let writeIdx = 0
      for (let i = 0; i < arr.length; i++) {
        const circle = arr[i]
        const edge0 = circle.x + circle.translateX - circle.size
        const edge1 = w - circle.x - circle.translateX - circle.size
        const edge2 = circle.y + circle.translateY - circle.size
        const edge3 = h - circle.y - circle.translateY - circle.size
        const closestEdge = Math.min(edge0, edge1, edge2, edge3)
        const remapClosestEdge = remapValue(closestEdge, 0, 20, 0, 1)
        if (remapClosestEdge > 1) {
          circle.alpha += 0.02
          if (circle.alpha > circle.targetAlpha) {
            circle.alpha = circle.targetAlpha
          }
        } else {
          circle.alpha = circle.targetAlpha * remapClosestEdge
        }
        circle.x += circle.dx + vx
        circle.y += circle.dy + vy
        circle.translateX +=
          (mx / (staticity / circle.magnetism) - circle.translateX) / ease
        circle.translateY +=
          (my / (staticity / circle.magnetism) - circle.translateY) / ease

        drawCircle(circle, true)

        if (
          circle.x < -circle.size ||
          circle.x > w + circle.size ||
          circle.y < -circle.size ||
          circle.y > h + circle.size
        ) {
          const newCircle = circleParams()
          drawCircle(newCircle)
        } else {
          arr[writeIdx++] = circle
        }
      }
      arr.length = writeIdx
      rafID.current = window.requestAnimationFrame(animate)
    }

    rafID.current = window.requestAnimationFrame(animate)

    return () => {
      if (rafID.current != null) {
        window.cancelAnimationFrame(rafID.current)
      }
      if (resizeTimeout.current) {
        clearTimeout(resizeTimeout.current)
      }
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("resize", handleResize)
    }
  }, [color, initCanvas, clearContext, drawCircle, circleParams, vx, vy, staticity, ease])

  useEffect(() => {
    initCanvas()
  }, [refresh, initCanvas])

  return (
    <div
      className={cn("pointer-events-none", className)}
      ref={canvasContainerRef}
      aria-hidden="true"
      {...props}
    >
      <canvas ref={canvasRef} className="size-full" />
    </div>
  )
}
