import { ImageResponse } from 'next/og'

export const alt = 'Konterra — your people and places on one globe'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const INK = '#0e0d0b'
const BONE = '#f2ede3'
const MUTED = '#8a8175'
const TERRA = '#b0651f'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 28,
          background: INK,
          padding: 96,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 24, color: TERRA, letterSpacing: 10, textTransform: 'uppercase' }}>
          Konterra
        </div>
        <div style={{ fontSize: 84, color: BONE, fontWeight: 600, lineHeight: 1.05, maxWidth: 940 }}>
          Your people and your places, on one globe.
        </div>
        <div style={{ fontSize: 30, color: MUTED, maxWidth: 860, lineHeight: 1.4 }}>
          A private CRM for people who move. Track where you have been, who you know, and who you can
          actually catch on the next trip.
        </div>
      </div>
    ),
    size,
  )
}
