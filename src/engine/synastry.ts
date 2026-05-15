import { normalizeAngle, longitudeToZodiac } from './zodiac'
import type { PlanetPosition, BodyName, ChartData, ZodiacPosition, Element, Modality } from './types'
import { PLANET_NAMES, SIGN_ELEMENTS, SIGN_MODALITIES } from './types'
import { getHouseForLongitude } from './ephemeris'
import type { AspectType } from './aspects'
import { ASPECT_DEFINITIONS } from './aspects'
import { analyzeElements } from '../data/interpretations/index'

// ── Types ──────────────────────────────────────────────────

export interface SynastryAspect {
  person1Planet: BodyName
  person2Planet: BodyName
  type: AspectType
  orb: number
  exactAngle: number
  applying: boolean
  nature: 'harmonious' | 'challenging' | 'neutral'
  symbol: string
}

export interface HouseOverlayEntry {
  planet: BodyName
  sign: string
  house: number // House in partner's chart
  degree: number
  minute: number
}

export interface HouseOverlay {
  person1InPerson2Houses: HouseOverlayEntry[]
  person2InPerson1Houses: HouseOverlayEntry[]
}

export interface CompositeChart {
  planets: PlanetPosition[]
  angles: {
    ascendant: ZodiacPosition
    midheaven: ZodiacPosition
    descendant: ZodiacPosition
    imumCoeli: ZodiacPosition
  }
}

export interface CompatibilityScore {
  overall: number // 0-100
  romantic: number
  emotional: number
  communication: number
  growth: number
  challenge: number
  harmoniousCount: number
  challengingCount: number
  neutralCount: number
  elementCompatibility: string
  modalityCompatibility: string
  keyThemes: string[]
}

export interface SynastryData {
  synastryAspects: SynastryAspect[]
  houseOverlay: HouseOverlay
  compositeChart: CompositeChart
  compatibility: CompatibilityScore
}

// ── Cross-Chart Aspects ────────────────────────────────────

/**
 * Calculate aspects between Person 1's planets and Person 2's planets.
 * Uses slightly tighter orbs than natal (6° major, 2° minor).
 */
export function calculateSynastryAspects(
  chart1: ChartData,
  chart2: ChartData,
): SynastryAspect[] {
  const aspects: SynastryAspect[] = []
  const orbScale = 0.75 // Tighter than natal

  for (const p1 of chart1.planets) {
    for (const p2 of chart2.planets) {
      const rawAngle = Math.abs(normalizeAngle(p1.longitude) - normalizeAngle(p2.longitude))
      const angle = rawAngle > 180 ? 360 - rawAngle : rawAngle

      for (const def of ASPECT_DEFINITIONS) {
        const orb = Math.abs(angle - def.angle)
        const maxOrb = def.orb * orbScale

        if (orb <= maxOrb) {
          // Two static natal charts have no directional motion; applying is meaningless here.
          // SynastryPage.tsx already renders this field as false — this makes it correct at source.
          const applying = false

          aspects.push({
            person1Planet: p1.name,
            person2Planet: p2.name,
            type: def.name,
            orb: Math.round(orb * 100) / 100,
            exactAngle: def.angle,
            applying,
            nature: def.nature,
            symbol: def.symbol,
          })
          break
        }
      }
    }
  }

  aspects.sort((a, b) => a.orb - b.orb)
  return aspects
}

// ── House Overlays ─────────────────────────────────────────

/**
 * Calculate where each person's planets fall in the other person's houses.
 */
export function calculateHouseOverlays(
  chart1: ChartData,
  chart2: ChartData,
): HouseOverlay {
  const p1InP2: HouseOverlayEntry[] = []
  const p2InP1: HouseOverlayEntry[] = []

  if (!chart1.unknownTime && chart2.houses.length > 0) {
    const chart2Cusps = chart2.houses.map(h => h.longitude)
    for (const p of chart1.planets) {
      p1InP2.push({
        planet: p.name,
        sign: p.sign,
        house: getHouseForLongitude(p.longitude, chart2Cusps),
        degree: p.degree,
        minute: p.minute,
      })
    }
  }

  if (!chart2.unknownTime && chart1.houses.length > 0) {
    const chart1Cusps = chart1.houses.map(h => h.longitude)
    for (const p of chart2.planets) {
      p2InP1.push({
        planet: p.name,
        sign: p.sign,
        house: getHouseForLongitude(p.longitude, chart1Cusps),
        degree: p.degree,
        minute: p.minute,
      })
    }
  }

  return { person1InPerson2Houses: p1InP2, person2InPerson1Houses: p2InP1 }
}

