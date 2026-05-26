import {
  callOpenAI,
  retryWithBackoff,
  resolveUserBirthContext,
} from './gpt.js'
import { calculateChart } from '../engine/chartEngine.js'
import { calculateTransits } from '../engine/transitEngine.js'
import {
  calculatePersonalDay,
  calculatePersonalYear,
  calculateLifePath,
} from '../engine/numerologyEngine.js'

// ---------------------------------------------------------------------------
// Shared payload types
// ---------------------------------------------------------------------------

export interface TarotCardPayload {
  id: string
  name: string
  arcana: 'major' | 'minor'
  suit?: string
  number: number
  element: string | null
  /** Ruling planet of this card (from astroConnections). Null for cards without a classical planetary ruler. */
  rulingPlanet: string | null
  reversed: boolean
  coreMeaning: string
  symbolicTheme: string
  emotionalMeaning: string
  practicalGuidance: string
  reflectionQuestion: string
  numerologyResonance: string
  astroHeadline: string
  transitInfluence: string
  lunarPhaseNote: string | null
}

// ---------------------------------------------------------------------------
// Chart rulership lookup — server-side mirror of src/engine/tarot.ts SIGN_RULERSHIPS.
// Modern rulerships. Both copies must be maintained in lockstep.
// ---------------------------------------------------------------------------
const SIGN_RULERSHIPS_SERVER: Record<string, string> = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Pluto',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Uranus',
  Pisces: 'Neptune',
}

function deriveChartRuler(ascSign: string | null | undefined): string | null {
  if (!ascSign) return null
  return SIGN_RULERSHIPS_SERVER[ascSign] ?? null
}

export interface SpreadPositionPayload {
  index: number
  label: string
  meaning: string
}

// ---------------------------------------------------------------------------
// Elemental dignity
// ---------------------------------------------------------------------------

export type ElementalDignity = 'harmonious' | 'opposing' | 'resonant' | 'neutral'

/**
 * Compute classical elemental dignity between two element strings.
 *
 * Rules (per the sprint spec):
 *   Fire + Air   → harmonious
 *   Water + Earth→ harmonious
 *   Fire + Water → opposing
 *   Air + Earth  → opposing
 *   same element → resonant
 *   null or unmatched → neutral
 */
export function computeElementalDignity(
  elementA: string | null | undefined,
  elementB: string | null | undefined,
): ElementalDignity {
  if (!elementA || !elementB) return 'neutral'
  if (elementA === elementB) return 'resonant'
  const pair = [elementA, elementB].sort().join('+')
  const harmonious = new Set(['Air+Fire', 'Earth+Water'])
  const opposing = new Set(['Fire+Water', 'Air+Earth'])
  if (harmonious.has(pair)) return 'harmonious'
  if (opposing.has(pair)) return 'opposing'
  return 'neutral'
}

/**
 * Produce a one-sentence dignity description for GPT consumption.
 */
export function describeElementalDignity(
  cardA: TarotCardPayload,
  cardB: TarotCardPayload,
  dignity: ElementalDignity,
): string {
  const a = cardA.name
  const b = cardB.name
  const elA = cardA.element ?? 'elementless'
  const elB = cardB.element ?? 'elementless'
  switch (dignity) {
    case 'harmonious':
      return `${a} (${elA}) and ${b} (${elB}) are elementally harmonious — their energies support and amplify one another.`
    case 'opposing':
      return `${a} (${elA}) and ${b} (${elB}) are elementally opposing — a productive friction or creative tension is present between them.`
    case 'resonant':
      return `${a} and ${b} share the ${elA} element — elemental resonance: the same field, different expressions.`
    case 'neutral':
      return `${a} and ${b} hold an elemental neutrality — no classical tension or harmony; their relationship is symbolic rather than elemental.`
  }
}

// ---------------------------------------------------------------------------
// Court card detection helpers
// ---------------------------------------------------------------------------

const COURT_RANKS = new Set(['Page', 'Knight', 'Queen', 'King'])

export function isCourtCard(card: TarotCardPayload): boolean {
  if (card.arcana !== 'minor') return false
  return COURT_RANKS.has(card.name.split(' ')[0] ?? '')
}

export function describeCourtPairDynamic(cardA: TarotCardPayload, cardB: TarotCardPayload): string {
  const a = cardA.name
  const b = cardB.name
  const rankA = cardA.name.split(' ')[0] ?? ''
  const rankB = cardB.name.split(' ')[0] ?? ''
  const elA = cardA.element ?? ''
  const elB = cardB.element ?? ''

  if (elA === elB) {
    return `${a} and ${b} are court cards of the same element (${elA}) — two facets of the same inner archetype face each other, one perhaps more developed or assertive than the other.`
  }
  if (rankA === rankB) {
    return `${a} and ${b} are court cards of the same rank (${rankA}) but different elements (${elA} vs. ${elB}) — a mirroring dynamic where equal authority meets different natures.`
  }
  return `${a} and ${b} are both court cards — two distinct inner figures meet across the central axis of the spread, each carrying their own authority and symbolic role.`
}

// ---------------------------------------------------------------------------
// Major/Minor asymmetry description
// ---------------------------------------------------------------------------

export function describeMajorMinorAsymmetry(
  cardA: TarotCardPayload,
  cardB: TarotCardPayload,
): string {
  const majorCard = cardA.arcana === 'major' ? cardA : cardB
  const minorCard = cardA.arcana === 'major' ? cardB : cardA
  return `${majorCard.name} (Major Arcana) sets the archetypal register — a fundamental life force or universal pattern — while ${minorCard.name} (Minor Arcana, ${minorCard.suit ?? 'suitless'}) grounds it in everyday reality, bringing the cosmic into the concrete.`
}

// ---------------------------------------------------------------------------
// Directional numeral progression
// ---------------------------------------------------------------------------

export type NumeralDirection = 'ascending' | 'descending' | 'non-sequential'

export interface NumeralProgressionSignal {
  direction: NumeralDirection
  /** True if every consecutive pair differs by exactly 1 */
  adjacent: boolean
  numbers: number[]
  description: string
}

export function computeNumeralProgression(cards: TarotCardPayload[]): NumeralProgressionSignal | null {
  const numbers = cards.map(c => c.number).filter(n => typeof n === 'number' && !isNaN(n) && n > 0)
  if (numbers.length < 2) return null

  const diffs = numbers.slice(1).map((n, i) => n - numbers[i]!)
  const allPositive = diffs.every(d => d > 0)
  const allNegative = diffs.every(d => d < 0)
  const adjacent = diffs.every(d => Math.abs(d) === 1)

  let direction: NumeralDirection
  if (allPositive) direction = 'ascending'
  else if (allNegative) direction = 'descending'
  else direction = 'non-sequential'

  let description: string
  if (direction === 'ascending' && adjacent) {
    description = `The card numbers step upward (${numbers.join('→')}) in consecutive sequence — an arc of building, progression, or accumulation.`
  } else if (direction === 'ascending') {
    description = `The card numbers move upward (${numbers.join('→')}) — an ascending arc suggesting growth, expansion, or forward movement.`
  } else if (direction === 'descending' && adjacent) {
    description = `The card numbers step downward (${numbers.join('→')}) in consecutive sequence — an unwinding, resolution, or return arc.`
  } else if (direction === 'descending') {
    description = `The card numbers move downward (${numbers.join('→')}) — a descending arc suggesting release, narrowing, or completion.`
  } else {
    description = `The card numbers (${numbers.join(', ')}) do not follow a clear sequence — the spread speaks from discontinuity or juxtaposition rather than progression.`
  }

  return { direction, adjacent, numbers, description }
}

// ---------------------------------------------------------------------------
// Signals types
// ---------------------------------------------------------------------------

export interface ThreeCardSignals {
  dominantArcana: 'major-heavy' | 'minor-heavy' | 'balanced'
  majorArcanaCount: number
  elementDistribution: Record<string, number>
  polarityCount: { upright: number; reversed: number }
  hasFoolOrWorld: boolean
  dominantSuit: string | null
  /** Replaces the old string field — now a structured directional signal */
  numeralProgression: NumeralProgressionSignal | null
  /** Elemental dignity for positions 1+2 */
  pairDignity12: {
    dignity: ElementalDignity
    description: string
    courtDynamic: string | null
    majorMinorAsymmetry: string | null
  }
  /** Elemental dignity for positions 2+3 */
  pairDignity23: {
    dignity: ElementalDignity
    description: string
  }
  /** Whether all cards are Major Arcana */
  allMajorArcana: boolean
}

