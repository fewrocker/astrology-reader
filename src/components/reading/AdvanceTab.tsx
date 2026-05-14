import { useMemo, useState, useCallback } from 'react'
import type { TransitPeriod, TransitPosition, TransitAspect } from '../../engine/transits'
import { calculateCurrentPositions, calculateTransitAspects, assignTransitHouses, getRetrogradeStatus } from '../../engine/transits'
import type { ChartData, PlanetName, ZodiacSign } from '../../engine/types'
import { PLANET_GLYPHS, ZODIAC_GLYPHS } from '../../engine/types'
import { formatPosition } from '../../engine/zodiac'
import type { Aspect } from '../../engine/aspects'
import ChartWheel from '../chart/ChartWheel'
import AspectRow from './AspectRow'

import { TRANSIT_RETROGRADE } from '../../data/interpretations/retrogrades'
import { computeTransitAspectBrief } from '../../data/interpretations/transitAspectBriefs'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdvanceSnapshot {
  offset: number
  date: Date
  dateStr: string
  transitPlanets: TransitPosition[]
  housedTransitPlanets: TransitPosition[]
  transitAspects: TransitAspect[]
  retrogrades: { planet: PlanetName; isRetro: boolean; status: string }[]
}

interface AdvanceConfig {
  unit: string
  unitPlural: string
  max: number
  msPerStep: number
}

const ADVANCE_CONFIG: Record<TransitPeriod, AdvanceConfig> = {
  daily: { unit: 'day', unitPlural: 'days', max: 30, msPerStep: 86400000 },
  weekly: { unit: 'week', unitPlural: 'weeks', max: 52, msPerStep: 7 * 86400000 },
  monthly: { unit: 'month', unitPlural: 'months', max: 36, msPerStep: 30.44 * 86400000 }, // average month
}

// ─── Pre-calculator ──────────────────────────────────────────────────────────

function preCalculateSnapshots(
  chartData: ChartData,
  period: TransitPeriod,
  baseDate: Date,
): AdvanceSnapshot[] {
  const config = ADVANCE_CONFIG[period]
  const snapshots: AdvanceSnapshot[] = []

  for (let i = 0; i <= config.max; i++) {
    let targetDate: Date

    if (period === 'monthly') {
      // Use proper month arithmetic to avoid drift
      targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate())
    } else {
      targetDate = new Date(baseDate.getTime() + i * config.msPerStep)
    }

    const transitPlanets = calculateCurrentPositions(targetDate)
    const transitAspects = calculateTransitAspects(transitPlanets, chartData.planets, period)
    const retrogrades = getRetrogradeStatus(targetDate)
    const housedTransitPlanets = assignTransitHouses(transitPlanets, chartData.houses)

    snapshots.push({
      offset: i,
      date: targetDate,
      dateStr: targetDate.toISOString().split('T')[0],
      transitPlanets,
      housedTransitPlanets,
      transitAspects,
      retrogrades,
    })
  }

  return snapshots
}

// ─── Advance Tab Component ───────────────────────────────────────────────────

