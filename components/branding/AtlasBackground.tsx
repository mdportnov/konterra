export default function AtlasBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none" aria-hidden="true" style={{ background: 'var(--ink)' }}>
      <div className="absolute inset-0 k-grid-bg" />
      <div className="absolute inset-0 k-vignette" />
      <div className="absolute inset-0 k-grain" />
    </div>
  )
}
