import { useEffect, useMemo, useRef, useState } from 'react'

interface TarotDeckSelectionProps {
  deckCardIds: string[]
  selectedDeckIndices: number[]
  completedSelections: number
  labels?: string[]
  onSelect: (selectionIndex: number, deckIndex: number) => void
  disabled?: boolean
}

const BASE_CARD_STYLE: React.CSSProperties = {
  width: '72px',
  height: '116px',
  borderRadius: '10px',
  background: 'linear-gradient(160deg, rgba(28,20,40,0.98) 0%, rgba(13,10,26,0.98) 100%)',
  border: '1px solid rgba(201,168,76,0.18)',
  boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(201,168,76,0.28)',
  fontSize: '1.1rem',
}

function buildDeckCards(
  deckCardIds: string[],
  selectedDeckIndices: number[],
  spreadHalfWidth: number,
) {
  const selected = new Set(selectedDeckIndices)

  return deckCardIds
    .map((id, deckIndex) => ({ id, deckIndex }))
    .filter(card => !selected.has(card.deckIndex))
    .map((card, visualIndex, cards) => {
      const midpoint = (cards.length - 1) / 2
      const normalized = midpoint === 0 ? 0 : (visualIndex - midpoint) / midpoint
      const distance = Math.abs(normalized)

      return {
        id: card.id,
        deckIndex: card.deckIndex,
        rotation: normalized * 12,
        offsetX: normalized * spreadHalfWidth,
        offsetY: distance * distance * 38,
      }
    })
}

export default function TarotDeckSelection({
  deckCardIds,
  selectedDeckIndices,
  completedSelections,
  labels,
  onSelect,
  disabled = false,
}: TarotDeckSelectionProps) {
  const [animatingSelection, setAnimatingSelection] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState<number>(0)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setContainerWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  // Reserve ~70px so the outermost cards stay inside the container.
  const spreadHalfWidth = Math.max(60, (containerWidth / 2) - 70)
  const baseDeckCards = useMemo(
    () => buildDeckCards(deckCardIds, selectedDeckIndices, spreadHalfWidth),
    [deckCardIds, selectedDeckIndices, spreadHalfWidth],
  )
  const deckCards = useMemo(() => {
    if (animatingSelection === null) return baseDeckCards
    return buildDeckCards(deckCardIds, [...selectedDeckIndices, animatingSelection], spreadHalfWidth)
  }, [animatingSelection, baseDeckCards, deckCardIds, selectedDeckIndices, spreadHalfWidth])
  const animatingCard = useMemo(
    () => baseDeckCards.find(card => card.deckIndex === animatingSelection) ?? null,
    [animatingSelection, baseDeckCards],
  )

  useEffect(() => {
    if (animatingSelection === null) return
    const timer = window.setTimeout(() => setAnimatingSelection(null), 520)
    return () => window.clearTimeout(timer)
  }, [animatingSelection])

  const nextSelection = completedSelections
  const remaining = deckCards.length
  const promptLabel = labels?.[nextSelection] ?? `Card ${nextSelection + 1}`

  return (
    <div
      style={{
        display: remaining > 0 ? 'flex' : 'none',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem',
      }}
    >
      <p
        className="font-heading"
        style={{
          color: 'rgba(201,168,76,0.72)',
          fontSize: '0.9rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          textAlign: 'center',
        }}
      >
        Choose {promptLabel}
      </p>

      <div
        ref={containerRef}
        aria-label="Face-down tarot deck"
        style={{
          position: 'relative',
          width: 'min(96vw, 1680px)',
          height: '230px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {deckCards.map(card => {
          const isAnimating = false
          const active = !disabled && animatingSelection === null
          return (
            <button
              key={card.id}
              type="button"
              aria-label={`Draw ${promptLabel} from the deck`}
              disabled={!active}
              onClick={() => {
                setAnimatingSelection(card.deckIndex)
                window.setTimeout(() => onSelect(nextSelection, card.deckIndex), 120)
              }}
              style={{
                ...BASE_CARD_STYLE,
                position: 'absolute',
                transform: isAnimating
                  ? `translate(${card.offsetX}px, ${card.offsetY - 112}px) rotate(${card.rotation}deg) scale(1.08)`
                  : `translate(${card.offsetX}px, ${card.offsetY}px) rotate(${card.rotation}deg)`,
                transition: 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms ease, border-color 220ms ease, opacity 220ms ease',
                opacity: isAnimating ? 0 : 1,
                cursor: active ? 'pointer' : 'default',
                transformOrigin: 'center bottom',
                top: '6px',
                zIndex: deckCards.length - Math.abs(card.offsetX),
                animation: active ? 'tarot-deck-breathe 2.8s ease-in-out infinite' : 'none',
              }}
            >
              ✦
            </button>
          )
        })}

        {animatingCard && (
          <button
            key={`animating-${animatingCard.id}`}
            type="button"
            aria-hidden="true"
            disabled
            style={{
              ...BASE_CARD_STYLE,
              position: 'absolute',
              transform: `translate(${animatingCard.offsetX}px, ${animatingCard.offsetY - 112}px) rotate(${animatingCard.rotation}deg) scale(1.08)`,
              transition: 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease',
              opacity: 0,
              cursor: 'default',
              transformOrigin: 'center bottom',
              top: '6px',
              zIndex: deckCards.length + 1,
              pointerEvents: 'none',
            }}
          >
            ✦
          </button>
        )}
      </div>

      <p style={{ color: 'rgba(232,230,227,0.55)', fontSize: '0.8rem', textAlign: 'center' }}>
        {remaining === 1 ? 'One card remains in the deck.' : `${remaining} cards remain in the deck.`}
      </p>

      <style>{`
        @keyframes tarot-deck-breathe {
          0%, 100% { box-shadow: 0 12px 32px rgba(0,0,0,0.28); }
          50% { box-shadow: 0 18px 38px rgba(0,0,0,0.34), 0 0 0 1px rgba(201,168,76,0.18); }
        }
      `}</style>
    </div>
  )
}