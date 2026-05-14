import * as Astronomy from 'astronomy-engine'
import { calculateChart } from './chartEngine.js'
import type { ServerChartData } from './chartEngine.js'

// ---------- Types ----------

export interface SolarReturnResult {
  srMoment: Date
  srChart: ServerChartData
  natalChart: ServerChartData
  targetYear: number
}

// ---------- analyzeElements (inline port from src/data/interpretations/index.ts) ----------
// MUST be kept in sync with analyzeElements in src/data/interpretations/index.ts
// and the SIGN_ELEMENTS / ELEMENT_INTERPRETATIONS data in src/engine/types.ts
// and src/data/interpretations/types.ts.

type Element = 'Fire' | 'Earth' | 'Air' | 'Water'

const SIGN_ELEMENTS: Record<string, Element> = {
  Aries: 'Fire', Taurus: 'Earth', Gemini: 'Air', Cancer: 'Water',
  Leo: 'Fire', Virgo: 'Earth', Libra: 'Air', Scorpio: 'Water',
  Sagittarius: 'Fire', Capricorn: 'Earth', Aquarius: 'Air', Pisces: 'Water',
}

const ELEMENT_INTERPRETATIONS: Record<Element, { dominant: string; lacking: string }> = {
  Fire: {
    dominant: "You lead with passion, enthusiasm, and courage. You're naturally action-oriented and inspire others with your energy and confidence.",
    lacking: "You may sometimes struggle with motivation or assertiveness. Cultivating spontaneity and physical activity can help ignite your inner fire.",
  },
  Earth: {
    dominant: "You're grounded, practical, and reliable. You build things that last and have a strong connection to the material world and physical senses.",
    lacking: "You may find it challenging to stay organized or follow through on practical matters. Establishing routines and connecting with nature can help.",
  },
  Air: {
    dominant: "You're intellectually curious, communicative, and socially adept. Ideas flow easily to you, and you thrive on mental stimulation and connection.",
    lacking: "You may sometimes struggle to articulate your thoughts or feel disconnected from intellectual pursuits. Journaling and conversation can stimulate this energy.",
  },
  Water: {
    dominant: "You're deeply intuitive, emotionally rich, and empathetic. You navigate the world through feeling and have powerful instincts about people and situations.",
    lacking: "You may find it difficult to access or express emotions. Creative outlets and time near water can help you connect with your emotional depth.",
  },
}

interface ElementBalance {
  counts: Record<Element, number>
  dominant: Element
  lacking: Element | null
  interpretation: { dominant: string; lacking: string | null }
}

function analyzeElements(planets: { sign: string }[]): ElementBalance {
  const counts: Record<Element, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 }
  for (const p of planets) {
    const el = SIGN_ELEMENTS[p.sign]
    if (el) counts[el] += 1
  }
  const sorted = (Object.entries(counts) as [Element, number][]).sort((a, b) => b[1] - a[1])
  const dominant = sorted[0][0]
  const lacking = sorted[3][1] === 0 ? sorted[3][0] : null
  return {
    counts,
    dominant,
    lacking,
    interpretation: {
      dominant: ELEMENT_INTERPRETATIONS[dominant].dominant,
      lacking: lacking ? ELEMENT_INTERPRETATIONS[lacking].lacking : null,
    },
  }
}

// ---------- findSolarReturn ----------
// Port from src/engine/astronomy.ts (line 335–406).
// The _birthLat / _birthLng parameters present in the frontend signature are unused
// (the function computes ecliptic longitude, not topocentric position) and are omitted here.
// Birth coordinates are used for the SR chart in calculateSolarReturn, not here.

