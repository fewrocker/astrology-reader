import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { ChartData, PlanetName } from '../../engine/types'
import { PLANET_GLYPHS, ZODIAC_GLYPHS } from '../../engine/types'
import { calculateCurrentPositions, calculateTransitAspects, getTopActiveTransits, computeEnergyRating } from '../../engine/transits'
import type { TransitAspect, EnergyRating } from '../../engine/transits'
import { getCurrentMoonPhase } from '../../engine/lunar'
import type { CurrentMoonPhase } from '../../engine/lunar'
import { calculatePersonalDay } from '../../engine/numerology'
import { getInterpretation } from '../../data/numerologyInterpretations'
import { getTodayPageInterpretation, getGptNudge } from '../../services/gptInterpretation'
import GptSkeleton from '../ui/GptSkeleton'

const PHASE_EMOJIS: Record<string, string> = {
  'New Moon': '🌑',
  'Waxing Crescent': '🌒',
  'First Quarter': '🌓',
  'Waxing Gibbous': '🌔',
  'Full Moon': '🌕',
  'Waning Gibbous': '🌖',
  'Last Quarter': '🌗',
  'Waning Crescent': '🌘',
}

const ASPECT_KEYWORDS: Record<string, Record<string, string>> = {
  Sun: { harmonious: 'Vitality', challenging: 'Ego tension', neutral: 'Identity' },
  Moon: { harmonious: 'Flow', challenging: 'Emotional', neutral: 'Intuition' },
  Mercury: { harmonious: 'Clarity', challenging: 'Discord', neutral: 'Communication' },
  Venus: { harmonious: 'Harmony', challenging: 'Friction', neutral: 'Connection' },
  Mars: { harmonious: 'Drive', challenging: 'Tension', neutral: 'Action' },
  Jupiter: { harmonious: 'Expansion', challenging: 'Excess', neutral: 'Growth' },
  Saturn: { harmonious: 'Structure', challenging: 'Pressure', neutral: 'Discipline' },
  Uranus: { harmonious: 'Innovation', challenging: 'Disruption', neutral: 'Change' },
  Neptune: { harmonious: 'Inspiration', challenging: 'Confusion', neutral: 'Mysticism' },
  Pluto: { harmonious: 'Transformation', challenging: 'Intensity', neutral: 'Power' },
  NorthNode: { harmonious: 'Purpose', challenging: 'Karma', neutral: 'Destiny' },
}

function getAspectKeyword(transitPlanet: string, nature: string): string {
  return ASPECT_KEYWORDS[transitPlanet]?.[nature] ?? nature
}

interface TodayPageProps {
  chartData: ChartData | null
  birthDate: string
}

