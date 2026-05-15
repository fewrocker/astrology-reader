import { normalizeAngle, longitudeToZodiac } from './zodiac'
import type { PlanetPosition, BodyName, ChartData, ZodiacPosition, Element, Modality } from './types'
import { PLANET_NAMES, ASTEROID_NAMES, SIGN_ELEMENTS, SIGN_MODALITIES, isAsteroid } from './types'
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

export interface DimensionValue {
  value: number        // -1.0 to 1.0 (negative = left pole, positive = right pole)
  confidence: number   // 0.0 to 1.0 — how much aspect evidence supports this value
  leftPole: string     // e.g. "Calm"
  rightPole: string    // e.g. "Fiery"
  label: string        // qualitative description e.g. "Distinctly Fiery"
  sentence: string     // one sentence for this couple's specific position
}

export interface CoupleProfile {
  intensity: DimensionValue       // Calm ←→ Fiery
  emotionalFlow: DimensionValue   // Reserved ←→ Expressive
  communicationStyle: DimensionValue  // Intuitive ←→ Analytical
  intimacyRhythm: DimensionValue  // Spacious ←→ Merging
  growthDynamic: DimensionValue   // Stabilizing ←→ Expanding
  sexualChemistry: DimensionValue // Understated ←→ Electric
  lifePace: DimensionValue        // Steady ←→ Catalytic
}

export interface SynastryData {
  synastryAspects: SynastryAspect[]
  houseOverlay: HouseOverlay
  compositeChart: CompositeChart
  coupleProfile: CoupleProfile
  keyThemes: string[]
  elementCompatibility: string
  modalityCompatibility: string
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

  for (const name of ([...PLANET_NAMES, 'NorthNode', ...ASTEROID_NAMES] as BodyName[])) {
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

// ── Shared Helpers ─────────────────────────────────────────

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

  for (const p of chart1.planets.filter(p => !isAsteroid(p.name as BodyName))) count1[SIGN_ELEMENTS[p.sign]]++
  for (const p of chart2.planets.filter(p => !isAsteroid(p.name as BodyName))) count2[SIGN_ELEMENTS[p.sign]]++

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

  for (const p of chart1.planets.filter(p => !isAsteroid(p.name as BodyName))) count1[SIGN_MODALITIES[p.sign]]++
  for (const p of chart2.planets.filter(p => !isAsteroid(p.name as BodyName))) count2[SIGN_MODALITIES[p.sign]]++

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

  // Chiron contacts to personal planets — wound-and-healing dynamic
  const chironToPersonal = aspects.filter(a =>
    (a.person1Planet === 'Chiron' || a.person2Planet === 'Chiron') &&
    (
      ['Sun', 'Moon', 'Venus', 'Mars'].includes(a.person1Planet as string) ||
      ['Sun', 'Moon', 'Venus', 'Mars'].includes(a.person2Planet as string)
    )
  )
  if (chironToPersonal.length > 0) {
    const tightest = chironToPersonal.sort((a, b) => a.orb - b.orb)[0]
    const isHarsh = tightest.nature === 'challenging'
    themes.push(isHarsh
      ? 'Chiron contacts a personal planet — this relationship carries a wound-and-healing dynamic at its core; the Chiron person\'s wound is activated by the other\'s identity or feeling'
      : 'Chiron contacts a personal planet — this relationship has a healing dimension; one person\'s wound becomes a source of growth and care for the other'
    )
  }

  if (themes.length === 0) {
    themes.push('A relationship with unique dynamics worth exploring through deeper aspects')
  }

  return themes
}

/**
 * Calculate the 7-axis Couple Relational Profile from synastry aspects and chart data.
 */
export function calculateCoupleProfile(
  chart1: ChartData,
  chart2: ChartData,
  aspects: SynastryAspect[],
): CoupleProfile {
  // Helper: accumulate aspect score for an axis
  function accumulateAspectScore(
    positivePairs: [string, string][],
    negativePairs: [string, string][],
  ): { score: number; totalWeight: number; topDriver: string | null } {
    let score = 0
    let totalWeight = 0
    let topDriverWeight = 0
    let topDriver: string | null = null

    for (const asp of aspects) {
      const w = Math.max(0.1, 1 - asp.orb / 6)
      const p1 = asp.person1Planet
      const p2 = asp.person2Planet
      const isPos = isInPairList(p1 as string, p2 as string, positivePairs)
      const isNeg = isInPairList(p1 as string, p2 as string, negativePairs)
      if (isPos || isNeg) {
        const sign = isPos ? 1 : -1
        score += sign * w
        totalWeight += w
        if (w > topDriverWeight) {
          topDriverWeight = w
          topDriver = `${p1} × ${p2} ${asp.type} (${asp.nature})`
        }
      }
    }
    return { score, totalWeight, topDriver }
  }

  // Helper: compute element ratio for an axis
  function computeElementRatio(
    positiveElements: Element[],
    negativeElements: Element[],
  ): number {
    const counts: Record<Element, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 }
    for (const p of [...chart1.planets, ...chart2.planets]) {
      if (!isAsteroid(p.name as BodyName)) {
        counts[SIGN_ELEMENTS[p.sign]]++
      }
    }
    const pos = positiveElements.reduce((sum, e) => sum + counts[e], 0)
    const neg = negativeElements.reduce((sum, e) => sum + counts[e], 0)
    const total = Object.values(counts).reduce((s, v) => s + v, 0) + 1
    return (pos - neg) / total
  }

