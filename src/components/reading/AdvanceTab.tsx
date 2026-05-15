import { useMemo, useState, useEffect, useCallback, useTransition } from 'react'
import type { TransitPeriod, TransitPosition, TransitAspect } from '../../engine/transits'
import { calculateCurrentPositions, calculateTransitAspects, assignTransitHouses, getRetrogradeStatus } from '../../engine/transits'
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

type MarkerCategory = 'power' | 'favorable' | 'challenging' | 'shift' | 'neutral'

interface SnapshotScore {
  category: MarkerCategory
  intensity: number
  reason: string
  coShift: boolean
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

/** Spell out count words for small numbers (spec 9). */
function spellCount(n: number): string {
  const words: Record<number, string> = { 3: 'Three', 4: 'Four', 5: 'Five' }
  return words[n] ?? String(n)
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
 * Compute the power-day banner text for a given snapshot and chart.
 * Returns null when neither trigger condition is met, or at offset 0.
 */
function computePowerDayBanner(
  snapshot: AdvanceSnapshot,
  chartData: ChartData,
): string | null {
  // Suppress banner for current date (offset 0) — it's a reference point, not a future date
  if (snapshot.offset === 0) return null

  // Suppress banner for empty aspect lists
  if (snapshot.transitAspects.length === 0) return null

  // ── Primary trigger: slow planet within 1° of natal angle (requires birth time) ───
  if (!chartData.unknownTime) {
    const angleEntries: { key: 'ASC' | 'MC'; lon: number }[] = [
      { key: 'ASC', lon: chartData.angles.ascendant.longitude },
      { key: 'MC', lon: chartData.angles.midheaven.longitude },
    ]

    let bestContact: {
      planet: PlanetName
      angleKey: 'ASC' | 'MC'
      aspectType: AspectType
      orb: number
    } | null = null

    for (const tp of snapshot.transitPlanets) {
      if (!SLOW_PLANETS_FOR_BANNER.has(tp.name as PlanetName)) continue
      for (const { key, lon } of angleEntries) {
        const contact = detectAngleContact(tp.longitude, lon, 1.0)
        if (contact && (!bestContact || contact.orb < bestContact.orb)) {
          bestContact = {
            planet: tp.name as PlanetName,
            angleKey: key,
            aspectType: contact.aspectType,
            orb: contact.orb,
          }
        }
      }
    }

    if (bestContact) {
      const angleName = bestContact.angleKey === 'ASC' ? 'your Ascendant' : 'your Midheaven'
      const verb = ASPECT_VERB_BANNER[bestContact.aspectType] ?? 'contacts'
      const domain = ANGLE_DOMAIN[bestContact.angleKey]
      return `${bestContact.planet} ${verb} ${angleName} on this date — ${domain}.`
    }
  }

  // ── Secondary trigger: 3+ applying aspects with orb ≤ 2° ─────────────────
  const tightApplying = snapshot.transitAspects.filter(a => a.applying && a.orb <= 2.0)
  if (tightApplying.length >= 3) {
    const count = spellCount(tightApplying.length)
    // natalHouse not yet embedded (prerequisite task-0002 pending in this file's scope);
    // use the plain fallback variant (spec 9, natalHouse-null branch).
    return `${count} tight aspects converge on this date — a notable concentration of planetary energy.`
  }

  return null
}

// ─── Marker Scoring ──────────────────────────────────────────────────────────

/** Category labels shown in the aspect list header suffix. */
const CATEGORY_LABELS: Record<MarkerCategory, string> = {
  power: 'Power configuration',
  favorable: 'Favorable window',
  challenging: 'Tense configuration',
  shift: 'Planetary shift',
  neutral: '',
}

/** Halo box-shadow value per category (spec 8–9). */
const CATEGORY_HALO: Record<Exclude<MarkerCategory, 'neutral'>, string> = {
  power: '0 0 10px 3px rgba(201,168,76,0.35), 0 0 20px 6px rgba(201,168,76,0.20)',
  favorable: '0 0 10px 3px rgba(52,211,153,0.35), 0 0 20px 6px rgba(52,211,153,0.20)',
  challenging: '0 0 10px 3px rgba(248,113,113,0.35), 0 0 20px 6px rgba(248,113,113,0.20)',
  shift: '0 0 10px 3px rgba(96,165,250,0.35), 0 0 20px 6px rgba(96,165,250,0.20)',
}

/**
 * Score a snapshot to determine its marker category.
 * Returns a SnapshotScore describing the dominant quality.
 */
function scoreSnapshot(
  snapshot: Omit<AdvanceSnapshot, 'score'>,
  prev: Omit<AdvanceSnapshot, 'score'> | null,
  chartData: ChartData,
  _period: TransitPeriod,
): SnapshotScore {
  const neutral: SnapshotScore = {
    category: 'neutral',
    intensity: 0,
    reason: '',
    coShift: false,
  }

  // Offset 0 is always neutral (reference point)
  if (snapshot.offset === 0) return neutral
  if (snapshot.transitAspects.length === 0) return neutral

  // ── Shift detection: retrograde station (stationing in/out between snapshots) ──
  if (prev) {
    for (const curr of snapshot.retrogrades) {
      const prevR = prev.retrogrades.find(r => r.planet === curr.planet)
      if (!prevR) continue
      // Detect station: isRetro changed between prev and curr
      if (prevR.isRetro !== curr.isRetro) {
        return {
          category: 'shift',
          intensity: 2,
          reason: `${curr.planet} stations ${curr.isRetro ? 'retrograde' : 'direct'}`,
          coShift: false,
          shiftPlanet: curr.planet,
          shiftDirection: curr.isRetro ? 'retrograde' : 'direct',
        }
      }
      // Detect stationing
      const wasStationing = prevR.status.includes('Stationing')
      const isStationing = curr.status.includes('Stationing')
      if (!wasStationing && isStationing) {
        return {
          category: 'shift',
          intensity: 1,
          reason: `${curr.planet} stationing`,
          coShift: false,
          shiftPlanet: curr.planet,
          shiftDirection: curr.isRetro ? 'retrograde' : 'direct',
        }
      }
    }
  }

  // ── Power day: slow planet within 1° of natal angle (requires birth time) ──
  if (!chartData.unknownTime) {
    const angleEntries: { key: 'ASC' | 'MC'; lon: number }[] = [
      { key: 'ASC', lon: chartData.angles.ascendant.longitude },
      { key: 'MC', lon: chartData.angles.midheaven.longitude },
    ]

    for (const tp of snapshot.transitPlanets) {
      if (!SLOW_PLANETS_FOR_BANNER.has(tp.name as PlanetName)) continue
      for (const { key, lon } of angleEntries) {
        const contact = detectAngleContact(tp.longitude, lon, 1.0)
        if (contact) {
          return {
            category: 'power',
            intensity: 3,
            reason: `${tp.name} ${contact.aspectType} ${key}`,
            coShift: false,
          }
        }
      }
    }
  }

  // ── Count tight applying aspects ──
  const tightApplying = snapshot.transitAspects.filter(a => a.applying && a.orb <= 2.0)
  const harmonious = snapshot.transitAspects.filter(a => a.nature === 'harmonious')
  const challenging = snapshot.transitAspects.filter(a => a.nature === 'challenging')

  // Power: 3+ tight applying aspects of any kind
  if (tightApplying.length >= 3) {
    return {
      category: 'power',
      intensity: Math.min(tightApplying.length, 5),
      reason: `${tightApplying.length} tight applying aspects`,
      coShift: false,
    }
  }

  // Favorable: majority harmonious tight aspects
  const tightHarmonious = tightApplying.filter(a => a.nature === 'harmonious')
  const tightChallenging = tightApplying.filter(a => a.nature === 'challenging')

  if (tightHarmonious.length >= 2 && tightHarmonious.length > tightChallenging.length) {
    return {
      category: 'favorable',
      intensity: tightHarmonious.length,
      reason: `${tightHarmonious.length} harmonious applying aspects`,
      coShift: false,
    }
  }

  // Challenging: majority challenging tight aspects
  if (tightChallenging.length >= 2 && tightChallenging.length > tightHarmonious.length) {
    return {
      category: 'challenging',
      intensity: tightChallenging.length,
      reason: `${tightChallenging.length} challenging applying aspects`,
      coShift: false,
    }
  }

  // Favorable: overall aspect balance (3+ harmonious, outnumbering challenging 2:1)
  if (harmonious.length >= 3 && harmonious.length >= challenging.length * 2) {
    return {
      category: 'favorable',
      intensity: 1,
      reason: `${harmonious.length} harmonious vs ${challenging.length} challenging`,
      coShift: false,
    }
  }

  // Challenging: overall aspect balance (3+ challenging, outnumbering harmonious 2:1)
  if (challenging.length >= 3 && challenging.length >= harmonious.length * 2) {
    return {
      category: 'challenging',
      intensity: 1,
      reason: `${challenging.length} challenging vs ${harmonious.length} harmonious`,
      coShift: false,
    }
  }

  return neutral
}

// ─── Pre-calculator ──────────────────────────────────────────────────────────

function preCalculateSnapshots(
  chartData: ChartData,
  period: TransitPeriod,
  baseDate: Date,
): AdvanceSnapshot[] {
  const config = ADVANCE_CONFIG[period]
  // Build raw snapshots first (without score), then score them with prev reference
  const rawSnapshots: Omit<AdvanceSnapshot, 'score'>[] = []

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

    rawSnapshots.push({
      offset: i,
      date: targetDate,
      dateStr: targetDate.toISOString().split('T')[0],
      transitPlanets,
      housedTransitPlanets,
      transitAspects,
      retrogrades,
    })
  }

  // Now score each snapshot with access to the previous one
  return rawSnapshots.map((raw, idx) => ({
    ...raw,
    score: scoreSnapshot(raw, idx > 0 ? rawSnapshots[idx - 1] : null, chartData, period),
  }))
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
    if (!snapshot || !chartData) return null
    return computePowerDayBanner(snapshot, chartData)
  }, [snapshot, chartData])

  // Markers: non-neutral snapshots — available for Prev/Next navigation and thumb halo
  const markers = useMemo(
    () => snapshots.filter(s => s.score.category !== 'neutral'),
    [snapshots],
  )

  // Current marker at the current offset (null if neutral)
  const currentMarker = markers.find(m => m.offset === offset) ?? null

  // Thumb halo CSS custom property value (only when at a marked position)
  const thumbHaloValue = currentMarker && currentMarker.score.category !== 'neutral'
    ? CATEGORY_HALO[currentMarker.score.category]
    : undefined

  // Nearest next/prev marker offsets for Prev/Next navigation
  const nearestNext = markers
    .filter(m => m.offset > offset)
    .reduce<number | null>((min, m) => (min === null || m.offset < min ? m.offset : min), null)

  const nearestPrev = markers
    .filter(m => m.offset < offset)
    .reduce<number | null>((max, m) => (max === null || m.offset > max ? m.offset : max), null)

  const handleNext = useCallback(() => {
    if (nearestNext !== null) setOffset(nearestNext)
  }, [nearestNext])

  const handlePrev = useCallback(() => {
    if (nearestPrev !== null) setOffset(nearestPrev)
  }, [nearestPrev])

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
          className={`w-full h-2 bg-mystic-bg rounded-lg appearance-none cursor-pointer accent-mystic-gold
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-mystic-gold
            [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(201,168,76,0.5)] [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-track]:bg-mystic-border [&::-webkit-slider-track]:rounded-lg${currentMarker ? ' has-thumb-halo' : ''}`}
          style={thumbHaloValue ? ({ '--thumb-halo': thumbHaloValue } as React.CSSProperties) : undefined}
        />

        <div className="flex justify-between mt-2 text-mystic-muted text-[10px]">
          <span>Now</span>
          <span>{config.max} {config.unitPlural}</span>
        </div>

        {/* Prev / Next navigation — only rendered when markers exist */}
        {markers.length > 0 && (
          <div className="flex justify-center gap-6 mt-3">
            <button
              onClick={handlePrev}
              disabled={nearestPrev === null}
              aria-label="Jump to previous notable moment"
              aria-disabled={nearestPrev === null}
              className={`text-xs font-heading tracking-wide min-h-[44px] px-4 transition-colors duration-150 ${
                nearestPrev !== null
                  ? 'text-mystic-gold/60 hover:text-mystic-gold cursor-pointer'
                  : 'text-mystic-muted/40 cursor-not-allowed opacity-30'
              }`}
            >
              &lt;- Prev
            </button>
            <button
              onClick={handleNext}
              disabled={nearestNext === null}
              aria-label="Jump to next notable moment"
              aria-disabled={nearestNext === null}
              className={`text-xs font-heading tracking-wide min-h-[44px] px-4 transition-colors duration-150 ${
                nearestNext !== null
                  ? 'text-mystic-gold/60 hover:text-mystic-gold cursor-pointer'
                  : 'text-mystic-muted/40 cursor-not-allowed opacity-30'
              }`}
            >
              -&gt; Next
            </button>
          </div>
        )}

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
            <span className="font-heading text-lg text-mystic-gold">
              Transit Aspects ({snapshot.transitAspects.length})
              {currentMarker && (
                <span className="font-heading text-lg text-mystic-gold"> — {CATEGORY_LABELS[currentMarker.score.category]}</span>
              )}
            </span>
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