export default function TodayPage({ chartData, birthDate }: TodayPageProps) {
  const { dispatch } = useApp()

  const now = new Date()
  const dateHeader = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const personalDayNum = calculatePersonalDay(birthDate)
  const interpretation = getInterpretation('personalDay', personalDayNum)
  const firstSentence = interpretation?.essence
    ? interpretation.essence.split(/(?<=\.)\s+/)[0] ?? interpretation.essence
    : null

  const [moon, setMoon] = useState<CurrentMoonPhase | null>(null)
  const [transits, setTransits] = useState<TransitAspect[]>([])
  const [energy, setEnergy] = useState<EnergyRating | null>(null)
  const [gptText, setGptText] = useState<string | null>(null)
  const [gptLoading, setGptLoading] = useState(false)

  useEffect(() => {
    const currentMoon = getCurrentMoonPhase(now)
    setMoon(currentMoon)

    if (chartData) {
      const top = getTopActiveTransits(chartData, 3, 8)
      setTransits(top)
      const all = calculateTransitAspects(calculateCurrentPositions(now), chartData.planets, 'daily')
      setEnergy(computeEnergyRating(all))

      setGptLoading(true)
      getTodayPageInterpretation(
        currentMoon,
        top,
        personalDayNum,
        interpretation?.archetype ?? '',
      ).then(text => {
        setGptText(text)
      }).catch(() => {
        // silently hide if API call fails
      }).finally(() => {
        setGptLoading(false)
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleBack() {
    dispatch({ type: 'SET_VIEW', view: 'form' })
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-2 pb-16">
      {/* Back button */}
      <button
        type="button"
        onClick={handleBack}
        className="mb-8 text-mystic-muted hover:text-mystic-gold transition-colors text-sm font-heading"
      >
        ← Back
      </button>

      {/* Date header */}
      <div className="text-center mb-10">
        <p className="text-mystic-muted text-xs uppercase tracking-[0.25em] mb-1">Today</p>
        <h2 className="font-heading text-mystic-gold/70 text-lg">{dateHeader}</h2>
      </div>

      {/* Personal Day card */}
      <div className="border border-mystic-border rounded-xl bg-mystic-surface/50 p-8 mb-6 text-center">
        <p className="text-mystic-muted text-xs uppercase tracking-widest mb-4">Personal Day</p>
        <div
          className="font-heading mb-3 leading-none"
          style={{ fontSize: 'clamp(4rem, 15vw, 7rem)', color: '#c9a84c' }}
        >
          {personalDayNum}
        </div>
        {interpretation && (
          <>
            <p className="font-heading text-xl mb-4" style={{ color: '#7c5cbf' }}>
              {interpretation.archetype}
            </p>
            {firstSentence && (
              <p className="text-mystic-text/80 text-sm leading-relaxed max-w-md mx-auto">
                {firstSentence}
              </p>
            )}
            {interpretation.keywords && (
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {interpretation.keywords.map(kw => (
                  <span
                    key={kw}
                    className="text-xs px-3 py-1 rounded-full border"
                    style={{ borderColor: 'rgba(201,168,76,0.25)', color: 'rgba(201,168,76,0.7)', background: 'rgba(201,168,76,0.06)' }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Moon card */}
      <div className="border border-mystic-border rounded-xl bg-mystic-surface/50 p-6 mb-6">
        <p className="text-mystic-muted text-xs uppercase tracking-widest mb-4">Moon</p>
        {moon ? (
          <div className="flex items-center gap-4">
            <span className="text-5xl leading-none">{PHASE_EMOJIS[moon.phaseName] ?? '🌙'}</span>
            <div>
              <p className="font-heading text-lg text-mystic-gold">{moon.phaseName}</p>
              <p className="text-mystic-text/80 text-sm">
                in {ZODIAC_GLYPHS[moon.moonSign as keyof typeof ZODIAC_GLYPHS] ?? ''} {moon.moonSign}
                {' '}· {Math.round(moon.illumination)}% illuminated
              </p>
              {moon.isVoid && (
                <p className="text-orange-400 text-xs mt-1">Void of course · avoid major commitments</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-mystic-muted text-sm">Reading the lunar sky…</p>
        )}
      </div>

      {/* Sky Highlights card */}
      <div className="border border-mystic-border rounded-xl bg-mystic-surface/50 p-6 mb-6">
        <p className="text-mystic-muted text-xs uppercase tracking-widest mb-4">Sky Highlights</p>
        {chartData ? (
          transits.length > 0 ? (
            <div className="space-y-3">
              {transits.map((a, i) => {
                const g1 = PLANET_GLYPHS[a.transitPlanet as PlanetName | 'NorthNode'] ?? a.transitPlanet
                const g2 = PLANET_GLYPHS[a.natalPlanet as PlanetName | 'NorthNode'] ?? a.natalPlanet
                const keyword = getAspectKeyword(a.transitPlanet, a.nature)
                const natureColor = a.nature === 'harmonious'
                  ? 'text-emerald-400'
                  : a.nature === 'challenging'
                    ? 'text-orange-400'
                    : 'text-mystic-muted'
                return (
                  <div key={i} className="flex items-center justify-between">
                    <span className="font-heading text-lg text-mystic-gold/90 tracking-widest">
                      {g1} {a.symbol} {g2}
                    </span>
                    <span className={`text-xs font-medium ${natureColor}`}>{keyword}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-mystic-muted text-sm italic">No tight transit aspects active right now.</p>
          )
        ) : (
          <p className="text-mystic-muted text-sm italic">Enter birth data to see your transit highlights.</p>
        )}
      </div>

      {/* Transit Energy card (only when chart available) */}
      {chartData && energy && (
        <div className="border border-mystic-border rounded-xl bg-mystic-surface/50 p-5 mb-6">
          <p className="text-mystic-muted text-xs uppercase tracking-widest mb-3">Transit Energy</p>
          <div className="flex items-center gap-3">
            <span className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <span
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full ${i <= energy.score ? energy.dotColor : 'bg-mystic-gold/15'}`}
                />
              ))}
            </span>
            <span className={`font-heading text-base ${energy.textColor}`}>{energy.label}</span>
          </div>
        </div>
      )}

      {/* GPT Morning Synthesis (only if API key set) */}
      {chartData && (gptLoading || gptText) && (
        <div className="border border-mystic-border rounded-xl bg-mystic-surface/50 p-6 mb-6">
          <p className="text-mystic-muted text-xs uppercase tracking-widest mb-4">Morning Synthesis</p>
          {gptLoading && !gptText && (
            <GptSkeleton label="Reading today's sky for you..." accentColor="gold" lines={5} />
          )}
          {gptText && (
            <>
              <p className="text-mystic-text/90 text-sm leading-relaxed">{gptText}</p>
              {getGptNudge() && <p className="text-mystic-muted/60 text-xs mt-3">{getGptNudge()}</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
