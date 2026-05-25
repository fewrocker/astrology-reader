interface RitualFadeOverlayProps {
  visible: boolean
}

export default function RitualFadeOverlay({ visible }: RitualFadeOverlayProps) {
  return (
    <div
      aria-hidden="true"
      className="tarot-fade-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a0f',
        pointerEvents: 'none',
        zIndex: 100,
        opacity: visible ? 1 : 0,
        transition: 'opacity 250ms ease-in-out',
      }}
    />
  )
}
