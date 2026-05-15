import {
  normalizeAngle, longitudeToZodiac, getHouseForLongitude,
  ASPECT_DEFINITIONS, analyzeElements, PLANET_NAMES, type ZodiacSign, type ZodiacPosition,
} from './astroCore.js'
import type { ServerChartData } from './chartEngine.js'
import type { TransitData, TransitPeriod } from './transitEngine.js'

// ── Types ──────────────────────────────────────────────────

export interface SynastryAspect {
  person1Planet: string
  person2Planet: string
  type: string
  orb: number
  exactAngle: number
  applying: boolean
  nature: 'harmonious' | 'challenging' | 'neutral'
  symbol: string
}

export interface HouseOverlayEntry {
  planet: string
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
  planets: Array<{
    name: string
    longitude: number
    sign: ZodiacSign
    signIndex: number
    degree: number
    minute: number
    retrograde: boolean
    house: number
  }>
  angles: {
    ascendant: ZodiacPosition
    midheaven: ZodiacPosition
    descendant: ZodiacPosition
    imumCoeli: ZodiacPosition
  }
}

export interface DimensionValue {
  value: number
  confidence: number
  leftPole: string
  rightPole: string
  label: string
  sentence: string
}

export interface CoupleProfile {
  intensity: DimensionValue
  emotionalFlow: DimensionValue
  communicationStyle: DimensionValue
  intimacyRhythm: DimensionValue
  growthDynamic: DimensionValue
  sexualChemistry: DimensionValue
  lifePace: DimensionValue
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
  chart1: ServerChartData,
  chart2: ServerChartData,
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
          const applying = orb < maxOrb * 0.5

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
  chart1: ServerChartData,
  chart2: ServerChartData,
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
  chart1: ServerChartData,
  chart2: ServerChartData,
): CompositeChart {
  const compositePlanets: CompositeChart['planets'] = []

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

// ── Shared helpers ─────────────────────────────────────────

type Element = 'Fire' | 'Earth' | 'Air' | 'Water'
type Modality = 'Cardinal' | 'Fixed' | 'Mutable'

const SIGN_ELEMENTS: Record<ZodiacSign, Element> = {
  Aries: 'Fire',       Taurus: 'Earth',     Gemini: 'Air',   Cancer: 'Water',
  Leo: 'Fire',         Virgo: 'Earth',      Libra: 'Air',    Scorpio: 'Water',
  Sagittarius: 'Fire', Capricorn: 'Earth',  Aquarius: 'Air', Pisces: 'Water',
}

const SIGN_MODALITIES: Record<ZodiacSign, Modality> = {
  Aries: 'Cardinal', Taurus: 'Fixed',    Gemini: 'Mutable',
  Cancer: 'Cardinal', Leo: 'Fixed',      Virgo: 'Mutable',
  Libra: 'Cardinal', Scorpio: 'Fixed',   Sagittarius: 'Mutable',
  Capricorn: 'Cardinal', Aquarius: 'Fixed', Pisces: 'Mutable',
}

function isInPairList(
  p1: string,
  p2: string,
  pairs: [string, string][],
): boolean {
  return pairs.some(
    ([a, b]) => (p1 === a && p2 === b) || (p1 === b && p2 === a),
  )
}

function elementCompatString(chart1: ServerChartData, chart2: ServerChartData): string {
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

function modalityCompat(chart1: ServerChartData, chart2: ServerChartData): string {
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

  if (themes.length === 0) {
    themes.push('A relationship with unique dynamics worth exploring through deeper aspects')
  }

  return themes
}

/**
 * Calculate the 7-axis Couple Relational Profile from synastry aspects and chart data.
 */
export function calculateCoupleProfile(
  chart1: ServerChartData,
  chart2: ServerChartData,
  aspects: SynastryAspect[],
): CoupleProfile {
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
      const isPos = isInPairList(asp.person1Planet, asp.person2Planet, positivePairs)
      const isNeg = isInPairList(asp.person1Planet, asp.person2Planet, negativePairs)
      if (isPos || isNeg) {
        const sign = isPos ? 1 : -1
        score += sign * w
        totalWeight += w
        if (w > topDriverWeight) {
          topDriverWeight = w
          topDriver = `${asp.person1Planet} × ${asp.person2Planet} ${asp.type} (${asp.nature})`
        }
      }
    }
    return { score, totalWeight, topDriver }
  }

  function computeElementRatio(positiveElements: Element[], negativeElements: Element[]): number {
    const counts: Record<Element, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 }
    for (const p of [...chart1.planets, ...chart2.planets]) counts[SIGN_ELEMENTS[p.sign]]++
    const pos = positiveElements.reduce((s, e) => s + counts[e], 0)
    const neg = negativeElements.reduce((s, e) => s + counts[e], 0)
    const total = Object.values(counts).reduce((s, v) => s + v, 0) + 1
    return (pos - neg) / total
  }

  function computeModalityRatio(positiveModalities: Modality[], negativeModalities: Modality[]): number {
    const counts: Record<Modality, number> = { Cardinal: 0, Fixed: 0, Mutable: 0 }
    for (const p of [...chart1.planets, ...chart2.planets]) counts[SIGN_MODALITIES[p.sign]]++
    const pos = positiveModalities.reduce((s, m) => s + counts[m], 0)
    const neg = negativeModalities.reduce((s, m) => s + counts[m], 0)
    const total = Object.values(counts).reduce((s, v) => s + v, 0) + 1
    return (pos - neg) / total
  }

  function makeLabel(value: number, leftPole: string, rightPole: string): string {
    const abs = Math.abs(value)
    const pole = value > 0 ? rightPole : leftPole
    if (abs < 0.15) return 'Balanced'
    if (abs < 0.35) return `Leaning ${pole}`
    if (abs < 0.65) return `Moderately ${pole}`
    return `Distinctly ${pole}`
  }

  function buildDimension(
    leftPole: string, rightPole: string,
    aspectWeight: number, secondaryWeight: number,
    aspectData: { score: number; totalWeight: number; topDriver: string | null },
    secondaryScore: number,
    sentence: string,
  ): DimensionValue {
    const aspectComponent = aspectData.totalWeight > 0
      ? Math.tanh((aspectData.score / aspectData.totalWeight) * 3)
      : 0
    const combined = aspectWeight * aspectComponent + secondaryWeight * secondaryScore
    const value = Math.tanh(combined * 3)
    const confidence = Math.min(1.0, aspectData.totalWeight / 3.0)
    return { value, confidence, leftPole, rightPole, label: makeLabel(value, leftPole, rightPole), sentence }
  }

  // INTENSITY
  const intAsp = accumulateAspectScore(
    [['Mars','Mars'],['Sun','Mars'],['Mars','Sun'],['Pluto','Mars'],['Mars','Pluto'],['Pluto','Sun'],['Sun','Pluto']],
    [],
  )
  const intEl = computeElementRatio(['Fire'], ['Water'])
  let intSentence: string
  if (intAsp.topDriver?.includes('Mars × Mars')) {
    const sq = intAsp.topDriver.includes('square') || intAsp.topDriver.includes('opposition')
    intSentence = sq
      ? 'Your Mars contact is a square — the charge can power shared drives as forcefully as ignite conflict; the difference is direction.'
      : 'Your Mars signs meet directly — the energy between you is kinetic, combustible in the best sense, unlikely to stay still.'
  } else if (intAsp.topDriver?.includes('Pluto') || intAsp.topDriver?.includes('Sun × Pluto')) {
    intSentence = 'Mars and Pluto in contact generate pressure — the kind that can feel transformative or overwhelming, but never ordinary.'
  } else if (intAsp.topDriver?.includes('Sun × Mars') || intAsp.topDriver?.includes('Mars × Sun')) {
    intSentence = "One person's drive is animated by the other's core identity — this relationship has an assertive, forward-moving quality built into its center."
  } else {
    const v = Math.tanh((0.65 * (intAsp.totalWeight > 0 ? Math.tanh((intAsp.score / intAsp.totalWeight) * 3) : 0) + 0.35 * intEl) * 3)
    intSentence = Math.abs(v) < 0.15
      ? 'The energetic charge sits in the middle ground — neither consistently heightened nor subdued.'
      : v > 0.15
      ? 'Your combined charts lean toward Fire — the pace is quick and instincts are strong between you.'
      : 'Your combined charts lean toward Water — the energy is steady rather than combustible, depth over heat.'
  }
  const intensity = buildDimension('Calm', 'Fiery', 0.65, 0.35, intAsp, intEl, intSentence)

  // EMOTIONAL FLOW
  const emoAsp = accumulateAspectScore(
    [['Moon','Moon'],['Moon','Venus'],['Venus','Moon'],['Moon','Jupiter'],['Jupiter','Moon'],['Sun','Moon'],['Moon','Sun']],
    [['Moon','Saturn'],['Saturn','Moon'],['Moon','Uranus'],['Uranus','Moon']],
  )
  const emoEl = computeElementRatio(['Water'], ['Air', 'Fire'])
  let emoSentence: string
  if (emoAsp.topDriver?.includes('Moon × Moon')) {
    emoSentence = emoAsp.topDriver.includes('harmonious') || emoAsp.topDriver.includes('neutral')
      ? "Your Moon-Moon connection means you understand each other's emotional rhythms without much translation needed."
      : 'Moon-Moon tension creates strong emotional activation — you feel each other deeply, though processing styles may differ.'
  } else if (emoAsp.topDriver?.includes('Moon × Saturn') || emoAsp.topDriver?.includes('Saturn × Moon')) {
    emoSentence = 'Moon-Saturn contact creates emotional structure and restraint — feelings are real but surface slowly and deliberately.'
  } else if (emoAsp.topDriver?.includes('Moon × Venus') || emoAsp.topDriver?.includes('Venus × Moon')) {
    emoSentence = 'Moon-Venus contact creates warmth and emotional openness — affection flows naturally between you.'
  } else {
    const v = Math.tanh((0.70 * (emoAsp.totalWeight > 0 ? Math.tanh((emoAsp.score / emoAsp.totalWeight) * 3) : 0) + 0.30 * emoEl) * 3)
    emoSentence = Math.abs(v) < 0.15
      ? 'This relationship sits in the center of the emotional expression spectrum — neither withholding nor overflowing.'
      : v > 0.15
      ? 'Your combined charts favor Water — emotional sensitivity and expressiveness are a natural current between you.'
      : 'Emotional processing tends toward the private — feelings are present but held with care before being shared.'
  }
  const emotionalFlow = buildDimension('Reserved', 'Expressive', 0.70, 0.30, emoAsp, emoEl, emoSentence)

  // COMMUNICATION STYLE
  const commAsp = accumulateAspectScore(
    [['Mercury','Mercury'],['Mercury','Uranus'],['Uranus','Mercury'],['Mercury','Sun'],['Sun','Mercury'],['Mercury','Saturn'],['Saturn','Mercury']],
    [['Mercury','Moon'],['Moon','Mercury'],['Mercury','Neptune'],['Neptune','Mercury']],
  )
  const commEl = computeElementRatio(['Air', 'Earth'], ['Water', 'Fire'])
  let commSentence: string
  if (commAsp.topDriver?.includes('Mercury × Mercury')) {
    commSentence = 'Your Mercury signs connect directly — you process ideas in similar registers and conversation has its own natural flow.'
  } else if (commAsp.topDriver?.includes('Mercury × Moon') || commAsp.topDriver?.includes('Moon × Mercury')) {
    commSentence = "One person's thinking is colored by the other's emotional experience — this relationship communicates more through feeling than argument."
  } else if (commAsp.topDriver?.includes('Mercury × Uranus') || commAsp.topDriver?.includes('Uranus × Mercury')) {
    commSentence = 'Mercury-Uranus contact brings quick thinking and unconventional ideas — conversation between you tends to jump and spark.'
  } else if (commAsp.topDriver?.includes('Mercury × Neptune') || commAsp.topDriver?.includes('Neptune × Mercury')) {
    commSentence = 'Mercury-Neptune contact means communication is impressionistic rather than literal — meaning arrives through feeling as much as words.'
  } else {
    const v = Math.tanh((0.60 * (commAsp.totalWeight > 0 ? Math.tanh((commAsp.score / commAsp.totalWeight) * 3) : 0) + 0.40 * commEl) * 3)
    commSentence = Math.abs(v) < 0.15
      ? 'Your communication styles meet in the middle — intuition and analysis both have their place in how you exchange ideas.'
      : v > 0.15
      ? 'Combined Air and Earth dominance creates a preference for concrete thinking and organized communication.'
      : 'Dominant Water and Fire suggests communication that is more instinctive and feeling-led than analytical.'
  }
  const communicationStyle = buildDimension('Intuitive', 'Analytical', 0.60, 0.40, commAsp, commEl, commSentence)

  // INTIMACY RHYTHM
  const intimAsp = accumulateAspectScore(
    [['Venus','Neptune'],['Neptune','Venus'],['Moon','Neptune'],['Neptune','Moon'],['Venus','Pluto'],['Pluto','Venus'],['Moon','Pluto'],['Pluto','Moon'],['Sun','Neptune'],['Neptune','Sun']],
    [['Mars','Uranus'],['Uranus','Mars'],['Saturn','Venus'],['Venus','Saturn'],['Saturn','Moon'],['Moon','Saturn']],
  )
  let intimSentence: string
  if (intimAsp.topDriver?.includes('Venus × Neptune') || intimAsp.topDriver?.includes('Neptune × Venus')) {
    intimSentence = 'Venus-Neptune contact creates a dissolving, idealistic quality to closeness — boundaries soften and the desire to merge is real.'
  } else if (intimAsp.topDriver?.includes('Moon × Neptune') || intimAsp.topDriver?.includes('Neptune × Moon')) {
    intimSentence = "Moon-Neptune contact brings emotional permeability — you absorb each other's moods and the self-other distinction becomes fluid."
  } else if (intimAsp.topDriver?.includes('Pluto')) {
    intimSentence = 'Pluto contacts create compulsive closeness — the pull toward merger is intense and deep, sometimes uncomfortably so.'
  } else if (intimAsp.topDriver?.includes('Saturn')) {
    intimSentence = 'Saturn contacts create emotional structure and distance — intimacy is earned slowly and maintained through clear boundaries.'
  } else {
    const v = intimAsp.totalWeight > 0 ? Math.tanh((intimAsp.score / intimAsp.totalWeight) * 3) : 0
    intimSentence = Math.abs(v) < 0.15
      ? 'Your intimacy rhythm sits in balance — neither fused nor distant, adjusting naturally to what the moment asks.'
      : v > 0.15
      ? 'The pull toward closeness and merger is evident — this relationship tends to seek shared space rather than separate lanes.'
      : 'This relationship tends toward spaciousness — independence and individual identity are valued and maintained.'
  }
  const intimacyRhythm = buildDimension('Spacious', 'Merging', 1.0, 0.0, intimAsp, 0, intimSentence)

  // GROWTH DYNAMIC
  const growAsp = accumulateAspectScore(
    [['Jupiter','Jupiter'],['Jupiter','Sun'],['Sun','Jupiter'],['Jupiter','Moon'],['Moon','Jupiter'],['Jupiter','Venus'],['Venus','Jupiter'],['Uranus','Sun'],['Sun','Uranus'],['Uranus','Moon'],['Moon','Uranus']],
    [['Saturn','Sun'],['Sun','Saturn'],['Saturn','Moon'],['Moon','Saturn'],['Saturn','Venus'],['Venus','Saturn'],['Saturn','Mars'],['Mars','Saturn']],
  )
  const growMod = computeModalityRatio(['Mutable', 'Cardinal'], ['Fixed'])
  let growSentence: string
  if (growAsp.topDriver?.includes('Saturn × Sun') || growAsp.topDriver?.includes('Sun × Saturn') || growAsp.topDriver?.includes('Saturn × Moon') || growAsp.topDriver?.includes('Moon × Saturn')) {
    growSentence = 'Saturn contacts build slowly and durably — this relationship favors deepening what exists over rapid expansion.'
  } else if (growAsp.topDriver?.includes('Jupiter')) {
    growSentence = "Jupiter contacts amplify and expand — this relationship tends to bring out each other's optimism and push toward new horizons."
  } else if (growAsp.topDriver?.includes('Uranus')) {
    growSentence = 'Uranus contacts introduce an element of disruption and acceleration — this relationship opens territory neither would reach alone.'
  } else {
    const v = Math.tanh((0.65 * (growAsp.totalWeight > 0 ? Math.tanh((growAsp.score / growAsp.totalWeight) * 3) : 0) + 0.35 * growMod) * 3)
    growSentence = Math.abs(v) < 0.15
      ? 'This relationship balances expansion and consolidation — capable of both stability and growth.'
      : v > 0.15
      ? 'Your combined Mutable and Cardinal energy creates a relationship consistently in motion, seeking new experience.'
      : 'Fixed modality dominance means this relationship builds slowly and values what it has over what could be added.'
  }
  const growthDynamic = buildDimension('Stabilizing', 'Expanding', 0.65, 0.35, growAsp, growMod, growSentence)

  // SEXUAL CHEMISTRY
  const sexAsp = accumulateAspectScore(
    [['Venus','Mars'],['Mars','Venus'],['Mars','Mars'],['Venus','Uranus'],['Uranus','Venus'],['Mars','Uranus'],['Uranus','Mars']],
    [['Venus','Saturn'],['Saturn','Venus'],['Moon','Saturn'],['Saturn','Moon']],
  )
  let sexSentence: string
  if (sexAsp.topDriver?.includes('Venus × Mars') || sexAsp.topDriver?.includes('Mars × Venus')) {
    sexSentence = sexAsp.topDriver.includes('harmonious') || sexAsp.topDriver.includes('neutral')
      ? 'Venus-Mars contact is the primary attraction axis — there is a natural, easy pull between you in both romantic and physical chemistry.'
      : 'Venus-Mars tension creates charged attraction — the friction generates heat that can be creative or combustible.'
  } else if (sexAsp.topDriver?.includes('Venus × Uranus') || sexAsp.topDriver?.includes('Uranus × Venus')) {
    sexSentence = 'Venus-Uranus contact creates sudden, electric attraction — a sense of unexpectedness and spark that keeps the connection alive.'
  } else if (sexAsp.topDriver?.includes('Mars × Uranus') || sexAsp.topDriver?.includes('Uranus × Mars')) {
    sexSentence = 'Mars-Uranus contact creates restless, kinetic energy — the magnetic charge between you is real and somewhat unpredictable.'
  } else if (sexAsp.topDriver?.includes('Venus × Saturn') || sexAsp.topDriver?.includes('Saturn × Venus')) {
    sexSentence = 'Venus-Saturn contact creates slow-building attraction — the magnetic dimension develops with time rather than on first contact.'
  } else if (sexAsp.topDriver?.includes('Mars × Mars')) {
    sexSentence = 'Double Mars contact means high activation — the physical energy between you is direct, present, and hard to miss.'
  } else {
    const v = sexAsp.totalWeight > 0 ? Math.tanh((sexAsp.score / sexAsp.totalWeight) * 3) : 0
    sexSentence = Math.abs(v) < 0.15
      ? 'The magnetic dimension sits in balance — neither immediately electric nor quietly understated.'
      : v > 0.15
      ? 'The chart contacts suggest a charged, physically present quality to this connection.'
      : 'The magnetic dimension is understated — it builds through familiarity and trust rather than immediate charge.'
  }
  const sexualChemistry = buildDimension('Understated', 'Electric', 1.0, 0.0, sexAsp, 0, sexSentence)

  // LIFE PACE
  const paceAsp = accumulateAspectScore(
    [['Uranus','Sun'],['Sun','Uranus'],['Uranus','Moon'],['Moon','Uranus'],['Uranus','Mercury'],['Mercury','Uranus'],['Uranus','Mars'],['Mars','Uranus'],['NorthNode','Sun'],['Sun','NorthNode'],['NorthNode','Moon'],['Moon','NorthNode']],
    [['Saturn','Saturn'],['Saturn','Sun'],['Sun','Saturn'],['Saturn','Moon'],['Moon','Saturn']],
  )
  const paceMod = computeModalityRatio(['Cardinal'], ['Fixed'])
  let paceSentence: string
  if (paceAsp.topDriver?.includes('Uranus × Sun') || paceAsp.topDriver?.includes('Sun × Uranus')) {
    paceSentence = "Uranus contacts a person's Sun — this relationship introduces disruption and acceleration into one person's identity; expect rapid change."
  } else if (paceAsp.topDriver?.includes('Uranus × Moon') || paceAsp.topDriver?.includes('Moon × Uranus')) {
    paceSentence = 'Uranus-Moon contact destabilizes emotional rhythms — this relationship moves in sudden shifts rather than gradual development.'
  } else if (paceAsp.topDriver?.includes('Saturn')) {
    paceSentence = 'Saturn contacts create a deliberately paced, structured relationship — change comes slowly and with clear purpose.'
  } else if (paceAsp.topDriver?.includes('NorthNode')) {
    paceSentence = 'North Node contacts introduce a fated quality to the tempo — this relationship accelerates growth by pushing toward evolutionary direction.'
  } else {
    const v = Math.tanh((0.60 * (paceAsp.totalWeight > 0 ? Math.tanh((paceAsp.score / paceAsp.totalWeight) * 3) : 0) + 0.40 * paceMod) * 3)
    paceSentence = Math.abs(v) < 0.15
      ? 'The tempo sits between steady and catalytic — capable of stability and change in roughly equal measure.'
      : v > 0.15
      ? 'Cardinal dominance and Uranian contacts suggest a relationship that moves quickly and rarely settles for long.'
      : 'This relationship moves at a measured, deliberate pace — stability is the default state.'
  }
  const lifePace = buildDimension('Steady', 'Catalytic', 0.60, 0.40, paceAsp, paceMod, paceSentence)

  return { intensity, emotionalFlow, communicationStyle, intimacyRhythm, growthDynamic, sexualChemistry, lifePace }
}