export default function AdvanceTab({
  chartData,
  aspects,
  period,
  baseDate,
}: {
  chartData: ChartData
  aspects: Aspect[]
  period: TransitPeriod
  baseDate: Date
}) {
  const config = ADVANCE_CONFIG[period]

  // Pre-calculate all snapshots once
  const snapshots = useMemo(
    () => preCalculateSnapshots(chartData, period, baseDate),
    [chartData, period, baseDate],
  )

  const [offset, setOffset] = useState(0)

  const snapshot = snapshots[offset]

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setOffset(Number(e.target.value))
  }, [])

  if (!snapshot) return null

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })

  const offsetLabel =
    offset === 0 ? 'Now' :
    offset === 1 ? `+1 ${config.unit}` :
    `+${offset} ${config.unitPlural}`

  // Count significant aspects
  const harmonious = snapshot.transitAspects.filter(a => a.nature === 'harmonious').length
  const challenging = snapshot.transitAspects.filter(a => a.nature === 'challenging').length
  const activeRetrogrades = snapshot.retrogrades.filter(r => r.isRetro || r.status.includes('Stationing')).length

  return (
    <div>
      {/* Slider control */}
      <div className="bg-mystic-surface/50 border border-mystic-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-mystic-muted text-xs uppercase tracking-widest">Advance Time</span>
          <span className="font-heading text-lg text-mystic-gold">{offsetLabel}</span>
        </div>

        <input
          type="range"
          min={0}
          max={config.max}
          value={offset}
          onChange={handleSlider}
          className="w-full h-2 bg-mystic-bg rounded-lg appearance-none cursor-pointer accent-mystic-gold
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-mystic-gold
            [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(201,168,76,0.5)] [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-track]:bg-mystic-border [&::-webkit-slider-track]:rounded-lg"
        />

        <div className="flex justify-between mt-2 text-mystic-muted text-[10px]">
          <span>Now</span>
          <span>{config.max} {config.unitPlural}</span>
        </div>

        {/* Date display */}
        <div className="text-center mt-3">
          <p className="text-mystic-gold font-heading text-base">{formatDate(snapshot.date)}</p>
        </div>

        {/* Quick stats */}
        <div className="flex justify-center gap-4 mt-3">
          <span className="text-xs text-mystic-muted">
            <span className="text-mystic-gold font-medium">{snapshot.transitAspects.length}</span> aspects
          </span>
          <span className="text-xs">
            <span className="text-green-400 font-medium">{harmonious}</span>
            <span className="text-mystic-muted"> harmonious</span>
          </span>
          <span className="text-xs">
            <span className="text-red-400 font-medium">{challenging}</span>
            <span className="text-mystic-muted"> challenging</span>
          </span>
          {activeRetrogrades > 0 && (
            <span className="text-xs">
              <span className="text-red-400 font-medium">{activeRetrogrades}</span>
              <span className="text-mystic-muted"> ℞</span>
            </span>
          )}
        </div>
      </div>

      {/* Chart wheel */}
      <div className="flex justify-center mb-6">
        <div className="w-full max-w-2xl">
          <ChartWheel
            chartData={chartData}
            aspects={aspects}
            transitPlanets={snapshot.housedTransitPlanets}
            transitAspects={snapshot.transitAspects}
          />
          <p className="text-center text-mystic-muted text-xs mt-2">
            {offset === 0 ? 'Current transits' : `Transits on ${formatDate(snapshot.date)}`}
          </p>
        </div>
      </div>

      {/* Transit aspects */}
      {snapshot.transitAspects.length > 0 && (
        <div className="border border-mystic-gold/20 rounded-lg overflow-hidden mb-4">
          <div className="px-5 py-3 bg-mystic-gold/5">
            <span className="font-heading text-lg text-mystic-gold">Transit Aspects ({snapshot.transitAspects.length})</span>
          </div>
          <div className="px-5 py-4">
            {snapshot.transitAspects.map((a, i) => {
              // Spec 9: unknownTime guard — house is null when time is unknown
              // Spec 10: natal planet house lookup with house-0 guard (spec 17)
              const rawHouse = chartData.unknownTime
                ? null
                : (chartData.planets.find(p => p.name === a.natalPlanet)?.house ?? null)
              const natalHouse = rawHouse && rawHouse > 0 ? rawHouse : null

              const brief = computeTransitAspectBrief(
                a.transitPlanet,
                a.type,
                a.natalPlanet,
                natalHouse,
                a.nature,
                a.applying,
              )

              return (
                <AspectRow
                  key={i}
                  transitPlanet={a.transitPlanet}
                  natalPlanet={a.natalPlanet}
                  aspectType={a.type}
                  nature={a.nature}
                  symbol={a.symbol}
                  orb={a.orb}
                  applying={a.applying}
                  brief={brief}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Retrograde activity */}
      {(() => {
        const active = snapshot.retrogrades.filter(r => r.isRetro || r.status.includes('Stationing'))
        if (active.length === 0) return null
        return (
          <div className="border border-mystic-gold/20 rounded-lg overflow-hidden mb-4">
            <div className="px-5 py-3 bg-mystic-gold/5">
              <span className="font-heading text-lg text-mystic-gold">Retrograde Activity</span>
            </div>
            <div className="px-5 py-4 space-y-3">
              {active.map((r, i) => {
                const interp = TRANSIT_RETROGRADE[r.planet]
                return (
                  <div key={i} className="border border-red-500/15 bg-red-900/5 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg">{PLANET_GLYPHS[r.planet]}</span>
                      <span className="text-mystic-text text-sm font-medium">{r.planet}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${r.isRetro ? 'bg-red-900/30 text-red-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                        {r.status}
                      </span>
                    </div>
                    {interp && (
                      <div className="ml-8">
                        <p className="text-red-400/80 text-xs font-medium mb-1">{interp.brief}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Planet positions table */}
      <div className="border border-mystic-gold/20 rounded-lg overflow-hidden mb-4">
        <div className="px-5 py-3 bg-mystic-gold/5">
          <span className="font-heading text-lg text-mystic-gold">Planet Positions</span>
        </div>
        <div className="px-5 py-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-mystic-gold/10 text-mystic-muted text-xs uppercase tracking-wider">
                <th className="text-left px-3 py-2">Planet</th>
                <th className="text-left px-3 py-2">Sign</th>
                <th className="text-left px-3 py-2">Position</th>
                <th className="text-left px-3 py-2">Motion</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.transitPlanets.filter(p => p.name !== 'NorthNode').map(p => (
                <tr key={p.name} className="border-b border-mystic-gold/5">
                  <td className="px-3 py-2 text-mystic-text">
                    <span className="mr-2">{PLANET_GLYPHS[p.name as PlanetName] ?? '☊'}</span>
                    {p.name}
                  </td>
                  <td className="px-3 py-2 text-mystic-gold">{ZODIAC_GLYPHS[p.sign as ZodiacSign]} {p.sign}</td>
                  <td className="px-3 py-2 text-mystic-muted">{formatPosition(p)}</td>
                  <td className="px-3 py-2 text-mystic-muted">
                    {p.retrograde ? <span className="text-red-400">℞ Retrograde</span> : 'Direct'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
