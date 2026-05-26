import { useCallback, useEffect, useRef, useState } from 'react'
import { TAROT_CARD_BY_ID } from '../../data/tarot/cards'
import type { DrawnCard, InstantInterpretation, TarotAstroContext, SpreadMode, ThreeCardSynthesisSkeleton } from '../../types/tarot'
import { SPREAD_DEFINITIONS } from '../../data/tarot/spreadPositions'
import type { SpreadPosition } from '../../data/tarot/types'
import GptSkeleton from '../ui/GptSkeleton'
import {
  getTarotThreeSynthesis,
  RateLimitError,
  clientComputeElementalDignity,
  clientDescribeElementalDignity,
  clientIsCourtCard,
  clientDescribeCourtPairDynamic,
  clientDescribeMajorMinorAsymmetry,
  clientComputeNumeralProgression,
} from '../../services/gptInterpretation'
import type { TarotThreeSynthesisPayload, TarotCardPayload, SpreadPositionPayload } from '../../services/gptInterpretation'
import TarotDiscussPanel from './TarotDiscussPanel'
import TarotDeckSelection from './TarotDeckSelection'
import { CardBack } from './CardBack'
import { TarotCard as TarotCardComponent } from './TarotCard'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ThreeCardReadingProps {
  spreadMode: SpreadMode
  deckCardIds: string[]
  selectedDeckIndices: number[]
  drawnCards: DrawnCard[]
  instantInterpretations: InstantInterpretation[]
  astroContext: TarotAstroContext
  userIntention: string | null
  onSave: () => void
  onDiscard: () => void
  onOpenDiscuss: () => void
  onPickCard: (deckIndex: number) => void
}

// ─── Synthesis types ──────────────────────────────────────────────────────────

interface ParsedSynthesis {
  openingSentence: string
  mainTheme: string
  mainTension: string
  direction: string
  hiddenInfluence: string
  advice: string
  psychologicalPattern: string
  astrologySynthesis: string
  timing: string
  reflectionPrompts: string[]
}

function splitReadableParagraphs(text: string): string[] {
  const normalized = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  if (normalized.length > 1) return normalized

  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(sentence => sentence.trim()).filter(Boolean) ?? []
  if (sentences.length <= 3) return [text.trim()]

  const chunks: string[] = []
  for (let index = 0; index < sentences.length; index += 2) {
    chunks.push(sentences.slice(index, index + 2).join(' '))
  }
  return chunks
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseSynthesisText(text: string): ParsedSynthesis {
  const result: ParsedSynthesis = {
    openingSentence: '',
    mainTheme: '',
    mainTension: '',
    direction: '',
    hiddenInfluence: '',
    advice: '',
    psychologicalPattern: '',
    astrologySynthesis: '',
    timing: '',
    reflectionPrompts: [],
  }

  const sectionRe =
    /^(OPENING_SENTENCE|MAIN_THEME|MAIN_TENSION|DIRECTION|HIDDEN_INFLUENCE|ADVICE|PSYCHOLOGICAL_PATTERN|ASTROLOGY_SYNTHESIS|TIMING|REFLECTION_PROMPTS):\s*/m
  const parts = text.split(sectionRe)

  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i]
    const content = (parts[i + 1] ?? '').trim()
    switch (key) {
      case 'OPENING_SENTENCE': result.openingSentence = content; break
      case 'MAIN_THEME': result.mainTheme = content; break
      case 'MAIN_TENSION': result.mainTension = content; break
      case 'DIRECTION': result.direction = content; break
      case 'HIDDEN_INFLUENCE': result.hiddenInfluence = content; break
      case 'ADVICE': result.advice = content; break
      case 'PSYCHOLOGICAL_PATTERN': result.psychologicalPattern = content; break
      case 'ASTROLOGY_SYNTHESIS': result.astrologySynthesis = content; break
      case 'TIMING': result.timing = content; break
      case 'REFLECTION_PROMPTS':
        result.reflectionPrompts = content
          .split('\n')
          .filter(l => l.trim().startsWith('-'))
          .map(l => l.trim().slice(1).trim())
          .filter(Boolean)
        break
    }
  }

  // Fall back to treating the whole text as the opening sentence if parsing fails
  if (!result.openingSentence && text.trim()) {
    result.openingSentence = text.trim().split('\n')[0] ?? ''
    result.mainTheme = text.trim()
  }

  return result
}

function computeSynthesisSignals(cards: DrawnCard[]): ThreeCardSynthesisSkeleton {
  const elementDist: Record<string, number> = {}
  const suitSpread: string[] = []

  for (const card of cards) {
    if (card.element) elementDist[card.element] = (elementDist[card.element] ?? 0) + 1
    if (card.suit) suitSpread.push(card.suit)
  }

  const majorCount = cards.filter(c => c.arcana === 'major').length
  const upright = cards.filter(c => !c.reversed).length
  const hasFoolOrWorld = cards.some(c => c.arcana === 'major' && (c.number === 0 || c.number === 21))

  const OPPOSING: Record<string, string> = { Fire: 'Water', Water: 'Fire', Air: 'Earth', Earth: 'Air' }
  const elementConflicts: string[] = []
  for (let i = 0; i < cards.length - 1; i++) {
    const a = cards[i].element
    const b = cards[i + 1].element
    if (a && b && OPPOSING[a] === b) {
      elementConflicts.push(`${a} (card ${i}) vs ${b} (card ${i + 1})`)
    }
  }

  return {
    dominantArcana: majorCount >= 2 ? 'major-heavy' : majorCount === 0 ? 'minor-heavy' : 'mixed',
    elementDistribution: elementDist,
    polarityCount: { upright, reversed: 3 - upright },
    hasFoolOrWorld,
    suitSpread,
    elementConflicts,
    positionalWeights: cards.map((c, i) => `Position ${i}: ${c.name}${c.reversed ? ' (reversed)' : ''}`),
  }
}

