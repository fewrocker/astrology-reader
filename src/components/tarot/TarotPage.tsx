import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChartData } from '../../engine/types'
import type { RateLimitInfo, TarotSingleSynthesisPayload } from '../../services/gptInterpretation'
import { TarotProvider, useTarot } from '../../context/TarotContext'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { saveReading } from '../../services/readingsService'
import type { SaveReadingRequest } from '../../services/readingsService'
import { computeInstantInterpretation } from '../../engine/tarot'
import type {
  TarotCard,
  TarotAstroContext,
  DrawnCard,
  InstantInterpretation,
} from '../../engine/tarot'
import type { SpreadMode } from '../../types/tarot'
import TarotHomeView from './TarotHomeView'
import SingleCardReading from './SingleCardReading'
import ThreeCardReading from './ThreeCardReading'
import CelticCrossReading from './CelticCrossReading'
import SavedReadingsPage from './SavedReadingsPage'
import DeckShuffleAnimation from './DeckShuffleAnimation'
import type { FocusArea } from './TarotIntentionScreen'
import type { ReadingMode as ShuffleReadingMode } from './TarotModeSelector'
import {
  shuffleTarotDeck,
  computeCardReversal,
  computePersonalDay,
  computePersonalYear,
  buildEngineCtx,
  useTransitData,
} from './tarotUtils'

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
  const { dispatch } = useTarot()
  const { token } = useAuth()
  const { dailyTransitData, currentMoonSign, dailyTransitSummary, weeklyTransitSummary } = useTransitData(chartData)
  const engineCtx = useMemo(() => buildEngineCtx(chartData, birthDate, dailyTransitData), [chartData, birthDate, dailyTransitData])
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
          rulingPlanet: drawn.card.rulingPlanet ?? null,
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
        chartRulerPlanet: engineCtx.chartRulerPlanet,
        natalDominantModality: engineCtx.natalDominantModality,
        natalMoonHouse: engineCtx.natalMoonHouse,
        natalVenusHouse: engineCtx.natalVenusHouse,
        natalNorthNodeHouse: engineCtx.natalNorthNodeHouse,
        natalMarsHouse: engineCtx.natalMarsHouse,
        personalDay: computePersonalDay(birthDate),
        personalYear: computePersonalYear(birthDate),
        advanceCategory: engineCtx.advanceCategory,
        advanceReason: engineCtx.advanceReason,
        moonPhaseName: engineCtx.lunarPhaseName ?? '',
        moonSign: currentMoonSign,
        dailyTransitSummary,
        weeklyTransitSummary,
        spreadMode: null,
        localDate: new Date().toLocaleDateString('en-CA'),
      }
    : null

  const handleSave = useCallback(async (): Promise<void> => {
    if (!drawn || !token) throw new Error('not_ready')
    const payload: SaveReadingRequest = {
      readingType: 'single',
      spreadMode: null,
      firstCardName: drawn.card.name,
      intentPreview: userIntention || null,
      cards: [{
        cardId: drawn.card.id,
        cardName: drawn.card.name,
        reversed: drawn.reversed,
        coreMeaning: drawn.interp.coreMeaning,
      }],
      synthesis: synthesisPayload
        ? { cardName: drawn.card.name, reversed: drawn.reversed, coreMeaning: drawn.interp.coreMeaning }
        : undefined,
    }
    const result = await saveReading(payload, token)
    dispatch({ type: 'SAVE_READING', readingId: result.id })
  }, [drawn, token, userIntention, synthesisPayload, dispatch])

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
      onSave={handleSave}
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
  const { dispatch } = useTarot()
  const { token } = useAuth()
  const { dailyTransitData, currentMoonSign: transitMoonSign, dailyTransitSummary, weeklyTransitSummary } = useTransitData(chartData)
  const engineCtx = useMemo(() => buildEngineCtx(chartData, birthDate, dailyTransitData), [chartData, birthDate, dailyTransitData])
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

  const handleSave = useCallback(async (): Promise<void> => {
    if (!token) throw new Error('not_authenticated')
    if (drawnCards.length === 0) throw new Error('no_cards')
    const payload: SaveReadingRequest = {
      readingType: 'three-card',
      spreadMode: spreadMode ?? null,
      firstCardName: drawnCards[0]?.card.name ?? '',
      intentPreview: userIntention || null,
      cards: drawnCards.map((dc, i) => ({
        position: i + 1,
        cardId: dc.card.id,
        cardName: dc.card.name,
        reversed: dc.reversed,
        coreMeaning: dc.interpretation.coreMeaning,
      })),
    }
    const result = await saveReading(payload, token)
    dispatch({ type: 'SAVE_READING', readingId: result.id })
  }, [token, drawnCards, spreadMode, userIntention, dispatch])

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
      onSave={handleSave}
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
  const { dispatch } = useTarot()
  const { token } = useAuth()
  const { dailyTransitData, currentMoonSign, dailyTransitSummary, weeklyTransitSummary } = useTransitData(chartData)
  const engineCtx = useMemo(() => buildEngineCtx(chartData, birthDate, dailyTransitData), [chartData, birthDate, dailyTransitData])

  const handleSave = useCallback(async (payload: SaveReadingRequest): Promise<void> => {
    if (!token) throw new Error('not_authenticated')
    const result = await saveReading(payload, token)
    dispatch({ type: 'SAVE_READING', readingId: result.id })
  }, [token, dispatch])

  return (
    <CelticCrossReading
      userIntention={userIntention || null}
      tarotAstroContext={engineCtx}
      dailyTransitSummary={dailyTransitSummary}
      weeklyTransitSummary={weeklyTransitSummary}
      moonSign={currentMoonSign}
      onSave={handleSave}
      onDiscard={onBack}
    />
  )
}

// ─── Shuffle Ritual Flow ──────────────────────────────────────────────────────

/**
 * Derive the FocusArea for DeckShuffleAnimation from the user's intention string.
 * When the user selected a chip in TarotHomeView, the chip label is stored as the
 * intention string. We map common chip labels back to FocusArea ids; everything
 * else falls through to 'custom-question' or 'general'.
 */
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
    return buildEngineCtx(chartData, birthDate)
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