export interface CelticStructuralSignals {
  majorArcanaCount: number
  majorArcanaWeight: 'archetypal-heavy' | 'balanced' | 'practical-heavy'
  reversedCount: number
  reversalWeight: 'high-friction' | 'mixed' | 'all-upright'
  dominantElement: string | null
  absentElements: string[]
  elementFieldQuality: string
  courtCardCount: number
  hasFoolOrWorld: boolean
  /** Elemental dignity for positions 1 (Present) and 2 (Crossing) */
  crossingPairDignity: {
    dignity: ElementalDignity
    description: string
    courtDynamic: string | null
    majorMinorAsymmetry: string | null
  }
}

export interface TarotSingleSynthesisPayload {
  card: TarotCardPayload
  position: SpreadPositionPayload | null
  userIntention: string | null
  natalSunSign: string
  natalMoonSign: string
  natalAscSign: string
  chartRulerPlanet: string | null
  natalDominantModality: 'Cardinal' | 'Fixed' | 'Mutable' | null
  natalMoonHouse: number | null
  natalVenusHouse: number | null
  natalNorthNodeHouse: number | null
  natalMarsHouse: number | null
  personalDay: number
  personalYear: number
  advanceCategory: string | null
  advanceReason: string | null
  moonPhaseName: string
  moonSign: string
  dailyTransitSummary: string | null
  weeklyTransitSummary: string | null
  spreadMode: string | null
  localDate: string
}

export interface TarotThreeSynthesisPayload {
  cards: [TarotCardPayload, TarotCardPayload, TarotCardPayload]
  positions: [SpreadPositionPayload, SpreadPositionPayload, SpreadPositionPayload]
  spreadMode: string
  signals: ThreeCardSignals
  userIntention: string | null
  natalSunSign: string
  natalMoonSign: string
  natalAscSign: string
  chartRulerPlanet: string | null
  natalDominantModality: 'Cardinal' | 'Fixed' | 'Mutable' | null
  natalMoonHouse: number | null
  natalVenusHouse: number | null
  natalNorthNodeHouse: number | null
  natalMarsHouse: number | null
  personalDay: number
  personalYear: number
  advanceCategory: string | null
  advanceReason: string | null
  moonPhaseName: string
  moonSign: string
  dailyTransitSummary: string | null
  weeklyTransitSummary: string | null
  localDate: string
}

export interface TarotCelticSynthesisPayload {
  cards: TarotCardPayload[]
  positions: SpreadPositionPayload[]
  userIntention: string | null
  natalSunSign: string
  natalMoonSign: string
  natalAscSign: string
  chartRulerPlanet: string | null
  natalDominantModality: 'Cardinal' | 'Fixed' | 'Mutable' | null
  natalMoonPhase: string | null
  natalMoonHouse: number | null
  natalVenusHouse: number | null
  natalNorthNodeHouse: number | null
  natalMarsHouse: number | null
  personalDay: number
  personalYear: number
  lifePathNumber: number
  advanceCategory: string | null
  advanceReason: string | null
  moonPhaseName: string
  moonSign: string
  dailyTransitSummary: string | null
  weeklyTransitSummary: string | null
  localDate: string
  /** Pre-computed structural signals for Celtic Cross (spec 6) */
  signals?: CelticStructuralSignals
}

export interface TarotDiscussPayload {
  discussContext: string
  userIntention?: string | null
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}

// ---------------------------------------------------------------------------
// Celtic Cross structural signals computation (spec 6)
// ---------------------------------------------------------------------------

export function computeCelticStructuralSignals(cards: TarotCardPayload[]): CelticStructuralSignals {
  const allElements = ['Fire', 'Earth', 'Air', 'Water']

  const majorArcanaCount = cards.filter(c => c.arcana === 'major').length
  let majorArcanaWeight: CelticStructuralSignals['majorArcanaWeight']
  if (majorArcanaCount >= 5) majorArcanaWeight = 'archetypal-heavy'
  else if (majorArcanaCount <= 2) majorArcanaWeight = 'practical-heavy'
  else majorArcanaWeight = 'balanced'

  const reversedCount = cards.filter(c => c.reversed).length
  let reversalWeight: CelticStructuralSignals['reversalWeight']
  if (reversedCount >= 5) reversalWeight = 'high-friction'
  else if (reversedCount === 0) reversalWeight = 'all-upright'
  else reversalWeight = 'mixed'

  const elementMap: Record<string, number> = {}
  for (const c of cards) {
    if (c.element) elementMap[c.element] = (elementMap[c.element] ?? 0) + 1
  }
  const elementEntries = Object.entries(elementMap).sort((a, b) => b[1] - a[1])
  const dominantElement = elementEntries[0]?.[0] ?? null
  const dominantCount = elementEntries[0]?.[1] ?? 0
  const absentElements = allElements.filter(el => !elementMap[el])

  // Field quality description
  let elementFieldQuality: string
  if (!dominantElement) {
    elementFieldQuality = 'No element dominates — the spread is elementally fragmented or perfectly balanced, suggesting a situation without a single driving force.'
  } else {
    const absenceNote = absentElements.length > 0
      ? ` The absence of ${absentElements.join(' and ')} from this spread is itself meaningful — ${absentElements.join('/')} energy (${absentElements.map(el => el === 'Fire' ? 'drive/inspiration' : el === 'Earth' ? 'stability/matter' : el === 'Air' ? 'mind/communication' : 'feeling/depth').join('/')}) is not among the forces present.`
      : ' All four elements appear.'
    elementFieldQuality = `${dominantElement} dominates (${dominantCount} of ${cards.length} cards) — the reading's primary emotional register is ${dominantElement === 'Fire' ? 'energized, driven, and creative' : dominantElement === 'Earth' ? 'grounded, material, and embodied' : dominantElement === 'Air' ? 'mental, communicative, and relational' : 'emotional, intuitive, and depth-seeking'}.${absenceNote}`
  }

  const courtCardCount = cards.filter(c => isCourtCard(c)).length
  const hasFoolOrWorld = cards.some(c => c.id === 'the-fool' || c.id === 'the-world')

  // Positions 1 and 2 pairing dignity (spec 6)
  const card1 = cards[0]
  const card2 = cards[1]
  let crossingPairDignity: CelticStructuralSignals['crossingPairDignity']

  if (card1 && card2) {
    const dignity = computeElementalDignity(card1.element, card2.element)
    const description = describeElementalDignity(card1, card2, dignity)
    const courtDynamic = isCourtCard(card1) && isCourtCard(card2)
      ? describeCourtPairDynamic(card1, card2)
      : null
    const majorMinorAsymmetry = card1.arcana !== card2.arcana
      ? describeMajorMinorAsymmetry(card1, card2)
      : null
    crossingPairDignity = { dignity, description, courtDynamic, majorMinorAsymmetry }
  } else {
    crossingPairDignity = {
      dignity: 'neutral',
      description: 'Insufficient cards for pairing analysis.',
      courtDynamic: null,
      majorMinorAsymmetry: null,
    }
  }

  return {
    majorArcanaCount,
    majorArcanaWeight,
    reversedCount,
    reversalWeight,
    dominantElement,
    absentElements,
    elementFieldQuality,
    courtCardCount,
    hasFoolOrWorld,
    crossingPairDignity,
  }
}

// ---------------------------------------------------------------------------
// Dominant modality computation (server-side)
// Mirrors computeDominantModality in src/engine/tarot.ts — kept here because
// the server and client live in separate TypeScript compilation contexts.
// Any logic change must be applied to both copies in lockstep.
// ---------------------------------------------------------------------------

const SIGN_MODALITIES: Record<string, 'Cardinal' | 'Fixed' | 'Mutable'> = {
  Aries: 'Cardinal', Taurus: 'Fixed', Gemini: 'Mutable', Cancer: 'Cardinal',
  Leo: 'Fixed', Virgo: 'Mutable', Libra: 'Cardinal', Scorpio: 'Fixed',
  Sagittarius: 'Mutable', Capricorn: 'Cardinal', Aquarius: 'Fixed', Pisces: 'Mutable',
}

function computeDominantModality(
  natalChart: { planets: Array<{ name: string; sign: string }>; angles?: { ascendant?: { sign?: string } } },
): 'Cardinal' | 'Fixed' | 'Mutable' | null {
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
    const top = (Object.keys(counts) as ('Cardinal' | 'Fixed' | 'Mutable')[]).filter(m => counts[m] === max)
    return top.length === 1 ? top[0] : null
  } catch {
    return null
  }
}

/**
 * Server-side mirror of the canonical formatTransitSummary defined in
 * src/components/tarot/tarotUtils.ts. Kept here because the server and client
 * live in separate TypeScript compilation contexts and cannot share a module.
 * Any behaviour change must be applied to both copies in lockstep.
 */
