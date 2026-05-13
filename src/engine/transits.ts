import * as Astronomy from 'astronomy-engine'
import { longitudeToZodiac, normalizeAngle } from './zodiac'
import type { PlanetPosition, PlanetName, ChartData, HouseCusp } from './types'
import { PLANET_NAMES } from './types'
import type { AspectType } from './aspects'
import { ASPECT_DEFINITIONS } from './aspects'
import { getHouseForLongitude } from './astronomy'

export type TransitPeriod = 'daily' | 'weekly' | 'monthly'

export interface TransitPosition extends PlanetPosition {
  /** Daily motion in degrees (positive = direct, negative = retrograde) */
  dailyMotion: number
}

export interface TransitAspect {
  transitPlanet: PlanetName | 'NorthNode'
  natalPlanet: PlanetName | 'NorthNode'
  type: AspectType
  orb: number
  exactAngle: number
  applying: boolean
  nature: 'harmonious' | 'challenging' | 'neutral'
  symbol: string
}

export interface SignIngress {
  planet: PlanetName
  fromSign: string
  toSign: string
  approximateDate: string
}

export interface TransitData {
  period: TransitPeriod
  dateRange: { start: string; end: string }
  currentPlanets: TransitPosition[]
  transitAspects: TransitAspect[]
  ingresses: SignIngress[]
  retrogrades: { planet: PlanetName; isRetro: boolean; status: string }[]
}

/** Map planet names to astronomy-engine Body enum */
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

function getDailyMotion(body: Astronomy.Body, time: Astronomy.AstroTime): number {
  const lon1 = getPlanetLongitude(body, time)
  const timePlus = Astronomy.MakeTime(new Date(time.date.getTime() + 86400000))
  const lon2 = getPlanetLongitude(body, timePlus)
  let diff = lon2 - lon1
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return diff
}

/**
 * Calculate current planetary positions for transit reading.
 */
export function calculateCurrentPositions(date: Date): TransitPosition[] {
  const time = Astronomy.MakeTime(date)
  const positions: TransitPosition[] = []

  for (const name of PLANET_NAMES) {
    const body = BODY_MAP[name]
    const lon = getPlanetLongitude(body, time)
    const zodiac = longitudeToZodiac(lon)
    const motion = getDailyMotion(body, time)

    positions.push({
      ...zodiac,
      name,
      retrograde: motion < 0,
      house: 0,
      dailyMotion: motion,
    })
  }

  // North Node
  const nodeLon = getMeanNodeLongitude(time)
  const nodeZodiac = longitudeToZodiac(nodeLon)
  positions.push({
    ...nodeZodiac,
    name: 'NorthNode',
    retrograde: true,
    house: 0,
    dailyMotion: -0.053,
  })

  return positions
}

/**
 * Calculate aspects between transit planets and natal planets.
 * Uses tighter orbs for transits than natal aspects.
 */
export function calculateTransitAspects(
  transitPlanets: TransitPosition[],
  natalPlanets: PlanetPosition[],
  period: TransitPeriod
): TransitAspect[] {
  // Tighter orbs for transits — scale by period relevance
  const orbScale = period === 'daily' ? 0.3 : period === 'weekly' ? 0.5 : 0.7

  const aspects: TransitAspect[] = []

  for (const tp of transitPlanets) {
    for (const np of natalPlanets) {
      const rawAngle = Math.abs(tp.longitude - np.longitude)
      const angle = rawAngle > 180 ? 360 - rawAngle : rawAngle

      for (const def of ASPECT_DEFINITIONS) {
        const orb = Math.abs(angle - def.angle)
        const maxOrb = def.orb * orbScale

        if (orb <= maxOrb) {
          // Determine if applying (transit planet moving toward exact aspect)
          const applying = tp.dailyMotion > 0
            ? (angle > def.angle ? false : true)
            : (angle > def.angle ? true : false)

          aspects.push({
            transitPlanet: tp.name,
            natalPlanet: np.name,
            type: def.name,
            orb: Math.round(orb * 100) / 100,
            exactAngle: def.angle,
            applying,
            nature: def.nature,
            symbol: def.symbol,
          })
          break // only strongest aspect between this pair
        }
      }
    }
  }

  // Sort by orb tightness
  aspects.sort((a, b) => a.orb - b.orb)
  return aspects
}

/**
 * Detect sign ingresses (planet entering new sign) within a date range.
 */
