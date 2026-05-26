import { TAROT_CARDS } from '../data/tarot/cards'
import type { TarotCard, TarotSuit } from '../data/tarot/cards'
import { TRANSIT_ADAPTATIONS_BY_CARD as TRANSIT_ADAPTATIONS } from '../data/tarot/transitAdaptations'
import { ASTRO_CONNECTIONS } from '../data/tarot/astroConnections'
import { SPREAD_POSITIONS } from '../data/tarot/spreadPositions'
import type { SpreadType, SpreadPosition } from '../data/tarot/spreadPositions'
import type { Element, ChartData, ZodiacSign } from './types'
import { SIGN_ELEMENTS, SIGN_MODALITIES } from './types'
import type { TransitData, TransitAspect } from './transits'
import type { SnapshotScore } from './advanceScoring'

export type { TarotCard, TarotSuit } from '../data/tarot/cards'
export type { TarotArcana } from '../data/tarot/cards'
export type { SpreadType, SpreadPosition } from '../data/tarot/spreadPositions'
export { SPREAD_POSITIONS, TAROT_CARDS }

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TarotAstroContext {
  natalSunSign: ZodiacSign | null
  natalMoonSign: ZodiacSign | null
  natalAscendantSign: ZodiacSign | null
  natalDominantElement: Element | null
  natalDominantModality: 'Cardinal' | 'Fixed' | 'Mutable' | null

  // Natal house placements (1–12 when available, null when chart lacks house data)
  natalMoonHouse: number | null
  natalVenusHouse: number | null
  natalNorthNodeHouse: number | null
  natalMarsHouse: number | null

  currentTransits: TransitAspect[]
  retrogradeplanets: string[]
  dominantTransitPlanet: string | null

  lunarPhaseName: string | null
  lunarPhaseSymbol: string | null

  personalDay: number

  advanceCategory: 'power' | 'favorable' | 'challenging' | 'shift' | 'neutral' | null
  advanceReason: string | null
}

export interface AstroConnection {
  cardElement: Element | null
  natalDominantElement: Element | null
  elementResonanceNote: string
  transitInfluence: string
  lunarPhaseNote: string
  advanceCategoryNote: string
  astroHeadline: string
}

export interface InstantInterpretation {
  cardId: string
  cardName: string
  arcana: 'major' | 'minor'
  suit: TarotSuit | null
  reversed: boolean
  positionLabel: string | null
  positionMeaning: string | null
  coreMeaning: string
  symbolicTheme: string
  emotionalMeaning: string
  practicalGuidance: string
  reflectionQuestion: string
  numerologyNote: string
  astroConnection: AstroConnection
}

export interface DrawnCard {
  card: TarotCard
  reversed: boolean
  interpretation: InstantInterpretation
}

export interface ThreeCardSynthesisInput {
  dominantArcana: 'major-heavy' | 'minor-heavy' | 'balanced'
  elementDistribution: {
    elements: Element[]
    dominant: Element | null
    allSame: boolean
    crossElement: boolean
    fireWaterTension: boolean
  }
  polarityProfile: {
    reversedCount: number
    allReversed: boolean
    allUpright: boolean
    centerReversed: boolean
  }
  archetypeFraming: {
    hasFool: boolean
    hasWorld: boolean
    hasDeathOrTower: boolean
    numericalProgression: boolean
  }
  suitPattern: {
    suits: (TarotSuit | null)[]
    allSameSuit: boolean
    noMinorArcana: boolean
  }
  astroResonanceNote: string
  interpretedCards: DrawnCard[]
  spreadPositions: SpreadPosition[]
}

// ─── Internal constants ───────────────────────────────────────────────────────

const SPREAD_CARD_COUNT: Record<SpreadType, number> = {
  'single': 1,
  'three-past-present-future': 3,
  'three-situation-challenge-advice': 3,
  'three-mind-heart-action': 3,
  'three-self-other-bridge': 3,
  'three-theme-shadow-gift': 3,
  'celtic-cross': 10,
}

const PLANET_ELEMENT_MAP: Record<string, Element> = {
  Sun: 'Fire', Mars: 'Fire', Jupiter: 'Fire',
  Venus: 'Earth', Saturn: 'Earth',
  Mercury: 'Air', Uranus: 'Air',
  Moon: 'Water', Neptune: 'Water', Pluto: 'Water',
}

const PLANET_PRIORITY: Record<string, number> = {
  Pluto: 10, Neptune: 9, Uranus: 8, Saturn: 7, Jupiter: 5,
  Mars: 3, Sun: 2, Venus: 2, Mercury: 1, Moon: 1,
}

const ELEMENT_ADJECTIVE: Record<Element, string> = {
  Fire: 'fiery', Earth: 'grounding', Air: 'airy', Water: 'emotional',
}

const LUNAR_SYMBOLS: Record<string, string> = {
  'New Moon': '🌑',
  'Waxing Crescent': '🌒',
  'First Quarter': '🌓',
  'Waxing Gibbous': '🌔',
  'Full Moon': '🌕',
  'Waning Gibbous': '🌖',
  'Last Quarter': '🌗',
  'Waning Crescent': '🌘',
}

