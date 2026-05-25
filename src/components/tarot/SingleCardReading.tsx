import { useState } from 'react'
import TarotInterpretationPanel from './TarotInterpretationPanel'
import TarotSynthesisPanel from './TarotSynthesisPanel'
import type { TarotCard, InstantInterpretation } from './TarotInterpretationPanel'

export type { TarotCard, InstantInterpretation }

interface SingleCardReadingProps {
  card: TarotCard
  reversed: boolean
  interpretation: InstantInterpretation
  personalDay: number
  onBack: () => void
  onSave: () => void
  onDiscuss: () => void
}

function getArcanaLabel(card: TarotCard): string {
  if (card.arcana === 'major') return 'Major Arcana'
  if (card.suit) return `Suit of ${card.suit}`
  return 'Minor Arcana'
}

function getNumberLabel(card: TarotCard): string {
  if (card.arcana === 'major') {
    const ROMAN: Record<number, string> = { 0: '0', 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII', 13: 'XIII', 14: 'XIV', 15: 'XV', 16: 'XVI', 17: 'XVII', 18: 'XVIII', 19: 'XIX', 20: 'XX', 21: 'XXI' }
    return ROMAN[card.number] ?? String(card.number)
  }
  const WORDS: Record<number, string> = { 1: 'Ace', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Page', 12: 'Knight', 13: 'Queen', 14: 'King' }
  return WORDS[card.number] ?? String(card.number)
}

export default function SingleCardReading({
  card,
  reversed,
  interpretation,
  personalDay,
  onBack,
  onSave,
  onDiscuss,
}: SingleCardReadingProps) {
  const [saveLabel, setSaveLabel] = useState('Save')
  const personalDayMatchesCard = card.number === personalDay

  const bgTint = card.element === 'Fire'
    ? 'rgba(255,120,0,0.03)'
    : card.element === 'Water'
      ? 'rgba(0,80,180,0.03)'
      : 'transparent'

  function handleSave() {
    onSave()
    setSaveLabel('Saved')
    setTimeout(() => setSaveLabel('Save'), 2000)
  }

  return (
    <div
      className="w-full max-w-2xl mx-auto px-4 pb-24 relative"
      style={{ '--bg-tint': bgTint } as React.CSSProperties}
    >
      {/* Background tint overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: bgTint }}
        aria-hidden="true"
      />

      <div className="relative z-10">
        {/* Header row: Back + Save */}
        <div className="flex items-center justify-between mb-8 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="text-mystic-muted hover:text-mystic-gold transition-colors text-sm font-heading"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="text-xs text-mystic-muted hover:text-mystic-gold transition-colors font-heading uppercase tracking-widest min-h-[44px] px-2"
          >
            {saveLabel}
          </button>
        </div>

        {/* Card Visual */}
        <div className="flex justify-center mb-8">
          <div
            className="relative"
            style={{
              maxHeight: '45vh',
              transform: reversed ? 'rotate(-4deg)' : 'none',
              transition: 'transform 0.3s ease',
            }}
          >
            {/* Placeholder for CardReveal — renders card face from feat-tarot-card-visual-assets */}
            <div
              className="w-40 border border-mystic-gold/40 rounded-xl bg-mystic-surface flex items-center justify-center"
              style={{ height: '260px', background: 'rgba(201,168,76,0.05)' }}
              aria-label={`${card.name}${reversed ? ', reversed' : ''}`}
            >
              <span className="font-heading text-mystic-gold/40 text-xs text-center px-2">
                {card.name}
              </span>
            </div>
          </div>
        </div>

        {/* Card Identity */}
        <div className="text-center mb-8">
          <h1
            className="font-heading mb-2"
            style={{ fontSize: '2rem', color: '#c9a84c' }}
          >
            {card.name}
          </h1>
          <p className="text-mystic-muted text-xs uppercase tracking-widest">
            {getArcanaLabel(card)}&nbsp;·&nbsp;{getNumberLabel(card)}
          </p>
        </div>

        {/* Interpretation Panel */}
        <TarotInterpretationPanel
          interpretation={interpretation}
          card={card}
          personalDay={personalDay}
          personalDayMatchesCard={personalDayMatchesCard}
        />

        {/* Synthesis Panel (manages its own GPT call) */}
        <TarotSynthesisPanel
          card={card}
          reversed={reversed}
          interpretation={interpretation}
          userIntention={null}
          onDiscuss={onDiscuss}
        />
      </div>
    </div>
  )
}
