import React from 'react'
import { TAROT_CARD_BY_ID } from '../../data/tarot/cards'
import { CardBack } from './CardBack'
import { TarotCard as TarotCardComponent } from './TarotCard'
import type { DrawnCard } from './types'
import type { CelticCrossPosition } from '../../data/tarot/spreadPositions'

interface CelticCrossCardProps {
  card: DrawnCard | null
  position: CelticCrossPosition
  cardState: 'face-down' | 'face-up'
  isActive: boolean
  isCrossing?: boolean
  onReveal?: () => void
  tabIndex?: number
  id?: string
  hidden?: boolean
}

export default function CelticCrossCard({
  card,
  position,
  cardState,
  isActive,
  isCrossing = false,
  onReveal,
  tabIndex = -1,
  id,
  hidden = false,
}: CelticCrossCardProps) {
  if (hidden) {
    return (
      <div
        id={id}
        aria-hidden="true"
        style={{ width: '100%', aspectRatio: '2/3', opacity: 0 }}
      />
    )
  }

  const isRevealed = cardState === 'face-up'
  const tarotCard = card ? TAROT_CARD_BY_ID[card.cardId] : null

  const baseStyle: React.CSSProperties = {
    width: '100%',
    // Match standard tarot art ratio (2:3.5) so generated images fit without
    // cropping. Previously this was 2/3, which caused ~14% of the bottom of
    // every card to be clipped by the slot's overflow:hidden.
    aspectRatio: '4/7',
    borderRadius: '8px',
    transition: 'transform 0.6s ease, box-shadow 0.3s ease',
    ...(isCrossing ? { transform: 'rotate(90deg)' } : {}),
  }

  if (!isRevealed) {
    // Empty slot — position is in the spread but no card has been drawn for it yet
    if (!card) {
      return (
        <div
          id={id}
          aria-label={`${position.name} — empty slot`}
          style={{
            ...baseStyle,
            border: '1px dashed rgba(201,168,76,0.28)',
            background:
              'linear-gradient(160deg, rgba(28,20,40,0.55) 0%, rgba(13,10,26,0.55) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(201,168,76,0.4)',
            fontSize: '0.85rem',
            fontFamily: 'inherit',
            boxShadow: 'inset 0 0 12px rgba(0,0,0,0.35)',
          }}
        >
          {position.number}
        </div>
      )
    }

    // Card has been placed but not yet revealed — show the deck back art
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
          border: isActive ? '1px solid rgba(255,210,120,0.6)' : '1px solid transparent',
          borderRadius: '10px',
          animation: isActive ? 'tarot-pulse 1.8s ease-in-out infinite' : undefined,
        }}
      >
        <CardBack aria-label={`${position.name} — tap to reveal`} />
      </div>
    )
  }

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
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${accentColor}`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 12px rgba(201,168,76,0.08)`,
      }}
      aria-label={`${card?.cardName ?? 'Unknown'}, ${card?.reversed ? 'reversed' : 'upright'}, in the position of ${position.name}`}
    >
      {tarotCard ? (
        <TarotCardComponent
          card={tarotCard}
          face="up"
          reversed={card?.reversed}
          size="md"
          className="tarot-card-fill"
        />
      ) : null}

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
