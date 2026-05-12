import { useEffect, useState } from 'react'
import type { ChartData } from '../../engine/types'
import { ZODIAC_GLYPHS } from '../../engine/types'
import { calculateCurrentPositions, calculateTransitAspects } from '../../engine/transits'
import type { TransitAspect } from '../../engine/transits'
import { getCurrentMoonPhase } from '../../engine/lunar'
import type { CurrentMoonPhase } from '../../engine/lunar'
import { getDailySnapshotInterpretation, getStoredApiKey } from '../../services/gptInterpretation'

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

interface EnergyRating {
  label: string
  score: number
  dotColor: string
  textColor: string
}

function computeEnergyRating(aspects: TransitAspect[]): EnergyRating {
  const top = aspects.slice(0, 8)
  const score = top.reduce((acc, a) => {
    if (a.nature === 'harmonious') return acc + 1
    if (a.nature === 'challenging') return acc - 1
    return acc
  }, 0)

  if (score >= 3) return { label: 'Highly Favorable', score: 5, dotColor: 'bg-emerald-400', textColor: 'text-emerald-400' }
  if (score >= 1) return { label: 'Favorable', score: 4, dotColor: 'bg-green-400', textColor: 'text-green-400' }
  if (score === 0) return { label: 'Mixed', score: 3, dotColor: 'bg-yellow-400', textColor: 'text-yellow-400' }
  if (score >= -2) return { label: 'Tense', score: 2, dotColor: 'bg-orange-400', textColor: 'text-orange-400' }
  return { label: 'Demanding', score: 1, dotColor: 'bg-red-400', textColor: 'text-red-400' }
}

function buildSnapshotPrompt(chart: ChartData, moon: CurrentMoonPhase, aspects: TransitAspect[]): string {
  const sun = chart.planets.find(p => p.name === 'Sun')
  const moonNatal = chart.planets.find(p => p.name === 'Moon')
  const asc = chart.houseCusps?.[0]

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

const CACHE_PREFIX = 'daily-snapshot-'

function getCacheKey(chart: ChartData): string {
  const sun = chart.planets.find(p => p.name === 'Sun')
  const today = new Date().toISOString().split('T')[0]
  return `${CACHE_PREFIX}${sun?.longitude?.toFixed(0)}-${today}`
}

export default function DailySnapshotCard({ chart }: { chart: ChartData }) {
  const [text, setText] = useState<string | null>(null)
  const [energy, setEnergy] = useState<EnergyRating | null>(null)
  const [moon, setMoon] = useState<CurrentMoonPhase | null>(null)
  const [topAspect, setTopAspect] = useState<TransitAspect | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

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
        }

        const apiKey = getStoredApiKey()
        if (!apiKey) {
          if (!cancelled) {
            setError('Add an OpenAI API key to unlock the daily reading.')
            setLoading(false)
          }
          return
        }

        const prompt = buildSnapshotPrompt(chart, currentMoon, aspects)
        const result = await getDailySnapshotInterpretation(prompt, apiKey)

        if (!cancelled) {
          setText(result)
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ text: result, energy: rating, moon: currentMoon, topAspect: best }))
          } catch {
            // ignore cache write errors
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
    setRefreshTick(t => t + 1)
  }

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="mb-8 border border-mystic-gold/30 rounded-xl overflow-hidden bg-gradient-to-b from-mystic-gold/5 to-transparent">
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
            ↻ refresh
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
                <span className="text-orange-400 text-xs ml-1">· void</span>
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

          {topAspect && !loading && (
            <div className="flex items-center gap-1.5 bg-mystic-gold/8 border border-mystic-gold/20 rounded-full px-3 py-1">
              <span className="text-mystic-muted text-xs">
                Key: {topAspect.transitPlanet} {topAspect.symbol} natal {topAspect.natalPlanet}
              </span>
            </div>
          )}
        </div>

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
          <p className="text-mystic-text/90 text-sm leading-relaxed">{text}</p>
        )}
      </div>
    </div>
  )
}