function detectIngresses(startDate: Date, endDate: Date): SignIngress[] {
  const ingresses: SignIngress[] = []
  const dayMs = 86400000

  for (const name of PLANET_NAMES) {
    // Skip Moon for weekly/monthly (too many sign changes)
    const body = BODY_MAP[name]
    let prevTime = Astronomy.MakeTime(startDate)
    let prevLon = getPlanetLongitude(body, prevTime)
    let prevSign = longitudeToZodiac(prevLon).sign

    // Check each day in range
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs)
    // For Moon, check every 6 hours
    const step = name === 'Moon' ? dayMs / 4 : dayMs

    for (let d = 1; d <= days * (name === 'Moon' ? 4 : 1); d++) {
      const checkDate = new Date(startDate.getTime() + d * step)
      if (checkDate > endDate) break

      const checkTime = Astronomy.MakeTime(checkDate)
      const lon = getPlanetLongitude(body, checkTime)
      const sign = longitudeToZodiac(lon).sign

      if (sign !== prevSign) {
        ingresses.push({
          planet: name,
          fromSign: prevSign,
          toSign: sign,
          approximateDate: checkDate.toISOString().split('T')[0],
        })
        prevSign = sign
      }
    }
  }

  return ingresses
}

/**
 * Get retrograde status for all planets at a given date.
 */
export function getRetrogradeStatus(date: Date): { planet: PlanetName; isRetro: boolean; status: string }[] {
  const time = Astronomy.MakeTime(date)
  const statuses: { planet: PlanetName; isRetro: boolean; status: string }[] = []

  for (const name of PLANET_NAMES) {
    if (name === 'Sun' || name === 'Moon') continue
    const body = BODY_MAP[name]
    const motion = getDailyMotion(body, time)
    const isRetro = motion < 0

    // Check if recently stationed (very slow motion)
    const isStationing = Math.abs(motion) < 0.02
    let status = isRetro ? 'Retrograde' : 'Direct'
    if (isStationing) status = isRetro ? 'Stationing retrograde' : 'Stationing direct'

    statuses.push({ planet: name, isRetro, status })
  }

  return statuses
}

/**
 * Get date range for a transit period.
 * @param targetMonth optional "YYYY-MM" string to target a specific month (only used when period is 'monthly')
 */
function getDateRange(period: TransitPeriod, targetMonth?: string): { start: Date; end: Date; startStr: string; endStr: string } {
  const now = new Date()
  let start: Date
  let end: Date

  if (period === 'monthly' && targetMonth) {
    const [y, m] = targetMonth.split('-').map(Number)
    start = new Date(y, m - 1, 1)
    end = new Date(y, m, 1)
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    switch (period) {
      case 'daily':
        end = new Date(start.getTime() + 86400000)
        break
      case 'weekly':
        end = new Date(start.getTime() + 7 * 86400000)
        break
      case 'monthly':
        end = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate())
        break
    }
  }

  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { start, end, startStr: fmt(start), endStr: fmt(end) }
}

/**
 * Assign natal house positions to transit planets using natal house cusps.
 */
export function assignTransitHouses(
  transitPlanets: TransitPosition[],
  natalHouses: HouseCusp[]
): TransitPosition[] {
  const cusps = natalHouses
    .slice()
    .sort((a, b) => a.house - b.house)
    .map(h => h.longitude)

  return transitPlanets.map(tp => ({
    ...tp,
    house: getHouseForLongitude(tp.longitude, cusps),
  }))
}

/**
 * Build a text summary of the transit chart positions for GPT interpretation.
 */