const ADVANCE_CATEGORY_NOTES: Record<string, string> = {
  power: 'Today\'s sky is heightened — this card\'s energy arrives with unusual force and clarity.',
  favorable: 'The sky supports your movement — this card\'s guidance lands in fertile ground.',
  challenging: 'The sky asks for conscious engagement — this card\'s lesson comes with real stakes.',
  shift: 'Something is turning in the larger picture — this card marks the pivot point.',
  neutral: 'The sky holds steady — this card speaks on its own terms, uncolored by dramatic transits.',
}

type ThreeCardSpreadProfile = {
  spreadName: string
  slotRole: [string, string, string]
  coreFrame: [string, string, string]
  emotionalFrame: [string, string, string]
  practicalFrame: [string, string, string]
  reflectionFrame: [string, string, string]
}

const THREE_CARD_SPREAD_PROFILES: Record<Exclude<SpreadType, 'single' | 'celtic-cross'>, ThreeCardSpreadProfile> = {
  'three-past-present-future': {
    spreadName: 'Past / Present / Future',
    slotRole: ['what formed the ground', 'what is alive now', 'what is emerging next'],
    coreFrame: [
      'In the past position, this card describes the pattern, atmosphere, or unfinished residue that still shapes the present.',
      'In the present position, this card names the energy you are actively standing in now.',
      'In the future position, this card shows the direction current energies are already beginning to take.',
    ],
    emotionalFrame: [
      'Emotionally, it shows what the past still asks you to feel or understand instead of simply leaving behind.',
      'Emotionally, it reveals the tone beneath the surface of the current moment.',
      'Emotionally, it hints at the feeling-tone that is gathering if the present pattern continues.',
    ],
    practicalFrame: [
      'Practically, the work is to recognize how this older pattern is still informing your current choices.',
      'Practically, the card asks you to respond to what is true now rather than what used to be true.',
      'Practically, the card points toward the adjustment that would meet the future consciously rather than passively.',
    ],
    reflectionFrame: [
      'What from the past is still asking to be understood before it can truly become the past?',
      'What is this present moment asking you to face without delay or projection?',
      'If this card is showing where things are heading, what would it mean to meet that direction consciously now?',
    ],
  },
  'three-situation-challenge-advice': {
    spreadName: 'Situation / Challenge / Advice',
    slotRole: ['the true situation', 'the living friction', 'the symbolic direction forward'],
    coreFrame: [
      'In the situation position, this card names the real condition you are inside, beneath any story about it.',
      'In the challenge position, this card shows the exact pressure, resistance, or paradox that makes the situation difficult.',
      'In the advice position, this card becomes orientation rather than description: the quality of response the spread is asking for.',
    ],
    emotionalFrame: [
      'Emotionally, it shows what the situation feels like from within, not merely how it appears from outside.',
      'Emotionally, it reveals the feeling-complex that is most likely to create friction if left unconscious.',
      'Emotionally, it suggests the inner stance that would let the advice become embodied rather than theoretical.',
    ],
    practicalFrame: [
      'Practically, the card asks you to see the landscape clearly before trying to solve it.',
      'Practically, the card tells you what must be worked with rather than bypassed.',
      'Practically, the card points toward what to cultivate, release, or emphasize as you move forward.',
    ],
    reflectionFrame: [
      'What becomes clearer about the situation when you stop interpreting it and simply look at it?',
      'What kind of pressure is this challenge trying to refine in you rather than merely block?',
      'If this card is advice rather than prediction, what quality of response is it asking you to practice?',
    ],
  },
  'three-mind-heart-action': {
    spreadName: 'Mind / Heart / Action',
    slotRole: ['the mental frame', 'the emotional truth', 'the action that aligns them'],
    coreFrame: [
      'In the mind position, this card describes the thought-pattern, narrative, or perspective through which you are interpreting events.',
      'In the heart position, this card speaks to the deeper emotional truth beneath analysis.',
      'In the action position, this card shows what movement would bring thought and feeling into lived coherence.',
    ],
    emotionalFrame: [
      'Emotionally, it reveals how the mind may be protecting, distorting, or clarifying what you feel.',
      'Emotionally, it names the feeling-current that logic alone cannot resolve.',
      'Emotionally, it suggests what kind of action would honor the heart without abandoning discernment.',
    ],
    practicalFrame: [
      'Practically, the card asks you to examine whether this way of thinking is helping you see clearly.',
      'Practically, the card invites you to make room for the feeling it names rather than overriding it.',
      'Practically, the card points toward the next step that would convert inner clarity into motion.',
    ],
    reflectionFrame: [
      'What thought-pattern is this card revealing at the level of mind?',
      'What emotional truth has this card been waiting for you to admit at the level of heart?',
      'What action would make your inner world less divided and more honest?',
    ],
  },
  'three-self-other-bridge': {
    spreadName: 'Self / Other / Bridge',
    slotRole: ['your side of the dynamic', 'the other side of the dynamic', 'the bridge between them'],
    coreFrame: [
      'In the self position, this card reflects your energy, stance, need, or role inside the dynamic.',
      'In the other position, this card shows the energy on the other side of the exchange as the cards understand it.',
      'In the bridge position, this card reveals what could connect, transform, or mediate between self and other.',
    ],
    emotionalFrame: [
      'Emotionally, it shows what you may be carrying into the dynamic whether or not you intend to.',
      'Emotionally, it suggests what the other side may be organized around, defending, or expressing.',
      'Emotionally, it points to the quality that could soften opposition and create relation.',
    ],
    practicalFrame: [
      'Practically, the card asks for self-honesty before any attempt to change the dynamic externally.',
      'Practically, the card asks you to understand the other side as a real symbolic force rather than a projection.',
      'Practically, the card suggests the method, tone, or shift that could become a bridge rather than a wall.',
    ],
    reflectionFrame: [
      'What is this card showing you about your own role in the pattern?',
      'What is this card asking you to understand about the other side without collapsing into agreement or blame?',
      'If this card is the bridge, what would it look like to embody that bridge rather than merely wish for connection?',
    ],
  },
  'three-theme-shadow-gift': {
    spreadName: 'Theme / Shadow / Gift',
    slotRole: ['the central lesson', 'what is hidden beneath it', 'what becomes available through it'],
    coreFrame: [
      'In the theme position, this card names the central lesson or pattern trying to become conscious in your life.',
      'In the shadow position, this card reveals what has been operating below awareness and shaping the theme from underneath.',
      'In the gift position, this card shows what becomes possible when the theme is met honestly and the shadow is brought into the light.',
    ],
    emotionalFrame: [
      'Emotionally, it reveals the repeating tone that keeps returning until it is understood.',
      'Emotionally, it points to what may be avoided, repressed, or displaced yet still powerful.',
      'Emotionally, it suggests the quality of aliveness or freedom that emerges when the pattern is engaged consciously.',
    ],
    practicalFrame: [
      'Practically, the card asks you to identify this theme where it appears across different areas of life.',
      'Practically, the card asks for honest contact with what has been hidden rather than moral judgment about it.',
      'Practically, the card points toward the capacity, resource, or orientation that can now be claimed.',
    ],
    reflectionFrame: [
      'Where is this theme already repeating strongly enough that it can no longer be mistaken for coincidence?',
      'What hidden element of this pattern has been influencing you most from below awareness?',
      'What becomes possible if you receive the gift in this card as something to embody, not just admire?',
    ],
  },
}

