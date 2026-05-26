import { useMemo, useState } from 'react'
import type { ChartData } from '../../engine/types'
import type { RateLimitInfo, TarotSingleSynthesisPayload } from '../../services/gptInterpretation'
import { TarotProvider, useTarot } from '../../context/TarotContext'
import type { TarotAstroContext } from '../../context/TarotContext'
import { useApp } from '../../context/AppContext'
import { SIGN_ELEMENTS, SIGN_MODALITIES } from '../../engine/types'
import type { Element, ZodiacSign } from '../../engine/types'
import { calculateTransits } from '../../engine/transits'
import { computeInstantInterpretation } from '../../engine/tarot'
import type {
  TarotCard,
  TarotAstroContext as EngineCtx,
  InstantInterpretation as EngineInterp,
} from '../../engine/tarot'
import type {
  DrawnCard as TypesDrawnCard,
  InstantInterpretation as TypesInterp,
  TarotAstroContext as TypesAstroCtx,
  TarotSuit as TypesSuit,
  TarotElement as TypesElement,
  SpreadMode,
} from '../../types/tarot'
import { ALL_TAROT_CARDS } from '../../data/tarot/cards'
import type { TarotAstroContext as CelticCtx } from './types'
import type { TarotCard as PanelCard, InstantInterpretation as PanelInterp } from './TarotInterpretationPanel'
import TarotHomeView from './TarotHomeView'
import SingleCardReading from './SingleCardReading'
import ThreeCardReading from './ThreeCardReading'
import CelticCrossReading from './CelticCrossReading'
import SavedReadingsPage from './SavedReadingsPage'

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

function computeDominantElement(chartData: ChartData): Element | null {
  const counts: Record<Element, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 }
  for (const planet of chartData.planets) {
    const el = SIGN_ELEMENTS[planet.sign as ZodiacSign]
    if (el) counts[el]++
  }
  const max = Math.max(...Object.values(counts))
  if (max === 0) return null
  return (Object.entries(counts).find(([, v]) => v === max)?.[0] as Element) ?? null
}

function computeDominantModality(chartData: ChartData): 'Cardinal' | 'Fixed' | 'Mutable' | null {
  const counts = { Cardinal: 0, Fixed: 0, Mutable: 0 }
  for (const planet of chartData.planets) {
    const mod = SIGN_MODALITIES[planet.sign as ZodiacSign]
    if (mod) counts[mod]++
  }
  const max = Math.max(...Object.values(counts))
  if (max === 0) return null
  return (Object.entries(counts).find(([, v]) => v === max)?.[0] as 'Cardinal' | 'Fixed' | 'Mutable') ?? null
}

// ─── Context builders ─────────────────────────────────────────────────────────

function buildEngineCtx(chartData: ChartData, birthDate: string): EngineCtx {
  return {
    natalSunSign: (chartData.planets.find(p => p.name === 'Sun')?.sign ?? null) as ZodiacSign | null,
    natalMoonSign: (chartData.planets.find(p => p.name === 'Moon')?.sign ?? null) as ZodiacSign | null,
    natalAscendantSign: (chartData.angles?.ascendant?.sign ?? null) as ZodiacSign | null,
    natalDominantElement: computeDominantElement(chartData),
    natalDominantModality: computeDominantModality(chartData),
    currentTransits: [],
    retrogradeplanets: [],
    dominantTransitPlanet: null,
    lunarPhaseName: null,
    lunarPhaseSymbol: null,
    personalDay: computePersonalDay(birthDate),
    advanceCategory: null,
    advanceReason: null,
  }
}