// ── Composite Chart ────────────────────────────────────────

function midpointLongitude(lon1: number, lon2: number): number {
  const a = normalizeAngle(lon1)
  const b = normalizeAngle(lon2)
  let mid = (a + b) / 2
  // If the two points are more than 180° apart, the midpoint is on the other side
  if (Math.abs(a - b) > 180) {
    mid = normalizeAngle(mid + 180)
  }
  return normalizeAngle(mid)
}

function midpointPosition(pos1: ZodiacPosition, pos2: ZodiacPosition): ZodiacPosition {
  const lon = midpointLongitude(pos1.longitude, pos2.longitude)
  return longitudeToZodiac(lon)
}

/**
 * Calculate a composite (midpoint) chart from two natal charts.
 */
export function calculateCompositeChart(
  chart1: ChartData,
  chart2: ChartData,
): CompositeChart {
  const compositePlanets: PlanetPosition[] = []

  for (const name of [...PLANET_NAMES, 'NorthNode' as const]) {
    const p1 = chart1.planets.find(p => p.name === name)
    const p2 = chart2.planets.find(p => p.name === name)
    if (!p1 || !p2) continue

    const lon = midpointLongitude(p1.longitude, p2.longitude)
    const zodiac = longitudeToZodiac(lon)

    compositePlanets.push({
      ...zodiac,
      name,
      retrograde: false, // Composite planets aren't retrograde
      house: 0, // Deferred: composite house cusps require Placidus derivation from composite Ascendant.
                // Until computed, computeTransitAspectBrief falls to generic ASPECT_BRIEFS fallback.
                // See feat-couple-transit-aspect-rows proposal — known gap, sprint 0011.
    })
  }

  // Composite angles (midpoints)
  const compAsc = midpointPosition(chart1.angles.ascendant, chart2.angles.ascendant)
  const compMC = midpointPosition(chart1.angles.midheaven, chart2.angles.midheaven)
  const compDsc = longitudeToZodiac(normalizeAngle(compAsc.longitude + 180))
  const compIC = longitudeToZodiac(normalizeAngle(compMC.longitude + 180))

  return {
    planets: compositePlanets,
    angles: {
      ascendant: compAsc,
      midheaven: compMC,
      descendant: compDsc,
      imumCoeli: compIC,
    },
  }
}

// ── Compatibility Scoring ──────────────────────────────────

const ROMANTIC_PAIRS: [string, string][] = [
  ['Venus', 'Mars'], ['Sun', 'Moon'], ['Venus', 'Venus'],
  ['Mars', 'Mars'], ['Moon', 'Venus'], ['Sun', 'Venus'],
]

const EMOTIONAL_PAIRS: [string, string][] = [
  ['Moon', 'Moon'], ['Moon', 'Venus'], ['Moon', 'Neptune'],
  ['Sun', 'Moon'], ['Moon', 'Jupiter'],
]

const COMMUNICATION_PAIRS: [string, string][] = [
  ['Mercury', 'Mercury'], ['Mercury', 'Moon'], ['Mercury', 'Venus'],
  ['Mercury', 'Jupiter'], ['Mercury', 'Sun'],
]

function isInPairList(
  p1: string,
  p2: string,
  pairs: [string, string][],
): boolean {
  return pairs.some(
    ([a, b]) => (p1 === a && p2 === b) || (p1 === b && p2 === a),
  )
}