function getThreeCardSpreadProfile(position: SpreadPosition | null): ThreeCardSpreadProfile | null {
  if (!position || position.spreadType === 'single' || position.spreadType === 'celtic-cross') return null
  return THREE_CARD_SPREAD_PROFILES[position.spreadType]
}

function mergeSentence(base: string, addition: string): string {
  const trimmedBase = base.trim()
  const trimmedAddition = addition.trim()
  if (!trimmedBase) return trimmedAddition
  if (!trimmedAddition) return trimmedBase
  return `${trimmedBase} ${trimmedAddition}`
}

function adaptInterpretationToPosition(
  interpretation: {
    coreMeaning: string
    emotionalMeaning: string
    practicalGuidance: string
    reflectionQuestion: string
    symbolicTheme: string
  },
  position: SpreadPosition | null,
): typeof interpretation {
  const profile = getThreeCardSpreadProfile(position)
  if (!position || !profile) return interpretation

  const index = position.positionIndex as 0 | 1 | 2
  const positionLead = `${profile.coreFrame[index]} ${position.meaning}`
  const symbolicTheme = `${interpretation.symbolicTheme} In ${profile.spreadName}, ${position.label.toLowerCase()} names ${profile.slotRole[index]}.`

  return {
    ...interpretation,
    coreMeaning: mergeSentence(positionLead, interpretation.coreMeaning),
    emotionalMeaning: mergeSentence(profile.emotionalFrame[index], interpretation.emotionalMeaning),
    practicalGuidance: mergeSentence(profile.practicalFrame[index], interpretation.practicalGuidance),
    reflectionQuestion: `${profile.reflectionFrame[index]} ${interpretation.reflectionQuestion}`,
    symbolicTheme,
  }
}

// ─── Seed utilities ───────────────────────────────────────────────────────────

function seedToNumber(seed: string): number {
  return seed.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 5381)
}

function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

/** Constructs a deterministic daily draw seed from caller-provided components. */
export function computeDailyDrawSeed(
  userId: string,
  birthDate: string,
  localDateStr: string,
  spreadType: SpreadType,
): string {
  return `${userId}:${birthDate}:${localDateStr}:${spreadType}`
}

// ─── drawCards ────────────────────────────────────────────────────────────────

export function drawCards(spreadType: SpreadType, seed: string): TarotCard[] {
  const count = SPREAD_CARD_COUNT[spreadType]
  const rand = lcg(seedToNumber(seed))

  const indices = Array.from({ length: TAROT_CARDS.length }, (_, i) => i)

  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }

  return indices.slice(0, count).map(i => {
    const card = TAROT_CARDS[i]
    if (!card) {
      const fallback = TAROT_CARDS.find(c => c.id === 'the-fool')
      if (!fallback) throw new Error('drawCards: TAROT_CARDS is empty — data integrity failure')
      console.warn(`drawCards: missing card at index ${i}, falling back to The Fool`)
      return fallback
    }
    return card
  })
}