export function findSolarReturn(
  natalSunLongitude: number,
  targetYear: number,
): Date {
  const searchStart = new Date(Date.UTC(targetYear, 0, 1))
  const searchEnd = new Date(Date.UTC(targetYear, 11, 31))

  const dayMs = 86400000
  const days = Math.ceil((searchEnd.getTime() - searchStart.getTime()) / dayMs)

  function sunDiff(date: Date): number {
    const t = Astronomy.MakeTime(date)
    const lon = Astronomy.SunPosition(t).elon
    let diff = lon - natalSunLongitude
    if (diff > 180) diff -= 360
    if (diff < -180) diff += 360
    return diff
  }

  let crossStart: Date | null = null
  let crossEnd: Date | null = null
  let prevDiff = sunDiff(searchStart)

  for (let i = 1; i <= days; i++) {
    const d = new Date(searchStart.getTime() + i * dayMs)
    const diff = sunDiff(d)

    if ((prevDiff < 0 && diff >= 0) || (prevDiff >= 0 && diff < 0)) {
      crossStart = new Date(searchStart.getTime() + (i - 1) * dayMs)
      crossEnd = d
      break
    }
    prevDiff = diff
  }

  if (!crossStart || !crossEnd) {
    return new Date(Date.UTC(targetYear, 5, 21)) // fallback: ~summer solstice
  }

  let lo = crossStart.getTime()
  let hi = crossEnd.getTime()

  for (let iter = 0; iter < 30; iter++) {
    const mid = lo + (hi - lo) / 2
    const diff = sunDiff(new Date(mid))

    if (Math.abs(diff) < 0.0007) { // ~1 arcminute
      return new Date(mid)
    }

    const diffLo = sunDiff(new Date(lo))
    if ((diffLo < 0 && diff < 0) || (diffLo >= 0 && diff >= 0)) {
      lo = mid
    } else {
      hi = mid
    }
  }

  return new Date(lo + (hi - lo) / 2)
}

// ---------- calculateSolarReturn ----------
// Port from src/engine/solarReturn.ts (line 16–52).
// ASSUMPTION: SR chart is always computed for the birth location (birthLat, birthLng), not
// the user's current location. This matches the frontend behavior and is intentional —
// relocation SR charts are out of scope (no current-location storage). If relocation support
// is added in a future sprint, this function's signature must accept an optional srLat/srLng.

export function calculateSolarReturn(
  natalChart: ServerChartData,
  birthLat: number,
  birthLng: number,
  targetYear?: number,
): SolarReturnResult {
  const natalSun = natalChart.planets.find(p => p.name === 'Sun')
  if (!natalSun) throw new Error('No Sun found in natal chart')

  const now = new Date()
  const currentYear = now.getFullYear()

  let year = targetYear ?? currentYear

  if (!targetYear) {
    const srThisYear = findSolarReturn(natalSun.longitude, currentYear)
    if (srThisYear < now) {
      year = currentYear + 1
    } else {
      year = currentYear
    }
  }

  const srMoment = findSolarReturn(natalSun.longitude, year)

  const pad = (n: number) => String(n).padStart(2, '0')
  const srDate = `${srMoment.getUTCFullYear()}-${pad(srMoment.getUTCMonth() + 1)}-${pad(srMoment.getUTCDate())}`
  const srTime = `${pad(srMoment.getUTCHours())}:${pad(srMoment.getUTCMinutes())}`

  // SR chart uses birth coordinates and UTC timezone — moment is known to the second
  const srChart = calculateChart(srDate, srTime, birthLat, birthLng, 'UTC', false)

  return { srMoment, srChart, natalChart, targetYear: year }
}

// ---------- buildSolarReturnPrompt ----------
// Port from src/engine/solarReturn.ts (line 57–131).
// Accesses full ZodiacPosition fields (longitude, degree, minute) — must use ServerChartData,
// not the stripped ChartData interface in gpt.ts which omits longitude and minute.

