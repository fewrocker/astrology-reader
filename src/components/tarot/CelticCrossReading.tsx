
import { useState, useEffect, useCallback, useRef } from 'react'
import type { TarotCard as DataTarotCard } from '../../data/tarot/types'
import type {
  SynthesisChapter,
  CelticCrossPrecomputedSignals,
} from './types'
import type { DrawnCard, InstantInterpretation, TarotAstroContext } from '../../engine/tarot'
import { computeInstantInterpretation } from '../../engine/tarot'
import { CELTIC_CROSS_POSITIONS } from '../../data/tarot/spreadPositions'
import { getTarotCelticSynthesis, RateLimitError } from '../../services/gptInterpretation'
import type { SaveReadingRequest } from '../../services/readingsService'
import type { TarotCelticSynthesisPayload } from '../../services/gptInterpretation'
import CelticCrossCard from './CelticCrossCard'
import TarotSynthesisPanel from './TarotSynthesisPanel'
import TarotDiscussPanel from './TarotDiscussPanel'
import TarotDeckSelection from './TarotDeckSelection'
import { shuffleTarotDeck, computeCardReversal } from './tarotUtils'

// ─── Props ───────────────────────────────────────────────────────────────────

interface CelticCrossReadingProps {
  userIntention: string | null
  tarotAstroContext: TarotAstroContext
  dailyTransitSummary: string
  weeklyTransitSummary: string
  moonSign: string
  onSave: (payload: SaveReadingRequest) => Promise<void>
  onDiscard: () => void
}

// ─── State machine phase ──────────────────────────────────────────────────────
// Phases progress linearly; synthesis fires concurrently during staff reveal.
type Phase =
  | 'dealing'            // dealing animation (1.2 s), all face-down
  | 'drawing'            // user picks all 10 cards from the deck into positions
  | 'awaiting-12'        // waiting for user to flip positions 1+2 together
  | 'holding'            // mandatory 3-second contemplation hold
  | 'continuing'         // hold complete — faint Continue affordance shown
  | 'cross-staff-transition'   // boundary text between cross and staff
  | 'final-pause'        // 2-second silence after card 10
  | 'constellation-text' // full-screen overlay "read as constellation"
  | 'synthesis'          // chapters arriving sequentially
  | 'complete'           // reading done, Save/Discard visible

type SynthesisStatus = 'idle' | 'loading' | 'ready' | 'error'
type SynthesisErrorKind = 'unavailable' | 'rate-limited' | 'timeout' | 'session-expired'

// ─── Structural signals ───────────────────────────────────────────────────────
function computeCelticCrossSignals(cards: DrawnCard[]): CelticCrossPrecomputedSignals {
  const elementDist: Record<string, number> = {}
  const suitDist: Record<string, number> = {}
  const numerology: Record<number, number> = {}
  let majorCount = 0, reversalCount = 0
  let foolPos: number | null = null, worldPos: number | null = null

  cards.forEach((dc, i) => {
    const c = dc.card
    if (c.arcana === 'major') majorCount++
    if (dc.reversed) reversalCount++
    if (c.element) elementDist[c.element] = (elementDist[c.element] ?? 0) + 1
    if (c.suit) suitDist[c.suit] = (suitDist[c.suit] ?? 0) + 1
    numerology[c.number] = (numerology[c.number] ?? 0) + 1
    if (c.id === 'the-fool') foolPos = i + 1
    if (c.id === 'the-world') worldPos = i + 1
  })

  const dominantElement = Object.entries(elementDist).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const repeatingNumerology = Object.entries(numerology).filter(([, v]) => v > 1).map(([k]) => Number(k))

  return {
    majorArcanaCount: majorCount,
    minorArcanaCount: cards.length - majorCount,
    dominantElement,
    elementDistribution: elementDist,
    reversalCount,
    hasFoolOrWorld: foolPos !== null || worldPos !== null,
    foolPosition: foolPos,
    worldPosition: worldPos,
    repeatingNumerology,
    suitDistribution: suitDist,
  }
}

// ─── Build synthesis payload ──────────────────────────────────────────────────
function buildCelticSynthesisPayload(
  cards: DrawnCard[],
  astroContext: TarotAstroContext,
  userIntention: string | null,
  dailyTransitSummary: string,
  weeklyTransitSummary: string,
  moonSign: string,
): TarotCelticSynthesisPayload {
  const localDate = new Date().toISOString().slice(0, 10)
  return {
    cards: cards.map((dc, i) => ({
      id: dc.card.id,
      name: dc.card.name,
      arcana: dc.card.arcana,
      suit: dc.card.suit,
      number: dc.card.number,
      element: dc.card.element,
      reversed: dc.reversed,
      coreMeaning: dc.interpretation.coreMeaning,
      symbolicTheme: dc.interpretation.symbolicTheme,
      emotionalMeaning: dc.interpretation.emotionalMeaning,
      practicalGuidance: dc.interpretation.practicalGuidance,
      reflectionQuestion: dc.interpretation.reflectionQuestion,
      numerologyResonance: dc.interpretation.numerologyNote,
      astroHeadline: dc.interpretation.astroConnection.astroHeadline,
      transitInfluence: dc.interpretation.astroConnection.transitInfluence,
      lunarPhaseNote: dc.interpretation.astroConnection.lunarPhaseNote || null,
    })),
    positions: CELTIC_CROSS_POSITIONS.map((pos, i) => ({
      index: i,
      label: pos.name,
      meaning: pos.description,
    })),
    userIntention,
    natalSunSign: astroContext.natalSunSign ?? '',
    natalMoonSign: astroContext.natalMoonSign ?? '',
    natalAscSign: astroContext.natalAscendantSign ?? '',
    natalDominantModality: astroContext.natalDominantModality,
    natalMoonPhase: astroContext.lunarPhaseName,
    natalMoonHouse: astroContext.natalMoonHouse,
    natalVenusHouse: astroContext.natalVenusHouse,
    natalNorthNodeHouse: astroContext.natalNorthNodeHouse,
    natalMarsHouse: astroContext.natalMarsHouse,
    personalDay: astroContext.personalDay,
    personalYear: 0,
    lifePathNumber: 0,
    advanceCategory: astroContext.advanceCategory,
    advanceReason: astroContext.advanceReason,
    moonPhaseName: astroContext.lunarPhaseName ?? '',
    moonSign,
    dailyTransitSummary,
    weeklyTransitSummary,
    localDate,
  }
}