  // Helper: compute modality ratio
  function computeModalityRatio(
    positiveModalities: Modality[],
    negativeModalities: Modality[],
  ): number {
    const counts: Record<Modality, number> = { Cardinal: 0, Fixed: 0, Mutable: 0 }
    for (const p of [...chart1.planets, ...chart2.planets]) {
      if (!isAsteroid(p.name as BodyName)) {
        counts[SIGN_MODALITIES[p.sign]]++
      }
    }
    const pos = positiveModalities.reduce((sum, m) => sum + counts[m], 0)
    const neg = negativeModalities.reduce((sum, m) => sum + counts[m], 0)
    const total = Object.values(counts).reduce((s, v) => s + v, 0) + 1
    return (pos - neg) / total
  }

  // Helper: build qualitative label
  function makeLabel(value: number, leftPole: string, rightPole: string): string {
    const abs = Math.abs(value)
    const pole = value > 0 ? rightPole : leftPole
    if (abs < 0.15) return 'Balanced'
    if (abs < 0.35) return `Leaning ${pole}`
    if (abs < 0.65) return `Moderately ${pole}`
    return `Distinctly ${pole}`
  }

  // Helper: build DimensionValue
  function buildDimension(
    _axisName: string,
    leftPole: string,
    rightPole: string,
    aspectWeight: number,
    elementWeight: number,
    aspectData: { score: number; totalWeight: number; topDriver: string | null },
    elementScore: number,
    sentence: string,
  ): DimensionValue {
    const aspectComponent = aspectData.totalWeight > 0
      ? Math.tanh((aspectData.score / aspectData.totalWeight) * 3)
      : 0
    const combined = (aspectWeight * aspectComponent) + (elementWeight * elementScore)
    const value = Math.tanh(combined * 3)
    const confidence = Math.min(1.0, aspectData.totalWeight / 3.0)
    return {
      value,
      confidence,
      leftPole,
      rightPole,
      label: makeLabel(value, leftPole, rightPole),
      sentence,
    }
  }

