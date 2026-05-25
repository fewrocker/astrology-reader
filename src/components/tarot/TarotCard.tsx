import type { DrawnCard } from './types'
import type { SpreadPosition } from '../../data/tarot/spreadPositions'

interface TarotCardProps {
  card: DrawnCard | null
  position: SpreadPosition
  cardState: 'face-down' | 'face-up'
  isActive: boolean       // pulsing — waiting to be revealed
  isCrossing?: boolean    // position 2: rotate 90°
  onReveal?: () => void   // called when user taps a face-down active card
  tabIndex?: number
  id?: string
}

export default function TarotCard({
  card,
  position,
  cardState,
  isActive,
  isCrossing = false,
  onReveal,
  tabIndex = -1,
  id,
}: TarotCardProps) {
  const isRevealed = cardState === 'face-up'

  const baseStyle: React.CSSProperties = {
    width: '100%',
    aspectRatio: '2/3',
    borderRadius: '8px',
    transition: 'transform 0.6s ease, box-shadow 0.3s ease',
    ...(isCrossing ? { transform: 'rotate(90deg)' } : {}),
  }

  if (!isRevealed) {
    return (
      <div
        id={id}
        role="button"
        tabIndex={isActive ? tabIndex : -1}
        aria-label={`${position.name} — tap to reveal`}
        onClick={isActive ? onReveal : undefined}
        onKeyDown={isActive && onReveal ? (e) => {
          if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onReveal() }
        } : undefined}
        style={{
          ...baseStyle,
          cursor: isActive ? 'pointer' : 'default',
          background: 'linear-gradient(135deg, #1a1030 0%, #0d0a1a 100%)',
          border: `1px solid ${isActive ? 'rgba(201,168,76,0.45)' : 'rgba(201,168,76,0.18)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: isActive ? 'tarot-pulse 3s ease-in-out infinite' : undefined,
        }}
      >
        <span style={{ fontSize: '1.5rem', color: 'rgba(201,168,76,0.35)' }} aria-hidden="true">✦</span>
      </div>
    )
  }

  // Face-up card
  const arcanaColor = card?.arcana === 'major' ? '#c9a84c' : 'rgba(201,168,76,0.65)'
  const suitColors: Record<string, string> = {
    wands: '#c4622d',
    cups: '#5ec4c4',
    swords: '#8ab4d4',
    pentacles: '#7faf5e',
  }
  const accentColor = card?.suit ? (suitColors[card.suit] ?? arcanaColor) : arcanaColor

  return (
    <div
      id={id}
      style={{
        ...baseStyle,
        background: 'linear-gradient(160deg, #1c1428 0%, #0d0a1a 100%)',
        border: `1px solid ${accentColor}`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 12px rgba(201,168,76,0.08)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 6px',
        gap: '4px',
        position: 'relative',
      }}
      aria-label={`${card?.cardName ?? 'Unknown'}, ${card?.reversed ? 'reversed' : 'upright'}, in the position of ${position.name}`}
    >
      {/* Arcana label */}
      <span style={{ fontSize: '0.55rem', color: 'rgba(201,168,76,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {card?.arcana === 'major' ? 'Major' : (card?.suit ?? 'Minor')}
      </span>

      {/* Card name */}
      <span
        className="font-heading"
        style={{
          fontSize: '0.75rem',
          color: arcanaColor,
          textAlign: 'center',
          lineHeight: 1.25,
          ...(card?.reversed ? { transform: 'rotate(180deg)', display: 'block' } : {}),
        }}
      >
        {card?.cardName ?? '—'}
      </span>

      {/* Reversed indicator */}
      {card?.reversed && (
        <span style={{ fontSize: '0.5rem', color: 'rgba(201,168,76,0.4)', letterSpacing: '0.06em' }}>
          reversed
        </span>
      )}

      {/* Position number badge */}
      <span
        style={{
          position: 'absolute',
          bottom: '5px',
          right: '6px',
          fontSize: '0.55rem',
          color: 'rgba(201,168,76,0.3)',
        }}
      >
        {position.number}
      </span>
    </div>
  )
}