function elementCompat(chart1: ChartData, chart2: ChartData): string {
  const count1: Record<Element, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 }
  const count2: Record<Element, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 }

  for (const p of chart1.planets) count1[SIGN_ELEMENTS[p.sign]]++
  for (const p of chart2.planets) count2[SIGN_ELEMENTS[p.sign]]++

  const dom1 = (Object.keys(count1) as Element[]).sort((a, b) => count1[b] - count1[a])[0]
  const dom2 = (Object.keys(count2) as Element[]).sort((a, b) => count2[b] - count2[a])[0]

  const compatible = (
    (dom1 === 'Fire' && dom2 === 'Air') || (dom1 === 'Air' && dom2 === 'Fire') ||
    (dom1 === 'Earth' && dom2 === 'Water') || (dom1 === 'Water' && dom2 === 'Earth') ||
    dom1 === dom2
  )

  return compatible
    ? `Harmonious — ${dom1} and ${dom2} elements naturally support each other`
    : `Dynamic — ${dom1} and ${dom2} elements create growth through contrast`
}

function modalityCompat(chart1: ChartData, chart2: ChartData): string {
  const count1: Record<Modality, number> = { Cardinal: 0, Fixed: 0, Mutable: 0 }
  const count2: Record<Modality, number> = { Cardinal: 0, Fixed: 0, Mutable: 0 }

  for (const p of chart1.planets) count1[SIGN_MODALITIES[p.sign]]++
  for (const p of chart2.planets) count2[SIGN_MODALITIES[p.sign]]++

  const dom1 = (Object.keys(count1) as Modality[]).sort((a, b) => count1[b] - count1[a])[0]
  const dom2 = (Object.keys(count2) as Modality[]).sort((a, b) => count2[b] - count2[a])[0]

  if (dom1 === dom2) return `Both ${dom1}-dominant — you understand each other's drive but may compete`
  return `${dom1} meets ${dom2} — complementary approaches create balance`
}

function identifyKeyThemes(aspects: SynastryAspect[]): string[] {
  const themes: string[] = []

  const hasAspect = (p1: string, p2: string) =>
    aspects.some(a =>
      (a.person1Planet === p1 && a.person2Planet === p2) ||
      (a.person1Planet === p2 && a.person2Planet === p1)
    )

  const getAspect = (p1: string, p2: string) =>
    aspects.find(a =>
      (a.person1Planet === p1 && a.person2Planet === p2) ||
      (a.person1Planet === p2 && a.person2Planet === p1)
    )

  // Sun-Moon = core compatibility
  if (hasAspect('Sun', 'Moon')) {
    const a = getAspect('Sun', 'Moon')!
    themes.push(a.nature === 'harmonious' || a.nature === 'neutral'
      ? 'Deep soul connection — Sun-Moon contact suggests fundamental compatibility'
      : 'Intense growth bond — Sun-Moon tension drives personal evolution')
  }

  // Venus-Mars = romantic chemistry
  if (hasAspect('Venus', 'Mars')) {
    const a = getAspect('Venus', 'Mars')!
    themes.push(a.nature === 'harmonious' || a.nature === 'neutral'
      ? 'Strong romantic and physical attraction — Venus-Mars harmony'
      : 'Magnetic but fiery chemistry — Venus-Mars tension creates passion')
  }

  // Moon-Moon = emotional compatibility
  if (hasAspect('Moon', 'Moon')) {
    const a = getAspect('Moon', 'Moon')!
    themes.push(a.nature === 'harmonious' || a.nature === 'neutral'
      ? 'Emotional ease — your Moon-Moon connection means you understand each other\'s feelings'
      : 'Emotional growth — Moon-Moon tension means learning to honor different emotional needs')
  }

  // Saturn contacts = commitment
  const saturnAspects = aspects.filter(a => a.person1Planet === 'Saturn' || a.person2Planet === 'Saturn')
  if (saturnAspects.length > 0) {
    themes.push('Saturn contacts indicate commitment potential and lasting bonds')
  }

  // Pluto contacts = transformation
  const plutoAspects = aspects.filter(a => a.person1Planet === 'Pluto' || a.person2Planet === 'Pluto')
  if (plutoAspects.length > 0) {
    themes.push('Pluto contacts suggest a transformative and deeply impactful connection')
  }

  // Node contacts = karmic
  const nodeAspects = aspects.filter(a => a.person1Planet === 'NorthNode' || a.person2Planet === 'NorthNode')
  if (nodeAspects.length > 0) {
    themes.push('North Node contacts point to a fated, karmically significant relationship')
  }

  // Chiron contacts = wound and healing
  const personalPlanets = ['Sun', 'Moon', 'Venus', 'Mars']
  const chironAspects = aspects.filter(a =>
    (a.person1Planet as string) === 'Chiron' || (a.person2Planet as string) === 'Chiron'
  )
  const chironPersonalAspects = chironAspects.filter(a => {
    const other = (a.person1Planet as string) === 'Chiron' ? a.person2Planet : a.person1Planet
    return personalPlanets.includes(other as string)
  })
  if (chironPersonalAspects.length > 0) {
    const a = chironPersonalAspects[0]
    themes.push(a.nature === 'challenging'
      ? "One of you carries a wound the other's presence reopens — Chiron contacts this chart's personal planets, and the dynamic may defy easy explanation"
      : "A healer-and-healed thread runs through this connection — Chiron touching a personal planet brings depth and the possibility of mutual transformation")
  }

  // Chiron-to-Chiron = generational resonance
  if (hasAspect('Chiron', 'Chiron')) {
    themes.push("Your Chirons are in close contact — two people whose wounds speak the same language, mirroring each other's unhealed patterns")
  }

  if (themes.length === 0) {
    themes.push('A relationship with unique dynamics worth exploring through deeper aspects')
  }

  return themes
}