  // ── AXIS 1: INTENSITY — Calm ←→ Fiery ─────────────────────
  const intensityAspects = accumulateAspectScore(
    [['Mars', 'Mars'], ['Sun', 'Mars'], ['Mars', 'Sun'], ['Pluto', 'Mars'], ['Mars', 'Pluto'], ['Pluto', 'Sun'], ['Sun', 'Pluto']],
    [],
  )
  const intensityElement = computeElementRatio(['Fire'], ['Water'])
  // Sentence generation
  let intensitySentence: string
  if (Math.min(1.0, intensityAspects.totalWeight / 3.0) < 0.2 && Math.abs(intensityElement * 0.35) < 0.1) {
    intensitySentence = 'Insufficient synastry aspects to characterize the energetic charge of this connection.'
  } else if (intensityAspects.topDriver?.includes('Mars × Mars')) {
    const isSquare = intensityAspects.topDriver.includes('square') || intensityAspects.topDriver.includes('opposition')
    intensitySentence = isSquare
      ? 'Your Mars contact is a square — the charge between you can power shared drives as forcefully as it can ignite conflict; the difference is direction.'
      : 'Your Mars signs meet directly — the energy between you is kinetic, combustible in the best sense, and unlikely to stay still for long.'
  } else if (intensityAspects.topDriver?.includes('Mars × Pluto') || intensityAspects.topDriver?.includes('Pluto × Mars') || intensityAspects.topDriver?.includes('Pluto × Sun') || intensityAspects.topDriver?.includes('Sun × Pluto')) {
    intensitySentence = 'Mars and Pluto in contact generate pressure — the kind that can feel transformative or overwhelming depending on the day, but never ordinary.'
  } else if (intensityAspects.topDriver?.includes('Sun × Mars') || intensityAspects.topDriver?.includes('Mars × Sun')) {
    intensitySentence = "One person's drive is animated by the other's core identity — this relationship has an assertive, forward-moving quality built into its center."
  } else {
    const intensityVal = intensityAspects.totalWeight > 0
      ? Math.tanh((intensityAspects.score / intensityAspects.totalWeight) * 3)
      : 0
    const combined = 0.65 * intensityVal + 0.35 * intensityElement
    const finalVal = Math.tanh(combined * 3)
    if (Math.abs(finalVal) < 0.15) {
      intensitySentence = 'The energetic charge between you sits in the middle ground — neither consistently heightened nor subdued, able to move in either direction as circumstances call.'
    } else if (finalVal > 0.15) {
      intensitySentence = 'Combined, your charts lean toward Fire — the pace is quick and the instincts are strong between you.'
    } else {
      intensitySentence = 'Combined, your charts lean toward Water — the energy between you is steady rather than combustible, with depth over heat.'
    }
  }
  const intensity = buildDimension('Intensity', 'Calm', 'Fiery', 0.65, 0.35, intensityAspects, intensityElement, intensitySentence)

  // ── AXIS 2: EMOTIONAL FLOW — Reserved ←→ Expressive ───────
  const emotionalAspects = accumulateAspectScore(
    [['Moon', 'Moon'], ['Moon', 'Venus'], ['Venus', 'Moon'], ['Moon', 'Jupiter'], ['Jupiter', 'Moon'], ['Sun', 'Moon'], ['Moon', 'Sun']],
    [['Moon', 'Saturn'], ['Saturn', 'Moon'], ['Moon', 'Uranus'], ['Uranus', 'Moon']],
  )
  const emotionalElement = computeElementRatio(['Water'], ['Air', 'Fire'])
  let emotionalSentence: string
  if (Math.min(1.0, emotionalAspects.totalWeight / 3.0) < 0.2) {
    emotionalSentence = 'Insufficient synastry aspects to reliably characterize the emotional register of this connection.'
  } else if (emotionalAspects.topDriver?.includes('Moon × Moon')) {
    emotionalSentence = emotionalAspects.topDriver.includes('harmonious') || emotionalAspects.topDriver.includes('neutral')
      ? "Your Moon-Moon connection means you understand each other's emotional rhythms without much translation needed."
      : 'Moon-Moon tension creates strong emotional activation — you feel each other deeply, though processing styles may differ.'
  } else if (emotionalAspects.topDriver?.includes('Moon × Saturn') || emotionalAspects.topDriver?.includes('Saturn × Moon')) {
    emotionalSentence = 'Moon-Saturn contact creates emotional structure and restraint — feelings are real but surface slowly and deliberately.'
  } else if (emotionalAspects.topDriver?.includes('Moon × Venus') || emotionalAspects.topDriver?.includes('Venus × Moon')) {
    emotionalSentence = 'Moon-Venus contact creates warmth and emotional openness — affection flows naturally between you.'
  } else {
    const emotionalVal = emotionalAspects.totalWeight > 0
      ? Math.tanh((emotionalAspects.score / emotionalAspects.totalWeight) * 3)
      : 0
    const combined = 0.70 * emotionalVal + 0.30 * emotionalElement
    const finalVal = Math.tanh(combined * 3)
    if (Math.abs(finalVal) < 0.15) {
      emotionalSentence = 'This relationship sits in the center of the emotional expression spectrum — neither withholding nor overflowing.'
    } else if (finalVal > 0.15) {
      emotionalSentence = 'Your combined charts favor Water — emotional sensitivity and expressiveness are a natural current between you.'
    } else {
      emotionalSentence = 'Emotional processing in this relationship tends toward the private — feelings are present but held with care before being shared.'
    }
  }
  const emotionalFlow = buildDimension('Emotional Flow', 'Reserved', 'Expressive', 0.70, 0.30, emotionalAspects, emotionalElement, emotionalSentence)

