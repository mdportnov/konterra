const NODES = [
  { x: 80, y: 120 }, { x: 250, y: 80 }, { x: 420, y: 150 },
  { x: 600, y: 60 }, { x: 750, y: 180 }, { x: 900, y: 100 },
  { x: 150, y: 300 }, { x: 350, y: 260 }, { x: 520, y: 320 },
  { x: 700, y: 280 }, { x: 850, y: 350 }, { x: 100, y: 480 },
  { x: 300, y: 450 }, { x: 480, y: 500 }, { x: 680, y: 460 },
  { x: 850, y: 520 }, { x: 200, y: 620 }, { x: 400, y: 650 },
  { x: 600, y: 600 }, { x: 780, y: 660 }, { x: 920, y: 580 },
  { x: 50, y: 750 }, { x: 260, y: 780 }, { x: 500, y: 740 },
  { x: 720, y: 800 }, { x: 900, y: 750 },
]

const EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
  [0, 6], [1, 7], [2, 8], [3, 9], [4, 10],
  [6, 7], [7, 8], [8, 9], [9, 10],
  [6, 11], [7, 12], [8, 13], [9, 14], [10, 15],
  [11, 12], [12, 13], [13, 14], [14, 15],
  [11, 16], [12, 17], [13, 18], [14, 19], [15, 20],
  [16, 17], [17, 18], [18, 19], [19, 20],
  [16, 21], [17, 22], [18, 23], [19, 24], [20, 25],
  [21, 22], [22, 23], [23, 24], [24, 25],
  [1, 6], [3, 8], [5, 10], [7, 13], [9, 15],
  [12, 18], [14, 20], [17, 23], [19, 25],
]

export default function NetworkBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      aria-hidden="true"
      style={{ background: 'oklch(0.06 0.01 260)' }}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1000 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor="oklch(0.06 0.01 260)" />
          </radialGradient>
        </defs>

        {EDGES.map(([a, b], i) => {
          const from = NODES[a]
          const to = NODES[b]
          return (
            <g key={`e-${i}`}>
              <line
                x1={from.x} y1={from.y}
                x2={to.x} y2={to.y}
                stroke="oklch(0.25 0.03 180)"
                strokeWidth="0.5"
              />
              {i % 3 === 0 && (
                <circle r="1.5" fill="oklch(0.55 0.08 180)" opacity="0.7">
                  <animateMotion
                    dur={`${7 + (i % 5) * 1.2}s`}
                    repeatCount="indefinite"
                    path={`M${from.x},${from.y} L${to.x},${to.y}`}
                  />
                </circle>
              )}
            </g>
          )
        })}

        {NODES.map((n, i) => (
          <circle
            key={`n-${i}`}
            cx={n.x}
            cy={n.y}
            r="2"
            fill="oklch(0.55 0.08 180)"
            opacity="0.6"
          >
            <animate
              attributeName="opacity"
              values="0.3;0.8;0.3"
              dur={`${3 + (i % 4)}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="r"
              values="1.5;2.5;1.5"
              dur={`${3 + (i % 4)}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}

        <rect width="100%" height="100%" fill="url(#vignette)" />
      </svg>
    </div>
  )
}