// ─── assignReversals ──────────────────────────────────────────────────────────

export function assignReversals(cards: TarotCard[], seed: string): boolean[] {
  const rand = lcg(seedToNumber(seed + ':reversals'))
  return cards.map(() => rand() < 0.30)
}

// ─── buildTarotAstroContext ───────────────────────────────────────────────────

function computeDominantElement(natalChart: ChartData): Element | null {
  try {
    const counts: Record<Element, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 }

    const sunPlanet = natalChart.planets.find(p => p.name === 'Sun')
    const ascSign = natalChart.angles?.ascendant?.sign

    for (const planet of natalChart.planets) {
      const el = SIGN_ELEMENTS[planet.sign]
      if (!el) continue
      const weight =
        (planet.name === 'Sun' || planet.name === 'Moon') ? 2 : 1
      counts[el] += weight
    }

    if (ascSign && SIGN_ELEMENTS[ascSign]) {
      counts[SIGN_ELEMENTS[ascSign]] += 2
    }

    const max = Math.max(...Object.values(counts))
    const topElements = (Object.keys(counts) as Element[]).filter(e => counts[e] === max)

    if (topElements.length === 1) return topElements[0]

    const sunEl = sunPlanet ? SIGN_ELEMENTS[sunPlanet.sign] : null
    if (sunEl && topElements.includes(sunEl)) return sunEl

    return null
  } catch {
    return null
  }
}

function computeDominantModality(natalChart: ChartData): 'Cardinal' | 'Fixed' | 'Mutable' | null {
  try {
    const counts: Record<'Cardinal' | 'Fixed' | 'Mutable', number> = {
      Cardinal: 0, Fixed: 0, Mutable: 0,
    }

    const ascSign = natalChart.angles?.ascendant?.sign

    for (const planet of natalChart.planets) {
      const mod = SIGN_MODALITIES[planet.sign]
      if (!mod) continue
      const weight = (planet.name === 'Sun' || planet.name === 'Moon') ? 2 : 1
      counts[mod] += weight
    }

    if (ascSign && SIGN_MODALITIES[ascSign]) {
      counts[SIGN_MODALITIES[ascSign]] += 2
    }

    const max = Math.max(...Object.values(counts))
    const top = (Object.keys(counts) as ('Cardinal' | 'Fixed' | 'Mutable')[]).filter(
      m => counts[m] === max
    )

    return top.length === 1 ? top[0] : null
  } catch {
    return null
  }
}

function phaseAngleToName(angle: number): string {
  if (angle < 22.5 || angle >= 337.5) return 'New Moon'
  if (angle < 67.5) return 'Waxing Crescent'
  if (angle < 112.5) return 'First Quarter'
  if (angle < 157.5) return 'Waxing Gibbous'
  if (angle < 202.5) return 'Full Moon'
  if (angle < 247.5) return 'Waning Gibbous'
  if (angle < 292.5) return 'Last Quarter'
  return 'Waning Crescent'
}