  // ── AXIS 3: COMMUNICATION STYLE — Intuitive ←→ Analytical ─
  const commAspects = accumulateAspectScore(
    [['Mercury', 'Mercury'], ['Mercury', 'Uranus'], ['Uranus', 'Mercury'], ['Mercury', 'Sun'], ['Sun', 'Mercury'], ['Mercury', 'Saturn'], ['Saturn', 'Mercury']],
    [['Mercury', 'Moon'], ['Moon', 'Mercury'], ['Mercury', 'Neptune'], ['Neptune', 'Mercury']],
  )
  const commElement = computeElementRatio(['Air', 'Earth'], ['Water', 'Fire'])
  let commSentence: string
  if (Math.min(1.0, commAspects.totalWeight / 3.0) < 0.2) {
    commSentence = 'Insufficient synastry aspects to characterize how you two process and exchange information.'
  } else if (commAspects.topDriver?.includes('Mercury × Mercury')) {
    commSentence = 'Your Mercury signs connect directly — you tend to process ideas in similar registers, and conversations have their own natural flow.'
  } else if (commAspects.topDriver?.includes('Mercury × Moon') || commAspects.topDriver?.includes('Moon × Mercury')) {
    commSentence = "One person's thinking is colored by the other's emotional experience — this relationship communicates more through feeling than through argument."
  } else if (commAspects.topDriver?.includes('Mercury × Uranus') || commAspects.topDriver?.includes('Uranus × Mercury')) {
    commSentence = 'Mercury-Uranus contact brings quick thinking and unconventional ideas into your exchanges — conversation between you tends to jump and spark.'
  } else if (commAspects.topDriver?.includes('Mercury × Neptune') || commAspects.topDriver?.includes('Neptune × Mercury')) {
    commSentence = 'Mercury-Neptune contact means communication between you is impressionistic rather than literal — meaning arrives through feeling as much as through words.'
  } else {
    const commVal = commAspects.totalWeight > 0
      ? Math.tanh((commAspects.score / commAspects.totalWeight) * 3)
      : 0
    const combined = 0.60 * commVal + 0.40 * commElement
    const finalVal = Math.tanh(combined * 3)
    if (Math.abs(finalVal) < 0.15) {
      commSentence = 'Your communication styles meet in the middle — intuition and analysis both have their place in how you exchange ideas.'
    } else if (finalVal > 0.15) {
      commSentence = 'Combined Air and Earth dominance creates a preference for concrete thinking and organized communication between you.'
    } else {
      commSentence = 'Dominant Water and Fire in your combined charts suggests communication that is more instinctive and feeling-led than analytical.'
    }
  }
  const communicationStyle = buildDimension('Communication Style', 'Intuitive', 'Analytical', 0.60, 0.40, commAspects, commElement, commSentence)