export function buildSolarReturnPrompt(
  natalChart: ServerChartData,
  srChart: ServerChartData,
  srMoment: Date,
  birthDate: string,
): string {
  const srAsc = srChart.angles.ascendant
  const srMC = srChart.angles.midheaven
  const srSun = srChart.planets.find(p => p.name === 'Sun')
  const srMoon = srChart.planets.find(p => p.name === 'Moon')

  let prompt = `You are an expert astrologer providing a solar return year-ahead reading. Be direct, specific, and insightful — state what the chart shows plainly, both favorable and challenging, without generic encouragement.\n\n`

  prompt += `## Natal Chart\n`
  prompt += `Birth date: ${birthDate}\n`
  for (const p of natalChart.planets) {
    prompt += `- Natal ${p.name}: ${p.degree}°${p.minute}' ${p.sign} (House ${p.house})${p.retrograde ? ' [Rx]' : ''}\n`
  }
  prompt += `Natal ASC: ${natalChart.angles.ascendant.degree}°${natalChart.angles.ascendant.minute}' ${natalChart.angles.ascendant.sign}\n`
  prompt += `Natal MC: ${natalChart.angles.midheaven.degree}°${natalChart.angles.midheaven.minute}' ${natalChart.angles.midheaven.sign}\n`

  const elementAnalysis = analyzeElements(natalChart.planets)
  prompt += `\n## Natal Element Profile\n`
  prompt += `Dominant element: ${elementAnalysis.dominant} — ${elementAnalysis.interpretation.dominant}\n`

  prompt += `\n## Solar Return Chart\n`
  prompt += `Solar Return moment: ${srMoment.toUTCString()}\n`
  prompt += `SR Ascendant: ${srAsc.degree}°${srAsc.minute}' ${srAsc.sign} (overall year theme)\n`
  prompt += `SR Midheaven: ${srMC.degree}°${srMC.minute}' ${srMC.sign} (career/public life direction)\n`
  if (srSun) prompt += `SR Sun: ${srSun.degree}°${srSun.minute}' ${srSun.sign} (House ${srSun.house}) — primary area of focus\n`
  if (srMoon) prompt += `SR Moon: ${srMoon.degree}°${srMoon.minute}' ${srMoon.sign} (House ${srMoon.house}) — emotional climate of the year\n`

  prompt += `\nAll SR planet positions:\n`
  for (const p of srChart.planets) {
    prompt += `- SR ${p.name}: ${p.degree}°${p.minute}' ${p.sign} (House ${p.house})${p.retrograde ? ' [Rx]' : ''}\n`
  }

  // SR aspects (tight only, orb <= 3°)
  const srAspects: string[] = []
  for (let i = 0; i < srChart.planets.length; i++) {
    for (let j = i + 1; j < srChart.planets.length; j++) {
      const p1 = srChart.planets[i]
      const p2 = srChart.planets[j]
      let raw = Math.abs(p1.longitude - p2.longitude)
      if (raw > 180) raw = 360 - raw
      const angles = [0, 60, 90, 120, 180]
      const symbols = ['☌', '⚹', '□', '△', '☍']
      for (let k = 0; k < angles.length; k++) {
        const orb = Math.abs(raw - angles[k])
        if (orb <= 3) {
          srAspects.push(`${p1.name} ${symbols[k]} ${p2.name} (orb ${orb.toFixed(1)}°)`)
          break
        }
      }
    }
  }

  if (srAspects.length > 0) {
    prompt += `\nKey SR aspects (tight, ≤3° orb):\n`
    for (const a of srAspects) prompt += `- ${a}\n`
  }

  prompt += `\n## Instructions\n`
  prompt += `Write a 4-6 paragraph year-ahead reading based on this solar return chart. Cover:\n`
  prompt += `1. The SR Ascendant sign and what it means for the overall year theme and how the person will present themselves\n`
  prompt += `2. The SR Sun house placement and what life area becomes the primary focus and identity\n`
  prompt += `3. The SR Moon sign and house — emotional needs, what brings security, and the emotional climate of the year\n`
  prompt += `4. Key SR aspects and their year-long themes — conjunctions and hard aspects (squares, oppositions) show where tension and growth are demanded\n`
  prompt += `5. How this SR chart differs from the natal — where is this year different from the person's baseline? What is activated that's usually dormant?\n\n`
  prompt += `Use second person ("you"). Write flowing paragraphs, no headers or bullet points. `
  prompt += `Be specific about planets, signs, and houses. State challenges directly. `
  prompt += `Close with the most important single thing the chart says about this year.`

  return prompt
}