/**
 * Calculate overall compatibility metrics.
 */
export function calculateCompatibility(
  chart1: ChartData,
  chart2: ChartData,
  synastryAspects: SynastryAspect[],
): CompatibilityScore {
  let harmoniousCount = 0
  let challengingCount = 0
  let neutralCount = 0
  let romanticScore = 0
  let emotionalScore = 0
  let communicationScore = 0
  let growthScore = 0
  let challengeScore = 0

  for (const a of synastryAspects) {
    const weight = Math.max(0.2, 1 - a.orb / 8) // Tighter aspect = more weight

    if (a.nature === 'harmonious') harmoniousCount++
    else if (a.nature === 'challenging') challengingCount++
    else neutralCount++

    const scoreAdd = a.nature === 'harmonious' ? weight * 10 : a.nature === 'challenging' ? weight * 4 : weight * 7

    if (isInPairList(a.person1Planet, a.person2Planet, ROMANTIC_PAIRS)) {
      romanticScore += scoreAdd
    }
    if (isInPairList(a.person1Planet, a.person2Planet, EMOTIONAL_PAIRS)) {
      emotionalScore += scoreAdd
    }
    if (isInPairList(a.person1Planet, a.person2Planet, COMMUNICATION_PAIRS)) {
      communicationScore += scoreAdd
    }

    // Growth: Jupiter and outer planet contacts
    if (['Jupiter', 'Uranus', 'Neptune', 'Pluto'].includes(a.person1Planet) ||
        ['Jupiter', 'Uranus', 'Neptune', 'Pluto'].includes(a.person2Planet)) {
      growthScore += scoreAdd
    }

    if (a.nature === 'challenging') {
      challengeScore += weight * 10
    }
  }

  // Normalize scores to 0-100
  const normalize = (v: number, max: number) => Math.min(100, Math.round((v / max) * 100))
  const totalAspects = synastryAspects.length || 1

  const overall = normalize(
    harmoniousCount * 3 + neutralCount * 2 + challengingCount * 1,
    totalAspects * 3,
  )

  return {
    overall,
    romantic: normalize(romanticScore, 40),
    emotional: normalize(emotionalScore, 40),
    communication: normalize(communicationScore, 40),
    growth: normalize(growthScore, 60),
    challenge: normalize(challengeScore, 60),
    harmoniousCount,
    challengingCount,
    neutralCount,
    elementCompatibility: elementCompat(chart1, chart2),
    modalityCompatibility: modalityCompat(chart1, chart2),
    keyThemes: identifyKeyThemes(synastryAspects),
  }
}

