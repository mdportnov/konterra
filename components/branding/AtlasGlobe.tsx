const PARALLELS = [-60, -30, 0, 30, 60]
const MERIDIANS = [0, 30, 60, 80]

const NODES: [number, number][] = [
  [312, 148],
  [418, 226],
  [238, 292],
  [372, 350],
  [270, 405],
]

const ARCS = [
  'M312 148 Q 380 160 418 226',
  'M418 226 Q 330 300 238 292',
  'M238 292 Q 300 340 372 350',
  'M372 350 Q 320 400 270 405',
  'M270 405 Q 250 280 312 148',
]

export default function AtlasGlobe({ className }: { className?: string }) {
  const R = 210
  const CX = 320
  const CY = 280
  return (
    <svg viewBox="0 0 640 560" fill="none" className={className} aria-hidden="true">
      <g className="k-spin-slow" style={{ transformBox: 'fill-box' }}>
        <circle cx={CX} cy={CY} r={R} stroke="oklch(0.93 0.012 85 / 14%)" strokeWidth="1" />
        {PARALLELS.map((lat) => {
          const y = CY - R * Math.sin((lat * Math.PI) / 180)
          const rx = R * Math.cos((lat * Math.PI) / 180)
          return (
            <ellipse
              key={`p${lat}`}
              cx={CX}
              cy={y}
              rx={rx}
              ry={rx * 0.22}
              stroke="oklch(0.93 0.012 85 / 7%)"
              strokeWidth="1"
            />
          )
        })}
        {MERIDIANS.map((deg) => (
          <ellipse
            key={`m${deg}`}
            cx={CX}
            cy={CY}
            rx={R * Math.cos((deg * Math.PI) / 180)}
            ry={R}
            stroke="oklch(0.93 0.012 85 / 7%)"
            strokeWidth="1"
          />
        ))}
      </g>
      <circle cx={CX} cy={CY} r={R + 26} stroke="oklch(0.93 0.012 85 / 6%)" strokeWidth="1" strokeDasharray="2 10" />
      {ARCS.map((d, i) => (
        <path key={i} d={d} stroke="oklch(0.7 0.16 45 / 45%)" strokeWidth="1" className="k-arc" />
      ))}
      {NODES.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3" fill="var(--terra)" />
          <circle cx={x} cy={y} r="8" stroke="oklch(0.7 0.16 45 / 30%)" strokeWidth="1" />
        </g>
      ))}
    </svg>
  )
}