export function buildTarotAstroContext(
  natalChart: ChartData,
  transits: TransitData | null,
  numerologyDay: number,
  advanceScore: SnapshotScore | null,
): TarotAstroContext {
  let natalSunSign: ZodiacSign | null = null
  let natalMoonSign: ZodiacSign | null = null
  let natalAscendantSign: ZodiacSign | null = null
  let natalDominantElement: Element | null = null
  let natalDominantModality: 'Cardinal' | 'Fixed' | 'Mutable' | null = null

  // Natal house placements — null when chart lacks house data (e.g. unknown birth time)
  let natalMoonHouse: number | null = null
  let natalVenusHouse: number | null = null
  let natalNorthNodeHouse: number | null = null
  let natalMarsHouse: number | null = null

  try {
    natalSunSign = natalChart.planets.find(p => p.name === 'Sun')?.sign ?? null
    natalMoonSign = natalChart.planets.find(p => p.name === 'Moon')?.sign ?? null
    natalAscendantSign = natalChart.angles?.ascendant?.sign ?? null
    natalDominantElement = computeDominantElement(natalChart)
    natalDominantModality = computeDominantModality(natalChart)

    // Extract house placements from the same planet objects — house is 0 for unknown-time charts
    const moonPlanet = natalChart.planets.find(p => p.name === 'Moon')
    const venusPlanet = natalChart.planets.find(p => p.name === 'Venus')
    const northNodePlanet = natalChart.planets.find(p => p.name === 'NorthNode')
    const marsPlanet = natalChart.planets.find(p => p.name === 'Mars')

    // Treat house === 0 as "no data" (unknown birth time) — only accept 1–12
    natalMoonHouse = moonPlanet?.house && moonPlanet.house >= 1 && moonPlanet.house <= 12 ? moonPlanet.house : null
    natalVenusHouse = venusPlanet?.house && venusPlanet.house >= 1 && venusPlanet.house <= 12 ? venusPlanet.house : null
    natalNorthNodeHouse = northNodePlanet?.house && northNodePlanet.house >= 1 && northNodePlanet.house <= 12 ? northNodePlanet.house : null
    natalMarsHouse = marsPlanet?.house && marsPlanet.house >= 1 && marsPlanet.house <= 12 ? marsPlanet.house : null
  } catch {
    // defensive: malformed chart data produces null signals
  }

  let currentTransits: TransitAspect[] = []
  let retrogradeplanets: string[] = []
  let dominantTransitPlanet: string | null = null
  let lunarPhaseName: string | null = null
  let lunarPhaseSymbol: string | null = null

  if (transits) {
    try {
      currentTransits = transits.transitAspects ?? []

      retrogradeplanets = (transits.retrogrades ?? [])
        .filter(r => r.isRetro)
        .map(r => r.planet)

      // Dominant transit planet: highest-priority planet among active transit aspects
      let topPriority = -1
      for (const aspect of currentTransits) {
        const planet = String(aspect.transitPlanet)
        const priority = PLANET_PRIORITY[planet] ?? 0
        if (priority > topPriority) {
          topPriority = priority
          dominantTransitPlanet = planet
        }
      }

      // Lunar phase from Moon/Sun longitudes
      const moonPos = transits.currentPlanets?.find(p => p.name === 'Moon')
      const sunPos = transits.currentPlanets?.find(p => p.name === 'Sun')
      if (moonPos && sunPos) {
        const angle = ((moonPos.longitude - sunPos.longitude) + 360) % 360
        lunarPhaseName = phaseAngleToName(angle)
        lunarPhaseSymbol = LUNAR_SYMBOLS[lunarPhaseName] ?? null
      }
    } catch {
      // defensive: malformed transit data produces empty signals
    }
  }

  return {
    natalSunSign,
    natalMoonSign,
    natalAscendantSign,
    natalDominantElement,
    natalDominantModality,
    natalMoonHouse,
    natalVenusHouse,
    natalNorthNodeHouse,
    natalMarsHouse,
    currentTransits,
    retrogradeplanets,
    dominantTransitPlanet,
    lunarPhaseName,
    lunarPhaseSymbol,
    personalDay: numerologyDay,
    advanceCategory: advanceScore?.category ?? null,
    advanceReason: advanceScore?.reason ?? null,
  }
}

// ─── computeInstantInterpretation ─────────────────────────────────────────────

// Positional registers for the element-affinity fallback
type PositionRegister = 'past-root' | 'present-active' | 'future-emerging'

// IDs of positions that have a past/root temporal valence
const PAST_ROOT_POSITION_IDS = new Set([
  'past', 'recent-past', 'celtic-3-unconscious', 'celtic-4-recent-past',
  'shadow', 'theme',
])

// IDs of positions that have a forward/aspirational temporal valence
const FUTURE_EMERGING_POSITION_IDS = new Set([
  'future', 'advice', 'action', 'bridge', 'gift',
  'celtic-5-conscious-goal', 'celtic-6-near-future', 'celtic-10-outcome',
])

function getPositionRegister(position: SpreadPosition | null): PositionRegister | null {
  if (!position) return null
  if (PAST_ROOT_POSITION_IDS.has(position.id)) return 'past-root'
  if (FUTURE_EMERGING_POSITION_IDS.has(position.id)) return 'future-emerging'
  return 'present-active'
}

// True for court cards: Pages (11), Knights (12), Queens (13), Kings (14)
function isCourtCard(card: TarotCard): boolean {
  return card.arcana === 'minor' && card.number >= 11 && card.number <= 14
}

function getCourtRankLabel(card: TarotCard): string {
  if (card.number === 11) return 'Page'
  if (card.number === 12) return 'Knight'
  if (card.number === 13) return 'Queen'
  if (card.number === 14) return 'King'
  return card.name
}

