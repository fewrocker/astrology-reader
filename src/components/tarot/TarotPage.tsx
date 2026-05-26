import { useEffect, useMemo, useState } from 'react'
import type { ChartData } from '../../engine/types'
import type { RateLimitInfo, TarotSingleSynthesisPayload } from '../../services/gptInterpretation'
import { TarotProvider, useTarot } from '../../context/TarotContext'
import { useApp } from '../../context/AppContext'
import { calculateTransits } from '../../engine/transits'
import { computeInstantInterpretation, buildTarotAstroContext } from '../../engine/tarot'
import type {
  TarotCard,
  TarotAstroContext,
  DrawnCard,
  InstantInterpretation,
} from '../../engine/tarot'
import type { SpreadMode } from '../../types/tarot'
import { ALL_TAROT_CARDS } from '../../data/tarot/cards'
import TarotHomeView from './TarotHomeView'
import SingleCardReading from './SingleCardReading'
import ThreeCardReading from './ThreeCardReading'
import CelticCrossReading from './CelticCrossReading'
import SavedReadingsPage from './SavedReadingsPage'
import DeckShuffleAnimation from './DeckShuffleAnimation'
import type { FocusArea } from './TarotIntentionScreen'
import type { ReadingMode as ShuffleReadingMode } from './TarotModeSelector'

function shuffleTarotDeck(): TarotCard[] {
  const deck = [...ALL_TAROT_CARDS] as TarotCard[]

  for (let index = deck.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]]
  }

  return deck
}

function computeCardReversal(): boolean {
  return Math.random() < 0.3
}

// ─── Numerology helpers ───────────────────────────────────────────────────────

function computePersonalDay(birthDate: string): number {
  const today = new Date()
  const [, bMonth, bDay] = birthDate.split('-').map(Number)
  const sum =
    today.getDate() +
    (today.getMonth() + 1) +
    bMonth +
    bDay +
    Math.floor(today.getFullYear() / 1000) +
    Math.floor((today.getFullYear() % 1000) / 100) +
    Math.floor((today.getFullYear() % 100) / 10) +
    (today.getFullYear() % 10)
  let n = sum
  while (n > 9 && n !== 11 && n !== 22) {
    n = String(n).split('').reduce((a, d) => a + Number(d), 0)
  }
  return n
}

function computePersonalYear(birthDate: string): number {
  const today = new Date()
  const [, bMonth, bDay] = birthDate.split('-').map(Number)
  const sum =
    bMonth +
    bDay +
    Math.floor(today.getFullYear() / 1000) +
    Math.floor((today.getFullYear() % 1000) / 100) +
    Math.floor((today.getFullYear() % 100) / 10) +
    (today.getFullYear() % 10)
  let n = sum
  while (n > 9 && n !== 11 && n !== 22) {
    n = String(n).split('').reduce((a, d) => a + Number(d), 0)
  }
  return n
}

function formatTransitSummary(
  transitData: ReturnType<typeof calculateTransits>,
  periodLabel: 'Daily' | 'Weekly',
): string {
  const moon = transitData.currentPlanets.find(planet => planet.name === 'Moon')
  const topAspects = transitData.transitAspects.slice(0, periodLabel === 'Daily' ? 5 : 7)
  const ingresses = transitData.ingresses.slice(0, periodLabel === 'Daily' ? 2 : 4)
  const retrogrades = transitData.retrogrades.filter(item => item.isRetro || item.status.includes('Stationing')).slice(0, 5)

  const lines: string[] = []
  lines.push(`${periodLabel} window: ${transitData.dateRange.start} to ${transitData.dateRange.end}`)
  if (moon) {
    lines.push(`Current Moon: ${moon.degree}°${moon.minute}' ${moon.sign}${moon.retrograde ? ' [Rx]' : ''}`)
  }
  if (topAspects.length > 0) {
    lines.push(`${periodLabel} transit aspects:`)
    for (const aspect of topAspects) {
      const houseText = aspect.natalHouse ? `, natal house ${aspect.natalHouse}` : ''
      lines.push(`- ${aspect.transitPlanet} ${aspect.symbol} natal ${aspect.natalPlanet} (${aspect.type}, orb ${aspect.orb}°, ${aspect.applying ? 'applying' : 'separating'}, ${aspect.nature}${houseText})`)
    }
  }
  if (ingresses.length > 0) {
    lines.push(`${periodLabel} sign changes:`)
    for (const ingress of ingresses) {
      lines.push(`- ${ingress.planet} moves from ${ingress.fromSign} to ${ingress.toSign} around ${ingress.approximateDate}`)
    }
  }
  if (retrogrades.length > 0) {
    lines.push(`${periodLabel} retrograde activity:`)
    for (const retrograde of retrogrades) {
      lines.push(`- ${retrograde.planet}: ${retrograde.status}`)
    }
  }

  return lines.join('\n')
}