// ── Main Entry Point ───────────────────────────────────────

/**
 * Calculate full synastry data between two charts.
 */
export function calculateSynastry(
  chart1: ChartData,
  chart2: ChartData,
): SynastryData {
  const synastryAspects = calculateSynastryAspects(chart1, chart2)
  const houseOverlay = calculateHouseOverlays(chart1, chart2)
  const compositeChart = calculateCompositeChart(chart1, chart2)
  const compatibility = calculateCompatibility(chart1, chart2, synastryAspects)

  return { synastryAspects, houseOverlay, compositeChart, compatibility }
}

// ── Synastry GPT Prompt Builder ────────────────────────────

export function buildSynastryPrompt(
  chart1: ChartData,
  chart2: ChartData,
  synastryData: SynastryData,
  person1Date: string,
  person2Date: string,
): string {
  const elementAnalysis1 = analyzeElements(chart1.planets)
  const elementAnalysis2 = analyzeElements(chart2.planets)

  let prompt = `You are an expert astrologer providing a factual, direct synastry (couple compatibility) reading. State what the charts show plainly — both the genuine strengths and the real difficulties — without sugar-coating.\n\n`

  // Person 1
  prompt += `## Person 1 Birth Chart\nBorn: ${person1Date}\n`
  prompt += `Natal positions:\n`
  for (const p of chart1.planets) {
    prompt += `- ${p.name}: ${p.degree}°${p.minute}' ${p.sign}${!chart1.unknownTime ? ` (House ${p.house})` : ''}${p.retrograde ? ' [Rx]' : ''}\n`
  }
  if (!chart1.unknownTime) {
    prompt += `Ascendant: ${chart1.angles.ascendant.degree}°${chart1.angles.ascendant.minute}' ${chart1.angles.ascendant.sign}\n`
    prompt += `Midheaven: ${chart1.angles.midheaven.degree}°${chart1.angles.midheaven.minute}' ${chart1.angles.midheaven.sign}\n`
  }
  prompt += `\n## Person 1 Element Profile\n`
  prompt += `Dominant element: ${elementAnalysis1.dominant} — ${elementAnalysis1.interpretation.dominant}\n`

  // Person 2
  prompt += `\n## Person 2 Birth Chart\nBorn: ${person2Date}\n`
  prompt += `Natal positions:\n`
  for (const p of chart2.planets) {
    prompt += `- ${p.name}: ${p.degree}°${p.minute}' ${p.sign}${!chart2.unknownTime ? ` (House ${p.house})` : ''}${p.retrograde ? ' [Rx]' : ''}\n`
  }
  if (!chart2.unknownTime) {
    prompt += `Ascendant: ${chart2.angles.ascendant.degree}°${chart2.angles.ascendant.minute}' ${chart2.angles.ascendant.sign}\n`
    prompt += `Midheaven: ${chart2.angles.midheaven.degree}°${chart2.angles.midheaven.minute}' ${chart2.angles.midheaven.sign}\n`
  }
  prompt += `\n## Person 2 Element Profile\n`
  prompt += `Dominant element: ${elementAnalysis2.dominant} — ${elementAnalysis2.interpretation.dominant}\n`

  // Cross-chart aspects — sorted by orb ascending so GPT sees tightest contacts first
  const sortedAspects = [...synastryData.synastryAspects].sort((a, b) => a.orb - b.orb)
  prompt += `\n## Synastry Aspects (Cross-Chart)\n`
  for (const a of sortedAspects) {
    prompt += `- Person 1 ${a.person1Planet} ${a.symbol} Person 2 ${a.person2Planet} (${a.type}, orb ${a.orb}°, ${a.nature})\n`
  }

  // House overlays
  if (synastryData.houseOverlay.person1InPerson2Houses.length > 0) {
    prompt += `\n## House Overlays\n`
    prompt += `Person 1's planets in Person 2's houses:\n`
    for (const h of synastryData.houseOverlay.person1InPerson2Houses) {
      prompt += `- ${h.planet} in ${h.sign} → Person 2's House ${h.house}\n`
    }
    prompt += `Person 2's planets in Person 1's houses:\n`
    for (const h of synastryData.houseOverlay.person2InPerson1Houses) {
      prompt += `- ${h.planet} in ${h.sign} → Person 1's House ${h.house}\n`
    }
  }

  // Composite
  prompt += `\n## Composite Chart (Relationship Chart — Midpoints)\n`
  for (const p of synastryData.compositeChart.planets) {
    prompt += `- Composite ${p.name}: ${p.degree}°${p.minute}' ${p.sign}\n`
  }
  prompt += `Composite Ascendant: ${synastryData.compositeChart.angles.ascendant.degree}°${synastryData.compositeChart.angles.ascendant.minute}' ${synastryData.compositeChart.angles.ascendant.sign}\n`

  // Compatibility
  prompt += `\n## Compatibility Summary\n`
  prompt += `Element compatibility: ${synastryData.compatibility.elementCompatibility}\n`
  prompt += `Modality compatibility: ${synastryData.compatibility.modalityCompatibility}\n`
  prompt += `Harmonious aspects: ${synastryData.compatibility.harmoniousCount}, Challenging: ${synastryData.compatibility.challengingCount}, Neutral: ${synastryData.compatibility.neutralCount}\n`

  prompt += `\n## Instructions\n`

  // Priority header — lead with the tightest cross-chart aspect
  const tightestSynastry = sortedAspects[0]
  if (tightestSynastry) {
    prompt += `Priority: Lead with the single most significant contact in this synastry — the tightest orb aspect that involves personal planets. State what this contact means for the relationship and, where house data is available, name the life area it activates (e.g., 'Person 1's Venus in their 7th house — the partnership zone') before expanding to the broader picture.\n\n`
  }

  prompt += `Provide a comprehensive couple synastry reading covering:\n`
  prompt += `1. Overall relationship energy and core dynamic\n`
  prompt += `2. Romantic and physical chemistry (Venus-Mars, Sun-Moon contacts)\n`
  prompt += `3. Emotional compatibility (Moon contacts)\n`
  prompt += `4. Communication style together (Mercury contacts)\n`
  prompt += `5. Growth potential and challenges (Saturn, outer planets)\n`
  prompt += `6. House overlay insights — what each person activates in the other\n`
  prompt += `7. Composite chart — the nature of the relationship as its own entity\n`
  prompt += `8. Key strengths and areas for conscious work\n\n`

  // House-naming instruction — gated on at least one person having known birth time
  if (!chart1.unknownTime || !chart2.unknownTime) {
    prompt += `Where house data is available for either person, name the house that receives each planet placement and state what life area it governs for that person — not just the house number, but what the house means (e.g., 'Person 1's 5th house, the zone of creative expression and romance'). Use "Person 1's 7th house (partnership)" rather than "Person 1's Libra." Where birth time is unknown, interpret in terms of sign and nature only.\n\n`
  }

  // Anti-generic constraint
  prompt += `Write as if you know these two people's charts specifically. Do not write sentences that could apply to any Venus-Moon trine or any Saturn square. Ground every statement in the actual degrees and signs listed above.\n\n`

  prompt += `Write 6-8 flowing paragraphs. Be direct, specific, and reference actual placements. `
  prompt += `State what works well between them and what will be genuinely difficult — do not minimize tensions or over-romanticize strengths. `
  prompt += `Use "Person 1" and "Person 2" as labels. Close with the most important factual dynamic to be aware of, not generic encouragement.`

  return prompt
}