function buildThreeAstroCtx(
  chartData: ChartData,
  birthDate: string,
  dailyTransitSummary: string,
  weeklyTransitSummary: string,
  currentMoonSign: string,
): TypesAstroCtx {
  const sunSign = chartData.planets.find(p => p.name === 'Sun')?.sign ?? ''
  const moonSign = chartData.planets.find(p => p.name === 'Moon')?.sign ?? ''
  return {
    moonPhase: '',
    moonSign: currentMoonSign,
    personalDay: computePersonalDay(birthDate),
    personalYear: computePersonalYear(birthDate),
    sunSign,
    moonSignNatal: moonSign,
    ascendant: chartData.angles?.ascendant?.sign ?? '',
    dominantElement: computeDominantElement(chartData) ?? '',
    dominantModality: computeDominantModality(chartData) ?? '',
    topTransits: [],
    advanceCategory: null,
    advanceReason: null,
    dailyTransitSummary,
    weeklyTransitSummary,
  }
}

function buildCelticAstroCtx(chartData: ChartData, birthDate: string): CelticCtx {
  return {
    sunSign: chartData.planets.find(p => p.name === 'Sun')?.sign ?? '',
    moonSign: chartData.planets.find(p => p.name === 'Moon')?.sign ?? '',
    ascendant: chartData.angles?.ascendant?.sign ?? '',
    dominantElement: computeDominantElement(chartData) ?? '',
    currentMoonPhase: '',
    significantTransits: [],
    personalDay: computePersonalDay(birthDate),
    advanceCategory: null,
    numerologyYear: computePersonalYear(birthDate),
  }
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

// ─── Type adapters ────────────────────────────────────────────────────────────

function adaptSingleCard(card: TarotCard): PanelCard {
  return {
    id: card.id,
    name: card.name,
    number: card.number,
    arcana: card.arcana,
    suit: card.suit,
    uprightMeaning: card.uprightMeaning,
    reversedMeaning: card.reversedMeaning,
    keywords: card.keywords,
    element: card.element ?? undefined,
    reflectionQuestion: card.reflectionQuestion,
  }
}

function adaptSingleInterp(eng: EngineInterp): PanelInterp {
  return {
    coreMeaning: eng.coreMeaning,
    symbolicTheme: eng.symbolicTheme,
    emotionalMeaning: eng.emotionalMeaning,
    practicalGuidance: eng.practicalGuidance,
    reflectionQuestion: eng.reflectionQuestion,
    numerologyNote: eng.numerologyNote,
    astroConnection: {
      headline: eng.astroConnection.astroHeadline,
      transitInfluence: eng.astroConnection.transitInfluence || null,
      resonanceNote: eng.astroConnection.elementResonanceNote,
      lunarNote: eng.astroConnection.lunarPhaseNote || undefined,
    },
  }
}

function adaptThreeDrawnCard(card: TarotCard, reversed: boolean): TypesDrawnCard {
  return {
    id: card.id,
    name: card.name,
    arcana: card.arcana,
    number: card.number,
    suit: (card.suit as TypesSuit) ?? null,
    element: (card.element as TypesElement) ?? null,
    reversed,
  }
}

function adaptThreeInterp(eng: EngineInterp, card: TarotCard): TypesInterp {
  return {
    coreMeaning: eng.coreMeaning,
    symbolicTheme: eng.symbolicTheme,
    emotionalMeaning: eng.emotionalMeaning,
    practicalGuidance: eng.practicalGuidance,
    reflectionQuestion: eng.reflectionQuestion,
    numerologyNote: eng.numerologyNote,
    cardNumber: card.number,
    astroConnection: {
      headline: eng.astroConnection.astroHeadline,
      transitInfluence: eng.astroConnection.transitInfluence,
      lunarPhaseNote: eng.astroConnection.lunarPhaseNote || null,
      advanceCategoryNote: eng.astroConnection.advanceCategoryNote || null,
    },
  }
}

// ─── Reading flow containers ──────────────────────────────────────────────────

function SingleReadingFlow({
  chartData,
  birthDate,
  userIntention,
  onBack,
}: {
  chartData: ChartData
  birthDate: string
  userIntention: string
  onBack: () => void
}) {
  const engineCtx = useMemo(() => buildEngineCtx(chartData, birthDate), [chartData, birthDate])
  const dailyTransitData = useMemo(() => calculateTransits(chartData, 'daily'), [chartData])
  const weeklyTransitData = useMemo(() => calculateTransits(chartData, 'weekly'), [chartData])
  const [deck] = useState(() => shuffleTarotDeck())
  const [selectedDeckIndices, setSelectedDeckIndices] = useState<number[]>([])
  const [drawn, setDrawn] = useState<{ card: TarotCard; reversed: boolean; interp: EngineInterp } | null>(null)

  const handlePickCard = (deckIndex: number) => {
    const card = deck[deckIndex]
    if (!card) return
    const reversed = computeCardReversal()
    const interp = computeInstantInterpretation(card, reversed, null, engineCtx)
    setSelectedDeckIndices([deckIndex])
    setDrawn({ card, reversed, interp })
  }

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
      card={drawn ? adaptSingleCard(drawn.card) : null}
      reversed={drawn?.reversed ?? false}
      interpretation={drawn ? adaptSingleInterp(drawn.interp) : null}
      synthesisPayload={synthesisPayload}
      personalDay={computePersonalDay(birthDate)}
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
  onBack,
}: {
  chartData: ChartData
  birthDate: string
  userIntention: string
  spreadMode: SpreadMode
  onBack: () => void
}) {
  const engineCtx = useMemo(() => buildEngineCtx(chartData, birthDate), [chartData, birthDate])
  const dailyTransitData = useMemo(() => calculateTransits(chartData, 'daily'), [chartData])
  const weeklyTransitData = useMemo(() => calculateTransits(chartData, 'weekly'), [chartData])
  const [deck] = useState(() => shuffleTarotDeck())
  const [selectedDeckIndices, setSelectedDeckIndices] = useState<number[]>([])
  const [drawn, setDrawn] = useState<{ drawnCards: TypesDrawnCard[]; interpretations: TypesInterp[] }>({
    drawnCards: [],
    interpretations: [],
  })

  const handlePickCard = (deckIndex: number) => {
    if (selectedDeckIndices.includes(deckIndex)) return
    const card = deck[deckIndex]
    if (!card) return
    const reversed = computeCardReversal()
    const interpretation = computeInstantInterpretation(card, reversed, null, engineCtx)

    setSelectedDeckIndices(prev => [...prev, deckIndex])
    setDrawn(prev => ({
      drawnCards: [...prev.drawnCards, adaptThreeDrawnCard(card, reversed)],
      interpretations: [...prev.interpretations, adaptThreeInterp(interpretation, card)],
    }))
  }

  const astroContext = useMemo(
    () => buildThreeAstroCtx(
      chartData,
      birthDate,
      formatTransitSummary(dailyTransitData, 'Daily'),
      formatTransitSummary(weeklyTransitData, 'Weekly'),
      dailyTransitData.currentPlanets.find(planet => planet.name === 'Moon')?.sign ?? '',
    ),
    [birthDate, chartData, dailyTransitData, weeklyTransitData],
  )

  return (
    <ThreeCardReading
      spreadMode={spreadMode}
      deckCardIds={deck.map(card => card.id)}
      selectedDeckIndices={selectedDeckIndices}
      drawnCards={drawn.drawnCards}
      instantInterpretations={drawn.interpretations}
      astroContext={astroContext}
      userIntention={userIntention || null}
      onSave={() => {}}
      onDiscard={onBack}
      onOpenDiscuss={() => {}}
      onPickCard={handlePickCard}
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

    case 'single-reading':
      return (
        <SingleReadingFlow
          chartData={chartData}
          birthDate={birthDate}
          userIntention={state.userIntention}
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
          onBack={onBackToHome}
        />
      )

    case 'celtic-reading':
      return (
        <CelticCrossReading
          userIntention={state.userIntention || null}
          tarotAstroContext={buildCelticAstroCtx(chartData, birthDate)}
          onSave={() => {}}
          onDiscard={onBackToHome}
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
  const astroContext = useMemo((): TarotAstroContext | null => {
    if (!chartData) return null
    return {
      birthDate,
      personalDay: computePersonalDay(birthDate),
      moonPhase: null,
      transitAspects: null,
      advanceCategory: null,
      dominantElement: computeDominantElement(chartData),
    }
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