function buildPositionAwareAffinityLine(
  card: TarotCard,
  planet: string,
  cardElement: Element,
  transitElement: Element,
  register: PositionRegister,
): string {
  const kw0 = card.keywords[0] ?? 'its themes'
  const kw1 = card.keywords[1] ?? 'its energy'
  const transitAdj = ELEMENT_ADJECTIVE[transitElement]
  const sameElement = transitElement === cardElement

  if (isCourtCard(card)) {
    const rank = getCourtRankLabel(card)
    const figure = `this ${rank} of ${cardElement}`
    if (register === 'past-root') {
      if (sameElement) {
        return `The ${planet} transit has been deepening the ${cardElement} ground that ${figure} embodies — the ${kw0} and ${kw1} already at work here have shaped the situation from its roots.`
      } else {
        return `The ${planet} transit has been introducing ${transitAdj} pressure into the ${cardElement} ground that ${figure} embodies — a quality that has been operating beneath the surface of this situation, shaping it from below.`
      }
    } else if (register === 'future-emerging') {
      if (sameElement) {
        return `The ${planet} transit amplifies the ${cardElement} quality ${figure} carries — ${kw0} and ${kw1} are gathering, pointing toward the kind of mastery or presence this figure represents.`
      } else {
        return `The ${planet} transit brings ${transitAdj} energy into the domain of ${figure} — what approaches is a meeting between the ${cardElement} presence this card names and a force that will ask it to expand beyond its familiar ground.`
      }
    } else {
      // present-active
      if (sameElement) {
        return `The ${planet} transit amplifies ${figure}'s ${cardElement} nature — ${kw0} and ${kw1} are immediately alive in this position, whether as a quality you are embodying or a figure you are encountering.`
      } else {
        return `The ${planet} transit introduces ${transitAdj} energy into ${figure}'s ${cardElement} domain — the tension between these two forces is active right now, asking for conscious integration in the role or relationship this card names.`
      }
    }
  }

  // Non-court card: position-aware but less relational
  if (register === 'past-root') {
    if (sameElement) {
      return `The ${planet} transit has been amplifying this card's ${cardElement} nature — ${kw0} and ${kw1} have been operating as a shaping ground beneath this situation.`
    } else {
      return `The ${planet} transit has been introducing ${transitAdj} energy into this ${cardElement} card — these forces have been in tension beneath the surface, forming the root condition of what is present now.`
    }
  } else if (register === 'future-emerging') {
    if (sameElement) {
      return `The ${planet} transit amplifies this card's ${cardElement} nature — ${kw0} and ${kw1} are gathering momentum, pointing toward what is becoming available.`
    } else {
      return `The ${planet} transit brings ${transitAdj} energy into this ${cardElement} card — what approaches will ask for the integration of these contrasting forces as this direction takes shape.`
    }
  } else {
    // present-active (default)
    if (sameElement) {
      return `The current ${planet} transit amplifies this card's ${cardElement} nature — ${kw0} and ${kw1} are heightened now.`
    } else {
      return `The current ${planet} transit introduces ${transitAdj} energy into this ${cardElement} card — a call to integrate these opposing forces consciously.`
    }
  }
}

function buildTransitInfluence(
  card: TarotCard,
  astroContext: TarotAstroContext,
  position: SpreadPosition | null,
): string {
  // Level 1: specific transit adaptation lookup
  const adaptations = TRANSIT_ADAPTATIONS[card.id]
  if (adaptations && adaptations.length > 0) {
    for (const entry of adaptations) {
      if (entry.condition === 'retrograde') {
        if (astroContext.retrogradeplanets.includes(entry.planet)) {
          return entry.emphasis
        }
      } else if (entry.condition === 'direct') {
        if (
          astroContext.dominantTransitPlanet === entry.planet &&
          !astroContext.retrogradeplanets.includes(entry.planet)
        ) {
          return entry.emphasis
        }
      } else {
        // 'any' — match if dominant or retrograde
        if (
          astroContext.dominantTransitPlanet === entry.planet ||
          astroContext.retrogradeplanets.includes(entry.planet)
        ) {
          return entry.emphasis
        }
      }
    }
  }

  // Level 2: element affinity with dominant transit planet (position-aware)
  if (astroContext.dominantTransitPlanet) {
    const planet = astroContext.dominantTransitPlanet
    const transitElement = PLANET_ELEMENT_MAP[planet]
    const cardElement = card.element
    const register = getPositionRegister(position)

    if (transitElement && cardElement) {
      if (register !== null) {
        return buildPositionAwareAffinityLine(card, planet, cardElement, transitElement, register)
      }
      // No position (single-card draw) — unchanged generic output
      if (transitElement === cardElement) {
        const kw0 = card.keywords[0] ?? 'its themes'
        const kw1 = card.keywords[1] ?? 'its energy'
        return `The current ${planet} transit amplifies this card's ${cardElement} nature — ${kw0} and ${kw1} are heightened now.`
      } else {
        const transitAdj = ELEMENT_ADJECTIVE[transitElement]
        const cardEl = cardElement
        return `The current ${planet} transit introduces ${transitAdj} energy into this ${cardEl} card — a call to integrate these opposing forces consciously.`
      }
    }

    if (transitElement && !card.element) {
      return `The current ${planet} transit brings ${transitElement.toLowerCase()} energy into this card's domain — ${card.keywords[0] ?? 'its central theme'} is colored by this influence now.`
    }
  }

  // Level 3: baseline from card's astro connection or ruling planet/element
  const astroConn = ASTRO_CONNECTIONS[card.id]
  if (astroConn?.baselineNote) {
    return astroConn.baselineNote
  }

  if (card.rulingPlanet) {
    return `This card's ${card.rulingPlanet} nature speaks to ${card.symbolicTheme}.`
  }

  if (card.element) {
    return `This card's ${card.element} nature speaks to ${card.symbolicTheme}.`
  }

  return `This card speaks directly to ${card.symbolicTheme} as its guiding theme.`
}