// ── Couple Transit Prompt Builder ──────────────────────────

export function buildCoupleTransitPrompt(
  chart1: ChartData,
  chart2: ChartData,
  synastryData: SynastryData,
  transitData: import('./transits').TransitData,
  period: import('./transits').TransitPeriod,
  person1Date: string,
  person2Date: string,
  targetMonth?: string,
): string {
  const coupleElementAnalysis1 = analyzeElements(chart1.planets)
  const coupleElementAnalysis2 = analyzeElements(chart2.planets)

  let periodLabel: string
  if (period === 'daily') {
    periodLabel = 'today'
  } else if (period === 'weekly') {
    periodLabel = 'this week'
  } else if (targetMonth) {
    const [y, m] = targetMonth.split('-').map(Number)
    periodLabel = new Date(y, m - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
  } else {
    periodLabel = 'this month'
  }

  let prompt = `You are an expert astrologer providing a factual, direct ${period} couple transit reading. State what the transits show plainly — both favorable and challenging — without softening.\n\n`

  // Brief chart summary
  prompt += `## Person 1 (born ${person1Date})\n`
  for (const p of chart1.planets.filter(pp => ['Sun', 'Moon', 'Venus', 'Mars', 'Mercury'].includes(pp.name as string))) {
    prompt += `- ${p.name}: ${p.degree}°${p.minute}' ${p.sign}\n`
  }
  prompt += `\n## Person 1 Element Profile\n`
  prompt += `Dominant element: ${coupleElementAnalysis1.dominant} — ${coupleElementAnalysis1.interpretation.dominant}\n`

  prompt += `\n## Person 2 (born ${person2Date})\n`
  for (const p of chart2.planets.filter(pp => ['Sun', 'Moon', 'Venus', 'Mars', 'Mercury'].includes(pp.name as string))) {
    prompt += `- ${p.name}: ${p.degree}°${p.minute}' ${p.sign}\n`
  }
  prompt += `\n## Person 2 Element Profile\n`
  prompt += `Dominant element: ${coupleElementAnalysis2.dominant} — ${coupleElementAnalysis2.interpretation.dominant}\n`

  // Key synastry aspects
  prompt += `\n## Key Synastry Aspects\n`
  for (const a of synastryData.synastryAspects.slice(0, 10)) {
    prompt += `- P1 ${a.person1Planet} ${a.symbol} P2 ${a.person2Planet} (${a.type}, ${a.nature})\n`
  }

  // Composite chart
  prompt += `\n## Composite Chart\n`
  for (const p of synastryData.compositeChart.planets) {
    prompt += `- Composite ${p.name}: ${p.degree}°${p.minute}' ${p.sign}\n`
  }

  // Current transits
  prompt += `\n## Current Transits (${transitData.dateRange.start})\n`
  for (const p of transitData.currentPlanets.filter(pp => pp.name !== 'NorthNode')) {
    prompt += `- Transit ${p.name}: ${p.degree}°${p.minute}' ${p.sign}${p.retrograde ? ' [Rx]' : ''}\n`
  }

  // Transit aspects to composite
  prompt += `\n## Transit Aspects to Composite Chart\n`
  if (transitData.transitAspects.length === 0) {
    prompt += `No major transit aspects to composite within orb.\n`
  } else {
    for (const a of transitData.transitAspects) {
      prompt += `- Transit ${a.transitPlanet} ${a.symbol} Composite ${a.natalPlanet} (${a.type}, orb ${a.orb}°, ${a.nature})\n`
    }
  }

  // Priority instruction — lead with the tightest transit aspect to the composite
  const tightestCoupleTransit = transitData.transitAspects[0]
  if (tightestCoupleTransit) {
    prompt += `\nPriority: Lead with the single most impactful transit aspect to the composite chart — the tightest-orb aspect in transitData.transitAspects. State what this transit means for the relationship during this period before covering the broader picture.\n`
  }

  prompt += `\n## Instructions\n`
  prompt += `Provide a ${period} couple transit reading for ${periodLabel}.\n`
  prompt += `Focus on how current planetary transits are affecting this relationship — both individually and as a couple.\n`
  prompt += `Consider transits to the composite chart as affecting the relationship dynamic.\n`
  prompt += `Cover: relationship energy, communication, romance, and any challenges or growth opportunities.\n`
  prompt += `For each transit aspect to the composite chart, name what dimension of the relationship is being activated (romance, communication, shared resources, public identity, etc.) rather than stating only the house number.\n`
  prompt += `Write 4-6 flowing paragraphs. Be specific about placements. Use "Person 1" and "Person 2".\n`
  prompt += `State favorable transits plainly and state difficult ones without softening. Do not end with generic encouragement — close with the most important factual takeaway for the relationship during this period.`

  return prompt
}