function formatTransitSummary(
  transitData: ReturnType<typeof calculateTransits>,
  periodLabel: 'Daily' | 'Weekly',
): string {
  const moon = transitData.currentPlanets.find(planet => planet.name === 'Moon')
  const topAspects = transitData.transitAspects.slice(0, periodLabel === 'Daily' ? 5 : 7)
  const ingresses = transitData.ingresses.slice(0, periodLabel === 'Daily' ? 2 : 4)
  const retrogrades = transitData.retrogrades.filter(item => item.isRetro || item.status.includes('Stationing')).slice(0, 5)

  const lines: string[] = []
  lines.push(`${periodLabel} window: ${transitData.dateRange.start} to ${transitData.dateRange.end}`)
  if (moon) {
    lines.push(`Current Moon: ${moon.degree}°${moon.minute}' ${moon.sign}${moon.retrograde ? ' [Rx]' : ''}`)
  }
  if (topAspects.length > 0) {
    lines.push(`${periodLabel} transit aspects:`)
    for (const aspect of topAspects) {
      const houseText = aspect.natalHouse ? `, natal house ${aspect.natalHouse}` : ''
      lines.push(`- ${aspect.transitPlanet} ${aspect.symbol} natal ${aspect.natalPlanet} (${aspect.type}, orb ${aspect.orb}°, ${aspect.applying ? 'applying' : 'separating'}, ${aspect.nature}${houseText})`)
    }
  }
  if (ingresses.length > 0) {
    lines.push(`${periodLabel} sign changes:`)
    for (const ingress of ingresses) {
      lines.push(`- ${ingress.planet} moves from ${ingress.fromSign} to ${ingress.toSign} around ${ingress.approximateDate}`)
    }
  }
  if (retrogrades.length > 0) {
    lines.push(`${periodLabel} retrograde activity:`)
    for (const retrograde of retrogrades) {
      lines.push(`- ${retrograde.planet}: ${retrograde.status}`)
    }
  }

  return lines.join('\n')
}

function getThreeCardSpreadPromptConfig(
  spreadMode: TarotThreeSynthesisPayload['spreadMode'],
  positions: TarotThreeSynthesisPayload['positions'],
) {
  switch (spreadMode) {
    case 'past-present-future':
      return {
        spreadSummary: 'This spread is temporal. Read the cards as a moving arc from what shaped the present, to what is alive now, to what is emerging next.',
        directionInstruction: `DIRECTION: One short paragraph on what the ${positions[2].label} card reveals about the trajectory already forming from ${positions[0].label} through ${positions[1].label}.`,
        hiddenInstruction: `HIDDEN_INFLUENCE: One short paragraph on what the ${positions[1].label} card reveals about the tension between what was formed in ${positions[0].label} and what is gathering in ${positions[2].label}.`,
        adviceInstruction: 'ADVICE: One short paragraph with grounded integration guidance that helps the person respond consciously to the arc from past to future.',
        psychologicalInstruction: 'PSYCHOLOGICAL_PATTERN: One short paragraph naming the repeating pattern or developmental movement linking past, present, and future.',
        timingInstruction: 'TIMING: One short paragraph on how this sequence is likely to unfold over the next days and week, keeping the temporal progression central.',
      }
    case 'situation-challenge-advice':
      return {
        spreadSummary: 'This spread is diagnostic and directional. Read the first card as the true situation, the second as the living friction within it, and the third as the symbolic orientation forward.',
        directionInstruction: `DIRECTION: One short paragraph on how the ${positions[2].label} card reorients the person in relation to the ${positions[0].label} and the ${positions[1].label}.`,
        hiddenInstruction: `HIDDEN_INFLUENCE: One short paragraph on what the ${positions[1].label} card reveals about the hidden pressure or paradox inside the ${positions[0].label}.`,
        adviceInstruction: `ADVICE: One short paragraph translating the ${positions[2].label} card into grounded, practical guidance without reducing it to a cliché or command.`,
        psychologicalInstruction: 'PSYCHOLOGICAL_PATTERN: One short paragraph naming how the person may be participating in, resisting, or refining the situation-challenge dynamic.',
        timingInstruction: 'TIMING: One short paragraph on how the tension between situation and challenge is likely to evolve if the advice is taken seriously over the coming days and week.',
      }
    case 'mind-heart-action':
      return {
        spreadSummary: 'This spread is about inner alignment. Read the first card as the mental frame, the second as the emotional truth, and the third as the action that could bring them into coherence.',
        directionInstruction: `DIRECTION: One short paragraph on what the ${positions[2].label} card reveals about the action, gesture, or decision that could align the ${positions[0].label} and ${positions[1].label}.`,
        hiddenInstruction: `HIDDEN_INFLUENCE: One short paragraph on what the ${positions[1].label} card reveals about where feeling complicates, contradicts, or deepens the ${positions[0].label}.`,
        adviceInstruction: 'ADVICE: One short paragraph of grounded integration guidance that helps the person translate mental clarity and emotional truth into embodied action.',
        psychologicalInstruction: 'PSYCHOLOGICAL_PATTERN: One short paragraph naming the inner split, harmony, or compensation pattern running between mind and heart.',
        timingInstruction: 'TIMING: One short paragraph on how alignment or misalignment between mind, heart, and action is likely to develop over the coming days and week.',
      }
    case 'self-other-bridge':
      return {
        spreadSummary: 'This spread is relational. Read the first card as the self-position, the second as the other side of the dynamic, and the third as the bridge that could transform or connect the two.',
        directionInstruction: `DIRECTION: One short paragraph on what the ${positions[2].label} card reveals about how connection, repair, or transformation could happen between ${positions[0].label} and ${positions[1].label}.`,
        hiddenInstruction: `HIDDEN_INFLUENCE: One short paragraph on what the ${positions[1].label} card reveals about the dynamic the ${positions[0].label} card is meeting, resisting, or misunderstanding.`,
        adviceInstruction: 'ADVICE: One short paragraph of grounded guidance focused on what the person can embody to become a real bridge rather than stay inside projection or opposition.',
        psychologicalInstruction: 'PSYCHOLOGICAL_PATTERN: One short paragraph naming the relational pattern, projection, defense, or invitation running between self and other.',
        timingInstruction: 'TIMING: One short paragraph on how the self-other dynamic is likely to evolve over the next days and week, especially if the bridge card is or is not embodied.',
      }
    case 'theme-shadow-gift':
      return {
        spreadSummary: 'This spread is initiatory. Read the first card as the central theme, the second as the shadow shaping it from below awareness, and the third as the gift that becomes available through honest engagement.',
        directionInstruction: `DIRECTION: One short paragraph on what the ${positions[2].label} card reveals about the capacity, opening, or blessing that becomes available when the ${positions[0].label} and ${positions[1].label} are consciously engaged.`,
        hiddenInstruction: `HIDDEN_INFLUENCE: One short paragraph on what the ${positions[1].label} card reveals about the unseen force operating beneath the ${positions[0].label}.`,
        adviceInstruction: 'ADVICE: One short paragraph of grounded guidance focused on how to work honestly with the theme and shadow so the gift becomes livable rather than abstract.',
        psychologicalInstruction: 'PSYCHOLOGICAL_PATTERN: One short paragraph naming the deeper initiation, defense, or maturation process running through theme, shadow, and gift.',
        timingInstruction: 'TIMING: One short paragraph on how this initiatory process is likely to deepen across the coming days and week, keeping the gift conditional on real engagement.',
      }
    default:
      return {
        spreadSummary: 'Read the three cards as a single constellation whose meaning depends on the specific role of each position.',
        directionInstruction: `DIRECTION: One short paragraph on what the ${positions[2].label} card reveals about where the spread is moving.`,
        hiddenInstruction: `HIDDEN_INFLUENCE: One short paragraph on what the ${positions[1].label} card reveals about the dynamic between ${positions[0].label} and ${positions[2].label}, including any polarity, element, or suit tension.`,
        adviceInstruction: 'ADVICE: One short paragraph with grounded integration guidance.',
        psychologicalInstruction: 'PSYCHOLOGICAL_PATTERN: One short paragraph naming the psychological pattern running through the whole spread.',
        timingInstruction: 'TIMING: One short paragraph on how the spread energy is likely to develop over the coming days and week, again keeping the three cards central.',
      }
  }
}

// ---------------------------------------------------------------------------
// Ordinal helper for house numbers in prompt text
// ---------------------------------------------------------------------------

/**
 * Converts a house number (1–12) to its ordinal form: 1st, 2nd, 3rd, 4th–12th.
 * Returns an empty string for null/undefined/out-of-range values.
 */