// ─── Engine context builder ───────────────────────────────────────────────────

function buildEngineCtx(chartData: ChartData, birthDate: string): TarotAstroContext {
  return buildTarotAstroContext(
    chartData,
    null,
    computePersonalDay(birthDate),
    null,
  )
}

// ─── Reading flow containers ──────────────────────────────────────────────────

function SingleReadingFlow({
  chartData,
  birthDate,
  userIntention,
  ritualCardIndices,
  onBack,
}: {
  chartData: ChartData
  birthDate: string
  userIntention: string
  ritualCardIndices: number[]
  onBack: () => void
}) {
  const engineCtx = useMemo(() => buildEngineCtx(chartData, birthDate), [chartData, birthDate])
  const dailyTransitData = useMemo(() => calculateTransits(chartData, 'daily'), [chartData])
  const weeklyTransitData = useMemo(() => calculateTransits(chartData, 'weekly'), [chartData])
  const [deck] = useState(() => shuffleTarotDeck())
  const [selectedDeckIndices, setSelectedDeckIndices] = useState<number[]>([])
  const [drawn, setDrawn] = useState<{ card: TarotCard; reversed: boolean; interp: InstantInterpretation } | null>(null)

  const handlePickCard = (deckIndex: number) => {
    const card = deck[deckIndex]
    if (!card) return
    const reversed = computeCardReversal()
    const interp = computeInstantInterpretation(card, reversed, null, engineCtx)
    setSelectedDeckIndices([deckIndex])
    setDrawn({ card, reversed, interp })
  }

  // Auto-pick the ritual-drawn card index on mount when ritual provided it
  useEffect(() => {
    if (ritualCardIndices.length > 0 && selectedDeckIndices.length === 0) {
      const index = ritualCardIndices[0]
      if (index !== undefined) {
        handlePickCard(index)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const synthesisPayload: TarotSingleSynthesisPayload | null = drawn
    ? {
        card: {
          id: drawn.card.id,
          name: drawn.card.name,
          arcana: drawn.card.arcana,
          suit: drawn.card.suit,
          number: drawn.card.number,
          element: drawn.card.element,
          reversed: drawn.reversed,
          coreMeaning: drawn.interp.coreMeaning,
          symbolicTheme: drawn.interp.symbolicTheme,
          emotionalMeaning: drawn.interp.emotionalMeaning,
          practicalGuidance: drawn.interp.practicalGuidance,
          reflectionQuestion: drawn.interp.reflectionQuestion,
          numerologyResonance: drawn.interp.numerologyNote,
          astroHeadline: drawn.interp.astroConnection.astroHeadline,
          transitInfluence: drawn.interp.astroConnection.transitInfluence,
          lunarPhaseNote: drawn.interp.astroConnection.lunarPhaseNote || null,
        },
        position: null,
        userIntention: userIntention || null,
        natalSunSign: engineCtx.natalSunSign ?? '',
        natalMoonSign: engineCtx.natalMoonSign ?? '',
        natalAscSign: engineCtx.natalAscendantSign ?? '',
        personalDay: computePersonalDay(birthDate),
        personalYear: computePersonalYear(birthDate),
        advanceCategory: engineCtx.advanceCategory,
        advanceReason: engineCtx.advanceReason,
        moonPhaseName: engineCtx.lunarPhaseName ?? '',
        moonSign: dailyTransitData.currentPlanets.find(planet => planet.name === 'Moon')?.sign ?? '',
        dailyTransitSummary: formatTransitSummary(dailyTransitData, 'Daily'),
        weeklyTransitSummary: formatTransitSummary(weeklyTransitData, 'Weekly'),
        spreadMode: null,
        localDate: new Date().toLocaleDateString('en-CA'),
      }
    : null

  return (
    <SingleCardReading
      deckCardIds={deck.map(card => card.id)}
      selectedDeckIndices={selectedDeckIndices}
      card={drawn?.card ?? null}
      reversed={drawn?.reversed ?? false}
      interpretation={drawn?.interp ?? null}
      synthesisPayload={synthesisPayload}
      personalDay={computePersonalDay(birthDate)}
      userIntention={userIntention || null}
      onBack={onBack}
      onSave={() => {}}
      onDiscuss={() => {}}
      onPickCard={handlePickCard}
    />
  )
}

function ThreeReadingFlow({
  chartData,
  birthDate,
  userIntention,
  spreadMode,
  ritualCardIndices,
  onBack,
}: {
  chartData: ChartData
  birthDate: string
  userIntention: string
  spreadMode: SpreadMode
  ritualCardIndices: number[]
  onBack: () => void
}) {
  const engineCtx = useMemo(() => buildEngineCtx(chartData, birthDate), [chartData, birthDate])
  const dailyTransitData = useMemo(() => calculateTransits(chartData, 'daily'), [chartData])
  const weeklyTransitData = useMemo(() => calculateTransits(chartData, 'weekly'), [chartData])
  const [deck] = useState(() => shuffleTarotDeck())
  const [selectedDeckIndices, setSelectedDeckIndices] = useState<number[]>([])
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([])

  const handlePickCard = (deckIndex: number) => {
    if (selectedDeckIndices.includes(deckIndex)) return
    const card = deck[deckIndex]
    if (!card) return
    const reversed = computeCardReversal()
    const interpretation = computeInstantInterpretation(card, reversed, null, engineCtx)
    const drawnCard: DrawnCard = { card, reversed, interpretation }

    setSelectedDeckIndices(prev => [...prev, deckIndex])
    setDrawnCards(prev => [...prev, drawnCard])
  }

  // Auto-pick all three ritual-drawn card indices on mount when ritual provided them
  useEffect(() => {
    if (ritualCardIndices.length > 0 && selectedDeckIndices.length === 0) {
      for (const index of ritualCardIndices) {
        handlePickCard(index)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const transitMoonSign = dailyTransitData.currentPlanets.find(planet => planet.name === 'Moon')?.sign ?? ''
  const dailyTransitSummary = useMemo(() => formatTransitSummary(dailyTransitData, 'Daily'), [dailyTransitData])
  const weeklyTransitSummary = useMemo(() => formatTransitSummary(weeklyTransitData, 'Weekly'), [weeklyTransitData])

  return (
    <ThreeCardReading
      spreadMode={spreadMode}
      deckCardIds={deck.map(card => card.id)}
      selectedDeckIndices={selectedDeckIndices}
      drawnCards={drawnCards}
      astroContext={engineCtx}
      dailyTransitSummary={dailyTransitSummary}
      weeklyTransitSummary={weeklyTransitSummary}
      transitMoonSign={transitMoonSign}
      personalYear={computePersonalYear(birthDate)}
      userIntention={userIntention || null}
      onSave={() => {}}
      onDiscard={onBack}
      onOpenDiscuss={() => {}}
      onPickCard={handlePickCard}
    />
  )
}

function CelticReadingFlow({
  chartData,
  birthDate,
  userIntention,
  onBack,
}: {
  chartData: ChartData
  birthDate: string
  userIntention: string | null
  onBack: () => void
}) {
  const engineCtx = useMemo(() => buildEngineCtx(chartData, birthDate), [chartData, birthDate])
  const dailyTransitData = useMemo(() => calculateTransits(chartData, 'daily'), [chartData])
  const weeklyTransitData = useMemo(() => calculateTransits(chartData, 'weekly'), [chartData])

  const currentMoonSign = useMemo(
    () => dailyTransitData.currentPlanets.find(planet => planet.name === 'Moon')?.sign ?? '',
    [dailyTransitData],
  )

  const dailyTransitSummary = useMemo(
    () => formatTransitSummary(dailyTransitData, 'Daily'),
    [dailyTransitData],
  )

  const weeklyTransitSummary = useMemo(
    () => formatTransitSummary(weeklyTransitData, 'Weekly'),
    [weeklyTransitData],
  )

  return (
    <CelticCrossReading
      userIntention={userIntention || null}
      tarotAstroContext={engineCtx}
      dailyTransitSummary={dailyTransitSummary}
      weeklyTransitSummary={weeklyTransitSummary}
      moonSign={currentMoonSign}
      onSave={() => {}}
      onDiscard={onBack}
    />
  )
}

function deriveFocusArea(intention: string): FocusArea {
  const lower = intention.toLowerCase()
  if (!intention.trim()) return 'general'
  if (lower === 'love' || lower === 'love & relationships') return 'love-relationships'
  if (lower === 'career' || lower === 'career & purpose') return 'career-purpose'
  if (lower === 'growth') return 'growth'
  if (lower === "today's energy" || lower === 'todaysenergy') return 'todays-energy'
  return 'custom-question'
}

/**
 * Map the TarotContext ReadingMode ('single' | 'three') to the
 * DeckShuffleAnimation ReadingMode ('single' | 'three-card' | 'celtic-cross').
 */
function toShuffleReadingMode(mode: 'single' | 'three'): ShuffleReadingMode {
  return mode === 'single' ? 'single' : 'three-card'
}

function ShuffleRitualFlow({
  userIntention,
  readingMode,
  onRevealComplete,
}: {
  userIntention: string
  readingMode: 'single' | 'three'
  onRevealComplete: (indices: number[]) => void
}) {
  const cardCount = readingMode === 'single' ? 1 : 3
  const focusArea = deriveFocusArea(userIntention)
  const shuffleMode = toShuffleReadingMode(readingMode)

  return (
    <DeckShuffleAnimation
      intention={userIntention}
      focusArea={focusArea}
      readingMode={shuffleMode}
      cardCount={cardCount}
      onCardSelected={() => {
        // No-op: parent learns about the card via onRevealComplete
      }}
      onRevealComplete={state => {
        onRevealComplete(state.drawnCardIndices)
      }}
    />
  )
}

// ─── Inner component (inside TarotProvider) ───────────────────────────────────

export interface TarotPageProps {
  chartData: ChartData | null
  birthDate: string
  onOpenUpgrade: (info: RateLimitInfo, tier?: 'basic' | 'advanced') => void
}

function TarotPageInner({
  onOpenUpgrade,
  chartData,
  birthDate,
}: {
  onOpenUpgrade: TarotPageProps['onOpenUpgrade']
  chartData: ChartData
  birthDate: string
}) {
  const { state, dispatch } = useTarot()
  const { dispatch: appDispatch } = useApp()

  const onExitTarot = () => appDispatch({ type: 'SET_VIEW', view: 'form' })

  const onBackToHome = () => {
    dispatch({ type: 'RESET_READING' })
    dispatch({ type: 'NAVIGATE_TAROT', subView: 'home' })
  }

  switch (state.subView) {
    case 'home':
      return <TarotHomeView onExit={onExitTarot} onOpenUpgrade={onOpenUpgrade} />

    case 'shuffle-ritual': {
      // readingMode is set by TarotHomeView before navigating here
      const ritualMode = state.readingMode === 'three' ? 'three' : 'single'
      return (
        <ShuffleRitualFlow
          userIntention={state.userIntention}
          readingMode={ritualMode}
          onRevealComplete={indices => {
            dispatch({ type: 'SET_RITUAL_CARD_INDICES', indices })
            const targetView = ritualMode === 'three' ? 'three-reading' : 'single-reading'
            dispatch({ type: 'NAVIGATE_TAROT', subView: targetView })
          }}
        />
      )
    }

    case 'single-reading':
      return (
        <SingleReadingFlow
          chartData={chartData}
          birthDate={birthDate}
          userIntention={state.userIntention}
          ritualCardIndices={state.ritualCardIndices}
          onBack={onBackToHome}
        />
      )

    case 'three-reading':
      return (
        <ThreeReadingFlow
          chartData={chartData}
          birthDate={birthDate}
          userIntention={state.userIntention}
          spreadMode={state.spreadMode?.id as SpreadMode ?? 'past-present-future'}
          ritualCardIndices={state.ritualCardIndices}
          onBack={onBackToHome}
        />
      )

    case 'celtic-reading':
      return (
        <CelticReadingFlow
          chartData={chartData}
          birthDate={birthDate}
          userIntention={state.userIntention || null}
          onBack={onBackToHome}
        />
      )

    case 'saved-readings':
      return (
        <div className="w-full max-w-2xl mx-auto py-8">
          <button
            type="button"
            onClick={onBackToHome}
            className="text-xs font-heading mb-8 block transition-colors"
            style={{ color: 'rgba(201,168,76,0.6)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#c9a84c')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,168,76,0.6)')}
          >
            ← Back
          </button>
          <SavedReadingsPage />
        </div>
      )
  }
}

// ─── Exported page ────────────────────────────────────────────────────────────

export default function TarotPage({ chartData, birthDate, onOpenUpgrade }: TarotPageProps) {
  // Build a TarotAstroContext for the provider (used by home view and nav)
  const astroContext = useMemo((): TarotAstroContext | null => {
    if (!chartData) return null
    return buildTarotAstroContext(chartData, null, computePersonalDay(birthDate), null)
  }, [chartData, birthDate])

  if (!chartData) {
    return (
      <div className="w-full max-w-2xl mx-auto py-24 text-center" role="status" aria-live="polite">
        <div
          className="text-4xl mb-4 animate-spin"
          style={{ animationDuration: '3s', color: '#7c3aed' }}
          aria-hidden="true"
        >
          ✦
        </div>
        <p className="font-heading text-xl" style={{ color: '#7c3aed' }}>
          One moment while we read your sky.
        </p>
      </div>
    )
  }

  return (
    <TarotProvider astroContext={astroContext}>
      <TarotPageInner
        onOpenUpgrade={onOpenUpgrade}
        chartData={chartData}
        birthDate={birthDate}
      />
    </TarotProvider>
  )
}