// ── Main Entry Point ───────────────────────────────────────

/**
 * Calculate full synastry data between two charts.
 */
export function calculateSynastry(
  chart1: ServerChartData,
  chart2: ServerChartData,
): SynastryData {
  const synastryAspects = calculateSynastryAspects(chart1, chart2)
  const houseOverlay = calculateHouseOverlays(chart1, chart2)
  const compositeChart = calculateCompositeChart(chart1, chart2)
  const coupleProfile = calculateCoupleProfile(chart1, chart2, synastryAspects)
  const keyThemes = identifyKeyThemes(synastryAspects)
  const elementCompatibility = elementCompatString(chart1, chart2)
  const modalityCompatibility = modalityCompat(chart1, chart2)

  return { synastryAspects, houseOverlay, compositeChart, coupleProfile, keyThemes, elementCompatibility, modalityCompatibility }
}

// ── Synastry GPT Prompt Builder ────────────────────────────

export function buildSynastryPrompt(
  chart1: ServerChartData,
  chart2: ServerChartData,
  synastryData: SynastryData,
  person1Date: string,
  person2Date: string,
  person1Name?: string,
  person2Name?: string,
): string {
  const label1 = person1Name?.trim() || 'Person 1'
  const label2 = person2Name?.trim() || 'Person 2'

  const elementAnalysis1 = analyzeElements(chart1.planets)
  const elementAnalysis2 = analyzeElements(chart2.planets)

  let prompt = `You are an expert astrologer providing a factual, direct synastry (couple compatibility) reading. State what the charts show plainly — both the genuine strengths and the real difficulties — without sugar-coating.\n\n`

  // Person 1
  prompt += `## ${label1} Birth Chart\nBorn: ${person1Date}\n`
  prompt += `Natal positions:\n`
  for (const p of chart1.planets) {
    prompt += `- ${p.name}: ${p.degree}°${p.minute}' ${p.sign}${!chart1.unknownTime ? ` (House ${p.house})` : ''}${p.retrograde ? ' [Rx]' : ''}\n`
  }
  if (!chart1.unknownTime) {
    prompt += `Ascendant: ${chart1.angles.ascendant.degree}°${chart1.angles.ascendant.minute}' ${chart1.angles.ascendant.sign}\n`
    prompt += `Midheaven: ${chart1.angles.midheaven.degree}°${chart1.angles.midheaven.minute}' ${chart1.angles.midheaven.sign}\n`
  }
  prompt += `\n## ${label1} Element Profile\n`
  prompt += `Dominant element: ${elementAnalysis1.dominant} — ${elementAnalysis1.interpretation.dominant}\n`

  // Person 2
  prompt += `\n## ${label2} Birth Chart\nBorn: ${person2Date}\n`
  prompt += `Natal positions:\n`
  for (const p of chart2.planets) {
    prompt += `- ${p.name}: ${p.degree}°${p.minute}' ${p.sign}${!chart2.unknownTime ? ` (House ${p.house})` : ''}${p.retrograde ? ' [Rx]' : ''}\n`
  }
  if (!chart2.unknownTime) {
    prompt += `Ascendant: ${chart2.angles.ascendant.degree}°${chart2.angles.ascendant.minute}' ${chart2.angles.ascendant.sign}\n`
    prompt += `Midheaven: ${chart2.angles.midheaven.degree}°${chart2.angles.midheaven.minute}' ${chart2.angles.midheaven.sign}\n`
  }
  prompt += `\n## ${label2} Element Profile\n`
  prompt += `Dominant element: ${elementAnalysis2.dominant} — ${elementAnalysis2.interpretation.dominant}\n`

  // Cross-chart aspects — sorted by orb ascending so GPT sees tightest contacts first
  const sortedAspects = [...synastryData.synastryAspects].sort((a, b) => a.orb - b.orb)
  prompt += `\n## Synastry Aspects (Cross-Chart)\n`
  for (const a of sortedAspects) {
    prompt += `- ${label1} ${a.person1Planet} ${a.symbol} ${label2} ${a.person2Planet} (${a.type}, orb ${a.orb}°, ${a.nature})\n`
  }

  // House overlays
  if (synastryData.houseOverlay.person1InPerson2Houses.length > 0) {
    prompt += `\n## House Overlays\n`
    prompt += `${label1}'s planets in ${label2}'s houses:\n`
    for (const h of synastryData.houseOverlay.person1InPerson2Houses) {
      prompt += `- ${h.planet} in ${h.sign} → ${label2}'s House ${h.house}\n`
    }
    prompt += `${label2}'s planets in ${label1}'s houses:\n`
    for (const h of synastryData.houseOverlay.person2InPerson1Houses) {
      prompt += `- ${h.planet} in ${h.sign} → ${label1}'s House ${h.house}\n`
    }
  }

  // Composite
  prompt += `\n## Composite Chart (Relationship Chart — Midpoints)\n`
  for (const p of synastryData.compositeChart.planets) {
    prompt += `- Composite ${p.name}: ${p.degree}°${p.minute}' ${p.sign}\n`
  }
  prompt += `Composite Ascendant: ${synastryData.compositeChart.angles.ascendant.degree}°${synastryData.compositeChart.angles.ascendant.minute}' ${synastryData.compositeChart.angles.ascendant.sign}\n`

  // Couple Relational Profile
  const PERSONAL_PLANETS_SRV = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars']
  const { coupleProfile } = synastryData
  const srvAxisEntries: [string, DimensionValue][] = [
    ['Intensity', coupleProfile.intensity],
    ['Emotional Flow', coupleProfile.emotionalFlow],
    ['Communication Style', coupleProfile.communicationStyle],
    ['Intimacy Rhythm', coupleProfile.intimacyRhythm],
    ['Growth Dynamic', coupleProfile.growthDynamic],
    ['Sexual Chemistry', coupleProfile.sexualChemistry],
    ['Life Pace', coupleProfile.lifePace],
  ]
  prompt += `\n## Couple Relational Profile\n`
  for (const [axisName, dim] of srvAxisEntries) {
    prompt += `${axisName}: ${dim.label} (${dim.leftPole} ←→ ${dim.rightPole}, value ${dim.value.toFixed(2)}) — ${dim.sentence}\n`
  }
  prompt += `Element profile: ${synastryData.elementCompatibility}\n`
  prompt += `Modality profile: ${synastryData.modalityCompatibility}\n`

  prompt += `\n## Instructions\n`

  // Priority header — lead with the tightest personal-planet cross-chart aspect
  const personalAspects = sortedAspects.filter(a =>
    PERSONAL_PLANETS_SRV.includes(a.person1Planet) || PERSONAL_PLANETS_SRV.includes(a.person2Planet)
  )
  const tightestSynastry = personalAspects[0] ?? sortedAspects[0]
  if (tightestSynastry) {
    prompt += `Priority: Lead with the single most significant contact in this synastry — the tightest orb aspect that involves personal planets. State what this contact means for the relationship and, where house data is available, name the life area it activates (e.g., '${label1}'s Venus in their 7th house — the partnership zone') before expanding to the broader picture.\n\n`
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
    prompt += `Where house data is available for either person, name the house that receives each planet placement and state what life area it governs for that person — not just the house number, but what the house means (e.g., '${label1}'s 5th house, the zone of creative expression and romance'). Use "${label1}'s 7th house (partnership)" rather than "${label1}'s Libra." Where birth time is unknown, interpret in terms of sign and nature only.\n\n`
  }

  // Anti-generic constraint
  prompt += `Write as if you know these two people's charts specifically. Do not write sentences that could apply to any Venus-Moon trine or any Saturn square. Ground every statement in the actual degrees and signs listed above.\n\n`

  prompt += `Write 6-8 flowing paragraphs. Be direct, specific, and reference actual placements. `
  prompt += `State what works well between them and what will be genuinely difficult — do not minimize tensions or over-romanticize strengths. `
  prompt += `Use "${label1}" and "${label2}" as labels throughout. Close with the most important factual dynamic to be aware of, not generic encouragement.`

  return prompt
}