function buildAstroHeadline(
  card: TarotCard,
  astroContext: TarotAstroContext,
): string {
  const planet = astroContext.dominantTransitPlanet
  const kw = card.keywords[0] ?? 'its essence'

  if (planet && astroContext.retrogradeplanets.includes(planet)) {
    return `${planet} retrograde turns ${card.name}'s ${kw} inward — review before moving forward.`
  }

  if (planet) {
    const transitEl = PLANET_ELEMENT_MAP[planet]
    const cardEl = card.element
    if (transitEl && cardEl && transitEl === cardEl) {
      return `${planet}'s ${transitEl.toLowerCase()} current amplifies ${card.name}'s ${kw} — now is the moment.`
    }
    return `${planet}'s influence meets ${card.name} — ${kw} and transformation walk together today.`
  }

  if (astroContext.lunarPhaseName) {
    return `The ${astroContext.lunarPhaseName} deepens ${card.name}'s invitation to ${kw}.`
  }

  return `${card.name} speaks to ${kw} — its wisdom arrives exactly when you need it.`
}

function buildElementResonanceNote(card: TarotCard, astroContext: TarotAstroContext): string {
  const cardEl = card.element
  const natalEl = astroContext.natalDominantElement

  if (!cardEl && !natalEl) {
    return 'This card brings its symbolic force without a specific elemental alignment — its lesson is universal.'
  }

  if (!cardEl) {
    return `Your natal ${natalEl} dominance meets a card whose energy transcends elemental category.`
  }

  if (!natalEl) {
    return `This ${cardEl} card speaks its language directly — your natal chart holds space for its message.`
  }

  if (cardEl === natalEl) {
    return `This card's ${cardEl} nature resonates with your natal ${natalEl} dominance — familiar terrain, deep recognition.`
  }

  return `Your natal ${natalEl} nature meets this card's ${cardEl} themes — an encounter between what you know and what the card asks you to expand into.`
}

function buildLunarPhaseNote(astroContext: TarotAstroContext): string {
  if (!astroContext.lunarPhaseName) {
    return 'The lunar cycle supports your contemplation of this card\'s message.'
  }

  const phase = astroContext.lunarPhaseName
  const symbol = astroContext.lunarPhaseSymbol ?? ''

  const phaseNotes: Record<string, string> = {
    'New Moon': `The New Moon ${symbol} seeds what this card initiates — intentions set now carry the weight of new beginnings.`,
    'Waxing Crescent': `The Waxing Crescent ${symbol} builds momentum — this card\'s guidance is especially suited to what you are growing.`,
    'First Quarter': `The First Quarter ${symbol} asks for decisive action — this card\'s lesson meets the moment of commitment.`,
    'Waxing Gibbous': `The Waxing Gibbous ${symbol} refines what has been growing — this card invites precision and adjustment.`,
    'Full Moon': `The Full Moon ${symbol} illuminates what this card asks you to see fully — nothing hidden, nothing softened.`,
    'Waning Gibbous': `The Waning Gibbous ${symbol} shares what has been learned — this card speaks to the wisdom of distribution and gratitude.`,
    'Last Quarter': `The Last Quarter ${symbol} releases what does not serve — this card supports the letting go.`,
    'Waning Crescent': `The Waning Crescent ${symbol} rests before the new cycle — this card meets you in the surrendered space.`,
  }

  return phaseNotes[phase] ?? `The ${phase} ${symbol} colors this card\'s message with its particular quality of lunar light.`
}

function buildAdvanceCategoryNote(astroContext: TarotAstroContext): string {
  if (!astroContext.advanceCategory) return ''
  return ADVANCE_CATEGORY_NOTES[astroContext.advanceCategory] ?? ''
}

export function computeInstantInterpretation(
  card: TarotCard,
  reversed: boolean,
  position: SpreadPosition | null,
  astroContext: TarotAstroContext,
): InstantInterpretation {
  const transitInfluence = buildTransitInfluence(card, astroContext, position)
  const astroHeadline = buildAstroHeadline(card, astroContext)
  const elementResonanceNote = buildElementResonanceNote(card, astroContext)
  const lunarPhaseNote = buildLunarPhaseNote(astroContext)
  const advanceCategoryNote = buildAdvanceCategoryNote(astroContext)

  let numerologyNote = card.numerologyResonance
  if (astroContext.personalDay === card.number) {
    numerologyNote += ` Your personal day is also a ${card.number} — this card speaks directly into your current cycle.`
  }

  const astroConnection: AstroConnection = {
    cardElement: card.element,
    natalDominantElement: astroContext.natalDominantElement,
    elementResonanceNote,
    transitInfluence,
    lunarPhaseNote,
    advanceCategoryNote,
    astroHeadline,
  }

  const positionAwareInterpretation = adaptInterpretationToPosition(
    {
      coreMeaning: reversed ? card.reversedMeaning : card.uprightMeaning,
      symbolicTheme: card.symbolicTheme,
      emotionalMeaning: card.emotionalMeaning,
      practicalGuidance: card.practicalGuidance,
      reflectionQuestion: card.reflectionQuestion,
    },
    position,
  )

  return {
    cardId: card.id,
    cardName: card.name,
    arcana: card.arcana,
    suit: card.suit ?? null,
    reversed,
    positionLabel: position?.label ?? null,
    positionMeaning: position?.meaning ?? null,
    coreMeaning: positionAwareInterpretation.coreMeaning,
    symbolicTheme: positionAwareInterpretation.symbolicTheme,
    emotionalMeaning: positionAwareInterpretation.emotionalMeaning,
    practicalGuidance: positionAwareInterpretation.practicalGuidance,
    reflectionQuestion: positionAwareInterpretation.reflectionQuestion,
    numerologyNote,
    astroConnection,
  }
}