function ordinalHouse(n: number | null | undefined): string {
  if (n == null || n < 1 || n > 12) return ''
  const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
  return `${n}${suffix}`
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function handleTarotSingleSynthesis(
  payload: TarotSingleSynthesisPayload,
  userId?: number,
): Promise<string> {
  let authorizedPersonalDay = payload.personalDay
  let natalSunSign = payload.natalSunSign
  let natalMoonSign = payload.natalMoonSign
  let natalAscSign = payload.natalAscSign
  let chartRulerPlanet = payload.chartRulerPlanet
  let natalDominantModality = payload.natalDominantModality
  let natalMoonHouse = payload.natalMoonHouse
  let natalVenusHouse = payload.natalVenusHouse
  let natalNorthNodeHouse = payload.natalNorthNodeHouse
  let natalMarsHouse = payload.natalMarsHouse
  let dailyTransitSummary = payload.dailyTransitSummary
  let weeklyTransitSummary = payload.weeklyTransitSummary
  let currentMoonSign = payload.moonSign

  if (userId) {
    const ctx = resolveUserBirthContext(userId)
    if (ctx) {
      const targetDate = new Date(payload.localDate)
      authorizedPersonalDay = calculatePersonalDay(ctx.birthDate, targetDate)
      const natalChart = calculateChart(ctx.birthDate, ctx.birthTime, ctx.lat, ctx.lng, ctx.tz, ctx.unknownTime)
      natalSunSign = natalChart.planets.find(p => p.name === 'Sun')?.sign ?? payload.natalSunSign
      natalMoonSign = natalChart.planets.find(p => p.name === 'Moon')?.sign ?? payload.natalMoonSign
      natalAscSign = natalChart.angles?.ascendant?.sign ?? payload.natalAscSign
      natalDominantModality = computeDominantModality(natalChart)
      // Re-derive chart ruler from server-authoritative ascendant sign (overrides client-supplied value)
      chartRulerPlanet = deriveChartRuler(natalChart.angles?.ascendant?.sign ?? null)
      // Re-derive house placements from server-computed chart (overrides client-supplied values)
      const moonP = natalChart.planets.find(p => p.name === 'Moon')
      const venusP = natalChart.planets.find(p => p.name === 'Venus')
      const nnP = natalChart.planets.find(p => p.name === 'NorthNode')
      const marsP = natalChart.planets.find(p => p.name === 'Mars')
      natalMoonHouse = moonP?.house && moonP.house >= 1 && moonP.house <= 12 ? moonP.house : null
      natalVenusHouse = venusP?.house && venusP.house >= 1 && venusP.house <= 12 ? venusP.house : null
      natalNorthNodeHouse = nnP?.house && nnP.house >= 1 && nnP.house <= 12 ? nnP.house : null
      natalMarsHouse = marsP?.house && marsP.house >= 1 && marsP.house <= 12 ? marsP.house : null
      const dailyTransitData = calculateTransits(natalChart, 'daily')
      const weeklyTransitData = calculateTransits(natalChart, 'weekly')
      dailyTransitSummary = formatTransitSummary(dailyTransitData, 'Daily')
      weeklyTransitSummary = formatTransitSummary(weeklyTransitData, 'Weekly')
      currentMoonSign = dailyTransitData.currentPlanets.find(planet => planet.name === 'Moon')?.sign ?? payload.moonSign
    }
  }

  const card = payload.card
  const intentionLine = payload.userIntention
    ? `The person drew this card seeking clarity on: "${payload.userIntention}"`
    : 'This is an open daily draw — no specific question was asked.'

  const intentionAnchor = payload.userIntention
    ? `The person's stated intention is: "${payload.userIntention}". This intention is the ground every paragraph is writing toward — not a label to mention and move past. Return to it operatively in paragraph 1 (name how the card's central tension illuminates or complicates what they came to ask) and in the reflection question (which must be answerable only in the context of this card and this intention together). The test: if the intention were swapped for a different question, would the paragraph need to be rewritten? If not, it is not threaded — it is footnoted.`
    : 'No intention was stated. Anchor your reflection question to the most charged or surprising element of this card under today\'s astrological context — do not write a generic tarot question.'

  const positionLine = payload.position
    ? `Card position: ${payload.position.label} — ${payload.position.meaning}`
    : 'Single card draw, no positional context.'

  const spreadLine = payload.spreadMode
    ? `Reading context: ${payload.spreadMode}`
    : ''

  const reversalText = card.reversed ? 'reversed (upright-down — off-axis energy, not negated)' : 'upright'

  // Modality description for the natal bridge paragraph
  const modalityNote = natalDominantModality
    ? `Dominant modality: ${natalDominantModality} — ${
        natalDominantModality === 'Cardinal' ? 'this person initiates; they meet force by moving toward it'
        : natalDominantModality === 'Fixed' ? 'this person holds; they meet force by standing their ground or enduring'
        : 'this person adapts; they meet force by reframing or moving with it'
      }`
    : ''

  const prompt = `${intentionLine}

## The Card
${card.name} — ${reversalText}
${positionLine}
${spreadLine}
Arcana: ${card.arcana === 'major' ? 'Major Arcana' : `Minor Arcana, ${card.suit}`}
Element: ${card.element ?? 'none'}
Symbolic theme: ${card.symbolicTheme}
Core meaning (${card.reversed ? 'reversed' : 'upright'}): ${card.coreMeaning}
Emotional meaning: ${card.emotionalMeaning}
Practical guidance: ${card.practicalGuidance}
Numerology resonance: ${card.numerologyResonance}

## This Person's Sky Right Now
Sun in ${natalSunSign}, Moon in ${natalMoonSign}${natalMoonHouse ? ` in your ${ordinalHouse(natalMoonHouse)} house` : ''}, Ascendant in ${natalAscSign}
${chartRulerPlanet ? `Chart ruler: ${chartRulerPlanet}${payload.card.rulingPlanet && payload.card.rulingPlanet === chartRulerPlanet ? ` — SAME AS THIS CARD'S RULING PLANET (${payload.card.rulingPlanet}): highest personal resonance signal — name this conjunction explicitly in the reading` : ''}` : ''}
${natalDominantModality ? `Dominant modality: ${natalDominantModality}` : ''}
${natalVenusHouse ? `Venus in your ${ordinalHouse(natalVenusHouse)} house` : ''}
${natalNorthNodeHouse ? `North Node in your ${ordinalHouse(natalNorthNodeHouse)} house` : ''}
${natalMarsHouse ? `Mars in your ${ordinalHouse(natalMarsHouse)} house` : ''}
${modalityNote}
Personal Day: ${authorizedPersonalDay}
Personal Year: ${payload.personalYear}
Moon: ${payload.moonPhaseName} in ${currentMoonSign}
${payload.advanceCategory ? `Advance signal: ${payload.advanceCategory} — ${payload.advanceReason ?? ''}` : ''}
Astro connection the instant interpretation found: ${card.astroHeadline}
Transit influence on this card: ${card.transitInfluence}
${card.lunarPhaseNote ? `Lunar note: ${card.lunarPhaseNote}` : ''}

## Daily Transit Context
${dailyTransitSummary ?? 'No daily transit summary available.'}

## Weekly Transit Context
${weeklyTransitSummary ?? 'No weekly transit summary available.'}

## Intention Instruction
${intentionAnchor}

Write a complete single-card synthesis in exactly 4 short paragraphs plus 1 final reflection question line.

Paragraph 1: Start with the card interpretation itself. Lead with the card's symbolic and psychological meaning in the context of the person's intention — name how this card speaks directly to what they came to explore. This paragraph must name the living tension, threshold, or opportunity in the card and explicitly connect it to the stated intention (or to the most charged astrological signal if no intention was given).

Paragraph 2: Connect the card to the natal chart. The test for this paragraph: if a different card had been drawn, would this paragraph need to be rewritten? If not, it is not doing the work. If the chart ruler is provided in "This Person's Sky Right Now": name it and describe the specific relationship between this card's ruling planet or element and the person's chart ruler — if they are the same planet, name this conjunction explicitly. If the card deals with change, disruption, resistance, or movement, use the dominant modality (${natalDominantModality ?? 'unknown'}) to show how this person characteristically meets that kind of force — and what that means for how this card lands. A reversed card should name what the card's central principle feels like when it operates as blocked, internalized, or working beneath the surface in the context of this natal pattern. Use Sun, Moon, Ascendant, or house placements only when the connection is direct and unmistakable — not to decorate the reading, but to name the specific collision between this card's symbolic field and this person's birth architecture.

Paragraph 3: Connect the card to the daily transits. Use the Daily Transit Context above concretely, but every transit point you mention must be explicitly tied back to the card. Do not write a standalone daily transit reading. Show how the most relevant transit planets, aspects, retrogrades, sign changes, or Moon movement activate, complicate, sharpen, or echo the card's symbolic message today.

Paragraph 4: Connect the card to the weekly transits and return to the person's intention. Use the Weekly Transit Context to explain how the card's energy develops across the coming week. Close this paragraph with one sentence that brings the week's energy back to bear on the person's original question or orientation — what this week means specifically for what they came to explore.

Then end with a single final line beginning exactly with "REFLECTION:" followed by one strong reflection question. Before writing this question, verify internally that it could only arise from this specific card, this specific intention or astrological context, and this specific sky — revise it if it would apply equally to a different person's reading.

Formatting rules: separate each paragraph with a blank line. Keep each paragraph to 2–4 sentences. Do not output headings. Do not produce one long block of text. Every paragraph must remain card-centered. The daily and weekly paragraphs must each cite at least one concrete transit feature from their respective context blocks and explicitly connect that feature back to the card's symbolism, element, or reversed/upright condition.`

  const result = await retryWithBackoff(() =>
    callOpenAI(
      [
        {
          role: 'system',
          content: `You are a symbolic interpreter and reflective guide — not a fortune teller. You read Tarot as a language of the psyche, enriched by the living sky. You speak directly to the person in second person. You are personal, specific, and never generic. You do not predict events. You illuminate what is already present. The tone is mystical but grounded: poetic precision, not spiritual performance. You never evoke fear, never claim certainty about outcomes, and never use Tarot to manipulate or destabilize. Every reading ends with possibility, not fate. You must connect the card to the person's actual sky in a concrete way; avoid generic card summaries. The person's stated intention must be traceable in more than one place in your response — it should shape the opening paragraph and the final reflection question at minimum. You must format the response as 4 short paragraphs separated by blank lines, followed by one final line starting with "REFLECTION:".`,
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.85, max_tokens: 900 },
    ),
  )
  return result || 'Unable to generate synthesis.'
}

export async function handleTarotThreeSynthesis(
  payload: TarotThreeSynthesisPayload,
  userId?: number,
): Promise<string> {
  let authorizedPersonalDay = payload.personalDay
  let authorizedPersonalYear = payload.personalYear
  let natalSunSign = payload.natalSunSign
  let natalMoonSign = payload.natalMoonSign
  let natalAscSign = payload.natalAscSign
  let chartRulerPlanet = payload.chartRulerPlanet
  let natalDominantModality = payload.natalDominantModality
  let natalMoonHouse = payload.natalMoonHouse
  let natalVenusHouse = payload.natalVenusHouse
  let natalNorthNodeHouse = payload.natalNorthNodeHouse
  let natalMarsHouse = payload.natalMarsHouse
  let dailyTransitSummary = payload.dailyTransitSummary
  let weeklyTransitSummary = payload.weeklyTransitSummary
  let currentMoonSign = payload.moonSign

  if (userId) {
    const ctx = resolveUserBirthContext(userId)
    if (ctx) {
      const targetDate = new Date(payload.localDate)
      authorizedPersonalDay = calculatePersonalDay(ctx.birthDate, targetDate)
      authorizedPersonalYear = calculatePersonalYear(ctx.birthDate)
      const natalChart = calculateChart(ctx.birthDate, ctx.birthTime, ctx.lat, ctx.lng, ctx.tz, ctx.unknownTime)
      natalSunSign = natalChart.planets.find(p => p.name === 'Sun')?.sign ?? payload.natalSunSign
      natalMoonSign = natalChart.planets.find(p => p.name === 'Moon')?.sign ?? payload.natalMoonSign
      natalAscSign = natalChart.angles?.ascendant?.sign ?? payload.natalAscSign
      natalDominantModality = computeDominantModality(natalChart)
      // Re-derive chart ruler from server-authoritative ascendant sign (overrides client-supplied value)
      chartRulerPlanet = deriveChartRuler(natalChart.angles?.ascendant?.sign ?? null)
      // Re-derive house placements from server-computed chart (overrides client-supplied values)
      const moonP = natalChart.planets.find(p => p.name === 'Moon')
      const venusP = natalChart.planets.find(p => p.name === 'Venus')
      const nnP = natalChart.planets.find(p => p.name === 'NorthNode')
      const marsP = natalChart.planets.find(p => p.name === 'Mars')
      natalMoonHouse = moonP?.house && moonP.house >= 1 && moonP.house <= 12 ? moonP.house : null
      natalVenusHouse = venusP?.house && venusP.house >= 1 && venusP.house <= 12 ? venusP.house : null
      natalNorthNodeHouse = nnP?.house && nnP.house >= 1 && nnP.house <= 12 ? nnP.house : null
      natalMarsHouse = marsP?.house && marsP.house >= 1 && marsP.house <= 12 ? marsP.house : null
      const dailyTransitData = calculateTransits(natalChart, 'daily')
      const weeklyTransitData = calculateTransits(natalChart, 'weekly')
      dailyTransitSummary = formatTransitSummary(dailyTransitData, 'Daily')
      weeklyTransitSummary = formatTransitSummary(weeklyTransitData, 'Weekly')
      currentMoonSign = dailyTransitData.currentPlanets.find(planet => planet.name === 'Moon')?.sign ?? payload.moonSign
    }
  }

  const { cards, positions, signals, spreadMode } = payload
  const spreadPromptConfig = getThreeCardSpreadPromptConfig(spreadMode, positions)

  const cardLines = cards.map((card, i) => {
    const pos = positions[i]
    const reversalText = card.reversed ? ' (reversed)' : ' (upright)'
    return `${pos.label}: ${card.name}${reversalText}
  Position meaning: ${pos.meaning}
  Core meaning: ${card.coreMeaning}
  Symbolic theme: ${card.symbolicTheme}
  Emotional: ${card.emotionalMeaning}
  Practical: ${card.practicalGuidance}
  Astro connection: ${card.astroHeadline}${card.transitInfluence ? ` — ${card.transitInfluence}` : ''}`
  }).join('\n\n')

  const intentionLine = payload.userIntention
    ? `The person drew this spread seeking clarity on: "${payload.userIntention}"`
    : 'Open reading — no specific intention stated.'

  const intentionAnchor = payload.userIntention
    ? `This person's stated intention — "${payload.userIntention}" — is the ground every section of this reading is writing toward, not a label to note and move past. The floor is: it must appear operatively in at least two distinct sections — meaning each appearance shows the cards changing or complicating the person's understanding of their own question, not merely referencing it. In MAIN_TENSION, show how the tension the cards reveal directly implicates what they came to ask. In ADVICE, show what this card's guidance means specifically for their stated question — not generally. In the REFLECTION_PROMPTS, each question must be answerable only given this exact combination of cards and this exact intention. Generic intention references ("in relation to your question about...") are not operative; they are footnotes. The test: if the intention were replaced with a different question, would the sentence need to be rewritten? If not, it is not threaded.`
    : `No intention was stated. Do not treat this as license for generic language. Instead, identify the most charged or surprising element of this spread and treat it as the implicit center of inquiry. Name it in the MAIN_THEME section and return to it in the ADVICE section. The REFLECTION_PROMPTS must feel specific to this constellation — as if no other spread could have generated them.`

  const signalLines: string[] = []
  signalLines.push(`Arcana composition: ${signals.majorArcanaCount} Major, ${3 - signals.majorArcanaCount} Minor (${signals.dominantArcana})`)
  if (signals.allMajorArcana) {
    signalLines.push('ALL THREE CARDS ARE MAJOR ARCANA — there are no suit-level or elemental-practical relationships to describe. The dialogue between these cards is purely archetypal. Do not manufacture elemental tensions that are not present.')
  }
  const elementEntries = Object.entries(signals.elementDistribution).filter(([, n]) => n > 0)
  if (elementEntries.length > 0) {
    signalLines.push(`Elements: ${elementEntries.map(([el, n]) => `${el}×${n}`).join(', ')}`)
  }
  signalLines.push(`Polarity: ${signals.polarityCount.upright} upright, ${signals.polarityCount.reversed} reversed`)
  if (signals.hasFoolOrWorld) signalLines.push('Contains The Fool or The World — beginning or completion framing is present')
  if (signals.dominantSuit) signalLines.push(`All Minor Arcana from same suit: ${signals.dominantSuit} — elemental intensity`)

  // Directional numeral progression (spec 5)
  if (signals.numeralProgression) {
    signalLines.push(`Numeral progression: ${signals.numeralProgression.description}`)
  }

  // Elemental dignity for pairs 1+2 and 2+3 (spec 1)
  const pd12 = signals.pairDignity12
  signalLines.push(`\nCard 1 + Card 2 elemental dignity: ${pd12.dignity.toUpperCase()}`)
  signalLines.push(pd12.description)
  if (pd12.courtDynamic) signalLines.push(`Court card dynamic: ${pd12.courtDynamic}`)
  if (pd12.majorMinorAsymmetry) signalLines.push(`Major/Minor asymmetry: ${pd12.majorMinorAsymmetry}`)

  const pd23 = signals.pairDignity23
  signalLines.push(`\nCard 2 + Card 3 elemental dignity: ${pd23.dignity.toUpperCase()}`)
  signalLines.push(pd23.description)

  // Build pairing instruction for the opening sentence (spec 2, 3, 4)
  let pairingInstruction = `CRITICAL — OPENING_SENTENCE: The opening sentence must show what cards 1 (${cards[0]?.name ?? ''}) and 2 (${cards[1]?.name ?? ''}) are doing to each other before it names card 3's role. "Incorporate" is not enough — the sentence must name the tension, unified image, or quality of encounter that the pairing generates, not label it. A sentence that lists the two cards with their elements and calls them "opposing" or "harmonious" has labeled the pairing, not shown it. The test: does the opening sentence convey something that would be different if card 2 had been a different card? If not, the pairing has not been used — it has been named. Draw on the pre-computed elemental dignity (${pd12.dignity}) and both position roles to name what this specific pairing produces.`
  if (pd12.courtDynamic) {
    pairingInstruction += ` Both cards 1 and 2 are court cards — name their relational dynamic (whether they face, oppose, or mirror each other) as part of the opening constellation framing.`
  }
  if (pd12.majorMinorAsymmetry) {
    pairingInstruction += ` Cards 1 and 2 come from different arcana tiers — acknowledge this asymmetry: the Major card sets the archetypal register and the Minor card grounds it in everyday reality.`
  }
  if (signals.allMajorArcana) {
    pairingInstruction += ` All three cards are Major Arcana — the pairing between cards 1 and 2 is archetypal, not elemental-practical; describe the symbolic image or cosmic tension they form together.`
  }

  // Modality description for the astrology synthesis paragraph
  const modalityNote = natalDominantModality
    ? `Natal dominant modality: ${natalDominantModality} — ${
        natalDominantModality === 'Cardinal' ? 'this person initiates; they meet force by moving toward it'
        : natalDominantModality === 'Fixed' ? 'this person holds; they meet force by standing their ground or enduring'
        : 'this person adapts; they meet force by reframing or moving with it'
      }`
    : ''

  const prompt = `${intentionLine}

## Spread: ${spreadMode}
${spreadPromptConfig.spreadSummary}
${cardLines}

## Pre-Computed Structural Signals (use these as given facts — do not re-derive from card names)
${signalLines.join('\n')}

## This Person's Sky Right Now
Sun in ${natalSunSign}, Moon in ${natalMoonSign}${natalMoonHouse ? ` in your ${ordinalHouse(natalMoonHouse)} house` : ''}, Ascendant in ${natalAscSign}
${chartRulerPlanet ? `Chart ruler: ${chartRulerPlanet}` : ''}
${natalDominantModality ? `Dominant modality: ${natalDominantModality}` : ''}
${natalVenusHouse ? `Venus in your ${ordinalHouse(natalVenusHouse)} house` : ''}
${natalNorthNodeHouse ? `North Node in your ${ordinalHouse(natalNorthNodeHouse)} house` : ''}
${natalMarsHouse ? `Mars in your ${ordinalHouse(natalMarsHouse)} house` : ''}
${modalityNote}
Personal Day: ${authorizedPersonalDay}
Personal Year: ${authorizedPersonalYear}
Moon: ${payload.moonPhaseName} in ${currentMoonSign}
${payload.advanceCategory ? `Advance signal: ${payload.advanceCategory} — ${payload.advanceReason ?? ''}` : ''}

## Daily Transit Context
${dailyTransitSummary ?? 'No daily transit summary available.'}

## Weekly Transit Context
${weeklyTransitSummary ?? 'No weekly transit summary available.'}

## Intention and Specificity Instruction
${intentionAnchor}

## Card Pairing Instruction
${pairingInstruction}

INSTRUCTION: You must return the reading using the exact labeled sections below so the app can render them. Do not add any extra headings.

OPENING_SENTENCE: One sentence only. Name all three cards together as a single symbolic statement — the constellation they form, not a list. This sentence must show what the pairing of cards 1 and 2 (their elemental dignity, relational dynamic, or archetypal encounter) is generating before naming card 3's role. The pairing must be active in the sentence, not labeled.

MAIN_THEME: One short paragraph on the living theme of the whole spread, using the exact logic of this spread type rather than treating it as a generic three-card pull.${payload.userIntention ? ` Return to the person's intention ("${payload.userIntention}") in this paragraph.` : ''}

MAIN_TENSION: One short paragraph on the main tension or living problem in the spread.${payload.userIntention ? ` Name the person's stated intention ("${payload.userIntention}") explicitly in relation to the tension the cards reveal.` : ''}

DIRECTION: ${spreadPromptConfig.directionInstruction.replace(/^DIRECTION:\s*/, '')}

HIDDEN_INFLUENCE: ${spreadPromptConfig.hiddenInstruction.replace(/^HIDDEN_INFLUENCE:\s*/, '')}

ADVICE: ${spreadPromptConfig.adviceInstruction.replace(/^ADVICE:\s*/, '')}${payload.userIntention ? ` The practical guidance must refer back to the person's intention ("${payload.userIntention}") — what does this card's advice mean specifically for what they came to explore?` : ''}

PSYCHOLOGICAL_PATTERN: ${spreadPromptConfig.psychologicalInstruction.replace(/^PSYCHOLOGICAL_PATTERN:\s*/, '')}

ASTROLOGY_SYNTHESIS: One short paragraph that keeps the three-card constellation central while connecting it to the natal chart, Daily Transit Context, and Weekly Transit Context. Do not drift into a standalone astrology reading. If the chart ruler is provided: in at least one sentence, draw on the chart ruler's relationship to one of the three drawn cards — name the chart ruler by planet name and explain what it means for this specific person that this card appears in this position. Explicitly connect at least one daily transit feature and one weekly transit feature back to the cards. Any transit or natal placement you mention must be tied to a specific card in the same or immediately adjacent sentence. When any card in this spread deals with change, disruption, resistance, or movement, use the dominant modality (${natalDominantModality ?? 'unknown'}) to show how this person characteristically meets that quality of force — and what that means for how the card lands.

TIMING: ${spreadPromptConfig.timingInstruction.replace(/^TIMING:\s*/, '')}${payload.userIntention ? ` Close the TIMING paragraph with a sentence that ends on the person's specific question — what the timing development means for what they came to explore, not for the reading in general.` : ''}

REFLECTION_PROMPTS:
- First reflection question
- Second reflection question
- Third reflection question

Before writing these reflection prompts, verify internally that each question could only have arisen from this specific combination of cards, this specific intention, and this specific sky. Revise any question that would be equally valid for a different person's reading. Generic tarot reflection questions ("What are you ready to release?") are prohibited unless they are grounded in a direct reference to the specific card that raised them.

Tone: mystical but grounded, symbolic not deterministic, emotionally intelligent, never fear-inducing. Speak in second person. Do not predict outcomes. Every section must stay centered on the three-card constellation rather than becoming a generic transit reading. You must fully respect the spread logic above; do not reinterpret this spread as past-present-future unless that is explicitly the spread.`

  const result = await retryWithBackoff(() =>
    callOpenAI(
      [
        {
          role: 'system',
          content: `You are a symbolic interpreter and reflective guide reading a ${spreadMode} Tarot spread as a single constellation — not three independent readings placed side by side. The three cards form a sentence the psyche is speaking to this person right now. Your task is to hear that sentence and speak it back with depth, specificity, and emotional intelligence. You speak in second person. You are mystical but grounded, poetic but never vague. You do not predict events. You illuminate patterns. You never evoke fear, never claim certainty about outcomes. Every constellation has a through-line — your job is to find it and name it. The astrology must deepen the Tarot reading, not replace it: natal chart, daily transits, and weekly transits must always be interpreted through the meaning of these exact three cards. The person's stated intention must be traceable in more than one paragraph — it is not a header to be noted and forgotten. Return the response using exactly the requested labels and no additional headings.`,
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.85, max_tokens: 1400 },
    ),
  )
  return result || 'Unable to generate synthesis.'
}

