import { useEffect, useState } from 'react'
import type { ChartData } from '../../engine/types'
import { ZODIAC_GLYPHS } from '../../engine/types'
import { calculateCurrentPositions, calculateTransitAspects, computeEnergyRating } from '../../engine/transits'
import type { TransitAspect, EnergyRating } from '../../engine/transits'
import { getCurrentMoonPhase } from '../../engine/lunar'
import type { CurrentMoonPhase } from '../../engine/lunar'
import { getDailySnapshotInterpretation, getGptNudge } from '../../services/gptInterpretation'
import { calculatePersonalDay } from '../../engine/numerology'
import { isQuotaError } from '../../utils/storage'
import { buildKeyAspectSentence } from '../../data/interpretations/aspectKeywords'
import type { MarkerCategory } from '../../engine/advanceScoring'
import { CATEGORY_LABELS } from './AdvanceTab'

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

function buildSnapshotPrompt(chart: ChartData, moon: CurrentMoonPhase, aspects: TransitAspect[]): string {
  const sun = chart.planets.find(p => p.name === 'Sun')
  const moonNatal = chart.planets.find(p => p.name === 'Moon')
  const asc = chart.houses?.[0]

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  const aspectLines = aspects.slice(0, 6).map(a =>
    `${a.transitPlanet} ${a.symbol} natal ${a.natalPlanet} (${a.type}, ${a.nature}, orb ${a.orb}°, ${a.applying ? 'applying' : 'separating'})`
  ).join('\n')

  return `Write a 2-3 sentence personalized daily astrological briefing for ${today}.

Natal chart:
- Sun: ${sun?.sign} ${sun?.degree}°
- Moon: ${moonNatal?.sign} ${moonNatal?.degree}°
${asc ? `- Ascendant: ${asc.sign}` : ''}

Today's Moon: ${moon.moonSign}, ${moon.phaseName}, ${Math.round(moon.illumination)}% illuminated${moon.isVoid ? ' (void of course — avoid major decisions)' : ''}

Active transit aspects today (tightest first):
${aspectLines || 'No tight aspects active today.'}

Write 2-3 specific, honest sentences about what this person's day looks like astrologically. Be direct and personal.`
}

function personalDayArchetype(n: number): string {
  const archetypes: Record<number, string> = {
    1: 'The Pioneer', 2: 'The Peacemaker', 3: 'The Communicator',
    4: 'The Builder', 5: 'The Explorer', 6: 'The Nurturer',
    7: 'The Seeker', 8: 'The Powerhouse', 9: 'The Sage',
    11: 'The Illuminator', 22: 'The Architect', 33: 'The Healer',
  }
  return archetypes[n] ?? ''
}

const ADVANCE_SIGNAL_GLYPHS: Partial<Record<MarkerCategory, string>> = {
  power: '✦',
  favorable: '◆',
  challenging: '◆',
  shift: '◆',
}

const ADVANCE_SIGNAL_COLORS: Partial<Record<MarkerCategory, string>> = {
  power: 'text-mystic-gold',
  favorable: 'text-emerald-400',
  challenging: 'text-red-400',
  shift: 'text-blue-400',
}

const CACHE_PREFIX = 'daily-snapshot-'

function getCacheKey(chart: ChartData): string {
  const sun = chart.planets.find(p => p.name === 'Sun')
  const moon = chart.planets.find(p => p.name === 'Moon')
  const asc = chart.houses?.[0]
  const today = new Date().toISOString().split('T')[0]
  return `${CACHE_PREFIX}${sun?.longitude?.toFixed(4)}-${asc?.sign ?? 'unknown'}-${moon?.sign ?? 'unknown'}-${today}`
}

