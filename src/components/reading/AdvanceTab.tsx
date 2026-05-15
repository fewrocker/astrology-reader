import { useMemo, useState, useEffect, useCallback, useTransition } from 'react'
import type { TransitPeriod, TransitPosition, TransitAspect } from '../../engine/transits'
import { calculateCurrentPositions, calculateTransitAspects, assignTransitHouses, getRetrogradeStatus, computeEnergyRating } from '../../engine/transits'
import type { ChartData, PlanetName, ZodiacSign } from '../../engine/types'
import { PLANET_GLYPHS, ZODIAC_GLYPHS, getBodyGlyph } from '../../engine/types'
import { formatPosition } from '../../engine/zodiac'
import { ASPECT_DEFINITIONS } from '../../engine/aspects'
import type { Aspect, AspectType } from '../../engine/aspects'
import ChartWheel from '../chart/ChartWheel'
import AspectRow from './AspectRow'

import { TRANSIT_RETROGRADE } from '../../data/interpretations/retrogrades'
import { computeTransitAspectBrief } from '../../data/interpretations/transitAspectBriefs'

// ─── Types ───────────────────────────────────────────────────────────────────

export type MarkerCategory = 'power' | 'favorable' | 'challenging' | 'shift' | 'neutral'

export interface SnapshotScore {
  category: MarkerCategory
  coShift: boolean
  intensity: number
  reason: string
  triggerAspect?: string
  shiftPlanet?: string
  shiftDirection?: 'retrograde' | 'direct'
}

