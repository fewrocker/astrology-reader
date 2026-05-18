import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { ChartData, PlanetName } from '../../engine/types'
import { ZODIAC_GLYPHS } from '../../engine/types'
import { calculateCurrentPositions, calculateTransitAspects, getTopActiveTransits, computeEnergyRating } from '../../engine/transits'
import type { TransitAspect, EnergyRating } from '../../engine/transits'
import { getCurrentMoonPhase } from '../../engine/lunar'
import type { CurrentMoonPhase } from '../../engine/lunar'
import { calculatePersonalDay } from '../../engine/numerology'
import { getInterpretation } from '../../data/numerologyInterpretations'
import { getTodayPageInterpretation, getGptNudge } from '../../services/gptInterpretation'
import GptSkeleton from '../ui/GptSkeleton'
import AspectRow from '../reading/AspectRow'
import { computeTransitAspectBrief } from '../../data/interpretations/transitAspectBriefs'
import { track } from '../../services/analytics'
import type { SnapshotScore } from '../../engine/advanceScoring'
import { advanceSnapshotSessionCache, CATEGORY_LABELS } from './AdvanceTab'

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

interface TodayPageProps {
  chartData: ChartData | null
  birthDate: string
}

export default function TodayPage({ chartData, birthDate }: TodayPageProps) {
  const { dispatch } = useApp()

  useEffect(() => { track('reading_viewed', { reading_type: 'today' }) }, [])

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
  const [advanceScore, setAdvanceScore] = useState<SnapshotScore | null>(null)

  useEffect(() => {
    const currentMoon = getCurrentMoonPhase(now)
    setMoon(currentMoon)

    if (chartData) {
      const top = getTopActiveTransits(chartData, 3, 5)
      setTransits(top)
      const all = calculateTransitAspects(calculateCurrentPositions(now), chartData.planets, 'daily')
      setEnergy(computeEnergyRating(all))

      // Derive today's advance signal from the module-level session cache (spec 2, 8).
      // Synchronous Map iteration — no computation triggered here.
      const chartKey = `${chartData.angles.ascendant.longitude.toFixed(4)}:${chartData.angles.midheaven.longitude.toFixed(4)}:${chartData.unknownTime}`
      const todayStr = new Date().toISOString().slice(0, 10)
      outer: for (const period of ['daily', 'weekly', 'monthly'] as const) {
        for (const [key, snapshots] of advanceSnapshotSessionCache.entries()) {
          if (!key.startsWith(`${chartKey}:${period}:`)) continue
          const todaySnap = snapshots.find(s => s.dateStr === todayStr)
          if (!todaySnap || todaySnap.score.category === 'neutral') continue
          setAdvanceScore(todaySnap.score)
          break outer
        }
      }

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

      {/* Advance signal banner — shown only when session cache has a non-neutral score for today */}
      {chartData && advanceScore && advanceScore.category !== 'neutral' && (
        <div className={`mb-6 rounded-xl border border-l-2 px-4 py-3 flex items-start gap-2 ${
          advanceScore.category === 'power'
            ? 'border-mystic-gold/30 border-l-mystic-gold bg-mystic-gold/10'
            : advanceScore.category === 'favorable'
              ? 'border-green-500/30 border-l-green-500 bg-green-900/10'
              : advanceScore.category === 'challenging'
                ? 'border-red-500/30 border-l-red-500 bg-red-900/10'
                : 'border-blue-500/30 border-l-blue-500 bg-blue-900/10'
        }`}>
          <span className={`mt-0.5 shrink-0 ${
            advanceScore.category === 'power'
              ? 'text-mystic-gold'
              : advanceScore.category === 'favorable'
                ? 'text-green-400'
                : advanceScore.category === 'challenging'
                  ? 'text-red-400'
                  : 'text-blue-400'
          }`}>
            {advanceScore.category === 'challenging' ? '⚠' :
             advanceScore.category === 'shift' ? '◆' : '✦'}
          </span>
          <div>
            <p className="text-mystic-muted text-xs uppercase tracking-widest mb-1">
              {CATEGORY_LABELS[advanceScore.category]}
            </p>
            <p className={`text-sm ${
              advanceScore.category === 'power'
                ? 'text-mystic-gold/90'
                : advanceScore.category === 'favorable'
                  ? 'text-green-400/90'
                  : advanceScore.category === 'challenging'
                    ? 'text-red-400/90'
                    : 'text-blue-400/90'
            }`}>
              <span className="font-heading">{advanceScore.bannerBoldFragment ?? advanceScore.reason.split(' ')[0]}</span>
              {' ' + advanceScore.reason.slice((advanceScore.bannerBoldFragment ?? advanceScore.reason.split(' ')[0]).length).trimStart()}
            </p>
            {advanceScore.guidance && (
              <p className="text-xs text-mystic-muted/80 mt-1.5 font-light leading-relaxed">
                {advanceScore.guidance}
              </p>
            )}
          </div>
        </div>
      )}

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
            <>
              {transits.map((a) => (
                <AspectRow
                  key={`${a.transitPlanet}-${a.natalPlanet}-${a.type}`}
                  transitPlanet={a.transitPlanet}
                  natalPlanet={a.natalPlanet}
                  aspectType={a.type}
                  nature={a.nature}
                  symbol={a.symbol}
                  orb={a.orb}
                  applying={a.applying}
                  brief={computeTransitAspectBrief(a.transitPlanet as (PlanetName | 'NorthNode'), a.type, a.natalPlanet as (PlanetName | 'NorthNode'), a.natalHouse, a.nature, a.applying)}
                />
              ))}
            </>
          ) : (
            <p className="text-mystic-muted text-sm italic">No tight transit aspects active right now.</p>
          )
        ) : (
          <p className="text-mystic-muted text-sm italic">Enter birth data to see your transit highlights.</p>
        )}
      </div>

      {/* Transit Energy card (only when chart available and advance score is absent or neutral) */}
      {chartData && energy && !(advanceScore && advanceScore.category !== 'neutral') && (
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
