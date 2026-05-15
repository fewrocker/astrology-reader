import * as Astronomy from 'astronomy-engine'
import { longitudeToZodiac, normalizeAngle } from './zodiac'
import type { PlanetName, BodyName, ChartData } from './types'
import { PLANET_NAMES, isAsteroid } from './types'
import type { AspectType } from './aspects'
import { ASPECT_DEFINITIONS } from './aspects'
import type { TransitPeriod } from './transits'

// ─── Types ───────────────────────────────────────────────────────────────────

export type TimelineEventType =
  | 'aspect-perfection'
  | 'sign-ingress'
  | 'retrograde-station'
  | 'lunar-phase'
  | 'moon-sign-change'

export interface TimelineEvent {
  id: string
  type: TimelineEventType
  date: Date
  dateStr: string // YYYY-MM-DD
  planet?: BodyName
  secondPlanet?: BodyName
  natalHouse?: number | null   // null when unknownTime; absent for non-aspect events
  natalSign?: string
  aspectType?: AspectType
  aspectSymbol?: string
  aspectNature?: 'harmonious' | 'challenging' | 'neutral'
  fromSign?: string
  toSign?: string
  stationType?: 'retrograde' | 'direct'
  lunarPhase?: 'New Moon' | 'First Quarter' | 'Full Moon' | 'Last Quarter'
  lunarSign?: string
  label: string
  brief: string
}

export interface TimelineDay {
  dateStr: string
  date: Date
  events: TimelineEvent[]
  isPowerDay: boolean
}

// ─── Planet ↔ astronomy-engine mapping ───────────────────────────────────────

const BODY_MAP: Record<PlanetName, Astronomy.Body> = {
  Sun: Astronomy.Body.Sun,
  Moon: Astronomy.Body.Moon,
  Mercury: Astronomy.Body.Mercury,
  Venus: Astronomy.Body.Venus,
  Mars: Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn: Astronomy.Body.Saturn,
  Uranus: Astronomy.Body.Uranus,
  Neptune: Astronomy.Body.Neptune,
  Pluto: Astronomy.Body.Pluto,
}

function getPlanetLongitude(body: Astronomy.Body, time: Astronomy.AstroTime): number {
  if (body === Astronomy.Body.Sun) return Astronomy.SunPosition(time).elon
  if (body === Astronomy.Body.Moon) return Astronomy.EclipticGeoMoon(time).lon
  const geo = Astronomy.GeoVector(body, time, true)
  return Astronomy.Ecliptic(geo).elon
}

function getMeanNodeLongitude(time: Astronomy.AstroTime): number {
  const T = time.tt / 36525
  const omega = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T * T * T / 467441 - T * T * T * T / 60616000
  return normalizeAngle(omega)
}

function getLongitudeForName(name: BodyName, time: Astronomy.AstroTime): number {
  if (name === 'NorthNode') return getMeanNodeLongitude(time)
  if (isAsteroid(name)) return 0 // asteroid calculation path pending
  return getPlanetLongitude(BODY_MAP[name as PlanetName], time)
}

function getDailyMotion(body: Astronomy.Body, time: Astronomy.AstroTime): number {
  const lon1 = getPlanetLongitude(body, time)
  const timePlus = Astronomy.MakeTime(new Date(time.date.getTime() + 86400000))
  const lon2 = getPlanetLongitude(body, timePlus)
  let diff = lon2 - lon1
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return diff
}

// ─── Aspect perfection date finder (binary search) ──────────────────────────

function aspectSeparation(transitLon: number, natalLon: number, targetAngle: number): number {
  let raw = Math.abs(transitLon - natalLon)
  if (raw > 180) raw = 360 - raw
  return raw - targetAngle
}

/**
 * Find the exact date when a transit aspect becomes exact (orb = 0) using binary search.
 * Returns null if the aspect doesn't perfect within the window.
 */
