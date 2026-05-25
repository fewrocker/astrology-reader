import { useMemo } from 'react'
import type { ChartData } from '../../engine/types'
import type { RateLimitInfo } from '../../services/gptInterpretation'
import { TarotProvider, useTarot } from '../../context/TarotContext'
import type { TarotAstroContext } from '../../context/TarotContext'
import { useApp } from '../../context/AppContext'
import TarotHomeView from './TarotHomeView'

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

function computeDominantElement(chartData: ChartData): TarotAstroContext['dominantElement'] {
  const elementMap: Record<string, 'Fire' | 'Water' | 'Air' | 'Earth'> = {
    Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
    Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
    Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
    Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water',
  }
  const counts: Record<string, number> = { Fire: 0, Water: 0, Air: 0, Earth: 0 }
  for (const planet of chartData.planets) {
    const el = elementMap[planet.sign]
    if (el) counts[el]++
  }
  const max = Math.max(...Object.values(counts))
  if (max === 0) return null
  const dominant = Object.entries(counts).find(([, v]) => v === max)
  return (dominant?.[0] as TarotAstroContext['dominantElement']) ?? null
}

export interface TarotPageProps {
  chartData: ChartData | null
  birthDate: string
  onOpenUpgrade: (info: RateLimitInfo, tier?: 'basic' | 'advanced') => void
}

function TarotPageInner({ onOpenUpgrade }: { onOpenUpgrade: TarotPageProps['onOpenUpgrade'] }) {
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
    case 'three-reading':
    case 'celtic-reading':
    case 'saved-readings':
      return (
        <div className="w-full max-w-2xl mx-auto py-12 text-center">
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
          <div className="text-4xl mb-4" style={{ color: '#7c3aed' }}>✦</div>
          <p className="font-heading text-xl text-mystic-gold mb-2">Tarot module coming soon</p>
          <p className="text-mystic-muted text-sm">The reading interface is being built.</p>
        </div>
      )
  }
}

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
      <TarotPageInner onOpenUpgrade={onOpenUpgrade} />
    </TarotProvider>
  )
}