// ─── computeThreeCardSynthesis ────────────────────────────────────────────────

export function computeThreeCardSynthesis(
  cards: DrawnCard[],
  positions: SpreadPosition[],
  astroContext: TarotAstroContext,
): ThreeCardSynthesisInput {
  // Dominant arcana
  const majorCount = cards.filter(dc => dc.card.arcana === 'major').length
  let dominantArcana: 'major-heavy' | 'minor-heavy' | 'balanced'
  if (majorCount >= 2) {
    dominantArcana = 'major-heavy'
  } else if (majorCount === 0) {
    dominantArcana = 'minor-heavy'
  } else {
    dominantArcana = 'balanced'
  }

  // Element distribution
  const elements: Element[] = cards
    .map(dc => dc.card.element)
    .filter((e): e is Element => e !== null)

  const elementCounts: Partial<Record<Element, number>> = {}
  for (const el of elements) {
    elementCounts[el] = (elementCounts[el] ?? 0) + 1
  }

  let dominant: Element | null = null
  let maxCount = 0
  for (const [el, count] of Object.entries(elementCounts) as [Element, number][]) {
    if (count > maxCount) {
      maxCount = count
      dominant = el
    } else if (count === maxCount) {
      dominant = null
    }
  }

  const uniqueElements = new Set(elements)
  const allSame = elements.length === cards.length && uniqueElements.size === 1
  const crossElement = uniqueElements.size === cards.length && cards.length > 1

  const fireWaterTension =
    elements.includes('Fire') && elements.includes('Water')

  // Polarity profile
  const reversedCount = cards.filter(dc => dc.reversed).length
  const centerReversed = cards.length >= 2 ? (cards[1]?.reversed ?? false) : false

  // Archetype framing
  const cardIds = cards.map(dc => dc.card.id)
  const hasFool = cardIds.includes('the-fool')
  const hasWorld = cardIds.includes('the-world')
  const hasDeathOrTower = cardIds.includes('death') || cardIds.includes('the-tower')

  const numbers = cards
    .map(dc => dc.card.number)
    .filter(n => typeof n === 'number' && !isNaN(n))
  let numericalProgression = false
  if (numbers.length >= 2) {
    const sorted = [...numbers].sort((a, b) => a - b)
    const diffs = sorted.slice(1).map((n, i) => n - sorted[i])
    numericalProgression = diffs.every(d => Math.abs(d) <= 2)
  }

  // Suit pattern
  const suits: (TarotSuit | null)[] = cards.map(dc => dc.card.suit ?? null)
  const nonNullSuits = suits.filter((s): s is TarotSuit => s !== null)
  const allSameSuit = nonNullSuits.length === suits.length && new Set(nonNullSuits).size === 1
  const noMinorArcana = cards.every(dc => dc.card.arcana === 'major')

  // Astro resonance note
  let astroResonanceNote = ''
  if (allSame && dominant && astroContext.dominantTransitPlanet) {
    const planet = astroContext.dominantTransitPlanet
    astroResonanceNote = `All three cards draw from ${dominant} against a ${planet}-dominant sky — the element is amplified.`
  } else if (fireWaterTension && astroContext.dominantTransitPlanet) {
    astroResonanceNote = `Fire and Water meet across the spread under a ${astroContext.dominantTransitPlanet} sky — emotional pressure and creative drive are in direct conversation.`
  } else if (dominantArcana === 'major-heavy' && astroContext.dominantTransitPlanet) {
    astroResonanceNote = `${majorCount} Major Arcana cards arrive during a ${astroContext.dominantTransitPlanet} transit — archetypal forces are in motion, not merely personal patterns.`
  } else if (dominant) {
    astroResonanceNote = `A ${dominant} theme runs through this spread — ${ELEMENT_ADJECTIVE[dominant]} energy shapes the constellation.`
  } else if (astroContext.lunarPhaseName) {
    astroResonanceNote = `The ${astroContext.lunarPhaseName} colors the full spread — its particular quality of light illuminates all three positions.`
  } else {
    astroResonanceNote = 'The three cards form a constellation whose meaning exceeds any single archetype — read the whole before reading the parts.'
  }

  return {
    dominantArcana,
    elementDistribution: {
      elements,
      dominant,
      allSame,
      crossElement,
      fireWaterTension,
    },
    polarityProfile: {
      reversedCount,
      allReversed: reversedCount === cards.length,
      allUpright: reversedCount === 0,
      centerReversed,
    },
    archetypeFraming: {
      hasFool,
      hasWorld,
      hasDeathOrTower,
      numericalProgression,
    },
    suitPattern: {
      suits,
      allSameSuit,
      noMinorArcana,
    },
    astroResonanceNote,
    interpretedCards: cards,
    spreadPositions: positions,
  }
}