function findAspectPerfection(
  transitPlanet: BodyName,
  natalLon: number,
  targetAngle: number,
  startDate: Date,
  endDate: Date,
  maxOrb: number,
): Date | null {
  const stepMs = 86400000 // 1 day
  const steps = Math.ceil((endDate.getTime() - startDate.getTime()) / stepMs)

  // Scan day by day looking for sign change in separation (crosses zero)
  let prevSep: number | null = null
  let crossStart: Date | null = null
  let crossEnd: Date | null = null

  for (let i = 0; i <= steps; i++) {
    const d = new Date(startDate.getTime() + i * stepMs)
    const t = Astronomy.MakeTime(d)
    const lon = getLongitudeForName(transitPlanet, t)
    const sep = aspectSeparation(lon, natalLon, targetAngle)

    if (prevSep !== null && Math.abs(sep) <= maxOrb) {
      // Check for zero crossing (sign change)
      if ((prevSep < 0 && sep >= 0) || (prevSep >= 0 && sep < 0)) {
        crossStart = new Date(startDate.getTime() + (i - 1) * stepMs)
        crossEnd = d
        break
      }
      // Check if we're very close to exact
      if (Math.abs(sep) < 0.05) {
        return d
      }
    }
    prevSep = sep
  }

  if (!crossStart || !crossEnd) return null

  // Binary search to find exact crossing
  let lo = crossStart.getTime()
  let hi = crossEnd.getTime()
  for (let iter = 0; iter < 20; iter++) {
    const mid = lo + (hi - lo) / 2
    const t = Astronomy.MakeTime(new Date(mid))
    const lon = getLongitudeForName(transitPlanet, t)
    const sep = aspectSeparation(lon, natalLon, targetAngle)

    if (Math.abs(sep) < 0.01) {
      return new Date(mid)
    }

    const tLo = Astronomy.MakeTime(new Date(lo))
    const sepLo = aspectSeparation(getLongitudeForName(transitPlanet, tLo), natalLon, targetAngle)

    if ((sepLo < 0 && sep < 0) || (sepLo >= 0 && sep >= 0)) {
      lo = mid
    } else {
      hi = mid
    }
  }

  return new Date(lo + (hi - lo) / 2)
}

/**
 * Find all aspect perfection events across a date range.
 * Accepts the full natalChart so that unknownTime and house values can be embedded
 * into each TimelineEvent for house-aware personalized brief generation.
 * @param unknownTime when true, natalHouse is set to null (no birth time = no houses)
 */
function findAspectPerfections(
  natalChart: ChartData,
  startDate: Date,
  endDate: Date,
  period: TransitPeriod,
): TimelineEvent[] {
  const events: TimelineEvent[] = []
  const { planets: natalPlanets, unknownTime } = natalChart

  // Only track meaningful transit planets (skip Sun for daily since it barely moves)
  const transitNames: BodyName[] = [...PLANET_NAMES]

  // Wider orb window for scanning
  const orbScale = period === 'daily' ? 0.5 : period === 'weekly' ? 0.8 : 1.0

  for (const tName of transitNames) {
    for (const np of natalPlanets) {
      for (const def of ASPECT_DEFINITIONS) {
        // Skip minor aspects for fast-moving planets
        if ((tName === 'Moon') && (def.name === 'semi-sextile' || def.name === 'quincunx')) continue

        const maxOrb = def.orb * orbScale
        const perfDate = findAspectPerfection(tName, np.longitude, def.angle, startDate, endDate, maxOrb)

        if (perfDate && perfDate >= startDate && perfDate <= endDate) {
          const dateStr = perfDate.toISOString().split('T')[0]
          // Embed natal house — null when birth time unknown or house sentinel 0
          const natalHouse: number | null = unknownTime ? null : (np.house > 0 ? np.house : null)
          events.push({
            id: `aspect-${tName}-${np.name}-${def.name}-${dateStr}`,
            type: 'aspect-perfection',
            date: perfDate,
            dateStr,
            planet: tName,
            secondPlanet: np.name,
            natalHouse,
            natalSign: np.sign ?? '',
            aspectType: def.name,
            aspectSymbol: def.symbol,
            aspectNature: def.nature,
            label: `${tName} ${def.symbol} ${np.name}`,
            brief: `Transit ${tName} ${def.name} natal ${np.name} becomes exact`,
          })
        }
      }
    }
  }

  return events
}

// ─── Sign ingresses ─────────────────────────────────────────────────────────