function computeAIFreeSynthesis(
  cards: DrawnCard[],
  spreadMode: SpreadMode,
  signals: ThreeCardSynthesisSkeleton,
): ParsedSynthesis {
  const spread = SPREAD_DEFINITIONS[spreadMode]
  const [pos0, pos1, pos2] = spread.positions
  const names = cards.map(c => c.name)
  const elementEntries = Object.entries(signals.elementDistribution).filter(([, v]) => v > 0)
  const majorHeavy = signals.dominantArcana === 'major-heavy'

  return {
    openingSentence: `${names.join(', ')} together form a constellation of ${majorHeavy ? 'archetypal forces' : 'shifting circumstances'} — a reading that calls for honest attention to what is already in motion.`,
    mainTheme: `The cards together point toward ${signals.polarityCount.reversed > 1 ? 'a period of inward re-evaluation, where what has been moving outward is now turning toward integration' : 'a period of active engagement, where energy is available and ready to be directed'}. ${signals.hasFoolOrWorld ? 'The presence of a threshold card — The Fool or The World — marks this as a moment of genuine beginning or completion.' : ''}`.trim(),
    mainTension: signals.elementConflicts.length > 0
      ? `There is an elemental tension between ${signals.elementConflicts.join(' and ')}, suggesting that conflicting currents are running simultaneously beneath the surface. Neither is wrong; both are real.`
      : `The cards carry a ${signals.polarityCount.reversed > 0 ? 'mixed polarity, indicating that some energies are flowing outward while others are turning inward' : 'consistent forward polarity, suggesting that the energies here are aligned in direction if not in nature'}.`,
    direction: `The trajectory suggested here points ${signals.polarityCount.reversed > 1 ? 'inward — toward reflection, integration, and a slowing of outward action' : 'toward visible movement, engagement, and the kind of action that can be observed'}. The ${pos2.label} card holds the clearest indication of what is emerging.`,
    hiddenInfluence: `Beneath what is visible in this spread, ${elementEntries.length > 1 ? `the interplay of ${elementEntries.map(([k]) => k).join(' and ')} elements` : 'an undercurrent'} may be shaping events in ways that are not yet fully apparent. What resists naming often holds the most charge.`,
    advice: `The symbolic field here is not prescriptive. It invites ${signals.polarityCount.reversed > 0 ? 'attending to what is turned inward before pushing outward — the resistance is pointing toward something worth examining' : 'trusting the direction that is already present and acting from that trust rather than from hesitation'}.`,
    psychologicalPattern: `The reading suggests a pattern in which ${majorHeavy ? 'archetypal forces — larger than personal choice or circumstance — are at work. The ego is not the primary actor here; something larger is moving' : 'circumstances and choices are closely linked. The pattern is navigational: responding thoughtfully to the landscape around you rather than attempting to control it'}.`,
    astrologySynthesis: `The elemental distribution in this spread — ${elementEntries.map(([k, v]) => `${v} ${k}`).join(', ')} — speaks to the blend of active energies. This may resonate with or counterpoint your natal chart's dominant element, creating either amplification or useful friction.`,
    timing: `The texture of this reading suggests energy that is ${signals.polarityCount.reversed > 1 ? 'building slowly and not yet ready for outward harvest — this is a season of preparation' : 'actively present and available now — the window for this particular movement is open'}.`,
    reflectionPrompts: [
      `What would it mean to trust the direction suggested by the ${pos2.label} card?`,
      `Where in your life does the tension between ${pos0.label} and ${pos1.label} feel most alive right now?`,
      `What is this reading pointing toward that you have not yet been willing to name?`,
    ],
  }
}

function getElementGradient(element: string | null): string {
  switch (element) {
    case 'Fire':
      return 'radial-gradient(ellipse at top left, rgba(201,120,30,0.05) 0%, transparent 60%)'
    case 'Water':
      return 'radial-gradient(ellipse at top left, rgba(30,100,180,0.05) 0%, transparent 60%)'
    case 'Air':
      return 'radial-gradient(ellipse at top left, rgba(130,80,200,0.04) 0%, transparent 60%)'
    case 'Earth':
      return 'radial-gradient(ellipse at top left, rgba(50,140,80,0.04) 0%, transparent 60%)'
    default:
      return 'none'
  }
}

function CardSlotPill({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div
      className="rounded-full border px-4 py-2 text-center"
      style={{
        minWidth: '132px',
        maxWidth: '100%',
        background: active
          ? 'linear-gradient(180deg, rgba(28,20,12,0.98) 0%, rgba(14,10,8,0.94) 100%)'
          : 'linear-gradient(180deg, rgba(18,18,26,0.94) 0%, rgba(11,11,18,0.92) 100%)',
        borderColor: active ? 'rgba(201,168,76,0.42)' : 'rgba(201,168,76,0.2)',
        boxShadow: active
          ? '0 12px 30px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,240,200,0.08)'
          : '0 8px 18px rgba(0,0,0,0.2)',
      }}
    >
      <p
        className="font-heading leading-none whitespace-nowrap"
        style={{
          fontSize: '1.1rem',
          color: active ? '#d4af58' : 'rgba(220,194,114,0.88)',
          textShadow: '0 1px 10px rgba(0,0,0,0.28)',
        }}
      >
        {label}
      </p>
    </div>
  )
}