  // ── AXIS 4: INTIMACY RHYTHM — Spacious ←→ Merging ─────────
  const intimacyAspects = accumulateAspectScore(
    [['Venus', 'Neptune'], ['Neptune', 'Venus'], ['Moon', 'Neptune'], ['Neptune', 'Moon'], ['Venus', 'Pluto'], ['Pluto', 'Venus'], ['Moon', 'Pluto'], ['Pluto', 'Moon'], ['Sun', 'Neptune'], ['Neptune', 'Sun']],
    [['Mars', 'Uranus'], ['Uranus', 'Mars'], ['Saturn', 'Venus'], ['Venus', 'Saturn'], ['Saturn', 'Moon'], ['Moon', 'Saturn']],
  )
  // House overlay component for intimacy (8th/12th vs 1st/11th)
  let houseComponent = 0
  const houseWeight = (synastryData?: HouseOverlay) => {
    if (!synastryData) return 0
    const allEntries = [...synastryData.person1InPerson2Houses, ...synastryData.person2InPerson1Houses]
    if (allEntries.length === 0) return 0
    let score = 0
    for (const e of allEntries) {
      if ([8, 12].includes(e.house)) score += 0.3
      if ([1, 11].includes(e.house)) score -= 0.2
    }
    return Math.tanh(score)
  }
  // We don't have houseOverlay inside this helper but we compute it below
  // For now, use aspect-only (house component handled at integration level)
  let intimacySentence: string
  if (Math.min(1.0, intimacyAspects.totalWeight / 3.0) < 0.2) {
    intimacySentence = 'Insufficient synastry aspects to characterize the intimacy rhythm of this connection.'
  } else if (intimacyAspects.topDriver?.includes('Venus × Neptune') || intimacyAspects.topDriver?.includes('Neptune × Venus')) {
    intimacySentence = 'Venus-Neptune contact creates a dissolving, idealistic quality to closeness — boundaries soften and the desire to merge is real and present.'
  } else if (intimacyAspects.topDriver?.includes('Moon × Neptune') || intimacyAspects.topDriver?.includes('Neptune × Moon')) {
    intimacySentence = 'Moon-Neptune contact brings emotional permeability — you absorb each other\'s moods and the distinction between self and other becomes fluid in this relationship.'
  } else if (intimacyAspects.topDriver?.includes('Venus × Pluto') || intimacyAspects.topDriver?.includes('Pluto × Venus') || intimacyAspects.topDriver?.includes('Moon × Pluto') || intimacyAspects.topDriver?.includes('Pluto × Moon')) {
    intimacySentence = 'Pluto contacts create compulsive closeness — the pull toward merger is intense and deep, sometimes uncomfortably so.'
  } else if (intimacyAspects.topDriver?.includes('Saturn × Moon') || intimacyAspects.topDriver?.includes('Moon × Saturn') || intimacyAspects.topDriver?.includes('Saturn × Venus') || intimacyAspects.topDriver?.includes('Venus × Saturn')) {
    intimacySentence = 'Saturn contacts to personal planets create emotional structure and distance — intimacy is earned slowly and maintained through clear boundaries.'
  } else {
    const intimacyVal = intimacyAspects.totalWeight > 0
      ? Math.tanh((intimacyAspects.score / intimacyAspects.totalWeight) * 3)
      : 0
    if (Math.abs(intimacyVal) < 0.15) {
      intimacySentence = 'Your intimacy rhythm sits in balance — neither fused nor distant, adjusting naturally to what the moment asks.'
    } else if (intimacyVal > 0.15) {
      intimacySentence = 'The pull toward closeness and merger is evident — this relationship tends to seek shared space rather than separate lanes.'
    } else {
      intimacySentence = 'This relationship tends toward spaciousness — independence and individual identity are valued and maintained.'
    }
  }
  const intimacyRhythm = buildDimension('Intimacy Rhythm', 'Spacious', 'Merging', 1.0, 0.0, intimacyAspects, houseComponent, intimacySentence)
  void houseWeight // suppress unused warning — house overlay handled externally