function findIngresses(startDate: Date, endDate: Date, includeMoon: boolean): TimelineEvent[] {
  const events: TimelineEvent[] = []
  const dayMs = 86400000

  for (const name of PLANET_NAMES) {
    if (name === 'Moon' && !includeMoon) continue

    const body = BODY_MAP[name]
    const step = name === 'Moon' ? dayMs / 4 : dayMs
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs)
    const totalSteps = name === 'Moon' ? days * 4 : days

    let prevSign = longitudeToZodiac(getPlanetLongitude(body, Astronomy.MakeTime(startDate))).sign

    for (let i = 1; i <= totalSteps; i++) {
      const checkDate = new Date(startDate.getTime() + i * step)
      if (checkDate > endDate) break

      const t = Astronomy.MakeTime(checkDate)
      const lon = getPlanetLongitude(body, t)
      const sign = longitudeToZodiac(lon).sign

      if (sign !== prevSign) {
        const dateStr = checkDate.toISOString().split('T')[0]

        if (name === 'Moon') {
          events.push({
            id: `moon-sign-${sign}-${dateStr}-${i}`,
            type: 'moon-sign-change',
            date: checkDate,
            dateStr,
            planet: 'Moon',
            fromSign: prevSign,
            toSign: sign,
            label: `☽ enters ${sign}`,
            brief: `Moon moves into ${sign}, shifting emotional tone`,
          })
        } else {
          events.push({
            id: `ingress-${name}-${sign}-${dateStr}`,
            type: 'sign-ingress',
            date: checkDate,
            dateStr,
            planet: name,
            fromSign: prevSign,
            toSign: sign,
            label: `${name} enters ${sign}`,
            brief: `${name} moves into ${sign}`,
          })
        }
        prevSign = sign
      }
    }
  }

  return events
}

// ─── Retrograde stations ────────────────────────────────────────────────────

function findStations(startDate: Date, endDate: Date): TimelineEvent[] {
  const events: TimelineEvent[] = []
  const dayMs = 86400000
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs)

  // Only outer planets station (not Sun/Moon)
  const stationPlanets: PlanetName[] = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']

  for (const name of stationPlanets) {
    const body = BODY_MAP[name]
    let prevMotion = getDailyMotion(body, Astronomy.MakeTime(startDate))

    for (let d = 1; d <= days; d++) {
      const checkDate = new Date(startDate.getTime() + d * dayMs)
      if (checkDate > endDate) break

      const t = Astronomy.MakeTime(checkDate)
      const motion = getDailyMotion(body, t)

      // Detect direction change
      if ((prevMotion >= 0 && motion < 0) || (prevMotion < 0 && motion >= 0)) {
        const stationType = motion < 0 ? 'retrograde' : 'direct'
        const dateStr = checkDate.toISOString().split('T')[0]
        const sign = longitudeToZodiac(getPlanetLongitude(body, t)).sign

        events.push({
          id: `station-${name}-${stationType}-${dateStr}`,
          type: 'retrograde-station',
          date: checkDate,
          dateStr,
          planet: name,
          stationType,
          label: `${name} stations ${stationType}`,
          brief: `${name} stations ${stationType} in ${sign}`,
        })
      }

      prevMotion = motion
    }
  }

  return events
}

// ─── Lunar phases ───────────────────────────────────────────────────────────