function CardPositionCaption({ label }: { label: string }) {
  return (
    <p
      className="text-center font-heading uppercase"
      style={{
        fontSize: '0.7rem',
        letterSpacing: '0.22em',
        color: 'rgba(201,168,76,0.66)',
      }}
    >
      {label}
    </p>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CardRevealProps {
  card: DrawnCard | null
  revealed: boolean
  flipDone: boolean
  isActive: boolean
  isFlashing: boolean
  dimmed: boolean
  onTap: () => void
}

function CardReveal({ card, revealed, flipDone, isActive, isFlashing, dimmed, onTap }: CardRevealProps) {
  const reversalStyle = flipDone && card?.reversed ? 'rotate(180deg)' : ''
  const tarotCard = card ? TAROT_CARD_BY_ID[card.id] : null
  const hasPickedCard = card !== null

  return (
    <>
      <style>{`
        @keyframes tarot-breathe {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.92; }
        }
        @keyframes tarot-ring-pulse {
          0%, 100% { box-shadow: 0 0 0 1px rgba(201,168,76,0.2), inset 0 0 0 1px rgba(201,168,76,0.1); }
          50% { box-shadow: 0 0 0 2px rgba(201,168,76,0.55), inset 0 0 0 1px rgba(201,168,76,0.25); }
        }
      `}</style>
      <div
        role="button"
        aria-label={revealed && card ? card.name : hasPickedCard ? 'Reveal card' : 'Empty card slot'}
        tabIndex={hasPickedCard && isActive && !revealed ? 0 : -1}
        onClick={hasPickedCard && !revealed && isActive ? onTap : undefined}
        onKeyDown={e => { if (hasPickedCard && !revealed && isActive && (e.key === 'Enter' || e.key === ' ')) onTap() }}
        className="relative select-none"
        style={{
          cursor: hasPickedCard && !revealed && isActive ? 'pointer' : 'default',
          perspective: '1200px',
        }}
      >
        {/* Card flip container */}
        <div
          style={{
            width: 'var(--card-w)',
            height: 'var(--card-h)',
            position: 'relative',
            transformStyle: 'preserve-3d',
            transition: 'transform 600ms ease-in-out, opacity 300ms ease-in-out',
            transform: revealed ? 'rotateY(180deg)' : 'scale(0.95)',
            opacity: dimmed && !isFlashing ? 0.75 : 1,
          }}
        >
          {/* Card back */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              borderRadius: '8px',
              background: hasPickedCard ? '#12121a' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isActive && !revealed ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.12)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: !revealed ? `tarot-breathe 3s ease-in-out infinite${isActive ? ', tarot-ring-pulse 2s ease-in-out infinite' : ''}` : 'none',
              overflow: 'hidden',
            }}
          >
            {hasPickedCard ? (
              <CardBack aria-label="Face-down tarot card" />
            ) : (
              <span style={{ color: 'rgba(201,168,76,0.2)', fontSize: '1.5rem' }}>✦</span>
            )}
          </div>

          {/* Card front */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              borderRadius: '8px',
              transform: `rotateY(180deg) ${reversalStyle}`,
              transition: 'transform 600ms ease-in-out',
              overflow: 'hidden',
            }}
          >
            {tarotCard && card ? (
              <TarotCardComponent
                card={tarotCard}
                face="up"
                reversed={card.reversed}
                size="lg"
              />
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}

interface InterpretationPanelProps {
  card: DrawnCard
  interpretation: InstantInterpretation
  positionLabel: string
  positionMeaning: string
  personalDay: number
}

function TarotInterpretationPanel({ card, interpretation, positionLabel, positionMeaning, personalDay }: InterpretationPanelProps) {
  const elementGrad = getElementGradient(card.element)
  const tarotCard = TAROT_CARD_BY_ID[card.id]

  return (
    <div
      className="rounded-xl border border-mystic-border p-6 md:p-8 space-y-5"
      style={{ background: `#12121a`, backgroundImage: elementGrad }}
    >
      <div className="flex flex-col items-center gap-3 pb-2">
        <div
          className="rounded-[28px] p-2"
          style={{
            width: 'fit-content',
            background: 'rgba(255,255,255,0.01)',
            boxShadow: '0 0 0 1px rgba(201,168,76,0.1)',
          }}
        >
          {tarotCard ? (
            <div style={{ width: '160px' }}>
              <TarotCardComponent
                card={tarotCard}
                face="up"
                reversed={card.reversed}
                size="lg"
              />
            </div>
          ) : null}
        </div>
        <CardSlotPill label={card.name} />
      </div>

      {/* 1. Position header */}
      <div>
        <p
          className="text-xs uppercase tracking-[0.2em] font-heading"
          style={{ color: '#c9a84c' }}
        >
          {positionLabel}
        </p>
        <p className="text-mystic-muted text-xs italic mt-1 leading-relaxed">
          {positionMeaning}
        </p>
      </div>

      {/* 2. Card identity */}
      <div className="flex items-start gap-4">
        {card.arcana === 'major' && card.number !== null && (
          <div
            className="font-heading leading-none shrink-0"
            style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', color: '#c9a84c', opacity: 0.85 }}
          >
            {card.number === 0 ? '0' : card.number}
          </div>
        )}
        {card.arcana === 'minor' && card.suit && (
          <div
            className="font-heading leading-none shrink-0"
            style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', color: '#c9a84c', opacity: 0.65 }}
          >
            {card.number !== null ? card.number : ''}
          </div>
        )}
        <div>
          <h3
            className="font-heading text-xl text-mystic-text"
          >
            {card.name}
          </h3>
          {card.reversed && (
            <p className="text-mystic-muted text-xs mt-1">This card arrives turned.</p>
          )}
          {card.element && (
            <p className="text-mystic-muted text-xs mt-1">
              {card.suit ? `${card.suit} · ` : ''}{card.element}
            </p>
          )}
        </div>
      </div>

      {/* 3. Core meaning */}
      <p className="font-heading text-mystic-text/90 leading-relaxed">
        {interpretation.coreMeaning}
      </p>

      {/* 4. Symbolic theme */}
      <p
        className="font-heading text-mystic-gold/80 italic"
        style={{ letterSpacing: '0.05em' }}
      >
        {interpretation.symbolicTheme}
      </p>

      {/* 5. Emotional meaning */}
      <div className="border-t border-mystic-border pt-4">
        <p className="text-mystic-muted text-xs uppercase tracking-widest mb-2">Feeling</p>
        <p className="text-mystic-text/80 text-sm leading-relaxed">{interpretation.emotionalMeaning}</p>
      </div>

      {/* 6. Practical guidance */}
      <div>
        <p className="text-mystic-muted text-xs uppercase tracking-widest mb-2">Consider</p>
        <p className="text-mystic-text/80 text-sm leading-relaxed">{interpretation.practicalGuidance}</p>
      </div>

      {/* 7. In Your Sky Now */}
      <div className="border-t border-mystic-border pt-4">
        <p className="text-mystic-muted text-xs uppercase tracking-widest mb-3">In Your Sky Now</p>
        {interpretation.astroConnection.headline && (
          <p className="font-heading text-mystic-gold/90 italic leading-snug mb-2">
            {interpretation.astroConnection.headline}
          </p>
        )}
        <p className="text-mystic-text/80 text-sm italic leading-relaxed">
          {interpretation.astroConnection.transitInfluence}
        </p>
        {interpretation.astroConnection.lunarPhaseNote && (
          <p className="text-mystic-muted text-sm italic mt-1">{interpretation.astroConnection.lunarPhaseNote}</p>
        )}
        {interpretation.astroConnection.advanceCategoryNote && (
          <p className="text-mystic-muted text-sm italic mt-1">{interpretation.astroConnection.advanceCategoryNote}</p>
        )}
      </div>

      {/* 8. Numerology resonance */}
      {interpretation.cardNumber !== null && (
        <div className="border-t border-mystic-border pt-4">
          <div className="flex items-baseline gap-4">
            <span
              className="font-heading leading-none"
              style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', color: '#c9a84c', opacity: 0.7 }}
            >
              {interpretation.cardNumber}
            </span>
            <div>
              <p className="text-mystic-text/80 text-sm leading-relaxed">{interpretation.numerologyNote}</p>
              {personalDay === interpretation.cardNumber && (
                <p className="text-mystic-gold/70 text-xs mt-1">Your personal day is also a {personalDay}.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 9. Reflection question */}
      <div className="border-t border-mystic-border pt-4">
        <p className="text-mystic-text/70 text-sm italic leading-relaxed pl-4 border-l border-mystic-gold/20">
          — {interpretation.reflectionQuestion}
        </p>
      </div>
    </div>
  )
}

function ThresholdDivider() {
  return (
    <div className="relative flex items-center justify-center my-10">
      <div
        className="absolute inset-x-0 top-1/2"
        style={{ height: '1px', background: 'rgba(201,168,76,0.3)' }}
      />
      <span
        className="relative bg-mystic-bg px-3 font-heading"
        style={{ color: '#c9a84c', fontSize: '1.2rem', zIndex: 1 }}
      >
        ✦
      </span>
    </div>
  )
}

interface SynthesisSectionProps {
  label: string
  text: string
}

function SynthesisSection({ label, text }: SynthesisSectionProps) {
  if (!text) return null
  return (
    <div className="space-y-2">
      <p className="text-mystic-muted text-xs uppercase tracking-[0.2em]">{label}</p>
      <div className="space-y-3">
        {splitReadableParagraphs(text).map((paragraph, index) => (
          <p key={`${label}-${index}`} className="font-heading text-mystic-text/90 leading-relaxed text-sm md:text-base">{paragraph}</p>
        ))}
      </div>
    </div>
  )
}

interface BackConfirmModalProps {
  onBack: () => void
  onStay: () => void
  onSaveAndBack?: () => void
}

function BackConfirmModal({ onBack, onStay, onSaveAndBack }: BackConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onStay} />
      <div className="relative bg-mystic-surface border border-mystic-gold/25 rounded-xl p-8 max-w-sm w-full space-y-5 text-center">
        <p className="font-heading text-mystic-text text-lg">Leave this reading?</p>
        <p className="text-mystic-muted text-sm">The cards and their interpretations will not be saved.</p>
        <div className="flex flex-col gap-2">
          {onSaveAndBack && (
            <button
              onClick={onSaveAndBack}
              className="w-full py-2.5 border border-mystic-gold/40 rounded-lg text-mystic-gold font-heading text-sm hover:bg-mystic-gold/10 transition-colors"
            >
              Save before leaving
            </button>
          )}
          <button
            onClick={onBack}
            className="w-full py-2.5 text-mystic-muted text-sm hover:text-mystic-text transition-colors"
          >
            Yes, go back
          </button>
          <button
            onClick={onStay}
            className="w-full py-2.5 bg-mystic-gold/10 border border-mystic-gold/20 rounded-lg text-mystic-text font-heading text-sm hover:bg-mystic-gold/15 transition-colors"
          >
            Keep reading
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ThreeCardReading({
  spreadMode,
  deckCardIds,
  selectedDeckIndices,
  drawnCards,
  instantInterpretations,
  astroContext,
  userIntention,
  onSave,
  onDiscard,
  onOpenDiscuss,
  onPickCard,
}: ThreeCardReadingProps) {
  const spreadDef = SPREAD_DEFINITIONS[spreadMode]
  const spreadPositions = spreadDef.positions
  const [selectedCount, setSelectedCount] = useState(0)
  const [discussOpen, setDiscussOpen] = useState(false)

  // Per-card reveal state: which cards are flipping / have finished flipping
  const [revealedMask, setRevealedMask] = useState([false, false, false])
  const [flipDoneMask, setFlipDoneMask] = useState([false, false, false])

  // Overall phase
  type RevealPhase =
    | 'idle'
    | 'card-revealed-0'
    | 'card-revealed-1'
    | 'card-revealed-2'
    | 'all-revealed'

  const [phase, setPhase] = useState<RevealPhase>('idle')

  type SynthesisState = 'idle' | 'loading' | 'ready' | 'error-retryable' | 'error-permanent'
  const [synthesisState, setSynthesisState] = useState<SynthesisState>('idle')

  // Synthesis data
  const [synthesisData, setSynthesisData] = useState<ParsedSynthesis | null>(null)
  const [aiFallback, setAiFallback] = useState<ParsedSynthesis | null>(null)

  // Visual effects
  const [overlayOpacity, setOverlayOpacity] = useState(0)
  const [allRevealedFlash, setAllRevealedFlash] = useState(false)

  // Save state
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle')

  // Back confirmation
  const [showBackConfirm, setShowBackConfirm] = useState(false)

  // Synthesis fetch abort controller
  const abortRef = useRef<AbortController | null>(null)

  // Synthesis already started guard (prevents double-fire in StrictMode)
  const synthesisStartedRef = useRef(false)

  const placementComplete = selectedCount === 3 && drawnCards.length === 3

  // Helper: how many cards are currently revealed
  const revealedCount = revealedMask.filter(Boolean).length

  const activePlacementIndex = selectedCount < 3 ? selectedCount : null
  const activeRevealIndex = placementComplete && revealedCount < 3 ? revealedCount : null
  const activeCardIndex = activeRevealIndex

  const triggerRevealOverlay = useCallback(() => {
    setOverlayOpacity(0.25)
    const id = setTimeout(() => setOverlayOpacity(0), 500)
    return () => clearTimeout(id)
  }, [])

  const handleCardTap = useCallback((index: number) => {
    if (index !== activeCardIndex) return

    triggerRevealOverlay()

    // Mark card as flipping
    setRevealedMask(m => m.map((v, j) => (j === index ? true : v)))

    // After flip animation, mark as done (enables reversed tilt)
    const flipTimer = setTimeout(() => {
      setFlipDoneMask(m => m.map((v, j) => (j === index ? true : v)))
    }, 600)

    // Update phase
    if (index === 0) setPhase('card-revealed-0')
    else if (index === 1) setPhase('card-revealed-1')
    else {
      setPhase('card-revealed-2')
      // Auto-transition to all-revealed after interpretation panel fades in
      const revealTimer = setTimeout(() => {
        setPhase('all-revealed')
        setAllRevealedFlash(true)
        const flashTimer = setTimeout(() => setAllRevealedFlash(false), 300)
        return () => clearTimeout(flashTimer)
      }, 400)
      return () => { clearTimeout(flipTimer); clearTimeout(revealTimer) }
    }

    return () => clearTimeout(flipTimer)
  }, [activeCardIndex, triggerRevealOverlay])

  const handleDeckSelect = useCallback((selectionIndex: number) => {
    setSelectedCount(selectionIndex + 1)
  }, [])

  const handleActualDeckSelect = useCallback((selectionIndex: number, deckIndex: number) => {
    onPickCard(deckIndex)
    handleDeckSelect(selectionIndex)
  }, [handleDeckSelect, onPickCard])

  // Fire synthesis as soon as all three cards are placed.
  useEffect(() => {
    if (!placementComplete || synthesisStartedRef.current) return
    synthesisStartedRef.current = true

    const signals = computeSynthesisSignals(drawnCards)
    const fallback = computeAIFreeSynthesis(drawnCards, spreadMode, signals)
    setAiFallback(fallback)

    setSynthesisState('loading')

    const controller = new AbortController()
    abortRef.current = controller

    const suitCounts: Record<string, number> = {}
    for (const c of drawnCards) if (c.suit) suitCounts[c.suit] = (suitCounts[c.suit] ?? 0) + 1
    const topSuit = Object.entries(suitCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null

    const payload: TarotThreeSynthesisPayload = {
      cards: drawnCards.map((card, i) => {
        const interp = instantInterpretations[i]
        return {
          id: card.id,
          name: card.name,
          arcana: card.arcana,
          suit: card.suit ?? undefined,
          number: card.number ?? 0,
          element: card.element,
          reversed: card.reversed,
          coreMeaning: interp?.coreMeaning ?? '',
          symbolicTheme: interp?.symbolicTheme ?? '',
          emotionalMeaning: interp?.emotionalMeaning ?? '',
          practicalGuidance: interp?.practicalGuidance ?? '',
          reflectionQuestion: interp?.reflectionQuestion ?? '',
          numerologyResonance: interp?.numerologyNote ?? '',
          astroHeadline: interp?.astroConnection.headline ?? '',
          transitInfluence: interp?.astroConnection.transitInfluence ?? '',
          lunarPhaseNote: interp?.astroConnection.lunarPhaseNote ?? null,
        } satisfies TarotCardPayload
      }) as [TarotCardPayload, TarotCardPayload, TarotCardPayload],
      positions: spreadPositions.map((pos, i) => ({
        index: i,
        label: pos.label,
        meaning: pos.meaning,
      })) as [SpreadPositionPayload, SpreadPositionPayload, SpreadPositionPayload],
      spreadMode,
      signals: (() => {
        const card0 = drawnCards[0]
        const card1 = drawnCards[1]
        const card2 = drawnCards[2]

        // Pair 1+2 dignity
        const dignity12 = clientComputeElementalDignity(card0?.element, card1?.element)
        const desc12 = clientDescribeElementalDignity(
          card0?.name ?? '', card0?.element ?? null,
          card1?.name ?? '', card1?.element ?? null,
          dignity12,
        )
        const court12 = card0 && card1 && clientIsCourtCard(card0.name, card0.arcana) && clientIsCourtCard(card1.name, card1.arcana)
          ? clientDescribeCourtPairDynamic(card0.name, card0.element ?? null, card1.name, card1.element ?? null)
          : null
        const mm12 = card0 && card1 && card0.arcana !== card1.arcana
          ? clientDescribeMajorMinorAsymmetry(card0.name, card0.arcana, card0.suit ?? undefined, card1.name, card1.arcana, card1.suit ?? undefined)
          : null

        // Pair 2+3 dignity
        const dignity23 = clientComputeElementalDignity(card1?.element, card2?.element)
        const desc23 = clientDescribeElementalDignity(
          card1?.name ?? '', card1?.element ?? null,
          card2?.name ?? '', card2?.element ?? null,
          dignity23,
        )

        const allMajorArcana = drawnCards.every(c => c.arcana === 'major')

        return {
          dominantArcana: signals.dominantArcana === 'mixed' ? 'balanced' : signals.dominantArcana,
          majorArcanaCount: drawnCards.filter(c => c.arcana === 'major').length,
          elementDistribution: signals.elementDistribution,
          polarityCount: signals.polarityCount,
          hasFoolOrWorld: signals.hasFoolOrWorld,
          dominantSuit: topSuit,
          numeralProgression: clientComputeNumeralProgression(drawnCards.map(c => ({ number: c.number }))),
          pairDignity12: {
            dignity: dignity12,
            description: desc12,
            courtDynamic: court12,
            majorMinorAsymmetry: mm12,
          },
          pairDignity23: {
            dignity: dignity23,
            description: desc23,
          },
          allMajorArcana,
        }
      })(),
      userIntention,
      natalSunSign: astroContext.sunSign,
      natalMoonSign: astroContext.moonSignNatal,
      natalAscSign: astroContext.ascendant,
      personalDay: astroContext.personalDay,
      personalYear: astroContext.personalYear,
      advanceCategory: astroContext.advanceCategory,
      advanceReason: astroContext.advanceReason,
      moonPhaseName: astroContext.moonPhase,
      moonSign: astroContext.moonSign,
      dailyTransitSummary: astroContext.dailyTransitSummary,
      weeklyTransitSummary: astroContext.weeklyTransitSummary,
      localDate: new Date().toISOString().split('T')[0],
    }

    const minDelay = new Promise<void>(r => setTimeout(r, 2000))

    Promise.all([getTarotThreeSynthesis(payload), minDelay])
      .then(([text]) => {
        if (controller.signal.aborted) return
        setSynthesisData(parseSynthesisText(text as string))
        setSynthesisState('ready')
      })
      .catch(err => {
        if (controller.signal.aborted) return
        const retryable = !(err instanceof RateLimitError) && !String(err).includes('400')
        setSynthesisState(retryable ? 'error-retryable' : 'error-permanent')
      })
  }, [astroContext, drawnCards, instantInterpretations, placementComplete, spreadMode, spreadPositions, userIntention])

  // Cleanup abort on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const handleRetry = useCallback(() => {
    synthesisStartedRef.current = false
    setSynthesisData(null)
    setSynthesisState('idle')
  }, [])

  const handleSave = useCallback(() => {
    setSaveState('saved')
    onSave()
  }, [onSave])

  const handleBackRequest = useCallback(() => {
    setShowBackConfirm(true)
  }, [])

  const handleBackConfirmed = useCallback(() => {
    abortRef.current?.abort()
    onDiscard()
  }, [onDiscard])

  const handleSaveAndBack = useCallback(() => {
    onSave()
    abortRef.current?.abort()
    onDiscard()
  }, [onSave, onDiscard])

  // Determine if synthesis zone should be visible
  const showSynthesisZone = phase === 'all-revealed' && synthesisState !== 'idle'

  // Determine if save/discuss buttons should be shown
  const showActions = synthesisState === 'ready' || synthesisState === 'error-retryable' || synthesisState === 'error-permanent'

  // Active synthesis data: GPT result or AI fallback
  const activeSynthesis = synthesisData ?? aiFallback
  const discussContext = [
    `THREE CARD TAROT READING (${spreadPositions.map(position => position.label).join(' / ')})`,
    userIntention ? `Intention: ${userIntention}` : 'Intention: Open reading',
    ...drawnCards.map((card, index) => {
      const interpretation = instantInterpretations[index]
      const position = spreadPositions[index]
      return `${index + 1}. ${position.label}: ${card.name} (${card.reversed ? 'Reversed' : 'Upright'})\nCore: ${interpretation?.coreMeaning ?? ''}\nTheme: ${interpretation?.symbolicTheme ?? ''}\nGuidance: ${interpretation?.practicalGuidance ?? ''}`
    }),
    activeSynthesis ? `Synthesis: ${activeSynthesis.mainTheme || activeSynthesis.openingSentence}` : 'Synthesis: Not loaded yet',
  ].join('\n\n')

  // Show "save before leaving" only when synthesis is complete
  const canSaveBeforeLeaving = showActions && saveState !== 'saved'

  const activePosition = activePlacementIndex !== null
    ? spreadPositions[activePlacementIndex]
    : activeRevealIndex !== null
      ? spreadPositions[activeRevealIndex]
      : null
  const activeInstruction = activePlacementIndex !== null
    ? `Pick a card for ${activePosition?.label}.`
    : activeRevealIndex !== null
      ? `Click ${activePosition?.label} to reveal it.`
      : 'All three cards are placed. Reveal them one by one.'

  return (
    <>
      <style>{`
        @keyframes tarot-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tarot-fade-in {
          animation: tarot-fade-in 400ms ease-in forwards;
        }
      `}</style>

      {/* Screen-level overlay for between-reveal transition */}
      {overlayOpacity > 0 && (
        <div
          className="fixed inset-0 bg-black pointer-events-none z-30"
          style={{ opacity: overlayOpacity, transition: 'opacity 250ms ease-in-out' }}
        />
      )}

      {/* Back confirmation modal */}
      {showBackConfirm && (
        <BackConfirmModal
          onBack={handleBackConfirmed}
          onStay={() => setShowBackConfirm(false)}
          onSaveAndBack={canSaveBeforeLeaving ? handleSaveAndBack : undefined}
        />
      )}

      <div className="w-full max-w-2xl mx-auto px-4 pb-20">
        {/* Back button */}
        <button
          type="button"
          onClick={handleBackRequest}
          className="mt-6 mb-4 text-mystic-muted hover:text-mystic-gold transition-colors text-sm font-heading"
        >
          ← Back
        </button>

        {/* Persistent intention anchor — visible from deck selection through synthesis (spec 15) */}
        {userIntention && (
          <div
            className="w-full max-w-xl mb-3 px-4 py-2 text-center rounded-xl"
            style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}
          >
            <p className="text-mystic-gold/70 text-xs italic leading-relaxed truncate" title={userIntention}>
              &ldquo;{userIntention}&rdquo;
            </p>
          </div>
        )}

        {selectedCount < 3 && (
          <TarotDeckSelection
            deckCardIds={deckCardIds}
            selectedDeckIndices={selectedDeckIndices}
            completedSelections={selectedCount}
            labels={spreadPositions.map(position => position.label)}
            onSelect={handleActualDeckSelect}
            disabled={activePlacementIndex === null}
          />
        )}

        <div className="pb-4 pt-3 flex flex-col items-center">
          {phase !== 'all-revealed' && (
            <div className="w-full max-w-xl mb-4 rounded-2xl border border-mystic-gold/20 px-4 py-4 text-center" style={{ background: 'rgba(18,18,26,0.9)' }}>
              <p className="text-mystic-muted text-xs uppercase tracking-[0.24em] mb-2">
                {spreadDef.positions.map((p: SpreadPosition) => p.label).join(' · ')}
              </p>
              <p className="font-heading text-mystic-gold text-lg mb-2">{activeInstruction}</p>
              {activePosition && (
                <p className="text-mystic-text/70 text-sm italic leading-relaxed max-w-prose mx-auto">
                  {activePosition.meaning}
                </p>
              )}
            </div>
          )}

          {/* Cards */}
          <div
            className="flex gap-4 md:gap-6 lg:gap-8"
            style={
              {
                '--card-w': 'clamp(112px, 23vw, 150px)',
                '--card-h': 'clamp(196px, 40vw, 262px)',
              } as React.CSSProperties
            }
          >
            {Array.from({ length: 3 }, (_, i) => drawnCards[i] ?? null).map((card, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div
                  className="rounded-2xl p-2 transition-all duration-300"
                  style={{
                    boxShadow: i === activePlacementIndex || i === activeRevealIndex
                      ? '0 0 0 1px rgba(201,168,76,0.42), 0 0 28px rgba(201,168,76,0.16)'
                      : '0 0 0 1px rgba(201,168,76,0.08)',
                    background: i === activePlacementIndex || i === activeRevealIndex
                      ? 'rgba(201,168,76,0.08)'
                      : 'rgba(255,255,255,0.01)',
                  }}
                >
                  <CardReveal
                    card={card}
                    revealed={revealedMask[i] && card !== null}
                    flipDone={flipDoneMask[i] && card !== null}
                    isActive={i === activeCardIndex}
                    isFlashing={allRevealedFlash}
                    dimmed={!revealedMask[i] && (selectedCount === 0 || i !== activeCardIndex)}
                    onTap={() => handleCardTap(i)}
                  />
                </div>
                {revealedMask[i] && card ? (
                  <div className="flex flex-col items-center gap-1">
                    <CardSlotPill
                      label={card.name}
                      active={i === activePlacementIndex || i === activeRevealIndex}
                    />
                    <CardPositionCaption label={spreadPositions[i].label} />
                  </div>
                ) : (
                  <CardSlotPill
                    label={spreadPositions[i].label}
                    active={i === activePlacementIndex || i === activeRevealIndex}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Interpretation panels ────────────────────────────────────────── */}
        <div className="mt-8 space-y-6">
          {Array.from({ length: 3 }, (_, i) => drawnCards[i] ?? null).map((card, i) => {
            const interp = instantInterpretations[i]
            if (!flipDoneMask[i] || card === null) return null

            if (!interp?.coreMeaning) {
              return (
                <div key={i} className="tarot-fade-in rounded-xl border border-mystic-border p-6">
                  <p className="text-mystic-muted text-sm italic text-center">
                    The interpretation for this card is resting. Try returning to this reading.
                  </p>
                </div>
              )
            }

            return (
              <div key={i} className="tarot-fade-in">
                <TarotInterpretationPanel
                  card={card}
                  interpretation={interp}
                  positionLabel={spreadPositions[i].label}
                  positionMeaning={spreadPositions[i].meaning}
                  personalDay={astroContext.personalDay}
                />
              </div>
            )
          })}
        </div>

        {/* ── Synthesis zone ───────────────────────────────────────────────── */}
        {showSynthesisZone && (
          <div className="tarot-fade-in">
            <ThresholdDivider />

            {/* Loading state */}
            {synthesisState === 'loading' && (
              <div className="space-y-6">
                <p
                  className="font-heading italic text-center text-lg text-mystic-text/80"
                  style={{ marginBottom: '1.5rem' }}
                >
                  The cards are being read as a whole.
                </p>
                <GptSkeleton accentColor="gold" lines={8} />
              </div>
            )}

            {/* Error — retryable */}
            {synthesisState === 'error-retryable' && (
              <div className="text-center space-y-3 py-6">
                {aiFallback && <SynthesisContent synthesis={aiFallback} />}
                <div className="border-t border-mystic-border pt-6 space-y-2">
                  <p className="text-mystic-muted text-sm">
                    The synthesis is resting. The instant interpretations above are complete.
                  </p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="text-mystic-gold text-sm font-heading hover:text-mystic-gold/80 transition-colors"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {/* Error — permanent */}
            {synthesisState === 'error-permanent' && aiFallback && (
              <SynthesisContent synthesis={aiFallback} />
            )}

            {/* Ready */}
            {synthesisState === 'ready' && activeSynthesis && (
              <SynthesisContent synthesis={activeSynthesis} />
            )}

            {/* Action buttons */}
            {showActions && (
              <div className="mt-10 flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    onOpenDiscuss()
                    setDiscussOpen(true)
                  }}
                  className="px-8 py-3 border border-mystic-gold/40 rounded-xl font-heading text-mystic-gold hover:bg-mystic-gold/10 transition-colors text-sm"
                >
                  Discuss ✦
                </button>

                {saveState === 'idle' && (
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-6 py-2 border border-mystic-border rounded-lg text-mystic-muted hover:text-mystic-text hover:border-mystic-gold/20 transition-colors text-xs font-heading"
                  >
                    Save Reading
                  </button>
                )}
                {saveState === 'saved' && (
                  <p className="text-mystic-gold/70 text-xs font-heading">Saved ✓</p>
                )}
                {saveState === 'error' && (
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-red-400/80 text-xs">Could not save. Try again.</p>
                    <button
                      type="button"
                      onClick={() => { setSaveState('idle') }}
                      className="text-mystic-muted text-xs hover:text-mystic-text transition-colors"
                    >
                      Retry save
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <TarotDiscussPanel
        isOpen={discussOpen}
        onClose={() => setDiscussOpen(false)}
        contextString={discussContext}
        userIntention={userIntention}
      />
    </>
  )
}

// ─── Synthesis content renderer ───────────────────────────────────────────────

function SynthesisContent({ synthesis }: { synthesis: ParsedSynthesis }) {
  return (
    <div className="space-y-8">
      {/* Opening constellation sentence */}
      {synthesis.openingSentence && (
        <p
          className="font-heading italic text-center text-lg text-mystic-text/90 leading-relaxed"
          style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)' }}
        >
          {synthesis.openingSentence}
        </p>
      )}

      <div className="space-y-6 max-w-prose mx-auto">
        <SynthesisSection label="Main Theme" text={synthesis.mainTheme} />
        <SynthesisSection label="Tension" text={synthesis.mainTension} />
        <SynthesisSection label="Direction" text={synthesis.direction} />
        <SynthesisSection label="Hidden Influence" text={synthesis.hiddenInfluence} />
        <SynthesisSection label="Advice" text={synthesis.advice} />
        <SynthesisSection label="Psychological Pattern" text={synthesis.psychologicalPattern} />
        <SynthesisSection label="Astrology Synthesis" text={synthesis.astrologySynthesis} />
        <SynthesisSection label="Timing" text={synthesis.timing} />
      </div>

      {/* Reflection prompts */}
      {synthesis.reflectionPrompts.length > 0 && (
        <div className="space-y-3 max-w-prose mx-auto border-t border-mystic-border pt-6">
          <p className="text-mystic-muted text-xs uppercase tracking-[0.2em]">Reflect</p>
          {synthesis.reflectionPrompts.map((q, i) => (
            <p key={i} className="text-mystic-text/70 text-sm italic leading-relaxed pl-4 border-l border-mystic-gold/20">
              — {q}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