export async function handleTarotCelticSynthesis(
  payload: TarotCelticSynthesisPayload,
  userId?: number,
): Promise<string> {
  let authorizedPersonalDay = payload.personalDay
  let authorizedPersonalYear = payload.personalYear
  let authorizedLifePath = payload.lifePathNumber
  let natalSunSign = payload.natalSunSign
  let natalMoonSign = payload.natalMoonSign
  let natalAscSign = payload.natalAscSign
  let chartRulerPlanet = payload.chartRulerPlanet
  let natalDominantModality = payload.natalDominantModality
  let natalMoonPhase = payload.natalMoonPhase
  let natalMoonHouse = payload.natalMoonHouse
  let natalVenusHouse = payload.natalVenusHouse
  let natalNorthNodeHouse = payload.natalNorthNodeHouse
  let natalMarsHouse = payload.natalMarsHouse
  let dailyTransitSummary = payload.dailyTransitSummary
  let weeklyTransitSummary = payload.weeklyTransitSummary
  let currentMoonSign = payload.moonSign

  if (userId) {
    const ctx = resolveUserBirthContext(userId)
    if (ctx) {
      const targetDate = new Date(payload.localDate)
      authorizedPersonalDay = calculatePersonalDay(ctx.birthDate, targetDate)
      authorizedPersonalYear = calculatePersonalYear(ctx.birthDate)
      authorizedLifePath = calculateLifePath(ctx.birthDate)
      const natalChart = calculateChart(ctx.birthDate, ctx.birthTime, ctx.lat, ctx.lng, ctx.tz, ctx.unknownTime)
      natalSunSign = natalChart.planets.find(p => p.name === 'Sun')?.sign ?? payload.natalSunSign
      natalMoonSign = natalChart.planets.find(p => p.name === 'Moon')?.sign ?? payload.natalMoonSign
      natalAscSign = natalChart.angles?.ascendant?.sign ?? payload.natalAscSign
      natalDominantModality = computeDominantModality(natalChart)
      // Re-derive chart ruler from server-authoritative ascendant sign (overrides client-supplied value)
      chartRulerPlanet = deriveChartRuler(natalChart.angles?.ascendant?.sign ?? null)
      // Re-derive house placements from server-computed chart (overrides client-supplied values)
      const moonP = natalChart.planets.find(p => p.name === 'Moon')
      const venusP = natalChart.planets.find(p => p.name === 'Venus')
      const nnP = natalChart.planets.find(p => p.name === 'NorthNode')
      const marsP = natalChart.planets.find(p => p.name === 'Mars')
      natalMoonHouse = moonP?.house && moonP.house >= 1 && moonP.house <= 12 ? moonP.house : null
      natalVenusHouse = venusP?.house && venusP.house >= 1 && venusP.house <= 12 ? venusP.house : null
      natalNorthNodeHouse = nnP?.house && nnP.house >= 1 && nnP.house <= 12 ? nnP.house : null
      natalMarsHouse = marsP?.house && marsP.house >= 1 && marsP.house <= 12 ? marsP.house : null
      const dailyTransitData = calculateTransits(natalChart, 'daily')
      const weeklyTransitData = calculateTransits(natalChart, 'weekly')
      dailyTransitSummary = formatTransitSummary(dailyTransitData, 'Daily')
      weeklyTransitSummary = formatTransitSummary(weeklyTransitData, 'Weekly')
      currentMoonSign = dailyTransitData.currentPlanets.find(planet => planet.name === 'Moon')?.sign ?? payload.moonSign
    }
  }

  const { cards, positions } = payload

  // Use pre-computed signals if provided, otherwise compute them (backward-compat)
  const signals: CelticStructuralSignals = payload.signals ?? computeCelticStructuralSignals(cards)

  const cardLines = cards.slice(0, 10).map((card, i) => {
    const pos = positions[i]
    const reversalText = card.reversed ? ' (reversed)' : ' (upright)'
    return `${i + 1}. ${pos.label} — ${card.name}${reversalText}
   ${card.symbolicTheme}. ${card.coreMeaning}
   Sky connection: ${card.astroHeadline}`
  }).join('\n\n')

  const intentionLine = payload.userIntention
    ? `This reading was drawn with the intention: "${payload.userIntention}"`
    : 'This is an open Celtic Cross — no specific question was stated.'

  const intentionAnchor = payload.userIntention
    ? `The person's intention — "${payload.userIntention}" — is the operative lens every section of this synthesis is looking through, not a reference label. The floor is that it must appear meaningfully in at least two distinct sections — where "meaningfully" means each appearance shows the cards complicating, deepening, or changing what the person understands about their own question, not merely repeating the intention's words. In The Central Cross, show what the heart of the spread says that directly implicates what they came to ask. In Practical Integration, each invitation must connect to their stated question — not to the reading in general. In the Reflection Prompts, each question must be answerable only given this specific constellation and this specific intention. The test: if the intention were replaced with a different question, would the sentence need to be rewritten? If not, the intention is being footnoted, not threaded.`
    : `No intention was stated. Identify the most charged or surprising element of this ten-card spread and name it in The Constellation section as the implicit center of inquiry. Do not use generic language that could apply to any reading.`

  // Crossing pair pairing instruction (spec 7)
  const crossPair = signals.crossingPairDignity
  const card1Name = cards[0]?.name ?? 'Position 1'
  const card2Name = cards[1]?.name ?? 'Position 2'
  const crossingInstruction = `THE CENTRAL CROSS MUST ADDRESS THE PAIRING FIRST: Before any other positional analysis, name the unified image that ${card1Name} (Present) and ${card2Name} (Crossing) form together. The elemental dignity between them is ${crossPair.dignity.toUpperCase()}: ${crossPair.description}${crossPair.courtDynamic ? ` Court card dynamic: ${crossPair.courtDynamic}` : ''}${crossPair.majorMinorAsymmetry ? ` Major/Minor asymmetry: ${crossPair.majorMinorAsymmetry}` : ''} Relate this central tension to the person's stated intention.`

  // Major arcana weight instruction (spec 8)
  const majorArcanaInstruction = signals.majorArcanaCount >= 3
    ? `ARCHETYPAL WEIGHT: This spread contains ${signals.majorArcanaCount} Major Arcana cards — you must acknowledge this explicitly. State clearly that the spread is operating at the level of fundamental life forces, not day-to-day circumstance. The Constellation section must name this archetypal weight as a defining quality of the reading.`
    : ''

  // Court card collective dynamic instruction (spec 9)
  const courtCardInstruction = signals.courtCardCount >= 2
    ? `COURT CARD COLLECTIVE: ${signals.courtCardCount} court cards appear in this spread. In the Psychological Dynamics section, name their collective dynamic — the relational cast or inner council present in this reading. Treat them as distinct inner figures meeting across the spread.`
    : signals.courtCardCount === 1 && (cards[0] && isCourtCard(cards[0]) || cards[1] && isCourtCard(cards[1]))
      ? `COURT CARD IN CENTRAL CROSS: A court card appears in the heart of the spread (position 1 or 2). Acknowledge in The Central Cross that this court card may represent a person rather than a quality, and frame the combination with the crossing card accordingly.`
      : ''

  // Element field quality (spec 10)
  const elementFieldInstruction = `ELEMENTAL FIELD: ${signals.elementFieldQuality}`

  const structuralSignalBlock = [
    `Major Arcana: ${signals.majorArcanaCount} of 10 (${signals.majorArcanaWeight.replace(/-/g, ' ')})`,
    `Reversed: ${signals.reversedCount} of 10 (${signals.reversalWeight.replace(/-/g, ' ')})`,
    `Dominant element: ${signals.dominantElement ?? 'none — balanced or fragmented'}`,
    signals.absentElements.length > 0 ? `Absent elements: ${signals.absentElements.join(', ')}` : 'All four elements present',
    `Court cards: ${signals.courtCardCount}`,
    signals.hasFoolOrWorld ? 'The Fool or The World present — beginning or completion framing.' : '',
  ].filter(Boolean).join('\n')

  const prompt = `${intentionLine}

## The Ten Cards of the Cross

${cardLines}

## Pre-Computed Structural Signals (treat as given facts — do not re-derive from card names)
${structuralSignalBlock}

## Elemental Field Quality
${signals.elementFieldQuality}

## Central Cross Pairing Signal
Positions 1+2 elemental dignity: ${crossPair.dignity.toUpperCase()}
${crossPair.description}${crossPair.courtDynamic ? `\nCourt dynamic: ${crossPair.courtDynamic}` : ''}${crossPair.majorMinorAsymmetry ? `\nMajor/Minor asymmetry: ${crossPair.majorMinorAsymmetry}` : ''}

## This Person's Living Sky
Sun in ${natalSunSign}, Moon in ${natalMoonSign}${natalMoonHouse ? ` in your ${ordinalHouse(natalMoonHouse)} house` : ''}, Ascendant in ${natalAscSign}
${chartRulerPlanet ? `Chart ruler: ${chartRulerPlanet}` : ''}
${natalDominantModality ? `Dominant modality: ${natalDominantModality}` : ''}
${natalVenusHouse ? `Venus in your ${ordinalHouse(natalVenusHouse)} house` : ''}
${natalNorthNodeHouse ? `North Node in your ${ordinalHouse(natalNorthNodeHouse)} house` : ''}
${natalMarsHouse ? `Mars in your ${ordinalHouse(natalMarsHouse)} house` : ''}
${natalDominantModality ? `Dominant modality: ${natalDominantModality} — ${natalDominantModality === 'Cardinal' ? 'this person initiates; they meet force by moving toward it' : natalDominantModality === 'Fixed' ? 'this person holds; they meet force by standing their ground or enduring' : 'this person adapts; they meet force by reframing or moving with it'}` : ''}
${natalMoonPhase ? `Natal Moon Phase: ${natalMoonPhase}` : ''}
Life Path: ${authorizedLifePath}
Personal Year: ${authorizedPersonalYear}, Personal Day: ${authorizedPersonalDay}
Current Moon: ${payload.moonPhaseName} in ${currentMoonSign}
${payload.advanceCategory ? `Advance signal: ${payload.advanceCategory} — ${payload.advanceReason ?? ''}` : ''}

## Daily Transit Context
${dailyTransitSummary ?? 'No daily transit summary available.'}

## Weekly Transit Context
${weeklyTransitSummary ?? 'No weekly transit summary available.'}

## Intention Instruction
${intentionAnchor}

## Structural Instructions
${crossingInstruction}
${majorArcanaInstruction}
${courtCardInstruction}
${elementFieldInstruction}


## Structure Your Synthesis in These Named Sections

**The Constellation**
Write this section LAST — it is the most important paragraph in the entire document. Edit it hardest. Read all ten cards together as a single symbolic field — not position by position, but as a complete pattern: what this spread, taken as a whole, reveals about where this person stands in the arc of their life.${payload.userIntention ? ` Anchor this paragraph to the person's stated intention: "${payload.userIntention}".` : ''} STRUCTURAL PROHIBITION: Nothing that has already been named in any other section — in any form — belongs here. If you find yourself completing a thought begun in The Central Cross, or restating a dynamic named in Psychological Dynamics, or summarizing what the other sections said: stop. That is summary, not Constellation. This paragraph begins where the other sections end. It must name the one thing the whole spread is saying that no individual section has yet named — the insight latent in the pattern as a whole, visible only from this distance. A reader who could remove The Constellation and insert it at the end of Psychological Dynamics without any loss has written summary. A reader whose Constellation makes the person re-read The Roots and the Horizon because they now see what those cards were pointing at — that has succeeded.

**The Central Cross**
${crossingInstruction}
The immediate reality (position 1) and what crosses it (position 2) — named as a unified image or tension. What does this central pairing say about the heart of this person's situation?${payload.userIntention ? ` Relate this tension directly to their question about "${payload.userIntention}".` : ''}

**The Roots and the Horizon**
Positions 3, 4, 5, 6: unconscious influence, recent past, conscious goal, near future. What does the sequence from below and behind reveal about the direction ahead?

**The Inner World**
Inner state (position 7) vs. external environment (position 8): what does this person carry that others cannot see? Where does the inner and outer world diverge or align?${signals.courtCardCount >= 2 ? ` If court cards appear here, name their role in the inner/outer dynamic.` : ''}

**Hopes, Fears, and Outcome**
Position 9 (hopes/fears — one card naming both) and position 10 (outcome). What is this person secretly hoping for or afraid of — and what is actually taking shape?

**Psychological Dynamics**
The dominant psychological pattern this ten-card constellation reveals — a single named quality or dynamic running through the entire reading like a thread.${signals.courtCardCount >= 2 ? ` Name the collective dynamic of the ${signals.courtCardCount} court cards present — the relational cast or inner council this reading convenes.` : ''}

**Astrology Resonance**
Where do the natal chart and current sky echo the spread's symbolic themes? If the chart ruler is provided in "This Person's Living Sky": treat it as the primary natal signal — name it and explain how it meets one specific card in this spread. This connection must be named at least as prominently as any Sun or Moon sign reference. Be specific — name the sign, transit planet, or aspect that directly amplifies a specific card's meaning. Any transit or natal placement you mention must be explicitly tied to a specific card in the same or immediately adjacent sentence. Do not write standalone astrology observations.${dailyTransitSummary ? ' Connect at least one daily transit feature and one weekly transit feature to specific cards.' : ''} When any card in this spread deals with change, disruption, resistance, or movement, use the dominant modality (${natalDominantModality ?? 'unknown'}) to name how this person characteristically meets that quality of force — and what it means for how the card lands for them specifically. A Fixed-dominant person receives a Tower differently than a Cardinal or Mutable person does — the modality makes the card personal, not just archetypal.

**Practical Integration**
Not prescriptive steps. Invitations: what does this constellation invite this person to move toward, release, or hold differently?${payload.userIntention ? ` These invitations must connect to the person's specific question about "${payload.userIntention}" — not to the reading in general.` : ''}

**Reflection Prompts**
Three distinct reflection questions, numbered 1–3. Before writing them, verify internally that each question could only have arisen from this specific constellation, this specific intention, and this specific sky. Revise any question that would be equally valid for a different person's reading. Generic tarot questions are prohibited unless grounded in direct reference to the specific card that raised them.

Tone throughout: mystical but grounded, symbolic not deterministic, emotionally intelligent, never fear-inducing. Speak in second person. Do not predict specific outcomes. Do not use the word "fate." Treat the spread as a portrait of energy and possibility — not a verdict. Each named section is substantive — not filler, not a rephrasing of the previous section.`

  const result = await retryWithBackoff(() =>
    callOpenAI(
      [
        {
          role: 'system',
          content: `You are a master symbolic reader conducting a Celtic Cross Tarot consultation. You read ten cards as a single constellation — not as ten independent interpretations. You are writing a document the person will return to, not a response to a question. You work at the intersection of Tarot, psychology, and astrology. You speak in second person, with depth and precision. You are never generic. You are never fatalistic. You treat the spread as a portrait of this person's present moment in full complexity — shadow and light, surface and depth, past and horizon. Your output has named sections as instructed. Each section is substantive — not filler, not padding. You do not use the word "fate" or predict specific events. You illuminate what is already present and invite the person to engage with it consciously. The Constellation section is the most important paragraph in the document — write it last and edit it hardest. It must name what no other section has named — not a summary, not a rephrasing, not an executive conclusion. The person's stated intention must be operative in more than one section — it is the ground the reading is growing in, not a label to be noted and forgotten. Any transit or natal placement you mention must be tied to a specific card in the spread in the same or immediately adjacent sentence — standalone transit observations are prohibited.`,
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.85, max_tokens: 3000 },
    ),
  )
  return result || 'Unable to generate Celtic Cross synthesis.'
}

export async function handleTarotDiscuss(
  payload: TarotDiscussPayload,
): Promise<string> {
  // Build intention threading instruction for the discuss system prompt (spec 14)
  const intentionInstruction = payload.userIntention
    ? `The person originally came to this reading with the intention: "${payload.userIntention}". This intention is the through-line of the entire conversation. When answering follow-up questions, connect your response back to this intention whenever the connection is direct and unmistakable. If the person asks about a specific card (for example, "what does the Tower mean here?"), interpret that card through the lens of their original intention — do not give a general card description divorced from what they came to explore.`
    : `No explicit intention was stated for this reading. Answer follow-up questions through the lens of the most charged or prominent card in the spread — ground your responses in the specific constellation rather than in generic card meanings.`

  const result = await retryWithBackoff(() =>
    callOpenAI(
      [
        {
          role: 'system',
          content: `You are a symbolic interpreter and reflective guide continuing a conversation about someone's Tarot reading. You are not a fortune teller. You read Tarot as a language of the psyche — symbolic, not predictive. Use the full reading context below to answer questions with depth, specificity, and personal directness. Reference the actual cards drawn, their positions, and the person's stated intention when relevant. Connect Tarot symbolism to the astrological context when the connection is direct and unmistakable. Stay in the mystical but grounded register — poetic but precise. Never predict outcomes. Never claim certainty. Never induce fear. If asked about a "scary" card (The Tower, Death, Ten of Swords), reframe within the symbolic register without dismissing the person's concern.

${intentionInstruction}

${payload.discussContext}`,
        },
        ...payload.messages,
      ],
      { temperature: 0.85, max_tokens: 1500 },
    ),
  )
  return result || 'Unable to generate a response.'
}
