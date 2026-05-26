import { useMemo, useState } from 'react'
import type { TarotSingleSynthesisPayload } from '../../services/gptInterpretation'
import TarotInterpretationPanel from './TarotInterpretationPanel'
import SingleCardSynthesisPanel from './SingleCardSynthesisPanel'
import TarotDiscussPanel from './TarotDiscussPanel'
import TarotDeckSelection from './TarotDeckSelection'
import { CardReveal } from './CardReveal'
import type { TarotCard, InstantInterpretation } from './TarotInterpretationPanel'

export type { TarotCard, InstantInterpretation }

interface SingleCardReadingProps {
  deckCardIds: string[]
  selectedDeckIndices: number[]
  card: TarotCard | null
  reversed: boolean
  interpretation: InstantInterpretation | null
  synthesisPayload: TarotSingleSynthesisPayload | null
  personalDay: number
  onBack: () => void
  onSave: () => void
  onDiscuss: () => void
  onPickCard: (deckIndex: number) => void
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
  deckCardIds,
  selectedDeckIndices,
  card,
  reversed,
  interpretation,
  synthesisPayload,
  personalDay,
  onBack,
  onSave,
  onDiscuss,
  onPickCard,
}: SingleCardReadingProps) {
  const [saveLabel, setSaveLabel] = useState('Save')
  const [selectedCount, setSelectedCount] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [discussOpen, setDiscussOpen] = useState(false)
  const personalDayMatchesCard = card?.number === personalDay
  const revealReady = selectedCount > 0
  const cardLabel = useMemo(() => (card ? `${card.name}${reversed ? ', reversed' : ''}` : 'Face-down tarot card'), [card, reversed])

  const discussContext = useMemo(() => {
    if (!card || !interpretation) return ''
    return [
      'SINGLE CARD TAROT READING',
      `Card: ${card.name} (${reversed ? 'Reversed' : 'Upright'})`,
      `Arcana: ${card.arcana}${card.suit ? `, ${card.suit}` : ''}`,
      `Core Meaning: ${interpretation.coreMeaning}`,
      `Symbolic Theme: ${interpretation.symbolicTheme}`,
      `Emotional Meaning: ${interpretation.emotionalMeaning}`,
      `Practical Guidance: ${interpretation.practicalGuidance}`,
      `Reflection Question: ${interpretation.reflectionQuestion}`,
      `Personal Day: ${personalDay}`,
    ].join('\n')
  }, [card, interpretation, personalDay, reversed])

  const bgTint = card?.element === 'Fire'
    ? 'rgba(255,120,0,0.03)'
    : card?.element === 'Water'
      ? 'rgba(0,80,180,0.03)'
      : 'transparent'

  function handleSave() {
    onSave()
    setSaveLabel('Saved')
    setTimeout(() => setSaveLabel('Save'), 2000)
  }

  function handleSelect(_: number, deckIndex: number) {
    onPickCard(deckIndex)
    setSelectedCount(1)
    window.setTimeout(() => setRevealed(true), 480)
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

        {selectedCount === 0 && (
          <TarotDeckSelection
            deckCardIds={deckCardIds}
            selectedDeckIndices={selectedDeckIndices}
            completedSelections={selectedCount}
            labels={['Your card']}
            onSelect={handleSelect}
          />
        )}

        {/* Card Visual */}
        <div className="flex justify-center mb-12">
          {card ? (
            <div
              className="relative"
              style={{
                maxHeight: 'none',
                transform: revealReady ? 'translateY(0)' : 'translateY(12px)',
                transition: 'transform 0.45s ease, opacity 0.45s ease',
                opacity: revealReady ? 1 : 0.72,
              }}
            >
              <CardReveal
                card={card}
                reversed={reversed}
                revealed={revealed}
                size="hero"
                aria-label={cardLabel}
              />

              {revealed && (
                <div
                  className="pointer-events-none absolute left-1/2 z-20"
                  style={{
                    bottom: '-18px',
                    transform: 'translateX(-50%)',
                    width: '64%',
                    maxWidth: '280px',
                  }}
                >
                  <div
                    className="rounded-full border px-5 py-2 text-center"
                    style={{
                      background: 'linear-gradient(180deg, rgba(22,16,10,0.96) 0%, rgba(12,10,8,0.92) 100%)',
                      borderColor: 'rgba(201,168,76,0.42)',
                      boxShadow: '0 16px 40px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,240,200,0.08)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <h1
                      className="font-heading leading-none whitespace-nowrap"
                      style={{ fontSize: '1.6rem', color: '#d4af58', textShadow: '0 1px 10px rgba(0,0,0,0.35)' }}
                    >
                      {card.name}
                    </h1>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="tarot-card-xl rounded-xl border border-mystic-gold/30"
              aria-label={cardLabel}
              style={{
                background: 'linear-gradient(160deg, rgba(28,20,40,0.98) 0%, rgba(13,10,26,0.98) 100%)',
              }}
            />
          )}
        </div>

        {/* Card Identity */}
        {revealed && card && <div className="mb-16" aria-hidden="true" />}

        {/* Interpretation Panel */}
        {revealed && card && interpretation && (
          <TarotInterpretationPanel
            interpretation={interpretation}
            card={card}
            personalDay={personalDay}
            personalDayMatchesCard={personalDayMatchesCard}
          />
        )}

        {revealed && card && interpretation && (
          <SingleCardSynthesisPanel
            synthesisPayload={synthesisPayload}
            onDiscuss={() => {
              onDiscuss()
              setDiscussOpen(true)
            }}
          />
        )}
      </div>

      <TarotDiscussPanel
        isOpen={discussOpen}
        onClose={() => setDiscussOpen(false)}
        contextString={discussContext}
      />
    </div>
  )
}