export function buildTransitPrompt(
  natalChart: ChartData,
  transitData: TransitData,
  birthDate: string,
  period: TransitPeriod,
  targetMonth?: string,
): string {
  let periodLabel: string
  if (period === 'daily') {
    periodLabel = 'today'
  } else if (period === 'weekly') {
    periodLabel = 'this week'
  } else if (targetMonth) {
    const [y, m] = targetMonth.split('-').map(Number)
    const monthName = new Date(y, m - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
    periodLabel = monthName
  } else {
    periodLabel = 'this month'
  }

  let prompt = `You are an expert astrologer providing a factual, direct ${period} transit reading. State what the transits show plainly — both favorable and difficult — without sugar-coating or generic encouragement.\n\n`
  prompt += `## Birth Chart (Natal)\n`
  prompt += `Birth date: ${birthDate}\n`

  // Natal positions
  prompt += `\nNatal planet positions:\n`
  for (const p of natalChart.planets) {
    prompt += `- ${p.name}: ${p.degree}°${p.minute}' ${p.sign} (House ${p.house})${p.retrograde ? ' [Rx]' : ''}\n`
  }

  prompt += `\nNatal Ascendant: ${natalChart.angles.ascendant.degree}°${natalChart.angles.ascendant.minute}' ${natalChart.angles.ascendant.sign}\n`
  prompt += `Natal Midheaven: ${natalChart.angles.midheaven.degree}°${natalChart.angles.midheaven.minute}' ${natalChart.angles.midheaven.sign}\n`

  // Current transits
  prompt += `\n## Current Transit Positions (${transitData.dateRange.start})\n`
  for (const p of transitData.currentPlanets) {
    if (p.name === 'NorthNode') continue
    prompt += `- Transit ${p.name}: ${p.degree}°${p.minute}' ${p.sign}${p.retrograde ? ' [Rx]' : ''}\n`
  }

  // Transit aspects to natal
  prompt += `\n## Transit Aspects to Natal Chart\n`
  if (transitData.transitAspects.length === 0) {
    prompt += `No major transit aspects within orb ${periodLabel}.\n`
  } else {
    for (const a of transitData.transitAspects) {
      prompt += `- Transit ${a.transitPlanet} ${a.symbol} Natal ${a.natalPlanet} (${a.type}, orb ${a.orb}°, ${a.applying ? 'applying' : 'separating'}, ${a.nature})\n`
    }
  }

  // Sign ingresses
  if (transitData.ingresses.length > 0) {
    prompt += `\n## Sign Changes ${periodLabel}\n`
    for (const ing of transitData.ingresses) {
      prompt += `- ${ing.planet} moves from ${ing.fromSign} to ${ing.toSign} around ${ing.approximateDate}\n`
    }
  }

  // Retrogrades
  const retros = transitData.retrogrades.filter(r => r.isRetro || r.status.includes('Stationing'))
  if (retros.length > 0) {
    prompt += `\n## Retrograde Activity\n`
    for (const r of retros) {
      prompt += `- ${r.planet}: ${r.status}\n`
    }
  }

  prompt += `\n## Instructions\n`
  prompt += `Based on the transit aspects to the natal chart, provide a personalized ${period} reading for ${periodLabel}.\n\n`

  if (period === 'daily') {
    prompt += `Focus on:\n`
    prompt += `- Overall energy and mood for the day\n`
    prompt += `- The Moon's current transit and its effect\n`
    prompt += `- Any exact or very tight aspects (orb < 1°) that are most impactful today\n`
    prompt += `- Practical advice for navigating the day\n`
    prompt += `- Keep it concise but meaningful (3-4 paragraphs)\n`
  } else if (period === 'weekly') {
    prompt += `Focus on:\n`
    prompt += `- Key themes and energies for the week\n`
    prompt += `- Important days when exact aspects perfect\n`
    prompt += `- Mercury and Venus transits affecting communication and relationships\n`
    prompt += `- Any planetary sign changes during the week\n`
    prompt += `- Practical guidance for the week ahead (4-5 paragraphs)\n`
  } else {
    prompt += `Focus on:\n`
    prompt += `- Major themes and life areas activated this month\n`
    prompt += `- Slow planet (Jupiter, Saturn, Uranus, Neptune, Pluto) transits — these are the most significant\n`
    prompt += `- Any retrogrades and their impact\n`
    prompt += `- Key dates and turning points during the month\n`
    prompt += `- Growth opportunities and challenges to be aware of\n`
    prompt += `- Comprehensive guidance (5-6 paragraphs)\n`
  }

  prompt += `\nFormat your response as a direct, factual, honest reading. Use second person ("you"). `
  prompt += `Do not use headers or bullet points — write flowing paragraphs. `
  prompt += `Be specific about which planets and aspects you're interpreting. `
  prompt += `State favorable transits clearly and state difficult transits without softening — name real challenges and what they demand. `
  prompt += `Do not end with generic encouragement or positivity. Close with the most relevant factual takeaway for the period.`

  return prompt
}

/**
 * Return the tightest active transit aspects for a natal chart at the given moment.
 * Sorted by orb ascending. Useful for capturing sky context at a specific point in time.
 * @param date Optional date for historical sky lookup; defaults to now (current callers unaffected)
 */
export function getTopActiveTransits(
  chartData: ChartData,
  maxCount: number,
  maxOrbDegrees: number,
  date?: Date,
): TransitAspect[] {
  const positions = calculateCurrentPositions(date ?? new Date())
  const aspects = calculateTransitAspects(positions, chartData.planets, 'daily')
  return aspects.filter(a => a.orb <= maxOrbDegrees).slice(0, maxCount)
}

export interface EnergyRating {
  label: string
  score: number
  dotColor: string
  textColor: string
}

/**
 * Compute an energy rating from the top 8 transit aspects.
 * Harmonious aspects add +1, challenging aspects subtract 1.
 * Shared utility used by DailySnapshotCard, TodayPage, and JournalEntryCard.
 */
export function computeEnergyRating(aspects: TransitAspect[]): EnergyRating {
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

/**
 * Main function: calculate transit data for a given period.
 * @param targetMonth optional "YYYY-MM" for a specific future month
 */
export function calculateTransits(
  natalChart: ChartData,
  period: TransitPeriod,
  targetMonth?: string,
): TransitData {
  const { start, end, startStr, endStr } = getDateRange(period, targetMonth)

  const currentPlanets = calculateCurrentPositions(start)
  const transitAspects = calculateTransitAspects(currentPlanets, natalChart.planets, period)
  const ingresses = detectIngresses(start, end)
  const retrogrades = getRetrogradeStatus(start)

  return {
    period,
    dateRange: { start: startStr, end: endStr },
    currentPlanets,
    transitAspects,
    ingresses,
    retrogrades,
  }
}
