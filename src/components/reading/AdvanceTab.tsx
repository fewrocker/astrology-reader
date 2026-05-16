import { useMemo, useState, useEffect, useCallback, useTransition, useRef, memo } from 'react'
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
  coShift: boolean          // true when shift co-occurs with favorable or challenging
  intensity: number         // 0.0–1.0, drives dot size and glow strength
  reason: string            // one-line human sentence for tooltip and banner
  shiftPlanet?: string      // planet name when coShift or category === 'shift'
  shiftDirection?: 'retrograde' | 'direct'
  triggerAspect?: {         // the specific aspect that drove the score, for tooltip specificity
    transitPlanet: string
    natalPlanet: string
    type: string
    orb: number
  }
}

interface AdvanceSnapshot {
  offset: number
  date: Date
  dateStr: string
  transitPlanets: TransitPosition[]
  housedTransitPlanets: TransitPosition[]
  transitAspects: TransitAspect[]
  retrogrades: { planet: PlanetName; isRetro: boolean; status: string }[]
  score: SnapshotScore     // pre-computed once in preCalculateSnapshots
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

// ─── Marker Colors ────────────────────────────────────────────────────────────

const MARKER_COLORS: Record<MarkerCategory, string> = {
  power:       '#c9a84c', // mystic-gold
  favorable:   '#34d399', // emerald-400
  challenging: '#f87171', // red-400
  shift:       '#60a5fa', // blue-400
  neutral:     'transparent',
}

const CATEGORY_LABELS: Record<MarkerCategory, string> = {
  power:       'Power Day',
  favorable:   'Favorable Window',
  challenging: 'Challenging Period',
  shift:       'Planetary Shift',
  neutral:     '',
}

/** Halo box-shadow value per category — drives the CSS variable --thumb-halo (task-0005). */
const CATEGORY_HALO: Record<Exclude<MarkerCategory, 'neutral'>, string> = {
  power:       '0 0 10px 3px rgba(201,168,76,0.35), 0 0 20px 6px rgba(201,168,76,0.20)',
  favorable:   '0 0 10px 3px rgba(52,211,153,0.35), 0 0 20px 6px rgba(52,211,153,0.20)',
  challenging: '0 0 10px 3px rgba(248,113,113,0.35), 0 0 20px 6px rgba(248,113,113,0.20)',
  shift:       '0 0 10px 3px rgba(96,165,250,0.35), 0 0 20px 6px rgba(96,165,250,0.20)',
}

// ─── Orb Thresholds ──────────────────────────────────────────────────────────

const ORB_THRESHOLDS: Record<TransitPeriod, {
  angleContact: number
  applyingTight: number
  energyMinAspects: number
}> = {
  daily:   { angleContact: 1.0, applyingTight: 1.5, energyMinAspects: 2 },
  weekly:  { angleContact: 2.0, applyingTight: 3.0, energyMinAspects: 2 },
  monthly: { angleContact: 3.0, applyingTight: 4.0, energyMinAspects: 2 },
}

// Threshold for hysteresis post-processing (spec 14.4)
const MARKER_HYSTERESIS_ORB = 0.5

/** Slow planets for angle-contact trigger (Jupiter excluded intentionally). */
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

/** House domain phrase for each natal angle. */
const ANGLE_DOMAIN: Record<'ASC' | 'MC', string> = {
  ASC: 'a significant moment for identity and how the world first meets you',
  MC: 'a significant moment for career decisions and public commitments',
}

/** Planet weight for identifying the trigger aspect (slow planets outrank fast). */
const PLANET_WEIGHT: Partial<Record<string, number>> = {
  Pluto: 9, Neptune: 8, Uranus: 7, Saturn: 6, Jupiter: 5,
  Mars: 4, Sun: 3, Venus: 2, Mercury: 2, Moon: 1,
}

/**
 * Normalize angular difference between two ecliptic longitudes to [0, 180].
 */
function angularDiff(lon1: number, lon2: number): number {
  let diff = Math.abs(lon1 - lon2) % 360
  if (diff > 180) diff = 360 - diff
  return diff
}

/**
 * Check whether a transit planet longitude forms a recognized aspect
 * within the given max orb to an angle longitude.
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
 * Build the reason string for a power-day score.
 */
function buildPowerReason(
  planet: PlanetName,
  aspectType: AspectType,
  angleKey: 'ASC' | 'MC',
): string {
  const angleName = angleKey === 'ASC' ? 'your Ascendant' : 'your Midheaven'
  const verb = ASPECT_VERB_BANNER[aspectType] ?? 'contacts'
  const domain = ANGLE_DOMAIN[angleKey]
  return `${planet} ${verb} ${angleName} — ${domain}.`
}

/**
 * Build the reason string for a favorable/challenging score.
 */
function buildAspectReason(
  tightest: TransitAspect,
  category: 'favorable' | 'challenging',
): string {
  const domainMap: Partial<Record<string, string>> = {
    Pluto: 'transformation and power', Neptune: 'inspiration and surrender',
    Uranus: 'disruption and revelation', Saturn: 'structure and discipline',
    Jupiter: 'expansion and opportunity', Mars: 'drive and assertion',
    Sun: 'vitality and purpose', Venus: 'connection and beauty',
    Mercury: 'communication and thought', Moon: 'feeling and instinct',
  }
  const planet = tightest.transitPlanet
  const natalPlanet = tightest.natalPlanet
  const type = tightest.type
  const domain = domainMap[planet as string] ?? 'planetary energy'

  if (category === 'favorable') {
    return `${planet} ${type} your natal ${natalPlanet} — a window of ${domain}.`
  } else {
    return `${planet} ${type} your natal ${natalPlanet} — tension around ${domain}.`
  }
}

/**
 * scoreSnapshot — pure scoring function for a single snapshot.
 * spec 1.3–1.12
 */
function scoreSnapshot(
  snapshot: AdvanceSnapshot,
  prev: AdvanceSnapshot | null,
  chartData: ChartData,
  period: TransitPeriod,
): SnapshotScore {
  const neutral: SnapshotScore = { category: 'neutral', intensity: 0, reason: '', coShift: false }

  // spec 1.4 / 12.1: offset 0 is always neutral
  if (snapshot.offset === 0) return neutral

  const orbs = ORB_THRESHOLDS[period]

  // ── Detect station crossing (spec 1.5 priority 2, spec 1.10) ─────────────
  let stationPlanet: string | undefined
  let stationDirection: 'retrograde' | 'direct' | undefined

  if (prev) {
    for (const curr of snapshot.retrogrades) {
      const prevR = prev.retrogrades.find(r => r.planet === curr.planet)
      if (prevR && prevR.isRetro !== curr.isRetro) {
        stationPlanet = curr.planet
        stationDirection = curr.isRetro ? 'retrograde' : 'direct'
        break
      }
    }
  }

  // ── Priority 1: power — slow planet within angleContact orb of natal angle ─
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
        const contact = detectAngleContact(tp.longitude, lon, orbs.angleContact)
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
      const intensity = Math.max(0, 1.0 - (bestContact.orb / orbs.angleContact))
      const reason = buildPowerReason(bestContact.planet, bestContact.aspectType, bestContact.angleKey)

      // coShift check: if there's also a station
      const coShift = !!stationPlanet
      return {
        category: 'power',
        coShift,
        intensity,
        reason,
        shiftPlanet: coShift ? stationPlanet : undefined,
        shiftDirection: coShift ? stationDirection : undefined,
        triggerAspect: {
          transitPlanet: bestContact.planet,
          natalPlanet: bestContact.angleKey === 'ASC' ? 'Ascendant' : 'Midheaven',
          type: bestContact.aspectType,
          orb: bestContact.orb,
        },
      }
    }
  }

  // ── Priority 2: shift — station crossing (when no power) ─────────────────
  if (stationPlanet && stationDirection) {
    // check if favorable or challenging co-occur
    const rating = computeEnergyRating(snapshot.transitAspects)
    const tightApplyingHarmonious = snapshot.transitAspects.filter(
      a => a.applying && a.orb <= orbs.applyingTight && a.nature === 'harmonious'
    )
    const tightApplyingChallenging = snapshot.transitAspects.filter(
      a => a.applying && a.orb <= orbs.applyingTight && a.nature === 'challenging'
    )

    const isFavorable = rating.score >= 4 && tightApplyingHarmonious.length >= orbs.energyMinAspects
    const isChallenging = rating.score <= 2 && tightApplyingChallenging.length >= orbs.energyMinAspects

    if (isFavorable || isChallenging) {
      // Primary category is favorable/challenging, coShift = true
      const primaryCategory = isFavorable ? 'favorable' : 'challenging'
      const aspects = isFavorable ? tightApplyingHarmonious : tightApplyingChallenging
      const tightest = aspects.sort((a, b) =>
        (PLANET_WEIGHT[b.transitPlanet as string] ?? 0) - (PLANET_WEIGHT[a.transitPlanet as string] ?? 0)
      )[0]
      const rawScore = Math.abs(rating.score - 3)
      const intensity = rawScore / 2

      return {
        category: primaryCategory,
        coShift: true,
        intensity,
        reason: buildAspectReason(tightest, primaryCategory),
        shiftPlanet: stationPlanet,
        shiftDirection: stationDirection,
        triggerAspect: {
          transitPlanet: tightest.transitPlanet,
          natalPlanet: tightest.natalPlanet,
          type: tightest.type,
          orb: tightest.orb,
        },
      }
    }

    // Pure shift
    return {
      category: 'shift',
      coShift: false,
      intensity: 0.8,
      reason: `${stationPlanet} stations ${stationDirection}.`,
      shiftPlanet: stationPlanet,
      shiftDirection: stationDirection,
    }
  }

  // ── Priority 3: favorable ─────────────────────────────────────────────────
  {
    const rating = computeEnergyRating(snapshot.transitAspects)
    const tightApplyingHarmonious = snapshot.transitAspects.filter(
      a => a.applying && a.orb <= orbs.applyingTight && a.nature === 'harmonious'
    )

    if (rating.score >= 4 && tightApplyingHarmonious.length >= orbs.energyMinAspects) {
      const tightest = [...tightApplyingHarmonious].sort((a, b) =>
        (PLANET_WEIGHT[b.transitPlanet as string] ?? 0) - (PLANET_WEIGHT[a.transitPlanet as string] ?? 0)
      )[0]
      const intensity = Math.abs(rating.score - 3) / 2

      return {
        category: 'favorable',
        coShift: false,
        intensity,
        reason: buildAspectReason(tightest, 'favorable'),
        triggerAspect: {
          transitPlanet: tightest.transitPlanet,
          natalPlanet: tightest.natalPlanet,
          type: tightest.type,
          orb: tightest.orb,
        },
      }
    }
  }

  // ── Priority 4: challenging ───────────────────────────────────────────────
  {
    const rating = computeEnergyRating(snapshot.transitAspects)
    const tightApplyingChallenging = snapshot.transitAspects.filter(
      a => a.applying && a.orb <= orbs.applyingTight && a.nature === 'challenging'
    )

    if (rating.score <= 2 && tightApplyingChallenging.length >= orbs.energyMinAspects) {
      const tightest = [...tightApplyingChallenging].sort((a, b) =>
        (PLANET_WEIGHT[b.transitPlanet as string] ?? 0) - (PLANET_WEIGHT[a.transitPlanet as string] ?? 0)
      )[0]
      const intensity = Math.abs(rating.score - 3) / 2

      return {
        category: 'challenging',
        coShift: false,
        intensity,
        reason: buildAspectReason(tightest, 'challenging'),
        triggerAspect: {
          transitPlanet: tightest.transitPlanet,
          natalPlanet: tightest.natalPlanet,
          type: tightest.type,
          orb: tightest.orb,
        },
      }
    }
  }

  return neutral
}