// ── Couple Transit Prompt Builder ──────────────────────────

export function buildCoupleTransitPrompt(
  chart1: ServerChartData,
  chart2: ServerChartData,
  synastryData: SynastryData,
  transitData: TransitData,
  period: TransitPeriod,
  person1Date: string,
  person2Date: string,
  targetMonth?: string,
  person1Name?: string,
  person2Name?: string,
): string {
  const label1 = person1Name?.trim() || 'Person 1'
  const label2 = person2Name?.trim() || 'Person 2'

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
  prompt += `## ${label1} (born ${person1Date})\n`
  for (const p of chart1.planets.filter(pp => ['Sun', 'Moon', 'Venus', 'Mars', 'Mercury'].includes(pp.name as string))) {
    prompt += `- ${p.name}: ${p.degree}°${p.minute}' ${p.sign}\n`
  }
  prompt += `\n## ${label1} Element Profile\n`
  prompt += `Dominant element: ${coupleElementAnalysis1.dominant} — ${coupleElementAnalysis1.interpretation.dominant}\n`

  prompt += `\n## ${label2} (born ${person2Date})\n`
  for (const p of chart2.planets.filter(pp => ['Sun', 'Moon', 'Venus', 'Mars', 'Mercury'].includes(pp.name as string))) {
    prompt += `- ${p.name}: ${p.degree}°${p.minute}' ${p.sign}\n`
  }
  prompt += `\n## ${label2} Element Profile\n`
  prompt += `Dominant element: ${coupleElementAnalysis2.dominant} — ${coupleElementAnalysis2.interpretation.dominant}\n`

  // Key synastry aspects
  prompt += `\n## Key Synastry Aspects\n`
  for (const a of synastryData.synastryAspects.slice(0, 10)) {
    prompt += `- ${label1} ${a.person1Planet} ${a.symbol} ${label2} ${a.person2Planet} (${a.type}, ${a.nature})\n`
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
  prompt += `Write 4-6 flowing paragraphs. Be specific about placements. Use "${label1}" and "${label2}" throughout.\n`
  prompt += `State favorable transits plainly and state difficult ones without softening. Do not end with generic encouragement — close with the most important factual takeaway for the relationship during this period.`

  return prompt
}
