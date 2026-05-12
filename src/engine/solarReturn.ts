import { findSolarReturn, calculateChart } from './astronomy'
import type { ChartData } from './types'

export interface SolarReturnData {
  srMoment: Date
  srChart: ChartData
  natalChart: ChartData
  targetYear: number
}

/**
 * Calculate solar return for a given natal chart and target year.
 * targetYear defaults to current year if SR hasn't happened yet, else next year.
 */
export function calculateSolarReturn(
  natalChart: ChartData,
  _birthDate: string,
  birthLat: number,
  birthLng: number,
  targetYear?: number
): SolarReturnData {
  const natalSun = natalChart.planets.find(p => p.name === 'Sun')
  if (!natalSun) throw new Error('No Sun found in natal chart')

  const now = new Date()
  const currentYear = now.getFullYear()

  let year = targetYear ?? currentYear

  // If no explicit year, check if current year's SR has already passed
  if (!targetYear) {
    const srThisYear = findSolarReturn(natalSun.longitude, currentYear, birthLat, birthLng)
    if (srThisYear < now) {
      year = currentYear + 1
    } else {
      year = currentYear
    }
  }

  const srMoment = findSolarReturn(natalSun.longitude, year, birthLat, birthLng)

  // Format date and time in UTC for calculateChart
  const pad = (n: number) => String(n).padStart(2, '0')
  const srDate = `${srMoment.getUTCFullYear()}-${pad(srMoment.getUTCMonth() + 1)}-${pad(srMoment.getUTCDate())}`
  const srTime = `${pad(srMoment.getUTCHours())}:${pad(srMoment.getUTCMinutes())}`

  // Solar return chart is calculated for birth location, using UTC timezone
  const srChart = calculateChart(srDate, srTime, birthLat, birthLng, 'UTC', false)

  return { srMoment, srChart, natalChart, targetYear: year }
}

/**
 * Build a GPT prompt for a year-ahead solar return reading.
 */
export function buildSolarReturnPrompt(
  natalChart: ChartData,
  srChart: ChartData,
  srMoment: Date,
  birthDate: string
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

  // SR aspects (tight ones only, orb <= 3°)
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
