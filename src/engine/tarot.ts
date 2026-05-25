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

  try {
    natalSunSign = natalChart.planets.find(p => p.name === 'Sun')?.sign ?? null
    natalMoonSign = natalChart.planets.find(p => p.name === 'Moon')?.sign ?? null
    natalAscendantSign = natalChart.angles?.ascendant?.sign ?? null
    natalDominantElement = computeDominantElement(natalChart)
    natalDominantModality = computeDominantModality(natalChart)
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

function buildTransitInfluence(card: TarotCard, astroContext: TarotAstroContext): string {
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

  // Level 2: element affinity with dominant transit planet
  if (astroContext.dominantTransitPlanet) {
    const planet = astroContext.dominantTransitPlanet
    const transitElement = PLANET_ELEMENT_MAP[planet]
    const cardElement = card.element

    if (transitElement && cardElement) {
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
  const transitInfluence = buildTransitInfluence(card, astroContext)
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

  return {
    cardId: card.id,
    cardName: card.name,
    arcana: card.arcana,
    suit: card.suit,
    reversed,
    positionLabel: position?.label ?? null,
    positionMeaning: position?.meaning ?? null,
    coreMeaning: reversed ? card.reversedMeaning : card.uprightMeaning,
    symbolicTheme: card.symbolicTheme,
    emotionalMeaning: card.emotionalMeaning,
    practicalGuidance: card.practicalGuidance,
    reflectionQuestion: card.reflectionQuestion,
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
  const suits: (TarotSuit | null)[] = cards.map(dc => dc.card.suit)
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