  // ── AXIS 5: GROWTH DYNAMIC — Stabilizing ←→ Expanding ─────
  const growthAspects = accumulateAspectScore(
    [['Jupiter', 'Jupiter'], ['Jupiter', 'Sun'], ['Sun', 'Jupiter'], ['Jupiter', 'Moon'], ['Moon', 'Jupiter'], ['Jupiter', 'Venus'], ['Venus', 'Jupiter'], ['Uranus', 'Sun'], ['Sun', 'Uranus'], ['Uranus', 'Moon'], ['Moon', 'Uranus']],
    [['Saturn', 'Sun'], ['Sun', 'Saturn'], ['Saturn', 'Moon'], ['Moon', 'Saturn'], ['Saturn', 'Venus'], ['Venus', 'Saturn'], ['Saturn', 'Mars'], ['Mars', 'Saturn']],
  )
  const growthModality = computeModalityRatio(['Mutable', 'Cardinal'], ['Fixed'])
  let growthSentence: string
  if (Math.min(1.0, growthAspects.totalWeight / 3.0) < 0.2) {
    growthSentence = 'Insufficient synastry aspects to characterize whether this relationship deepens what exists or expands into new territory.'
  } else if (growthAspects.topDriver?.includes('Saturn × Sun') || growthAspects.topDriver?.includes('Sun × Saturn') || growthAspects.topDriver?.includes('Saturn × Moon') || growthAspects.topDriver?.includes('Moon × Saturn')) {
    growthSentence = 'Saturn contacts build slowly and durably — this relationship favors deepening what exists over rapid expansion into new experience.'
  } else if (growthAspects.topDriver?.includes('Jupiter × Sun') || growthAspects.topDriver?.includes('Sun × Jupiter') || growthAspects.topDriver?.includes('Jupiter × Moon') || growthAspects.topDriver?.includes('Moon × Jupiter')) {
    growthSentence = "Jupiter contacts amplify and expand — this relationship tends to bring out each other's optimism and push toward growth and new horizons."
  } else if (growthAspects.topDriver?.includes('Uranus × Sun') || growthAspects.topDriver?.includes('Sun × Uranus') || growthAspects.topDriver?.includes('Uranus × Moon') || growthAspects.topDriver?.includes('Moon × Uranus')) {
    growthSentence = 'Uranus contacts introduce an element of disruption and acceleration — this relationship opens territory neither person would reach alone.'
  } else {
    const growthVal = growthAspects.totalWeight > 0
      ? Math.tanh((growthAspects.score / growthAspects.totalWeight) * 3)
      : 0
    const combined = 0.65 * growthVal + 0.35 * growthModality
    const finalVal = Math.tanh(combined * 3)
    if (Math.abs(finalVal) < 0.15) {
      growthSentence = 'This relationship balances expansion and consolidation — capable of both stability and growth depending on what the moment calls for.'
    } else if (finalVal > 0.15) {
      growthSentence = 'Your combined Mutable and Cardinal energy creates a relationship that is consistently in motion, seeking new experience and expansion.'
    } else {
      growthSentence = 'Fixed modality dominance in your combined charts means this relationship builds slowly and values what it has over what could be added.'
    }
  }
  const growthDynamic = buildDimension('Growth Dynamic', 'Stabilizing', 'Expanding', 0.65, 0.35, growthAspects, growthModality, growthSentence)