interface AdvanceSnapshot {
  offset: number
  date: Date
  dateStr: string
  transitPlanets: TransitPosition[]
  housedTransitPlanets: TransitPosition[]
  transitAspects: TransitAspect[]
  retrogrades: { planet: PlanetName; isRetro: boolean; status: string }[]
  score: SnapshotScore
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

// ─── Orb Thresholds ──────────────────────────────────────────────────────────

const ORB_THRESHOLDS: Record<TransitPeriod, { angleContact: number; applyingTight: number; energyMinAspects: number }> = {
  daily:   { angleContact: 1.0, applyingTight: 2.0, energyMinAspects: 2 },
  weekly:  { angleContact: 2.0, applyingTight: 3.0, energyMinAspects: 3 },
  monthly: { angleContact: 3.0, applyingTight: 4.0, energyMinAspects: 2 },
}

// ─── Power Day Banner ─────────────────────────────────────────────────────────

/** Slow planets for the power-day angle-contact trigger (Jupiter excluded intentionally). */
const SLOW_PLANETS_FOR_BANNER = new Set<PlanetName>(['Saturn', 'Uranus', 'Neptune', 'Pluto'])

/** Verb to use in banner text per aspect type. */
const ASPECT_VERB_BANNER: Record<AspectType, string> = {
  conjunction: 'reaches',
  opposition: 'opposes',
  square: 'presses',
  trine: 'flows through',
  sextile: 'opens to',
  'semi-sextile': 'touches',
  quincunx: 'adjusts toward',
}

/** House domain phrase for each natal angle (hardcoded — spec 8). */
const ANGLE_DOMAIN: Record<'ASC' | 'MC', string> = {
  ASC: 'a significant moment for identity and how the world first meets you',
  MC: 'a significant moment for career decisions and public commitments',
}

/**
 * Normalize the angular difference between two ecliptic longitudes to [0, 180].
 */
function angularDiff(lon1: number, lon2: number): number {
  let diff = Math.abs(lon1 - lon2) % 360
  if (diff > 180) diff = 360 - diff
  return diff
}

/**
 * Check whether a transit planet longitude forms a recognized aspect
 * (within the given max orb) to an angle longitude.
 * Returns { aspectType, orb } of the tightest match, or null.
 */
function detectAngleContact(
  transitLon: number,
  angleLon: number,
  maxOrb: number,
): { aspectType: AspectType; orb: number } | null {
  const angle = angularDiff(transitLon, angleLon)
  let best: { aspectType: AspectType; orb: number } | null = null

  for (const def of ASPECT_DEFINITIONS) {
    const orb = Math.abs(angle - def.angle)
    if (orb <= maxOrb) {
      if (!best || orb < best.orb) {
        best = { aspectType: def.name, orb: Math.round(orb * 100) / 100 }
      }
    }
  }

  return best
}

/**
 * Score a snapshot and return a structured SnapshotScore.
 * This is the single source of truth for detecting astrological conditions.
 */
function scoreSnapshot(
  snapshot: Pick<AdvanceSnapshot, 'offset' | 'transitPlanets' | 'transitAspects' | 'retrogrades'>,
  prev: AdvanceSnapshot | null,
  chartData: ChartData,
  period: TransitPeriod,
): SnapshotScore {
  // Offset 0 is the reference point — always neutral
  if (snapshot.offset === 0) {
    return { category: 'neutral', intensity: 0, reason: '', coShift: false }
  }

  const orbThresholds = ORB_THRESHOLDS[period]

  // ── Station detection: compare prev vs current retrograde state ──────────
  let hasStation = false
  let stationPlanet: string | undefined
  let stationDirection: 'retrograde' | 'direct' | undefined

  if (prev) {
    for (const r of snapshot.retrogrades) {
      const prevR = prev.retrogrades.find(pr => pr.planet === r.planet)
      if (prevR && prevR.isRetro !== r.isRetro) {
        hasStation = true
        stationPlanet = r.planet
        stationDirection = r.isRetro ? 'retrograde' : 'direct'
        break
      }
    }
  }

  // ── Primary trigger: slow planet within angleContact° of natal angle ──────
  if (!chartData.unknownTime) {
    const angleEntries: { key: 'ASC' | 'MC'; lon: number }[] = [
      { key: 'ASC', lon: chartData.angles.ascendant.longitude },
      { key: 'MC', lon: chartData.angles.midheaven.longitude },
    ]

    let best: {
      planet: string
      angleKey: 'ASC' | 'MC'
      aspectType: AspectType
      orb: number
    } | null = null

    for (const tp of snapshot.transitPlanets) {
      if (!SLOW_PLANETS_FOR_BANNER.has(tp.name as PlanetName)) continue
      for (const { key, lon } of angleEntries) {
        const contact = detectAngleContact(tp.longitude, lon, orbThresholds.angleContact)
        if (contact && (!best || contact.orb < best.orb)) {
          best = { planet: tp.name, angleKey: key, aspectType: contact.aspectType, orb: contact.orb }
        }
      }
    }

    if (best) {
      const verb = ASPECT_VERB_BANNER[best.aspectType] ?? 'contacts'
      const angleName = best.angleKey === 'ASC' ? 'your Ascendant' : 'your Midheaven'
      return {
        category: 'power',
        intensity: 1.0 - (best.orb / orbThresholds.angleContact),
        reason: `${best.planet} ${verb} ${angleName} — ${ANGLE_DOMAIN[best.angleKey]}.`,
        triggerAspect: best.aspectType,
        coShift: hasStation,
        shiftPlanet: stationPlanet,
        shiftDirection: stationDirection,
      }
    }
  }

  // ── Favorable / Challenging: energy rating + tight applying aspects ────────
  const energyRating = computeEnergyRating(snapshot.transitAspects)

  const tightApplyingHarmonious = snapshot.transitAspects.filter(
    a => a.applying && a.orb <= orbThresholds.applyingTight && a.nature === 'harmonious'
  )
  const tightApplyingChallenging = snapshot.transitAspects.filter(
    a => a.applying && a.orb <= orbThresholds.applyingTight && a.nature === 'challenging'
  )

  // Monthly period: tighten score thresholds for genuinely extreme readings only
  const favorableThreshold = period === 'monthly' ? 5 : 4
  const challengingThreshold = period === 'monthly' ? 1 : 2

  if (energyRating.score >= favorableThreshold && tightApplyingHarmonious.length >= orbThresholds.energyMinAspects) {
    const tightest = tightApplyingHarmonious[0]
    return {
      category: 'favorable',
      intensity: (energyRating.score - 3) / 2,
      reason: `${tightApplyingHarmonious.length} harmonious aspects applying — ${tightest.transitPlanet} ${tightest.type} ${tightest.natalPlanet}.`,
      triggerAspect: tightest.type,
      coShift: hasStation,
      shiftPlanet: stationPlanet,
      shiftDirection: stationDirection,
    }
  }

  if (energyRating.score <= challengingThreshold && tightApplyingChallenging.length >= orbThresholds.energyMinAspects) {
    const tightest = tightApplyingChallenging[0]
    return {
      category: 'challenging',
      intensity: (3 - energyRating.score) / 2,
      reason: `${tightApplyingChallenging.length} tense aspects applying — ${tightest.transitPlanet} ${tightest.type} ${tightest.natalPlanet}.`,
      triggerAspect: tightest.type,
      coShift: hasStation,
      shiftPlanet: stationPlanet,
      shiftDirection: stationDirection,
    }
  }

  // ── Shift: station with no higher-priority category ───────────────────────
  if (hasStation) {
    return {
      category: 'shift',
      intensity: 0.8,
      reason: `${stationPlanet} stations ${stationDirection} — a turning point in ${stationPlanet}'s influence.`,
      coShift: false,
      shiftPlanet: stationPlanet,
      shiftDirection: stationDirection,
    }
  }

  return { category: 'neutral', intensity: 0, reason: '', coShift: false }
}

/**
 * Format a SnapshotScore as a human-readable banner string.
 */
function formatScoreAsBannerText(score: SnapshotScore): string {
  return score.reason
}

/**
 * Compute the power-day banner text for a given snapshot.
 * Delegates all detection to the pre-computed snapshot.score.
 */
function computePowerDayBanner(snapshot: AdvanceSnapshot): string | null {
  if (snapshot.offset === 0) return null
  if (snapshot.score.category === 'neutral') return null
  return formatScoreAsBannerText(snapshot.score)
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

    const prev = snapshots[i - 1] ?? null
    const score = scoreSnapshot(
      { offset: i, transitPlanets, transitAspects, retrogrades },
      prev,
      chartData,
      period,
    )

    snapshots.push({
      offset: i,
      date: targetDate,
      dateStr: targetDate.toISOString().split('T')[0],
      transitPlanets,
      housedTransitPlanets,
      transitAspects,
      retrogrades,
      score,
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

  // Pre-calculate all snapshots with useTransition so main thread stays responsive
  const [snapshots, setSnapshots] = useState<AdvanceSnapshot[]>([])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(() => {
      setSnapshots(preCalculateSnapshots(chartData, period, baseDate))
    })
  }, [chartData, period, baseDate])

  const [offset, setOffset] = useState(0)

  const snapshot = snapshots[offset]

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setOffset(Number(e.target.value))
  }, [])

  // Compute the power-day banner for the currently selected snapshot
  const powerDayBanner = useMemo(() => {
    if (!snapshot) return null
    return computePowerDayBanner(snapshot)
  }, [snapshot])

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })

  const offsetLabel =
    offset === 0 ? 'Now' :
    offset === 1 ? `+1 ${config.unit}` :
    `+${offset} ${config.unitPlural}`

  // Count significant aspects (from snapshot when available)
  const harmonious = snapshot?.transitAspects.filter(a => a.nature === 'harmonious').length ?? 0
  const challenging = snapshot?.transitAspects.filter(a => a.nature === 'challenging').length ?? 0
  const activeRetrogrades = snapshot?.retrogrades.filter(r => r.isRetro || r.status.includes('Stationing')).length ?? 0

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
          {snapshot ? (
            <p className="text-mystic-gold font-heading text-base">{formatDate(snapshot.date)}</p>
          ) : (
            <p className="text-mystic-muted font-heading text-base">Computing…</p>
          )}
        </div>

        {/* Quick stats */}
        {snapshot && (
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
        )}
      </div>

      {/* Power Day Banner — between quick-stats and chart wheel (spec 16) */}
      {powerDayBanner && (
        <div className="mb-6 rounded-xl border border-mystic-gold/30 border-l-2 border-l-mystic-gold bg-mystic-gold/10 px-4 py-3 flex items-start gap-2">
          <span className="text-mystic-gold mt-0.5 shrink-0">✦</span>
          <p className="text-sm text-mystic-gold/90">
            <span className="font-heading">{powerDayBanner.split(' ')[0]}</span>
            {' ' + powerDayBanner.split(' ').slice(1).join(' ')}
          </p>
        </div>
      )}

      {/* Chart wheel */}
      {snapshot ? (
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
      ) : (
        <div className="flex justify-center mb-6">
          <div className="w-full max-w-2xl flex items-center justify-center h-64 rounded-xl border border-mystic-gold/10 bg-mystic-surface/30">
            <span className="text-mystic-muted text-sm">Computing transits…</span>
          </div>
        </div>
      )}

      {/* Transit aspects */}
      {snapshot && snapshot.transitAspects.length > 0 && (
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
                a.transitPlanet as (PlanetName | 'NorthNode'),
                a.type,
                a.natalPlanet as (PlanetName | 'NorthNode'),
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

      {/* Loading skeleton for aspect list while snapshots are being computed */}
      {isPending && !snapshot && (
        <div className="border border-mystic-gold/10 rounded-lg overflow-hidden mb-4 px-5 py-8 flex justify-center">
          <span className="text-mystic-muted text-sm">Computing aspects…</span>
        </div>
      )}

      {/* Retrograde activity */}
      {snapshot && (() => {
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
      {snapshot && (
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
                      <span className="mr-2">{getBodyGlyph(p.name)}</span>
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
      )}
    </div>
  )
}
