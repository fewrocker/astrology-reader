import { useCallback, useMemo, useState } from 'react'
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
  userIntention?: string | null
  onBack: () => void
  onSave: () => Promise<void>
  onDiscuss: () => void
  onPickCard: (deckIndex: number) => void
}

function getArcanaLabel(card: TarotCard): string {
  if (card.arcana === 'major') return 'Major Arcana'
  if (card.suit) return `Suit of ${card.suit}`
  return 'Minor Arcana'
}

// ─── Build rich discuss context string ────────────────────────────────────────
function buildDiscussContext(
  card: TarotCard,
  reversed: boolean,
  interpretation: InstantInterpretation,
  synthesisPayload: TarotSingleSynthesisPayload | null,
  synthesisText: string | null,
): string {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const arcanaLabel = getArcanaLabel(card)
  const payload = synthesisPayload

  let ctx = `User intention: ${payload?.userIntention ?? 'Not stated'}\n\n`
  ctx += `SINGLE CARD TAROT READING — ${date}\n`

  // Natal + sky line
  const natalSun = payload?.natalSunSign ?? ''
  const natalMoon = payload?.natalMoonSign ?? ''
  const natalAsc = payload?.natalAscSign ?? ''
  const lunarPhase = payload?.moonPhaseName ?? ''
  const personalDay = payload?.personalDay ?? 0
  ctx += `Natal: ${natalSun}, ${natalMoon}, ${natalAsc} | Moon: ${lunarPhase} | Personal Day: ${personalDay}\n`

  // Natal dominant element (available via astroConnection)
  if (interpretation.astroConnection.natalDominantElement) {
    ctx += `Dominant Element: ${interpretation.astroConnection.natalDominantElement}\n`
  }

  // Advance category when present
  if (payload?.advanceCategory) ctx += `Advance category: ${payload.advanceCategory}\n`

  // Card line
  ctx += `\nCARD:\n`
  ctx += `${card.name} (${reversed ? 'Reversed' : 'Upright'}) — ${arcanaLabel}\n`
  ctx += `Core Meaning: ${interpretation.coreMeaning}\n`
  ctx += `Symbolic Theme: ${interpretation.symbolicTheme}\n`
  ctx += `Emotional Meaning: ${interpretation.emotionalMeaning}\n`
  ctx += `Practical Guidance: ${interpretation.practicalGuidance}\n`
  ctx += `Reflection Question: ${interpretation.reflectionQuestion}\n`

  // Astro connection headline and transit note from instant interpretation
  if (interpretation.astroConnection.astroHeadline) {
    ctx += `Astro Headline: ${interpretation.astroConnection.astroHeadline}\n`
  }
  if (interpretation.astroConnection.transitInfluence) {
    ctx += `Transit Influence: ${interpretation.astroConnection.transitInfluence}\n`
  }

  // Daily transit summary (top context from the live sky)
  if (payload?.dailyTransitSummary) {
    ctx += `\nDAILY TRANSIT CONTEXT:\n${payload.dailyTransitSummary}\n`
  }

  // GPT synthesis text when loaded
  if (synthesisText) {
    ctx += `\nAI SYNTHESIS:\n${synthesisText}\n`
  }

  return ctx
}

export default function SingleCardReading({
  deckCardIds,
  selectedDeckIndices,
  card,
  reversed,
  interpretation,
  synthesisPayload,
  personalDay,
  userIntention,
  onBack,
  onSave,
  onDiscuss,
  onPickCard,
}: SingleCardReadingProps) {
  const [saveLabel, setSaveLabel] = useState<'Save' | 'Saving…' | 'Saved' | 'Error'>('Save')
  const [selectedCount, setSelectedCount] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [discussOpen, setDiscussOpen] = useState(false)
  const [loadedSynthesisText, setLoadedSynthesisText] = useState<string | null>(null)
  const personalDayMatchesCard = card?.number === personalDay
  const revealReady = selectedCount > 0
  const cardLabel = useMemo(() => (card ? `${card.name}${reversed ? ', reversed' : ''}` : 'Face-down tarot card'), [card, reversed])

  const handleSynthesisLoaded = useCallback((text: string) => {
    setLoadedSynthesisText(text)
  }, [])

  const discussContext = useMemo(() => {
    if (!card || !interpretation) return ''
    return buildDiscussContext(card, reversed, interpretation, synthesisPayload, loadedSynthesisText)
  }, [card, interpretation, reversed, synthesisPayload, loadedSynthesisText])

  const bgTint = card?.element === 'Fire'
    ? 'rgba(255,120,0,0.03)'
    : card?.element === 'Water'
      ? 'rgba(0,80,180,0.03)'
      : 'transparent'

  async function handleSave() {
    if (saveLabel === 'Saving…' || saveLabel === 'Saved') return
    setSaveLabel('Saving…')
    try {
      await onSave()
      setSaveLabel('Saved')
    } catch {
      setSaveLabel('Error')
      setTimeout(() => setSaveLabel('Save'), 3000)
    }
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
            disabled={saveLabel === 'Saving…' || saveLabel === 'Saved'}
            className={`text-xs transition-colors font-heading uppercase tracking-widest min-h-[44px] px-2 ${saveLabel === 'Error' ? 'text-red-400/80' : saveLabel === 'Saved' ? 'text-mystic-gold/70' : 'text-mystic-muted hover:text-mystic-gold'}`}
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
        <style>{`
          @keyframes tarot-ring-pulse {
            0%, 100% { box-shadow: 0 0 0 1px rgba(201,168,76,0.2), inset 0 0 0 1px rgba(201,168,76,0.1); }
            50% { box-shadow: 0 0 0 2px rgba(201,168,76,0.55), inset 0 0 0 1px rgba(201,168,76,0.25); }
          }
        `}</style>
        <div className="flex justify-center mb-12">
          {card ? (
            <div
              className="relative"
              onClick={revealReady && !revealed ? () => setRevealed(true) : undefined}
              style={{
                maxHeight: 'none',
                transform: revealReady ? 'translateY(0)' : 'translateY(12px)',
                transition: 'transform 0.45s ease, opacity 0.45s ease',
                opacity: revealReady ? 1 : 0.72,
                cursor: revealReady && !revealed ? 'pointer' : undefined,
                borderRadius: '0.75rem',
                animation: revealReady && !revealed ? 'tarot-ring-pulse 2s ease-in-out infinite' : undefined,
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

        {/* Ritual invitation text — shown while card is face-down and ready to be tapped */}
        {revealReady && !revealed && (
          <p
            className="text-center font-heading"
            style={{
              color: 'rgba(201,168,76,0.65)',
              fontSize: '0.85rem',
              letterSpacing: '0.04em',
              marginTop: '-1.5rem',
              marginBottom: '2rem',
            }}
          >
            Visualize your intention and click on the card to start the ritual
          </p>
        )}

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
            onSynthesisLoaded={handleSynthesisLoaded}
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
        userIntention={userIntention}
      />
    </div>
  )
}