/**
 * Format score as banner text for the generalized category banner.
 */
function formatScoreAsBannerText(score: SnapshotScore): string {
  return score.reason
}

/**
 * Compute the banner for a snapshot — delegates to pre-computed score.
 * spec 2.1
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
  // Intermediate array before scoring (needed for previous-snapshot access)
  const snapshots: AdvanceSnapshot[] = []

  for (let i = 0; i <= config.max; i++) {
    let targetDate: Date

    if (period === 'monthly') {
      // Use noon (12:00:00) for all offsets ≥ 1 to prevent Moon position inconsistency (spec 1.11).
      // Note: JavaScript normalizes out-of-range dates (e.g., Feb 31 → Mar 3).
      // This is a known limitation — the marker for any normalized date reflects
      // the actual computed date (snapshot.dateStr is derived from resolved targetDate),
      // so label and ephemeris remain consistent even if slider implies a different calendar date.
      targetDate = i === 0
        ? new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
        : new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate(), 12, 0, 0)
    } else {
      targetDate = new Date(baseDate.getTime() + i * config.msPerStep)
    }

    const transitPlanets = calculateCurrentPositions(targetDate)
    const transitAspects = calculateTransitAspects(transitPlanets, chartData.planets, period)
    const retrogrades = getRetrogradeStatus(targetDate)
    const housedTransitPlanets = assignTransitHouses(transitPlanets, chartData.houses)

    // score is computed after building the snapshot array entry;
    // we push a placeholder and fill score below
    const snap: AdvanceSnapshot = {
      offset: i,
      date: targetDate,
      dateStr: targetDate.toISOString().split('T')[0],
      transitPlanets,
      housedTransitPlanets,
      transitAspects,
      retrogrades,
      score: { category: 'neutral', intensity: 0, reason: '', coShift: false },
    }

    // Compute score immediately (spec 1.12) — passing prev snapshot
    const prev = snapshots[i - 1] ?? null
    snap.score = scoreSnapshot(snap, prev, chartData, period)

    snapshots.push(snap)
  }

  // ── Post-processing: hysteresis pass (spec 14.4) ──────────────────────────
  // If consecutive snapshots i-1 and i+1 both score the same non-neutral category
  // but snapshot i does not, and the orb difference is small, inherit i-1's category.
  for (let i = 1; i < snapshots.length - 1; i++) {
    const prev = snapshots[i - 1]
    const curr = snapshots[i]
    const next = snapshots[i + 1]

    if (
      curr.score.category === 'neutral' &&
      prev.score.category !== 'neutral' &&
      prev.score.category === next.score.category &&
      prev.score.triggerAspect && curr.transitAspects.length > 0
    ) {
      // Check orb difference between i-1 and i for the trigger aspect
      const triggerPlanet = prev.score.triggerAspect.transitPlanet
      const triggerNatal = prev.score.triggerAspect.natalPlanet
      const prevOrb = prev.score.triggerAspect.orb
      const currAspect = curr.transitAspects.find(
        a => a.transitPlanet === triggerPlanet && a.natalPlanet === triggerNatal
      )
      if (currAspect && Math.abs(currAspect.orb - prevOrb) < MARKER_HYSTERESIS_ORB) {
        snapshots[i] = {
          ...curr,
          score: { ...prev.score },
        }
      }
    }
  }

  // ── Global density cap: max 20% of positions marked (spec 1.13) ──────────
  const nonNeutral = snapshots.filter(s => s.score.category !== 'neutral' && s.offset > 0)
  const maxMarkers = Math.ceil(config.max * 0.2)

  if (nonNeutral.length > maxMarkers) {
    // Phase 1: reserve the highest-intensity marker per non-neutral category present
    const NON_NEUTRAL_CATEGORIES: Exclude<MarkerCategory, 'neutral'>[] = [
      'power', 'favorable', 'challenging', 'shift',
    ]
    const reservedOffsets = new Set<number>()
    for (const cat of NON_NEUTRAL_CATEGORIES) {
      const best = nonNeutral
        .filter(s => s.score.category === cat)
        .sort((a, b) => b.score.intensity - a.score.intensity)[0]
      if (best) reservedOffsets.add(best.offset)
    }

    // Phase 2: fill remaining capacity from non-reserved markers by intensity
    const remaining = nonNeutral
      .filter(s => !reservedOffsets.has(s.offset))
      .sort((a, b) => b.score.intensity - a.score.intensity)
    const fillCount = maxMarkers - reservedOffsets.size
    for (let i = 0; i < fillCount && i < remaining.length; i++) {
      reservedOffsets.add(remaining[i].offset)
    }

    for (let i = 0; i < snapshots.length; i++) {
      if (snapshots[i].score.category !== 'neutral' && !reservedOffsets.has(snapshots[i].offset)) {
        snapshots[i] = {
          ...snapshots[i],
          score: { category: 'neutral', intensity: 0, reason: '', coShift: false },
        }
      }
    }
  }

  return snapshots
}

// ─── Priority order for marker comparison ────────────────────────────────────

const CATEGORY_PRIORITY: Record<MarkerCategory, number> = {
  power: 4,
  shift: 3,
  favorable: 2,
  challenging: 1,
  neutral: 0,
}

// ─── MarkerDot Component ─────────────────────────────────────────────────────

interface MarkerDotProps {
  marker: AdvanceSnapshot
  max: number
  active: boolean
  onClick: () => void
  onMouseEnter: (e: React.MouseEvent) => void
  onMouseLeave: () => void
}

const MarkerDot = memo(function MarkerDot({
  marker,
  max,
  active,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: MarkerDotProps) {
  const { score } = marker
  const color = MARKER_COLORS[score.category]
  const baseSize = 5 + Math.round(score.intensity * 3) // 5–8px
  const size = active ? baseSize + 4 : baseSize
  const left = `${(marker.offset / max) * 100}%`

  const isDiamond = score.category === 'power' || score.category === 'shift'

  // Animation class by category
  const animClass = score.category === 'power'
    ? 'marker-anim-power'
    : score.category === 'challenging'
      ? 'marker-anim-challenging'
      : score.category === 'shift'
        ? 'marker-anim-shift'
        : '' // favorable: no animation

  const dotStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    flexShrink: 0,
    transform: isDiamond ? 'rotate(45deg)' : undefined,
    backgroundColor: color,
    borderRadius: isDiamond ? '1px' : '50%',
    opacity: active ? 1 : 0.85,
    // coShift ring
    outline: score.coShift ? '1px solid rgb(96 165 250)' : undefined,
    outlineOffset: score.coShift ? '1px' : undefined,
    // Active state uses larger size (already computed above) + full opacity.
    // No box-shadow animation — spec 10.6 prohibits it (CPU composited).
    // Static box-shadow on active is fine (not animated).
    boxShadow: active ? `0 0 10px 2px ${color}99` : undefined,
  }

  // Touch target wrapper (spec 13.1): invisible padding around visual dot
  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    left,
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    cursor: 'pointer',
  }

  return (
    <div
      style={wrapperStyle}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label={`Jump to ${marker.dateStr}: ${score.reason}`}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
    >
      <div
        style={dotStyle}
        className={animClass}
      />
    </div>
  )
})

// ─── OverviewStrip Component ─────────────────────────────────────────────────

interface OverviewStripProps {
  markers: AdvanceSnapshot[]
  max: number
  offset: number
  onJump: (offset: number) => void
  isPending: boolean
  config: AdvanceConfig
  unknownTime: boolean
}

function OverviewStrip({
  markers,
  max,
  offset,
  onJump,
  isPending,
  config,
  unknownTime,
}: OverviewStripProps) {
  if (isPending) {
    return (
      <div className="mb-4">
        <div className="w-full h-10 rounded-full border border-mystic-border/30 bg-mystic-surface/20 flex items-center justify-center">
          <span className="text-mystic-muted text-[10px]">Reading your sky…</span>
        </div>
      </div>
    )
  }

  // Collision handling (spec 5.7): filter markers within 5% of a higher-priority one
  const sortedByPriority = [...markers].sort(
    (a, b) => CATEGORY_PRIORITY[b.score.category] - CATEGORY_PRIORITY[a.score.category]
  )
  const visibleMarkers: AdvanceSnapshot[] = []
  for (const m of sortedByPriority) {
    const pct = m.offset / max
    const tooClose = visibleMarkers.some(v => Math.abs(v.offset / max - pct) < 0.05)
    if (!tooClose) visibleMarkers.push(m)
  }

  return (
    <div className="mb-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-mystic-muted text-[10px] uppercase tracking-widest">Notable moments</span>
        <span className="text-mystic-muted text-[10px] uppercase tracking-widest">{config.max} {config.unitPlural}</span>
      </div>

      {/* Strip body */}
      <div className="w-full h-10 bg-mystic-surface/40 rounded-full border border-mystic-border/50 relative">
        {/* Dots inside strip */}
        {markers.length > 0 ? (
          visibleMarkers.map(m => {
            const isDiamond = m.score.category === 'power' || m.score.category === 'shift'
            return (
              <button
                key={m.offset}
                onClick={() => onJump(m.offset)}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                style={{
                  left: `${(m.offset / max) * 100}%`,
                  width: '10px',
                  height: '10px',
                  backgroundColor: MARKER_COLORS[m.score.category],
                  borderRadius: isDiamond ? '1px' : '50%',
                  transform: isDiamond
                    ? `translate(-50%, -50%) rotate(45deg)`
                    : 'translate(-50%, -50%)',
                }}
                aria-label={`Jump to ${m.dateStr}: ${m.score.reason}`}
              />
            )
          })
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-mystic-muted text-xs">Quiet period — no exceptional moments detected</span>
          </div>
        )}

        {/* Current position indicator (spec 5.5) */}
        <div
          className="absolute top-0 h-full w-px bg-mystic-gold/40 pointer-events-none"
          style={{ left: `${(offset / max) * 100}%` }}
        />
      </div>

      {/* Unknown time annotation (spec 11.2) */}
      {unknownTime && (
        <p className="text-mystic-muted text-[10px] mt-1">
          Birth time unknown — angle-contact power days not available
        </p>
      )}
    </div>
  )
}

