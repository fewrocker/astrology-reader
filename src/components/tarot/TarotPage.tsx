import { useMemo, useState } from 'react'
import type { ChartData } from '../../engine/types'
import type { RateLimitInfo } from '../../services/gptInterpretation'
import { TarotProvider, useTarot } from '../../context/TarotContext'
import type { TarotAstroContext } from '../../context/TarotContext'
import { useApp } from '../../context/AppContext'
import { SIGN_ELEMENTS, SIGN_MODALITIES } from '../../engine/types'
import type { Element, ZodiacSign } from '../../engine/types'
import { drawCards, assignReversals, computeInstantInterpretation } from '../../engine/tarot'
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
import type { TarotAstroContext as CelticCtx } from './types'
import type { TarotCard as PanelCard, InstantInterpretation as PanelInterp } from './TarotInterpretationPanel'
import TarotHomeView from './TarotHomeView'
import SingleCardReading from './SingleCardReading'
import ThreeCardReading from './ThreeCardReading'
import CelticCrossReading from './CelticCrossReading'
import SavedReadingsPage from './SavedReadingsPage'

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

function buildThreeAstroCtx(chartData: ChartData, birthDate: string): TypesAstroCtx {
  const sunSign = chartData.planets.find(p => p.name === 'Sun')?.sign ?? ''
  const moonSign = chartData.planets.find(p => p.name === 'Moon')?.sign ?? ''
  return {
    moonPhase: '',
    moonSign,
    personalDay: computePersonalDay(birthDate),
    personalYear: computePersonalYear(birthDate),
    sunSign,
    moonSignNatal: moonSign,
    ascendant: chartData.angles?.ascendant?.sign ?? '',
    dominantElement: computeDominantElement(chartData) ?? '',
    dominantModality: computeDominantModality(chartData) ?? '',
    topTransits: [],
    advanceCategory: null,
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
  onBack,
}: {
  chartData: ChartData
  birthDate: string
  onBack: () => void
}) {
  const seed = `${birthDate}:${new Date().toISOString().slice(0, 10)}`
  const [drawn] = useState(() => {
    const engineCtx = buildEngineCtx(chartData, birthDate)
    const cards = drawCards('single', seed)
    const reversals = assignReversals(cards, seed)
    const card = cards[0]!
    const reversed = reversals[0] ?? false
    const interp = computeInstantInterpretation(card, reversed, null, engineCtx)
    return { card, reversed, interp }
  })

  return (
    <SingleCardReading
      card={adaptSingleCard(drawn.card)}
      reversed={drawn.reversed}
      interpretation={adaptSingleInterp(drawn.interp)}
      personalDay={computePersonalDay(birthDate)}
      onBack={onBack}
      onSave={() => {}}
      onDiscuss={() => {}}
    />
  )
}

function ThreeReadingFlow({
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
  const spreadMode: SpreadMode = 'past-present-future'
  const seed = `${birthDate}:${new Date().toISOString().slice(0, 10)}:three`

  const [drawn] = useState(() => {
    const engineCtx = buildEngineCtx(chartData, birthDate)
    const cards = drawCards('three-past-present-future', seed)
    const reversals = assignReversals(cards, seed)
    const drawnCards = cards.map((card, i) => adaptThreeDrawnCard(card, reversals[i] ?? false))
    const interpretations = cards.map((card, i) =>
      adaptThreeInterp(
        computeInstantInterpretation(card, reversals[i] ?? false, null, engineCtx),
        card,
      )
    )
    return { drawnCards, interpretations }
  })

  const astroContext = useMemo(() => buildThreeAstroCtx(chartData, birthDate), [chartData, birthDate])

  return (
    <ThreeCardReading
      spreadMode={spreadMode}
      drawnCards={drawn.drawnCards}
      instantInterpretations={drawn.interpretations}
      astroContext={astroContext}
      userIntention={userIntention || null}
      onSave={() => {}}
      onDiscard={onBack}
      onOpenDiscuss={() => {}}
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
          onBack={onBackToHome}
        />
      )

    case 'three-reading':
      return (
        <ThreeReadingFlow
          chartData={chartData}
          birthDate={birthDate}
          userIntention={state.userIntention}
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
