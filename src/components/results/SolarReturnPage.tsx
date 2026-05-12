import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { calculateSolarReturn } from '../../engine/solarReturn'
import { calculateAspects } from '../../engine/aspects'
import type { ChartData } from '../../engine/types'
import type { Aspect } from '../../engine/aspects'
import { PLANET_GLYPHS, ZODIAC_GLYPHS } from '../../engine/types'
import ChartWheel from '../chart/ChartWheel'
import DiscussModal from '../discuss/DiscussModal'
import { SR_SUN_BY_HOUSE, SR_MOON_BY_SIGN, SR_ASC_BY_SIGN } from '../../data/interpretations/solarReturn'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatReturnDate(date: Date, tz: string): string {
  try {
    return date.toLocaleDateString('en-US', {
      timeZone: tz,
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }) + ' at ' + date.toLocaleTimeString('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return date.toUTCString()
  }
}

function natureColor(nature: string): string {
  if (nature === 'harmonious') return 'text-green-400'
  if (nature === 'challenging') return 'text-red-400'
  return 'text-mystic-gold'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HighlightCard({ icon, title, subtitle, brief }: {
  icon: string
  title: string
  subtitle: string
  brief: string
}) {
  return (
    <div className="bg-mystic-gold/5 border border-mystic-gold/20 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="font-heading text-mystic-gold text-sm">{title}</span>
      </div>
      <p className="text-mystic-muted text-xs mb-1">{subtitle}</p>
      <p className="text-mystic-text/80 text-xs leading-relaxed">{brief}</p>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SolarReturnPage() {
  const { state, dispatch } = useApp()
  const { chartData: natalChart, birthData } = state

  const now = new Date()
  const [srYear, setSrYear] = useState(now.getFullYear())
  const [loading, setLoading] = useState(false)
  const [srChart, setSrChart] = useState<ChartData | null>(null)
  const [srAspects, setSrAspects] = useState<Aspect[]>([])
  const [returnDate, setReturnDate] = useState<Date | null>(null)
  const [discussOpen, setDiscussOpen] = useState(false)

  const city = birthData.city
  const tz = city?.tz ?? 'UTC'

  // Parse birth month/day from birthData.date ('YYYY-MM-DD')
  const [, birthMonth, birthDay] = useMemo(() => {
    if (!birthData.date) return [2000, 1, 1]
    return birthData.date.split('-').map(Number)
  }, [birthData.date])

  const natalSunLongitude = useMemo(() => {
    return natalChart?.planets.find(p => p.name === 'Sun')?.longitude ?? 0
  }, [natalChart])

  useEffect(() => {
    if (!natalChart || !city) return

    setLoading(true)
    // Defer to next tick to let loading state render
    const timer = setTimeout(() => {
      try {
        const { chart, returnDate: rd } = calculateSolarReturn(
          natalSunLongitude,
          birthMonth,
          birthDay,
          srYear,
          city.lat,
          city.lng,
          tz,
        )
        const aspects = calculateAspects(chart.planets)
        setSrChart(chart)
        setSrAspects(aspects)
        setReturnDate(rd)
      } catch (e) {
        console.error('Solar return calculation error:', e)
      } finally {
        setLoading(false)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [srYear, natalSunLongitude, birthMonth, birthDay, city, tz]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!natalChart) return null

  const srSun = srChart?.planets.find(p => p.name === 'Sun')
  const srMoon = srChart?.planets.find(p => p.name === 'Moon')
  const srAsc = srChart?.angles.ascendant

  const sunHighlight = srSun ? SR_SUN_BY_HOUSE[srSun.house] : null
  const moonHighlight = srMoon ? SR_MOON_BY_SIGN[srMoon.sign] : null
  const ascHighlight = srAsc ? SR_ASC_BY_SIGN[srAsc.sign] : null

  // Top 3 tightest aspects
  const topAspects = [...srAspects]
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 3)

  const formattedDate = returnDate ? formatReturnDate(returnDate, tz) : null


  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="font-heading text-3xl text-mystic-gold mb-1">
          ☉ Solar Return {srYear}
        </h2>
        {formattedDate && (
          <p className="text-mystic-muted text-sm">
            Your birthday chart for {formattedDate}
          </p>
        )}
        <p className="text-mystic-muted/60 text-xs mt-1">
          Calculated for {city ? `${city.name}, ${city.country}` : 'birth location'}
        </p>
      </div>

      {/* Year navigation */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <button
          type="button"
          onClick={() => setSrYear(y => y - 1)}
          className="px-4 py-2 bg-mystic-surface border border-mystic-border text-mystic-muted font-heading rounded-lg hover:border-mystic-gold/40 hover:text-mystic-text transition-colors"
          disabled={loading}
        >
          &larr; Previous
        </button>
        <span className="font-heading text-xl text-mystic-gold min-w-[80px] text-center">{srYear}</span>
        <button
          type="button"
          onClick={() => setSrYear(y => y + 1)}
          className="px-4 py-2 bg-mystic-surface border border-mystic-border text-mystic-muted font-heading rounded-lg hover:border-mystic-gold/40 hover:text-mystic-text transition-colors"
          disabled={loading}
        >
          Next &rarr;
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16" role="status" aria-live="polite">
          <div className="text-4xl mb-4 animate-spin" style={{ animationDuration: '3s' }} aria-hidden="true">☉</div>
          <p className="text-mystic-gold font-heading text-xl animate-pulse">Finding your solar return...</p>
        </div>
      ) : srChart ? (
        <>
          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Left: Chart wheel */}
            <div className="flex flex-col items-center">
              <ChartWheel chartData={srChart} aspects={srAspects} />
            </div>

            {/* Right: Key highlights */}
            <div className="flex flex-col gap-4">
              <h3 className="font-heading text-lg text-mystic-gold">Key Themes for {srYear}</h3>

              {/* SR Ascendant */}
              {srAsc && ascHighlight && (
                <HighlightCard
                  icon={ZODIAC_GLYPHS[srAsc.sign]}
                  title={`SR Ascendant: ${srAsc.sign}`}
                  subtitle={ascHighlight.title}
                  brief={ascHighlight.brief}
                />
              )}

              {/* SR Sun in house */}
              {srSun && sunHighlight && (
                <HighlightCard
                  icon={PLANET_GLYPHS.Sun}
                  title={`SR Sun in House ${srSun.house}`}
                  subtitle={sunHighlight.title}
                  brief={sunHighlight.brief}
                />
              )}

              {/* SR Moon */}
              {srMoon && moonHighlight && (
                <HighlightCard
                  icon={PLANET_GLYPHS.Moon}
                  title={`SR Moon in ${srMoon.sign} (House ${srMoon.house})`}
                  subtitle={moonHighlight.title}
                  brief={moonHighlight.brief}
                />
              )}

              {/* Top 3 SR aspects */}
              {topAspects.length > 0 && (
                <div className="bg-mystic-surface/50 border border-mystic-border rounded-lg p-4">
                  <h4 className="font-heading text-mystic-gold text-sm mb-3">Strongest Aspects</h4>
                  <div className="space-y-2">
                    {topAspects.map((a, i) => {
                      const g1 = PLANET_GLYPHS[a.planet1 as keyof typeof PLANET_GLYPHS] ?? '☊'
                      const g2 = PLANET_GLYPHS[a.planet2 as keyof typeof PLANET_GLYPHS] ?? '☊'
                      return (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span>{g1}</span>
                          <span className={natureColor(a.nature)}>{a.symbol}</span>
                          <span>{g2}</span>
                          <span className="text-mystic-text flex-1">{a.planet1} {a.type} {a.planet2}</span>
                          <span className="text-mystic-muted text-xs">{a.orb.toFixed(1)}°</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Planet positions for this SR */}
          <div className="border border-mystic-gold/20 rounded-lg overflow-hidden mb-6">
            <div className="px-5 py-3 bg-mystic-gold/5">
              <span className="font-heading text-lg text-mystic-gold">Solar Return Planets ({srYear})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-mystic-gold/10 text-mystic-muted text-xs uppercase tracking-wider">
                    <th className="text-left px-5 py-2">Planet</th>
                    <th className="text-left px-3 py-2">Sign</th>
                    <th className="text-left px-3 py-2">Degree</th>
                    <th className="text-left px-3 py-2">House</th>
                    <th className="text-left px-3 py-2">Rx</th>
                  </tr>
                </thead>
                <tbody>
                  {srChart.planets.map((p) => (
                    <tr key={p.name} className="border-b border-mystic-gold/5">
                      <td className="px-5 py-2 text-mystic-text">
                        <span className="mr-2">{PLANET_GLYPHS[p.name as keyof typeof PLANET_GLYPHS] ?? '☊'}</span>
                        {p.name}
                      </td>
                      <td className="px-3 py-2 text-mystic-gold">{ZODIAC_GLYPHS[p.sign]} {p.sign}</td>
                      <td className="px-3 py-2 text-mystic-muted">{p.degree}°{p.minute.toString().padStart(2, '0')}'</td>
                      <td className="px-3 py-2 text-mystic-muted">{p.house}</td>
                      <td className="px-3 py-2 text-mystic-muted">{p.retrograde ? '℞' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons */}
          <div className="text-center mb-12 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setDiscussOpen(true)}
              className="px-8 py-3 bg-mystic-blue/10 border border-mystic-blue/30 text-mystic-blue font-heading rounded-lg hover:bg-mystic-blue/20 transition-colors"
            >
              Discuss ✦
            </button>
            <button
              onClick={() => dispatch({ type: 'SET_VIEW', view: 'results' })}
              className="px-8 py-3 bg-mystic-gold/10 border border-mystic-gold/30 text-mystic-gold font-heading rounded-lg hover:bg-mystic-gold/20 transition-colors"
            >
              ← Back to Birth Chart
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-mystic-muted">
          Unable to calculate solar return. Please check your birth data.
        </div>
      )}

      <DiscussModal
        open={discussOpen}
        onClose={() => setDiscussOpen(false)}
        mode="birth"
      />
    </div>
  )
}