// ─── Tooltip Component ────────────────────────────────────────────────────────

interface TooltipProps {
  marker: AdvanceSnapshot
  positionX: number   // percentage 0–100 of slider width
}

function MarkerTooltip({ marker, positionX }: TooltipProps) {
  const { score } = marker
  const color = MARKER_COLORS[score.category]
  const label = CATEGORY_LABELS[score.category]

  const d = marker.date
  const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  const orbSuffix = score.triggerAspect
    ? ` · ${score.triggerAspect.orb}° orb`
    : ''

  // Clamp left position so tooltip stays within container (spec 6.3)
  // Tooltip is 200px wide; container is ~100% wide. Adjust extremes.
  const clampedLeft = Math.max(0, Math.min(positionX, 85))

  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{
        bottom: 'calc(100% + 8px)',
        left: `${clampedLeft}%`,
        transform: 'translateX(-50%)',
      }}
    >
      {/* Connector line */}
      <div
        className="mx-auto w-px bg-mystic-gold/30 mb-1"
        style={{ height: '8px' }}
      />
      {/* Tooltip panel */}
      <div
        className="bg-mystic-bg/95 border border-mystic-gold/20 rounded-lg px-3 py-2 shadow-lg text-left"
        style={{ maxWidth: '200px' }}
      >
        <p className="text-[10px] text-mystic-muted mb-0.5">{dateStr}</p>
        <p className="text-[11px] font-medium mb-0.5" style={{ color }}>
          {label}{orbSuffix}
        </p>
        <p className="text-[10px] text-mystic-text/80" style={{ textWrap: 'balance' } as React.CSSProperties}>
          {score.reason}
        </p>
      </div>
    </div>
  )
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

  // Snapshot cache (spec 10.5): useRef-based cache keyed by (period, baseDate.toISOString()).
  // Prevents full preCalculateSnapshots re-run on tab remount with same inputs.
  const snapshotCache = useRef<Map<string, AdvanceSnapshot[]>>(new Map())

  // Pre-calculate all snapshots with useTransition so main thread stays responsive
  const [snapshots, setSnapshots] = useState<AdvanceSnapshot[]>([])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const cacheKey = `${period}:${baseDate.toISOString()}`
    const cached = snapshotCache.current.get(cacheKey)
    if (cached) {
      setSnapshots(cached)
      return
    }
    startTransition(() => {
      const computed = preCalculateSnapshots(chartData, period, baseDate)
      snapshotCache.current.set(cacheKey, computed)
      setSnapshots(computed)
    })
  }, [chartData, period, baseDate])

  const [offset, setOffset] = useState(0)

  const snapshot = snapshots[offset]

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setOffset(Number(e.target.value))
  }, [])

  // markers useMemo: keyed on snapshots only — not on offset (spec 1.14, 10.1)
  const markers = useMemo(
    () => snapshots.filter(s => s.score.category !== 'neutral' && s.offset > 0),
    [snapshots]
  )

  // Compute the banner for the currently selected snapshot (spec 2.1, 2.4)
  const categoryBanner = useMemo(() => {
    if (!snapshot) return null
    return computePowerDayBanner(snapshot)
  }, [snapshot])

  // Hover tooltip state (spec 6.1)
  const [hoveredMarker, setHoveredMarker] = useState<AdvanceSnapshot | null>(null)

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

  // Next/prev marker navigation (spec 7.3)
  const nextMarker = markers.find(m => m.offset > offset) ?? null
  const prevMarker = [...markers].reverse().find(m => m.offset < offset && m.offset > 0) ?? null

  // Slider thumb class: power halo vs normal (spec 8.3)
  const thumbShadowClass = snapshot?.score.category === 'power'
    ? '[&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(201,168,76,0.8)]'
    : '[&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(201,168,76,0.5)]'

  // Thumb halo CSS variable (task-0005): drives the has-thumb-halo class shadow via CSS var
  const currentMarker = markers.find(m => m.offset === offset) ?? null
  const thumbHaloValue = currentMarker && currentMarker.score.category !== 'neutral'
    ? CATEGORY_HALO[currentMarker.score.category]
    : undefined

  // Aspect list header suffix (spec 8.1)
  const aspectHeaderSuffix = snapshot ? (
    snapshot.score.category === 'favorable' ? ' — Favorable window' :
    snapshot.score.category === 'challenging' ? ' — Tense configuration' :
    snapshot.score.category === 'power' ? ' — Power configuration' :
    snapshot.score.category === 'shift' ? ' — Planetary shift' :
    ''
  ) : ''

  // Retrograde section header (spec 8.2)
  const retrogradeHeader = snapshot?.score.category === 'shift' ? 'Planetary Shift' : 'Retrograde Activity'

  return (
    <div>
      {/* Animation styles (spec 4.1–4.6) — GPU-composited opacity+transform only */}
      <style>{`
        @keyframes glow-breathe-gold {
          0%, 100% { opacity: 0.75; transform: rotate(45deg) scale(1.0); }
          50%       { opacity: 1.0;  transform: rotate(45deg) scale(1.15); }
        }
        @keyframes glow-breathe-red {
          0%, 100% { opacity: 0.70; transform: scale(1.0); }
          50%       { opacity: 1.0;  transform: scale(1.1); }
        }
        @keyframes shift-rotate {
          0%, 100% { transform: rotate(40deg); opacity: 0.80; }
          50%       { transform: rotate(50deg); opacity: 1.0; }
        }
        .marker-anim-power {
          animation: glow-breathe-gold 3s ease-in-out infinite;
        }
        .marker-anim-challenging {
          animation: glow-breathe-red 2s ease-in-out infinite;
        }
        .marker-anim-shift {
          animation: shift-rotate 4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .marker-anim-power,
          .marker-anim-challenging,
          .marker-anim-shift {
            animation: none;
            opacity: 0.85;
          }
        }
      `}</style>

      {/* Overview Strip (spec 5.1–5.8) — renders above slider card */}
      {(snapshots.length > 0 || isPending) && (
        <OverviewStrip
          markers={markers}
          max={config.max}
          offset={offset}
          onJump={setOffset}
          isPending={isPending}
          config={config}
          unknownTime={chartData.unknownTime ?? false}
        />
      )}

      {/* Slider control */}
      <div className="bg-mystic-surface/50 border border-mystic-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-mystic-muted text-xs uppercase tracking-widest">Advance Time</span>
          <div className="flex items-center gap-3">
            {/* Prev / Next navigation (spec 7.3) */}
            <button
              onClick={() => prevMarker && setOffset(prevMarker.offset)}
              disabled={!prevMarker}
              className="text-mystic-gold/60 text-xs hover:text-mystic-gold disabled:opacity-30 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Jump to previous notable moment"
            >
              ← Prev
            </button>
            <span className="font-heading text-lg text-mystic-gold">{offsetLabel}</span>
            <button
              onClick={() => nextMarker && setOffset(nextMarker.offset)}
              disabled={!nextMarker}
              className="text-mystic-gold/60 text-xs hover:text-mystic-gold disabled:opacity-30 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Jump to next notable moment"
            >
              Next ✦
            </button>
          </div>
        </div>

        {/* Slider with marker overlay (spec 3.1–3.3) */}
        <div className="relative w-full">
          <input
            type="range"
            min={0}
            max={config.max}
            value={offset}
            onChange={handleSlider}
            className={`w-full h-2 bg-mystic-bg rounded-lg appearance-none cursor-pointer accent-mystic-gold
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-mystic-gold
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-track]:bg-mystic-border [&::-webkit-slider-track]:rounded-lg
              ${thumbShadowClass}${currentMarker ? ' has-thumb-halo' : ''}`}
            style={thumbHaloValue ? ({ '--thumb-halo': thumbHaloValue } as React.CSSProperties) : undefined}
          />

          {/* Marker dot overlay — pointer-events-none so slider drag works (spec 3.1) */}
          <div
            className="absolute pointer-events-none"
            style={{ top: '50%', transform: 'translateY(-50%)', left: '10px', right: '10px' }}
          >
            {/* Tooltip renders here, relative to the inset container */}
            {hoveredMarker && offset !== hoveredMarker.offset && (
              <MarkerTooltip
                marker={hoveredMarker}
                positionX={(hoveredMarker.offset / config.max) * 100}
              />
            )}

            {markers.map(m => (
              <MarkerDot
                key={m.offset}
                marker={m}
                max={config.max}
                active={offset === m.offset}
                onClick={() => setOffset(m.offset)}
                onMouseEnter={() => setHoveredMarker(m)}
                onMouseLeave={() => setHoveredMarker(null)}
              />
            ))}
          </div>
        </div>

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

      {/* Generalized Category Banner — power, favorable, challenging, shift (spec 2.3) */}
      {categoryBanner && snapshot && snapshot.score.category !== 'neutral' && (
        <div className={`mb-6 rounded-xl border border-l-2 px-4 py-3 flex items-start gap-2 ${
          snapshot.score.category === 'power'
            ? 'border-mystic-gold/30 border-l-mystic-gold bg-mystic-gold/10'
            : snapshot.score.category === 'favorable'
              ? 'border-green-500/30 border-l-green-500 bg-green-900/10'
              : snapshot.score.category === 'challenging'
                ? 'border-red-500/30 border-l-red-500 bg-red-900/10'
                : 'border-blue-500/30 border-l-blue-500 bg-blue-900/10'
        }`}>
          <span className={`mt-0.5 shrink-0 ${
            snapshot.score.category === 'power'
              ? 'text-mystic-gold'
              : snapshot.score.category === 'favorable'
                ? 'text-green-400'
                : snapshot.score.category === 'challenging'
                  ? 'text-red-400'
                  : 'text-blue-400'
          }`}>
            {snapshot.score.category === 'challenging' ? '⚠' :
             snapshot.score.category === 'shift' ? '◆' : '✦'}
          </span>
          <p className={`text-sm ${
            snapshot.score.category === 'power'
              ? 'text-mystic-gold/90'
              : snapshot.score.category === 'favorable'
                ? 'text-green-400/90'
                : snapshot.score.category === 'challenging'
                  ? 'text-red-400/90'
                  : 'text-blue-400/90'
          }`}>
            <span className="font-heading">{categoryBanner.split(' ')[0]}</span>
            {' ' + categoryBanner.split(' ').slice(1).join(' ')}
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
            <span className="text-mystic-muted text-sm">Reading the next {config.max} {config.unitPlural}…</span>
          </div>
        </div>
      )}

      {/* Transit aspects (spec 8.1) */}
      {snapshot && snapshot.transitAspects.length > 0 && (
        <div className="border border-mystic-gold/20 rounded-lg overflow-hidden mb-4">
          <div className="px-5 py-3 bg-mystic-gold/5">
            <span className="font-heading text-lg text-mystic-gold">
              Transit Aspects ({snapshot.transitAspects.length})
            </span>
            {aspectHeaderSuffix && (
              <span className="text-mystic-muted text-sm font-normal">{aspectHeaderSuffix}</span>
            )}
          </div>
          <div className="px-5 py-4">
            {snapshot.transitAspects.map((a, i) => {
              // Spec 9: unknownTime guard — house is null when time is unknown
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

      {/* Retrograde / Planetary Shift activity (spec 8.2) */}
      {snapshot && (() => {
        const active = snapshot.retrogrades.filter(r => r.isRetro || r.status.includes('Stationing'))
        if (active.length === 0) return null
        return (
          <div className="border border-mystic-gold/20 rounded-lg overflow-hidden mb-4">
            <div className="px-5 py-3 bg-mystic-gold/5">
              <span className="font-heading text-lg text-mystic-gold">{retrogradeHeader}</span>
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