// ─── Build discuss context string ─────────────────────────────────────────────
function buildDiscussContext(
  cards: DrawnCard[],
  astroContext: TarotAstroContext,
  userIntention: string | null,
  synthesisChapters: SynthesisChapter[],
): string {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  let ctx = `User intention: ${userIntention ?? 'Not stated'}\n\n`
  ctx += `CELTIC CROSS READING — ${date}\n`
  ctx += `Natal: ${astroContext.natalSunSign ?? ''}, ${astroContext.natalMoonSign ?? ''}, ${astroContext.natalAscendantSign ?? ''} | Moon: ${astroContext.lunarPhaseName ?? ''} | Personal Day: ${astroContext.personalDay}\n`
  ctx += astroContext.advanceCategory ? `Advance category: ${astroContext.advanceCategory}\n` : ''
  ctx += '\nPOSITIONS AND CARDS:\n'
  cards.forEach((dc, i) => {
    ctx += `${i + 1}. ${CELTIC_CROSS_POSITIONS[i].name} — ${dc.card.name} (${dc.reversed ? 'Reversed' : 'Upright'})\n`
    ctx += `   ${dc.interpretation.coreMeaning} | ${dc.interpretation.astroConnection.astroHeadline}\n`
  })
  const signals = computeCelticCrossSignals(cards)
  ctx += `\nPRE-SYNTHESIS SIGNALS:\n`
  ctx += `Major Arcana: ${signals.majorArcanaCount}/10 | Dominant element: ${signals.dominantElement ?? 'None'} | Reversals: ${signals.reversalCount}\n`
  if (synthesisChapters.length > 0) {
    ctx += '\nAI SYNTHESIS:\n'
    ctx += synthesisChapters.map(c => `${c.heading}\n${c.body}`).join('\n\n')
  }
  return ctx
}