  // ── AXIS 6: SEXUAL CHEMISTRY — Understated ←→ Electric ────
  const sexAspects = accumulateAspectScore(
    [['Venus', 'Mars'], ['Mars', 'Venus'], ['Mars', 'Mars'], ['Venus', 'Uranus'], ['Uranus', 'Venus'], ['Mars', 'Uranus'], ['Uranus', 'Mars']],
    [['Venus', 'Saturn'], ['Saturn', 'Venus'], ['Moon', 'Saturn'], ['Saturn', 'Moon']],
  )
  let sexSentence: string
  if (Math.min(1.0, sexAspects.totalWeight / 3.0) < 0.2) {
    sexSentence = 'Insufficient synastry aspects to characterize the magnetic charge between you.'
  } else if (sexAspects.topDriver?.includes('Venus × Mars') || sexAspects.topDriver?.includes('Mars × Venus')) {
    sexAspects.topDriver.includes('harmonious') || sexAspects.topDriver.includes('neutral')
      ? (sexSentence = 'Venus-Mars contact is the primary attraction axis in synastry — there is a natural, easy pull between you that shows up in both romantic and physical chemistry.')
      : (sexSentence = 'Venus-Mars tension creates charged attraction — the friction between you generates heat that can be creative or combustible.')
  } else if (sexAspects.topDriver?.includes('Venus × Uranus') || sexAspects.topDriver?.includes('Uranus × Venus')) {
    sexSentence = 'Venus-Uranus contact creates sudden, electric attraction — a sense of unexpectedness and spark that keeps the connection feeling alive and unpredictable.'
  } else if (sexAspects.topDriver?.includes('Mars × Uranus') || sexAspects.topDriver?.includes('Uranus × Mars')) {
    sexSentence = 'Mars-Uranus contact creates restless, kinetic energy — the magnetic charge between you is real and somewhat unpredictable.'
  } else if (sexAspects.topDriver?.includes('Venus × Saturn') || sexAspects.topDriver?.includes('Saturn × Venus')) {
    sexSentence = 'Venus-Saturn contact creates a slow-building, disciplined attraction — the magnetic dimension of this connection develops with time rather than on first contact.'
  } else if (sexAspects.topDriver?.includes('Mars × Mars')) {
    sexSentence = 'Double Mars contact means high activation — the physical energy between you is direct, present, and hard to miss.'
  } else {
    const sexVal = sexAspects.totalWeight > 0
      ? Math.tanh((sexAspects.score / sexAspects.totalWeight) * 3)
      : 0
    if (Math.abs(sexVal) < 0.15) {
      sexSentence = 'The magnetic dimension of this connection sits in balance — neither immediately electric nor quietly understated.'
    } else if (sexVal > 0.15) {
      sexSentence = 'The chart contacts suggest a charged, physically present quality to this connection.'
    } else {
      sexSentence = 'The magnetic dimension of this connection is understated — it builds through familiarity and trust rather than immediate charge.'
    }
  }
  const sexualChemistry = buildDimension('Sexual Chemistry', 'Understated', 'Electric', 1.0, 0.0, sexAspects, 0, sexSentence)

  // ── AXIS 7: LIFE PACE — Steady ←→ Catalytic ───────────────
  const paceAspects = accumulateAspectScore(
    [['Uranus', 'Sun'], ['Sun', 'Uranus'], ['Uranus', 'Moon'], ['Moon', 'Uranus'], ['Uranus', 'Mercury'], ['Mercury', 'Uranus'], ['Uranus', 'Mars'], ['Mars', 'Uranus'], ['NorthNode', 'Sun'], ['Sun', 'NorthNode'], ['NorthNode', 'Moon'], ['Moon', 'NorthNode']],
    [['Saturn', 'Saturn'], ['Saturn', 'Sun'], ['Sun', 'Saturn'], ['Saturn', 'Moon'], ['Moon', 'Saturn']],
  )
  const paceModality = computeModalityRatio(['Cardinal'], ['Fixed'])
  let paceSentence: string
  if (Math.min(1.0, paceAspects.totalWeight / 3.0) < 0.2) {
    paceSentence = 'Insufficient synastry aspects to characterize the pace at which this relationship moves and changes.'
  } else if (paceAspects.topDriver?.includes('Uranus × Sun') || paceAspects.topDriver?.includes('Sun × Uranus')) {
    paceSentence = "Uranus contacts a person's Sun — this relationship introduces disruption and acceleration into one person's identity; expect periods of rapid change."
  } else if (paceAspects.topDriver?.includes('Uranus × Moon') || paceAspects.topDriver?.includes('Moon × Uranus')) {
    paceSentence = 'Uranus-Moon contact destabilizes emotional rhythms — this relationship moves in sudden shifts rather than gradual development.'
  } else if (paceAspects.topDriver?.includes('Saturn × Saturn') || (paceAspects.topDriver?.includes('Saturn') && paceAspects.topDriver?.includes('Sun'))) {
    paceSentence = 'Saturn contacts create a deliberately paced, structured relationship — change comes slowly and with clear purpose rather than through sudden disruption.'
  } else if (paceAspects.topDriver?.includes('NorthNode')) {
    paceSentence = 'North Node contacts introduce a fated quality to the tempo — this relationship tends to accelerate growth by pushing both people toward their evolutionary direction.'
  } else {
    const paceVal = paceAspects.totalWeight > 0
      ? Math.tanh((paceAspects.score / paceAspects.totalWeight) * 3)
      : 0
    const combined = 0.60 * paceVal + 0.40 * paceModality
    const finalVal = Math.tanh(combined * 3)
    if (Math.abs(finalVal) < 0.15) {
      paceSentence = 'The tempo of this relationship sits between steady and catalytic — capable of periods of stability and periods of change in roughly equal measure.'
    } else if (finalVal > 0.15) {
      paceSentence = 'Cardinal dominance and Uranian contacts suggest a relationship that moves quickly, initiates change, and rarely settles for long.'
    } else {
      paceSentence = 'This relationship moves at a measured, deliberate pace — stability is the default state, and change happens by choice rather than accident.'
    }
  }
  const lifePace = buildDimension('Life Pace', 'Steady', 'Catalytic', 0.60, 0.40, paceAspects, paceModality, paceSentence)