export default function DailySnapshotCard({ chart, birthDate, embedded }: { chart: ChartData; birthDate?: string; embedded?: boolean }) {
  const personalDay = birthDate ? calculatePersonalDay(birthDate) : null
  const personalDayLabel = personalDay !== null ? personalDayArchetype(personalDay) : null

  const [text, setText] = useState<string | null>(null)
  const [energy, setEnergy] = useState<EnergyRating | null>(null)
  const [moon, setMoon] = useState<CurrentMoonPhase | null>(null)
  const [topAspect, setTopAspect] = useState<TransitAspect | null>(null)
  const [aspectReady, setAspectReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [advanceSignal, setAdvanceSignal] = useState<{ category: MarkerCategory; intensity: number; reason: string } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const todayStr = new Date().toISOString().split('T')[0]
      try {
        const raw = localStorage.getItem(`advance-today-signal-${todayStr}`)
        if (raw) {
          const parsed = JSON.parse(raw) as { category: MarkerCategory; intensity: number; reason: string }
          if (parsed.category !== 'neutral' && parsed.intensity >= 0.25) {
            if (!cancelled) setAdvanceSignal({ category: parsed.category, intensity: parsed.intensity, reason: parsed.reason })
          } else {
            if (!cancelled) setAdvanceSignal(null)
          }
        } else {
          if (!cancelled) setAdvanceSignal(null)
        }
        // Opportunistic cleanup of yesterday's stale key
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        try { localStorage.removeItem(`advance-today-signal-${yesterday.toISOString().split('T')[0]}`) } catch { /* ignore */ }
      } catch {
        // ignore advance signal read errors
      }

      const cacheKey = getCacheKey(chart)

      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const parsed = JSON.parse(cached) as { text: string; energy: EnergyRating; moon: CurrentMoonPhase; topAspect: TransitAspect | null }
          if (!cancelled) {
            setText(parsed.text)
            setEnergy(parsed.energy)
            setMoon(parsed.moon)
            setTopAspect(parsed.topAspect)
            setAspectReady(true)
            setLoading(false)
          }
          return
        }
      } catch {
        // ignore cache read errors
      }

      try {
        const now = new Date()
        const currentMoon = getCurrentMoonPhase(now)
        const transitPlanets = calculateCurrentPositions(now)
        const aspects = calculateTransitAspects(transitPlanets, chart.planets, 'daily')
        const rating = computeEnergyRating(aspects)
        const best = aspects[0] ?? null

        if (!cancelled) {
          setMoon(currentMoon)
          setEnergy(rating)
          setTopAspect(best)
          setAspectReady(true)
        }

        const prompt = buildSnapshotPrompt(chart, currentMoon, aspects)
        // Stagger GPT call on first mount to avoid colliding with concurrent transit/synastry calls
        if (refreshTick === 0) {
          await new Promise<void>(r => setTimeout(r, 500))
          if (cancelled) return
        }
        const result = await getDailySnapshotInterpretation(prompt)

        if (!cancelled) {
          setText(result)
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ text: result, energy: rating, moon: currentMoon, topAspect: best }))
          } catch (e) {
            if (isQuotaError(e)) {
              console.warn('[DailySnapshot] localStorage quota exceeded — snapshot cache not written.')
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load daily snapshot.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [chart, refreshTick])

  function handleRefresh() {
    const cacheKey = getCacheKey(chart)
    try { localStorage.removeItem(cacheKey) } catch { /* ignore */ }
    setText(null)
    setEnergy(null)
    setMoon(null)
    setTopAspect(null)
    setAspectReady(false)
    setRefreshTick(t => t + 1)
  }

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className={`${embedded ? 'mb-4' : 'mb-8'} border border-mystic-gold/30 rounded-xl overflow-hidden bg-gradient-to-b from-mystic-gold/5 to-transparent`}>
      {/* header bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-mystic-gold/15">
        <div className="flex items-center gap-2">
          <span className="text-mystic-gold text-lg">☀</span>
          <span className="font-heading text-mystic-gold text-base">Daily Snapshot</span>
          <span className="text-mystic-muted text-xs ml-1">— {todayLabel}</span>
        </div>
        {!loading && (
          <button
            onClick={handleRefresh}
            className="text-mystic-muted text-xs hover:text-mystic-gold transition-colors"
            title="Refresh snapshot"
          >
            ↻ ask again
          </button>
        )}
      </div>

      <div className="px-5 py-4">
        {/* pill row */}
        <div className="flex flex-wrap gap-3 mb-4">
          {moon && (
            <div className="flex items-center gap-1.5 bg-mystic-gold/8 border border-mystic-gold/20 rounded-full px-3 py-1">
              <span className="text-base leading-none">{PHASE_EMOJIS[moon.phaseName] ?? '🌙'}</span>
              <span className="text-mystic-gold text-xs font-medium">
                {moon.phaseName} in {ZODIAC_GLYPHS[moon.moonSign as keyof typeof ZODIAC_GLYPHS] ?? ''} {moon.moonSign}
              </span>
              {moon.isVoid && (
                <span className="text-orange-400 text-xs ml-1">· void · decisions may need revisiting</span>
              )}
            </div>
          )}

          {energy && (
            <div className="flex items-center gap-2 bg-mystic-gold/8 border border-mystic-gold/20 rounded-full px-3 py-1">
              <span className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${i <= energy.score ? energy.dotColor : 'bg-mystic-gold/15'}`}
                  />
                ))}
              </span>
              <span className={`text-xs font-medium ${energy.textColor}`}>{energy.label}</span>
            </div>
          )}

          {topAspect && aspectReady && (
            <div className="flex items-center gap-1.5 bg-mystic-gold/8 border border-mystic-gold/20 rounded-full px-3 py-1">
              <span className="text-mystic-muted text-xs italic">
                {buildKeyAspectSentence(topAspect)}
              </span>
            </div>
          )}

          {advanceSignal && (
            <div className="flex items-center gap-1.5 bg-mystic-gold/8 border border-mystic-gold/20 rounded-full px-3 py-1">
              <span className={`${ADVANCE_SIGNAL_COLORS[advanceSignal.category]} text-xs`}>
                {ADVANCE_SIGNAL_GLYPHS[advanceSignal.category]}
              </span>
              <span className={`${ADVANCE_SIGNAL_COLORS[advanceSignal.category]} text-xs font-medium`}>
                {CATEGORY_LABELS[advanceSignal.category]}
              </span>
            </div>
          )}
        </div>

        {/* personal day line */}
        {personalDay !== null && (
          <p className="text-mystic-gold/70 text-xs mb-4">
            Personal Day {personalDay}{personalDayLabel ? ` · ${personalDayLabel}` : ''}
          </p>
        )}

        {/* main reading */}
        {loading && (
          <div className="flex items-center gap-2 text-mystic-muted text-sm py-2">
            <span className="animate-pulse">✦</span>
            <span>Reading today's sky for your chart…</span>
          </div>
        )}

        {error && !loading && (
          <p className="text-mystic-muted text-sm italic">{error}</p>
        )}

        {text && !loading && (
          <>
            <p className="text-mystic-text/90 text-sm leading-relaxed">{text}</p>
            {getGptNudge() && <p className="text-mystic-muted/60 text-xs mt-2">{getGptNudge()}</p>}
          </>
        )}
      </div>
    </div>
  )
}