function findLunarPhases(startDate: Date, endDate: Date): TimelineEvent[] {
  const events: TimelineEvent[] = []
  const dayMs = 86400000
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs)

  // Check Sun-Moon elongation each day (6-hour steps for precision)
  const step = dayMs / 4
  let prevPhaseAngle = -1

  for (let i = 0; i <= days * 4; i++) {
    const checkDate = new Date(startDate.getTime() + i * step)
    if (checkDate > endDate) break

    const t = Astronomy.MakeTime(checkDate)
    const sunLon = getPlanetLongitude(Astronomy.Body.Sun, t)
    const moonLon = getPlanetLongitude(Astronomy.Body.Moon, t)

    let elongation = normalizeAngle(moonLon - sunLon)
    // Map to phase quadrant: 0=new, 90=first quarter, 180=full, 270=last quarter
    const quadrant = Math.floor(elongation / 90)
    const prevQuadrant = Math.floor(prevPhaseAngle / 90)

    if (prevPhaseAngle >= 0 && quadrant !== prevQuadrant) {
      // A phase boundary was crossed
      const phaseNames: Record<number, 'New Moon' | 'First Quarter' | 'Full Moon' | 'Last Quarter'> = {
        0: 'New Moon',
        1: 'First Quarter',
        2: 'Full Moon',
        3: 'Last Quarter',
      }
      const phaseName = phaseNames[quadrant]
      if (phaseName) {
        const moonSign = longitudeToZodiac(moonLon).sign
        const dateStr = checkDate.toISOString().split('T')[0]

        events.push({
          id: `lunar-${phaseName.replace(/\s/g, '-').toLowerCase()}-${dateStr}`,
          type: 'lunar-phase',
          date: checkDate,
          dateStr,
          lunarPhase: phaseName,
          lunarSign: moonSign,
          label: `${phaseName} in ${moonSign}`,
          brief: getLunarPhaseBrief(phaseName, moonSign),
        })
      }
    }

    prevPhaseAngle = elongation
  }

  return events
}

function getLunarPhaseBrief(phase: string, sign: string): string {
  switch (phase) {
    case 'New Moon': return `New Moon in ${sign} — fresh beginnings, set intentions`
    case 'First Quarter': return `First Quarter Moon in ${sign} — take action, push through obstacles`
    case 'Full Moon': return `Full Moon in ${sign} — culmination, clarity, release`
    case 'Last Quarter': return `Last Quarter Moon in ${sign} — reflect, let go, prepare for renewal`
    default: return `${phase} in ${sign}`
  }
}

// ─── Main timeline builder ──────────────────────────────────────────────────

function getDateRange(period: TransitPeriod, targetMonth?: string): { start: Date; end: Date } {
  const now = new Date()
  let start: Date
  let end: Date

  if (period === 'monthly' && targetMonth) {
    const [y, m] = targetMonth.split('-').map(Number)
    start = new Date(y, m - 1, 1)
    end = new Date(y, m, 0) // last day of month
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    switch (period) {
      case 'daily':
        end = new Date(start.getTime() + 3 * 86400000) // 3 days for daily to show some events
        break
      case 'weekly':
        end = new Date(start.getTime() + 7 * 86400000)
        break
      case 'monthly':
        end = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate())
        break
    }
  }

  return { start, end }
}

/**
 * Build the full timeline of transit events for a given period.
 */
export function buildTransitTimeline(
  natalChart: ChartData,
  period: TransitPeriod,
  targetMonth?: string,
): TimelineDay[] {
  const { start, end } = getDateRange(period, targetMonth)

  // Gather all event types
  const aspectEvents = findAspectPerfections(natalChart, start, end, period)
  const ingressEvents = findIngresses(start, end, period !== 'monthly') // include Moon for daily/weekly
  const stationEvents = findStations(start, end)
  const lunarEvents = findLunarPhases(start, end)

  // Combine and sort
  const allEvents = [...aspectEvents, ...ingressEvents, ...stationEvents, ...lunarEvents]
  allEvents.sort((a, b) => a.date.getTime() - b.date.getTime())

  // Deduplicate by id
  const seen = new Set<string>()
  const unique = allEvents.filter(e => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })

  // Group by date
  const dayMap = new Map<string, TimelineEvent[]>()
  for (const event of unique) {
    const list = dayMap.get(event.dateStr) ?? []
    list.push(event)
    dayMap.set(event.dateStr, list)
  }

  // Build sorted day list
  const days: TimelineDay[] = []
  const sortedKeys = [...dayMap.keys()].sort()

  for (const dateStr of sortedKeys) {
    const events = dayMap.get(dateStr)!
    // Count significant events (not Moon sign changes)
    const significantCount = events.filter(e => e.type !== 'moon-sign-change').length
    days.push({
      dateStr,
      date: new Date(dateStr + 'T12:00:00'),
      events,
      isPowerDay: significantCount >= 3,
    })
  }

  return days
}