  return {
    intensity,
    emotionalFlow,
    communicationStyle,
    intimacyRhythm,
    growthDynamic,
    sexualChemistry,
    lifePace,
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
  const coupleProfile = calculateCoupleProfile(chart1, chart2, synastryAspects)
  const keyThemes = identifyKeyThemes(synastryAspects)
  const elementCompatibility = elementCompat(chart1, chart2)
  const modalityCompatibility = modalityCompat(chart1, chart2)

  return { synastryAspects, houseOverlay, compositeChart, coupleProfile, keyThemes, elementCompatibility, modalityCompatibility }
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

  // Couple Relational Profile
  const PERSONAL_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars']
  const { coupleProfile } = synastryData
  const axisEntries: [string, DimensionValue][] = [
    ['Intensity', coupleProfile.intensity],
    ['Emotional Flow', coupleProfile.emotionalFlow],
    ['Communication Style', coupleProfile.communicationStyle],
    ['Intimacy Rhythm', coupleProfile.intimacyRhythm],
    ['Growth Dynamic', coupleProfile.growthDynamic],
    ['Sexual Chemistry', coupleProfile.sexualChemistry],
    ['Life Pace', coupleProfile.lifePace],
  ]
  prompt += `\n## Couple Relational Profile\n`
  for (const [axisName, dim] of axisEntries) {
    prompt += `${axisName}: ${dim.label} (${dim.leftPole} ←→ ${dim.rightPole}, value ${dim.value.toFixed(2)}) — ${dim.sentence}\n`
  }
  prompt += `Element profile: ${synastryData.elementCompatibility}\n`
  prompt += `Modality profile: ${synastryData.modalityCompatibility}\n`

  prompt += `\n## Instructions\n`

  // Priority header — lead with the tightest cross-chart personal-planet aspect
  const personalAspects = sortedAspects.filter(a =>
    PERSONAL_PLANETS.includes(a.person1Planet as string) || PERSONAL_PLANETS.includes(a.person2Planet as string)
  )
  const tightestSynastry = personalAspects[0] ?? sortedAspects[0]
  if (tightestSynastry) {
    prompt += `Priority: Lead with the single most significant contact in this synastry — the tightest orb aspect that involves personal planets. State what this contact means for the relationship and, where house data is available, name the life area it activates (e.g., 'Person 1's Venus in their 7th house — the partnership zone') before expanding to the broader picture.\n\n`
  }

  prompt += `The Couple Relational Profile above describes the character of this relationship on seven dimensions. Reference this vocabulary in the reading — use the dimension labels (Intensity, Emotional Flow, etc.) and the qualitative positions (e.g., "Distinctly Fiery," "Leaning Merging") naturally in the prose. Do not repeat all seven dimensions mechanically; integrate the most relevant ones into the narrative as they apply to the aspects and placements discussed.\n\n`

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