// ─── AI-free reading fallback ──────────────────────────────────────────────────
function AiFreeReadingSummary({ cards }: { cards: DrawnCard[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {cards.map((dc, i) => (
        <div key={i} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(201,168,76,0.12)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', marginBottom: '0.4rem' }}>
            <span className="font-heading" style={{ color: '#c9a84c', fontSize: '0.875rem' }}>
              {CELTIC_CROSS_POSITIONS[i].name}
            </span>
            <span style={{ color: 'rgba(201,168,76,0.55)', fontSize: '0.8rem' }}>—</span>
            <span style={{ color: 'rgba(232,230,227,0.8)', fontSize: '0.875rem' }}>
              {dc.card.name} {dc.reversed ? '(Reversed)' : '(Upright)'}
            </span>
          </div>
          <p style={{ color: 'rgba(232,230,227,0.7)', fontSize: '0.85rem', lineHeight: 1.65, margin: 0 }}>{dc.interpretation.coreMeaning}</p>
          <p style={{ color: 'rgba(201,168,76,0.55)', fontSize: '0.8rem', marginTop: '0.35rem', fontStyle: 'italic' }}>{dc.interpretation.emotionalMeaning}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Cross-to-staff transition overlay ────────────────────────────────────────
function CrossStaffTransition({ visible }: { visible: boolean }) {
  return (
    <div
      aria-live="assertive"
      aria-atomic="true"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <p
        className="font-heading"
        style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: '1.125rem',
          fontStyle: 'italic',
          textAlign: 'center',
          maxWidth: '480px',
          padding: '0 2rem',
        }}
      >
        The cross has spoken. The staff now tells you where you are going.
      </p>
    </div>
  )
}

// ─── Constellation overlay ────────────────────────────────────────────────────
function ConstellationOverlay({ visible }: { visible: boolean }) {
  return (
    <div
      aria-live="assertive"
      aria-atomic="true"
      role="status"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.8s ease-out',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <p
        className="font-heading"
        style={{
          color: 'rgba(255,255,255,0.92)',
          fontSize: '1.375rem',
          fontStyle: 'italic',
          textAlign: 'center',
          maxWidth: '520px',
          padding: '0 2rem',
          lineHeight: 1.5,
        }}
      >
        The cards are now being read as a constellation.
      </p>
    </div>
  )
}

// ─── Error panel ─────────────────────────────────────────────────────────────
interface ErrorPanelProps {
  kind: SynthesisErrorKind
  cards: DrawnCard[]
  onRetry: () => void
  onShowIndividual: () => void
}
function ErrorPanel({ kind, cards, onRetry, onShowIndividual }: ErrorPanelProps) {
  if (kind === 'rate-limited') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
        <p className="font-heading" style={{ color: '#c9a84c', fontSize: '1.1rem', marginBottom: '0.75rem', fontStyle: 'italic' }}>
          You've drawn the full cross. The synthesis is an Advanced feature.
        </p>
        <p style={{ color: 'rgba(232,230,227,0.65)', fontSize: '0.875rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          Upgrade to Advanced to receive the full constellation synthesis — all eight sections, the complete astrological resonance, and the reflection prompts.
        </p>
        <button type="button" onClick={onShowIndividual} style={linkBtnStyle}>
          Read cards individually
        </button>
      </div>
    )
  }

  if (kind === 'session-expired') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
        <p className="font-heading" style={{ color: '#c9a84c', fontSize: '1.1rem', marginBottom: '0.75rem', fontStyle: 'italic' }}>
          Your session has ended. Your cards are preserved — tap to reconnect.
        </p>
        <button type="button" onClick={onRetry} style={primaryBtnStyle}>
          Reconnect
        </button>
      </div>
    )
  }

  // unavailable or timeout
  return (
    <div style={{ padding: '2rem 1.5rem' }}>
      <p className="font-heading" style={{ color: '#c9a84c', fontSize: '1.1rem', marginBottom: '0.5rem', fontStyle: 'italic', textAlign: 'center' }}>
        The synthesis is resting.
      </p>
      <p style={{ color: 'rgba(232,230,227,0.65)', fontSize: '0.875rem', lineHeight: 1.7, textAlign: 'center', marginBottom: '1.25rem' }}>
        The ten cards have been read and their individual interpretations are complete. The constellation synthesis requires a connection to the sky — and the sky is briefly unavailable.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <button type="button" onClick={onRetry} style={primaryBtnStyle}>Retry</button>
        <button type="button" onClick={onShowIndividual} style={outlineBtnStyle}>Read cards individually</button>
      </div>
      <AiFreeReadingSummary cards={cards} />
    </div>
  )
}

// ─── Button style constants ───────────────────────────────────────────────────
const primaryBtnStyle: React.CSSProperties = {
  background: '#c9a84c',
  color: '#0f0b05',
  border: 'none',
  borderRadius: '8px',
  padding: '0.65rem 1.5rem',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  cursor: 'pointer',
}
const outlineBtnStyle: React.CSSProperties = {
  background: 'transparent',
  color: 'rgba(201,168,76,0.7)',
  border: '1px solid rgba(201,168,76,0.3)',
  borderRadius: '8px',
  padding: '0.65rem 1.5rem',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  cursor: 'pointer',
}
const linkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'rgba(201,168,76,0.6)',
  fontSize: '0.875rem',
  cursor: 'pointer',
  textDecoration: 'underline',
  fontFamily: 'inherit',
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CelticCrossReading({
  userIntention,
  tarotAstroContext,
  dailyTransitSummary,
  weeklyTransitSummary,
  moonSign,
  onSave,
  onDiscard,
}: CelticCrossReadingProps) {
  const [deck] = useState<DataTarotCard[]>(() => shuffleTarotDeck())

  // ── Card data (determined at mount, revealed progressively) ───────────────
  const [selectedDeckIndices, setSelectedDeckIndices] = useState<number[]>([])
  // Single source of truth: engine DrawnCard (card + reversed + interpretation)
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([])

  // ── State machine ─────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('dealing')
  const [activePosition, setActivePosition] = useState<number>(2)  // 1-indexed, current position in hold/continue cycle
  const [revealedPositions, setRevealedPositions] = useState<Set<number>>(new Set())
  const [selectedCount, setSelectedCount] = useState(0)
  const holdStartRef = useRef<number>(0)

  // ── Synthesis ─────────────────────────────────────────────────────────────
  const [synthesisStatus, setSynthesisStatus] = useState<SynthesisStatus>('idle')
  const [synthesisChapters, setSynthesisChapters] = useState<SynthesisChapter[]>([])
  const [synthesisError, setSynthesisError] = useState<SynthesisErrorKind | null>(null)
  const [chaptersDisplayed, setChaptersDisplayed] = useState(0)
  const [showAiFree, setShowAiFree] = useState(false)
  const synthesisFireRef = useRef(false)
  const synthesisStartTimeRef = useRef<number>(0)

  // ── Background temperature ────────────────────────────────────────────────
  const [bgTemp, setBgTemp] = useState<'neutral' | 'warm' | 'cool'>('neutral')

  // ── Constellation overlay ─────────────────────────────────────────────────
  const [constellationVisible, setConstellationVisible] = useState(false)

  // ── Cross-staff transition overlay ────────────────────────────────────────
  const [transitionVisible, setTransitionVisible] = useState(false)

  // ── Save state ────────────────────────────────────────────────────────────
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // ── Discuss ───────────────────────────────────────────────────────────────
  const [discussOpen, setDiscussOpen] = useState(false)

  // ── Accessibility: live region ref ────────────────────────────────────────
  const [liveMessage, setLiveMessage] = useState('')

  // ── Screen-size detection for mobile layout ───────────────────────────────
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // ─── Phase transitions ──────────────────────────────────────────────────

  // dealing → drawing after dealing animation
  useEffect(() => {
    if (phase !== 'dealing') return
    const t = setTimeout(() => setPhase('drawing'), 1200)
    return () => clearTimeout(t)
  }, [phase])

  // 3-second mandatory hold enforcement
  useEffect(() => {
    if (phase !== 'holding') return
    holdStartRef.current = Date.now()
    const interval = setInterval(() => {
      if (Date.now() - holdStartRef.current >= 3000) {
        clearInterval(interval)
        setPhase('continuing')
      }
    }, 100)
    return () => clearInterval(interval)
  }, [phase, activePosition])

  // cross-staff-transition timing + GPT fire
  useEffect(() => {
    if (phase !== 'cross-staff-transition') return
    setTransitionVisible(true)
    // Fire synthesis early while transition text is showing
    fireEarlySynthesis()
    // Show text for 2200ms then fade (600ms)
    const showTimer = setTimeout(() => setTransitionVisible(false), 2200)
    // After text fades, move to staff phase (position 7)
    const advanceTimer = setTimeout(() => {
      setActivePosition(7)
      reveal(7)
      setPhase('holding')
    }, 2800)
    return () => { clearTimeout(showTimer); clearTimeout(advanceTimer) }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // final-pause → constellation-text after 2 seconds
  useEffect(() => {
    if (phase !== 'final-pause') return
    const t = setTimeout(() => {
      setConstellationVisible(true)
      setPhase('constellation-text')
    }, 2000)
    return () => clearTimeout(t)
  }, [phase])

  // Auto-advance to final-pause after card 10 is revealed (no card to tap as next).
  useEffect(() => {
    if (phase !== 'continuing' || activePosition !== 10) return
    const t = setTimeout(() => setPhase('final-pause'), 4000)
    return () => clearTimeout(t)
  }, [phase, activePosition])

  // constellation-text: show for 2800ms, fade 800ms, then show synthesis
  useEffect(() => {
    if (phase !== 'constellation-text') return
    // Check for synthesis timeout (90 seconds total budget)
    const age = Date.now() - synthesisStartTimeRef.current
    if (synthesisStatus === 'loading' && age > 90_000) {
      setSynthesisError('timeout')
      setSynthesisStatus('error')
    }
    const fadeTimer = setTimeout(() => setConstellationVisible(false), 2800)
    const advanceTimer = setTimeout(() => setPhase('synthesis'), 3600)
    return () => { clearTimeout(fadeTimer); clearTimeout(advanceTimer) }
  }, [phase, synthesisStatus])

  // Chapter-by-chapter reveal after entering synthesis phase
  useEffect(() => {
    if (phase !== 'synthesis') return
    if (synthesisStatus !== 'ready' || synthesisChapters.length === 0) return
    if (chaptersDisplayed >= synthesisChapters.length) {
      setPhase('complete')
      return
    }
    // Immediately show first chapter, then 1200ms between each subsequent one
    const delay = chaptersDisplayed === 0 ? 0 : 1200
    const t = setTimeout(() => setChaptersDisplayed(n => n + 1), delay)
    return () => clearTimeout(t)
  }, [phase, synthesisStatus, synthesisChapters.length, chaptersDisplayed])

  // ─── Synthesis fire (early, at card-7 onset) ───────────────────────────────
  const fireEarlySynthesis = useCallback(async () => {
    if (synthesisFireRef.current) return
    synthesisFireRef.current = true
    synthesisStartTimeRef.current = Date.now()
    setSynthesisStatus('loading')

    try {
      const payload = buildCelticSynthesisPayload(drawnCards, tarotAstroContext, userIntention, dailyTransitSummary, weeklyTransitSummary, moonSign)
      const chapters = await getTarotCelticSynthesis(payload)
      setSynthesisChapters(chapters)
      setSynthesisStatus('ready')
      // Chapters are held until constellation-text phase finishes
    } catch (err) {
      if (err instanceof RateLimitError) {
        setSynthesisError('rate-limited')
      } else if (err instanceof Error) {
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          setSynthesisError('session-expired')
        } else if (err.message.includes('timeout') || err.message.includes('TIMEOUT')) {
          setSynthesisError('timeout')
        } else {
          setSynthesisError('unavailable')
        }
      } else {
        setSynthesisError('unavailable')
      }
      setSynthesisStatus('error')
    }
  }, [drawnCards, tarotAstroContext, userIntention, dailyTransitSummary, weeklyTransitSummary, moonSign])

  const retrySynthesis = useCallback(() => {
    synthesisFireRef.current = false
    setSynthesisError(null)
    setSynthesisStatus('idle')
    setChaptersDisplayed(0)
    void fireEarlySynthesis()
  }, [fireEarlySynthesis])

  // ─── Card reveal helpers ──────────────────────────────────────────────────
  const reveal = (position: number) => {
    setRevealedPositions(prev => new Set(prev).add(position))
    const dc = drawnCards[position - 1]
    if (dc) {
      setBgTemp(dc.card.arcana === 'major' ? 'warm' : 'cool')
      setLiveMessage(`${dc.card.name}, ${dc.reversed ? 'reversed' : 'upright'}, in the position of ${CELTIC_CROSS_POSITIONS[position - 1].name}`)
    }
  }

  const revealInitialCross = useCallback(() => {
    reveal(1)
    reveal(2)
    setActivePosition(2)
    window.setTimeout(() => setPhase('holding'), 600)
  }, [drawnCards]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── User gesture handlers ────────────────────────────────────────────────

  // Tap on the face-down 1/2 pair — reveals both simultaneously
  const handleReveal12 = useCallback(() => {
    if (phase !== 'awaiting-12') return
    if (selectedCount < 2) return
    revealInitialCross()
  }, [phase, revealInitialCross, selectedCount])

  // Continue gesture — advance to next card or transition
  const handleContinue = useCallback(() => {
    if (phase !== 'continuing') return
    const next = activePosition + 1
    if (activePosition === 6) {
      // Cross → Staff transition
      setPhase('cross-staff-transition')
    } else if (activePosition === 10) {
      setPhase('final-pause')
    } else {
      // Reveal next card and enter hold.
      if (selectedCount < next) return
      setPhase('holding')
      reveal(next)
      setActivePosition(next)
    }
  }, [phase, activePosition, selectedCount]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleActualDeckSelect = useCallback((selectionIndex: number, deckIndex: number) => {
    if (phase !== 'drawing') return
    if (selectedDeckIndices.includes(deckIndex)) return

    const sourceCard = deck[deckIndex]
    if (!sourceCard) return

    const reversed = computeCardReversal()
    const celticPosition = CELTIC_CROSS_POSITIONS[selectionIndex]

    // Use the engine's computeInstantInterpretation with the Celtic Cross position
    const interpretation = computeInstantInterpretation(
      sourceCard,
      reversed,
      celticPosition ?? null,
      tarotAstroContext,
    )

    const drawnCard: DrawnCard = {
      card: sourceCard,
      reversed,
      interpretation,
    }

    setSelectedDeckIndices(prev => [...prev, deckIndex])
    setDrawnCards(prev => [...prev, drawnCard])

    const nextCount = selectionIndex + 1
    setSelectedCount(nextCount)

    if (nextCount === 10) {
      window.setTimeout(() => setPhase('awaiting-12'), 600)
    }
  }, [deck, phase, selectedDeckIndices, tarotAstroContext])

  // Global keyboard handler for Space/Enter continue
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        if (phase === 'awaiting-12') { e.preventDefault(); handleReveal12() }
        else if (phase === 'continuing') { e.preventDefault(); handleContinue() }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [phase, handleReveal12, handleContinue])

  // ─── Save reading ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (saveState === 'saving' || saveState === 'saved') return
    setSaveState('saving')
    const payload: SaveReadingRequest = {
      readingType: 'celtic-cross',
      spreadMode: 'celtic-cross',
      firstCardName: drawnCards[0]?.card.name ?? '',
      intentPreview: userIntention ?? null,
      cards: drawnCards.map((dc, i) => ({
        position: i + 1,
        cardId: dc.card.id,
        cardName: dc.card.name,
        reversed: dc.reversed,
        coreMeaning: dc.interpretation.coreMeaning,
      })),
      synthesis: synthesisChapters.length > 0
        ? { chapters: synthesisChapters.map(c => ({ heading: c.heading, body: c.body })) }
        : undefined,
    }
    try {
      await onSave(payload)
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  // ─── Derived values ───────────────────────────────────────────────────────
  const bgColor = bgTemp === 'warm' ? '#1a0f08' : bgTemp === 'cool' ? '#080d1a' : '#0d0d0f'
  const currentInterp = revealedPositions.has(activePosition) ? drawnCards[activePosition - 1]?.interpretation ?? null : null
  const currentDc = revealedPositions.has(activePosition) ? drawnCards[activePosition - 1] ?? null : null
  const isSynthesisPhase = phase === 'synthesis' || phase === 'complete'
  const discussContext = isSynthesisPhase
    ? buildDiscussContext(drawnCards, tarotAstroContext, userIntention, synthesisChapters)
    : ''

  // ─── Card size based on viewport ─────────────────────────────────────────
  const cardWidth = isMobile ? 'clamp(60px, 20vw, 80px)' : 'clamp(70px, 8vw, 100px)'

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Global keyframe styles injected once */}
      <style>{`
        @keyframes tarot-pulse {
          0%, 100% {
            box-shadow: 0 0 14px 2px rgba(201,168,76,0.35), 0 0 0 1px rgba(201,168,76,0.45);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 28px 8px rgba(201,168,76,0.75), 0 0 0 2px rgba(255,210,120,0.85);
            transform: scale(1.04);
          }
        }
        @keyframes tarot-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes tarot-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
          @keyframes tarot-fade-in { from { opacity: 0; } to { opacity: 1; } }
        }
      `}</style>

      {/* Accessibility live regions */}
      <div aria-live="polite" aria-atomic="true" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        {liveMessage}
      </div>

      {/* Overlays */}
      <CrossStaffTransition visible={transitionVisible} />
      <ConstellationOverlay visible={constellationVisible} />

      {/* Main reading container */}
      <div
        style={{
          minHeight: '100vh',
          background: bgColor,
          transition: 'background 1.2s ease-in-out',
          padding: isMobile ? '1.5rem 1rem 3rem' : '2rem 1.5rem 4rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '560px' }}>
          <h1 className="font-heading" style={{ color: '#c9a84c', fontSize: isMobile ? '1.375rem' : '1.625rem', marginBottom: '0.35rem' }}>
            Celtic Cross
          </h1>
          {userIntention && (
            <p style={{ color: 'rgba(201,168,76,0.5)', fontSize: '0.85rem', fontStyle: 'italic' }}>
              {userIntention}
            </p>
          )}
          {phase === 'dealing' && (
            <p style={{ color: 'rgba(201,168,76,0.45)', fontSize: '0.8rem', marginTop: '0.5rem', animation: 'tarot-fade-in 0.5s ease-in' }}>
              The cards are being placed…
            </p>
          )}
          {phase === 'drawing' && (
            <p style={{ color: 'rgba(201,168,76,0.55)', fontSize: '0.875rem', marginTop: '0.5rem', animation: 'tarot-fade-in 0.5s ease-in', fontStyle: 'italic' }}>
              Draw a card from the deck for each of the ten positions ({selectedCount}/10).
            </p>
          )}
          {phase === 'awaiting-12' && (
            <p style={{ color: 'rgba(201,168,76,0.55)', fontSize: '0.875rem', marginTop: '0.5rem', animation: 'tarot-fade-in 0.5s ease-in', fontStyle: 'italic' }}>
              All ten cards are placed. Tap the heart of the cross to begin the reading.
            </p>
          )}
        </div>

        {/* Deck — visible only while user is placing the 10 cards */}
        {phase === 'drawing' && (
          <TarotDeckSelection
            deckCardIds={deck.map(card => card.id)}
            selectedDeckIndices={selectedDeckIndices}
            completedSelections={selectedCount}
            labels={CELTIC_CROSS_POSITIONS.map(position => position.name)}
            onSelect={handleActualDeckSelect}
            disabled={false}
          />
        )}

        {isMobile ? (
          <MobileLayout
            drawnCards={drawnCards}
            revealedPositions={revealedPositions}
            activePosition={activePosition}
            phase={phase}
            cardWidth={cardWidth}
            onReveal12={handleReveal12}
            onAdvance={handleContinue}
            selectedCount={selectedCount}
          />
        ) : (
          <DesktopLayout
            drawnCards={drawnCards}
            revealedPositions={revealedPositions}
            activePosition={activePosition}
            phase={phase}
            cardWidth={cardWidth}
            onReveal12={handleReveal12}
            onAdvance={handleContinue}
            selectedCount={selectedCount}
          />
        )}

        {/* Interpretation panel for current card */}
        {currentInterp && currentDc && (phase === 'holding' || phase === 'continuing') && (
          <InterpretationPanel
            interp={currentInterp}
            dc={currentDc}
            phase={phase}
            onContinue={handleContinue}
            isMobile={isMobile}
          />
        )}

        {/* Synthesis or error */}
        {isSynthesisPhase && (
          <div style={{ width: '100%', maxWidth: '680px', animation: 'tarot-fade-in 0.5s ease-in' }}>
            {synthesisStatus === 'error' && synthesisError && !showAiFree ? (
              <ErrorPanel
                kind={synthesisError}
                cards={drawnCards}
                onRetry={retrySynthesis}
                onShowIndividual={() => setShowAiFree(true)}
              />
            ) : showAiFree ? (
              <AiFreeReadingSummary cards={drawnCards} />
            ) : (
              <TarotSynthesisPanel
                chapters={synthesisChapters}
                chaptersDisplayed={chaptersDisplayed}
                loadingMessage={synthesisStatus === 'loading' ? 'The cards are being read as a constellation.' : undefined}
              />
            )}

            {/* Save/Discard + Discuss — shown when complete */}
            {phase === 'complete' && (
              <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setDiscussOpen(true)}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(201,168,76,0.3)',
                    color: 'rgba(201,168,76,0.7)',
                    borderRadius: '8px',
                    padding: '0.6rem 1.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    letterSpacing: '0.04em',
                  }}
                >
                  Discuss ✦
                </button>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
                  {saveState === 'idle' && (
                    <button type="button" onClick={handleSave} style={primaryBtnStyle}>
                      Save this reading
                    </button>
                  )}
                  {saveState === 'saving' && (
                    <button type="button" disabled style={{ ...primaryBtnStyle, opacity: 0.6, cursor: 'default' }}>
                      Saving…
                    </button>
                  )}
                  {saveState === 'saved' && (
                    <p style={{ color: 'rgba(201,168,76,0.7)', fontSize: '0.875rem', fontFamily: 'inherit' }}>Saved ✓</p>
                  )}
                  {saveState === 'error' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                      <p style={{ color: 'rgba(220,80,80,0.85)', fontSize: '0.8rem' }}>Could not save. Try again.</p>
                      <button
                        type="button"
                        onClick={() => setSaveState('idle')}
                        style={linkBtnStyle}
                      >
                        Retry save
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={onDiscard}
                    style={{ ...outlineBtnStyle, color: 'rgba(201,168,76,0.45)', borderColor: 'rgba(201,168,76,0.15)' }}
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Discuss panel */}
      <TarotDiscussPanel
        isOpen={discussOpen}
        onClose={() => setDiscussOpen(false)}
        contextString={discussContext}
        userIntention={userIntention}
      />
    </>
  )
}

// ─── Interpretation panel ─────────────────────────────────────────────────────
function InterpretationPanel({
  interp,
  dc,
  phase,
  onContinue,
  isMobile,
}: {
  interp: InstantInterpretation
  dc: DrawnCard
  phase: Phase
  onContinue: () => void
  isMobile: boolean
}) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '580px',
        animation: 'tarot-fade-in 0.4s ease-in',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      {/* Position + card name */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'rgba(201,168,76,0.5)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
          {interp.positionLabel}
        </p>
        <h2 className="font-heading" style={{ color: '#c9a84c', fontSize: isMobile ? '1.25rem' : '1.5rem' }}>
          {dc.card.name}
          {dc.reversed && <span style={{ color: 'rgba(201,168,76,0.45)', fontSize: '0.7em', marginLeft: '0.4em' }}>reversed</span>}
        </h2>
      </div>

      {/* Interpretation */}
      <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(201,168,76,0.12)' }}>
        <p style={{ color: 'rgba(232,230,227,0.85)', fontSize: '0.9rem', lineHeight: 1.75, marginBottom: '0.6rem' }}>
          {interp.coreMeaning}
        </p>
        <p style={{ color: 'rgba(201,168,76,0.6)', fontSize: '0.85rem', lineHeight: 1.7, fontStyle: 'italic' }}>
          {interp.emotionalMeaning}
        </p>
        <p style={{ color: 'rgba(201,168,76,0.4)', fontSize: '0.78rem', marginTop: '0.75rem', letterSpacing: '0.02em' }}>
          {interp.astroConnection.astroHeadline}
        </p>
        <p style={{ color: 'rgba(201,168,76,0.3)', fontSize: '0.75rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
          {interp.positionMeaning}
        </p>
      </div>

      {/* Continue affordance — hint to tap the next face-down card */}
      {phase === 'continuing' && (
        <p style={{ color: 'rgba(201,168,76,0.45)', fontSize: '0.8rem', textAlign: 'center', marginTop: '0.5rem', fontStyle: 'italic', animation: 'tarot-fade-in 0.5s ease-in' }}>
          Tap the next glowing card when you are ready.
        </p>
      )}
    </div>
  )
}

// ─── Desktop layout (Cross + Staff side-by-side) ──────────────────────────────
interface LayoutProps {
  drawnCards: DrawnCard[]
  revealedPositions: Set<number>
  activePosition: number
  phase: Phase
  cardWidth: string
  onReveal12: () => void
  onAdvance: () => void
  selectedCount: number
}

function DesktopLayout({ drawnCards, revealedPositions, activePosition, phase, cardWidth, onReveal12, onAdvance, selectedCount }: LayoutProps) {
  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', justifyContent: 'center', width: '100%', maxWidth: '860px' }}>
      {/* Cross: 3×3 grid, ~60% width */}
      <div
        style={{
          display: 'grid',
          gridTemplateAreas: '". p5 ." "p4 p12 p6" ". p3 ."',
          gridTemplateColumns: `${cardWidth} ${cardWidth} ${cardWidth}`,
          gridTemplateRows: 'auto auto auto',
          gap: '12px',
          flex: '0 0 auto',
          position: 'relative',
        }}
      >
        <div style={{ gridArea: 'p5' }}>
          <PositionSlot position={5} drawnCards={drawnCards} revealedPositions={revealedPositions} activePosition={activePosition} phase={phase} onAdvance={onAdvance} selectedCount={selectedCount} />
        </div>
        <div style={{ gridArea: 'p4' }}>
          <PositionSlot position={4} drawnCards={drawnCards} revealedPositions={revealedPositions} activePosition={activePosition} phase={phase} onAdvance={onAdvance} selectedCount={selectedCount} />
        </div>
        {/* Positions 1+2 share a cell with 2 rotating over 1 */}
        <div style={{ gridArea: 'p12', position: 'relative', width: cardWidth, aspectRatio: '2/3' }}>
          {/* Card 1 (below) */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            <PositionSlot position={1} drawnCards={drawnCards} revealedPositions={revealedPositions} activePosition={activePosition} phase={phase} onReveal12={phase === 'awaiting-12' ? onReveal12 : undefined} selectedCount={selectedCount} />
          </div>
          {/* Card 2 (crossing, rotated 90°, on top) */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
            <PositionSlot position={2} drawnCards={drawnCards} revealedPositions={revealedPositions} activePosition={activePosition} phase={phase} isCrossing onReveal12={phase === 'awaiting-12' ? onReveal12 : undefined} selectedCount={selectedCount} />
          </div>
        </div>
        <div style={{ gridArea: 'p6' }}>
          <PositionSlot position={6} drawnCards={drawnCards} revealedPositions={revealedPositions} activePosition={activePosition} phase={phase} onAdvance={onAdvance} selectedCount={selectedCount} />
        </div>
        <div style={{ gridArea: 'p3' }}>
          <PositionSlot position={3} drawnCards={drawnCards} revealedPositions={revealedPositions} activePosition={activePosition} phase={phase} onAdvance={onAdvance} selectedCount={selectedCount} />
        </div>
      </div>

      {/* Staff: vertical column, 10 at top → 7 at bottom. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: '0 0 auto' }}>
        {[10, 9, 8, 7].map(pos => (
          <div key={pos} style={{ width: `calc(${cardWidth} * 1.3)` }}>
            <PositionSlot position={pos} drawnCards={drawnCards} revealedPositions={revealedPositions} activePosition={activePosition} phase={phase} onAdvance={onAdvance} selectedCount={selectedCount} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Mobile layout (stacked) ──────────────────────────────────────────────────
function MobileLayout({ drawnCards, revealedPositions, activePosition, phase, cardWidth, onReveal12, onAdvance, selectedCount }: LayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* Cross positions 1-6 stacked */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(3, ${cardWidth})`, gap: '10px', justifyContent: 'center' }}>
        {/* Row 1: 5 */}
        <div />
        <PositionSlot position={5} drawnCards={drawnCards} revealedPositions={revealedPositions} activePosition={activePosition} phase={phase} onAdvance={onAdvance} selectedCount={selectedCount} />
        <div />
        {/* Row 2: 4, 1/2, 6 */}
        <PositionSlot position={4} drawnCards={drawnCards} revealedPositions={revealedPositions} activePosition={activePosition} phase={phase} onAdvance={onAdvance} selectedCount={selectedCount} />
        <div style={{ position: 'relative', width: cardWidth, aspectRatio: '2/3' }}>
          <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            <PositionSlot position={1} drawnCards={drawnCards} revealedPositions={revealedPositions} activePosition={activePosition} phase={phase} onReveal12={phase === 'awaiting-12' ? onReveal12 : undefined} selectedCount={selectedCount} />
          </div>
          <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
            <PositionSlot position={2} drawnCards={drawnCards} revealedPositions={revealedPositions} activePosition={activePosition} phase={phase} isCrossing onReveal12={phase === 'awaiting-12' ? onReveal12 : undefined} selectedCount={selectedCount} />
          </div>
        </div>
        <PositionSlot position={6} drawnCards={drawnCards} revealedPositions={revealedPositions} activePosition={activePosition} phase={phase} onAdvance={onAdvance} selectedCount={selectedCount} />
        {/* Row 3: 3 */}
        <div />
        <PositionSlot position={3} drawnCards={drawnCards} revealedPositions={revealedPositions} activePosition={activePosition} phase={phase} onAdvance={onAdvance} selectedCount={selectedCount} />
        <div />
      </div>

      {/* Staff divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 1rem' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.15)' }} />
        <span style={{ color: 'rgba(201,168,76,0.35)', fontSize: '0.75rem' }}>✦</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.15)' }} />
      </div>

      {/* Staff positions 7-10 */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(2, calc(${cardWidth} * 1.3))`, gap: '12px', justifyContent: 'center' }}>
        {[7, 8, 9, 10].map(pos => (
          <PositionSlot key={pos} position={pos} drawnCards={drawnCards} revealedPositions={revealedPositions} activePosition={activePosition} phase={phase} onAdvance={onAdvance} selectedCount={selectedCount} />
        ))}
      </div>
    </div>
  )
}

// ─── Position slot ────────────────────────────────────────────────────────────
interface PositionSlotProps {
  position: number
  drawnCards: DrawnCard[]
  revealedPositions: Set<number>
  activePosition: number
  phase: Phase
  isCrossing?: boolean
  onReveal12?: () => void
  onAdvance?: () => void
  selectedCount: number
}

function PositionSlot({ position, drawnCards, revealedPositions, activePosition, phase, isCrossing, onReveal12, onAdvance, selectedCount: _selectedCount }: PositionSlotProps) {
  void _selectedCount
  const pos = CELTIC_CROSS_POSITIONS[position - 1]
  const dc = drawnCards[position - 1] ?? null
  const isRevealed = revealedPositions.has(position)

  // A card is "active" (pulsing) when it's the next to be tapped
  const isContinuingTarget =
    phase === 'continuing' &&
    position === activePosition + 1 &&
    activePosition >= 2 &&
    activePosition < 10

  const isNextToReveal = !isRevealed && (
    (phase === 'awaiting-12' && (position === 1 || position === 2)) ||
    isContinuingTarget ||
    (phase === 'cross-staff-transition' && position === 7)
  )

  // Pick the right click handler for this slot.
  const clickHandler = isNextToReveal
    ? (phase === 'awaiting-12' ? onReveal12 : isContinuingTarget ? onAdvance : undefined)
    : undefined

  return (
    <CelticCrossCard
      card={dc}
      position={pos}
      cardState={isRevealed ? 'face-up' : 'face-down'}
      isActive={isNextToReveal}
      isCrossing={isCrossing}
      onReveal={clickHandler}
      tabIndex={isNextToReveal ? 0 : -1}
      id={`tarot-pos-${position}`}
      hidden={false}
    />
  )
}
