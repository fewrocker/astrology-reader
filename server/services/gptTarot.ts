import {
  callOpenAI,
  retryWithBackoff,
  resolveUserBirthContext,
  GptServiceError,
  type BirthContext,
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

export interface SpreadPositionPayload {
  index: number
  label: string
  meaning: string
}

export interface ThreeCardSignals {
  dominantArcana: 'major-heavy' | 'minor-heavy' | 'balanced'
  majorArcanaCount: number
  elementDistribution: Record<string, number>
  polarityCount: { upright: number; reversed: number }
  hasFoolOrWorld: boolean
  dominantSuit: string | null
  numeralProgression: string | null
}

export interface TarotSingleSynthesisPayload {
  card: TarotCardPayload
  position: SpreadPositionPayload | null
  userIntention: string | null
  natalSunSign: string
  natalMoonSign: string
  natalAscSign: string
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
  natalMoonPhase: string | null
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
}

export interface TarotDiscussPayload {
  discussContext: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}

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

  const positionLine = payload.position
    ? `Card position: ${payload.position.label} — ${payload.position.meaning}`
    : 'Single card draw, no positional context.'

  const spreadLine = payload.spreadMode
    ? `Reading context: ${payload.spreadMode}`
    : ''

  const reversalText = card.reversed ? 'reversed (upright-down — off-axis energy, not negated)' : 'upright'

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
Sun in ${natalSunSign}, Moon in ${natalMoonSign}, Ascendant in ${natalAscSign}
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

Write a complete single-card synthesis in exactly 4 short paragraphs plus 1 final reflection question line.

Paragraph 1: Start with the card interpretation itself. Lead with the card's symbolic and psychological meaning in the context of the person's intention. This paragraph should name the living tension, threshold, or opportunity in the card before moving into astrology.

Paragraph 2: Connect the card to the natal chart. Mention at least one natal placement and explain why this specific card — its symbolism, element, arcana, and reversal if present — resonates with this person's birth pattern specifically. Use the Sun, Moon, Ascendant, Personal Day, Personal Year, and advance signal only when they genuinely sharpen the reading.

Paragraph 3: Connect the card to the daily transits. Use the Daily Transit Context above concretely, but every transit point you mention must be explicitly tied back to the card. Do not write a standalone daily transit reading. Show how the most relevant transit planets, aspects, retrogrades, sign changes, or Moon movement activate, complicate, sharpen, or echo the card's symbolic message today.

Paragraph 4: Connect the card to the weekly transits. Use the Weekly Transit Context above to explain how the card's energy develops across the coming week, but keep the card central in every sentence. Do not write a standalone weekly transit reading. Show how the week's transits extend, pressure-test, deepen, or unfold the meaning of this exact card over time.

Then end with a single final line beginning exactly with "REFLECTION:" followed by one strong reflection question that could only arise from this exact card-sky combination.

Formatting rules: separate each paragraph with a blank line. Keep each paragraph to 2–4 sentences. Do not output headings. Do not produce one long block of text. Every paragraph must remain card-centered. The daily and weekly paragraphs must each cite at least one concrete transit feature from their respective context blocks and explicitly connect that feature back to the card's symbolism, element, or reversed/upright condition.`

  const result = await retryWithBackoff(() =>
    callOpenAI(
      [
        {
          role: 'system',
          content: `You are a symbolic interpreter and reflective guide — not a fortune teller. You read Tarot as a language of the psyche, enriched by the living sky. You speak directly to the person in second person. You are personal, specific, and never generic. You do not predict events. You illuminate what is already present. The tone is mystical but grounded: poetic precision, not spiritual performance. You never evoke fear, never claim certainty about outcomes, and never use Tarot to manipulate or destabilize. Every reading ends with possibility, not fate. You must connect the card to the person's actual sky in a concrete way; avoid generic card summaries. You must format the response as 4 short paragraphs separated by blank lines, followed by one final line starting with "REFLECTION:".`,
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

  const signalLines: string[] = []
  signalLines.push(`Arcana composition: ${signals.majorArcanaCount} Major, ${3 - signals.majorArcanaCount} Minor (${signals.dominantArcana})`)
  const elementEntries = Object.entries(signals.elementDistribution).filter(([, n]) => n > 0)
  if (elementEntries.length > 0) {
    signalLines.push(`Elements: ${elementEntries.map(([el, n]) => `${el}×${n}`).join(', ')}`)
  }
  signalLines.push(`Polarity: ${signals.polarityCount.upright} upright, ${signals.polarityCount.reversed} reversed`)
  if (signals.hasFoolOrWorld) signalLines.push('Contains The Fool or The World — beginning or completion framing is present')
  if (signals.dominantSuit) signalLines.push(`All Minor Arcana from same suit: ${signals.dominantSuit} — elemental intensity`)
  if (signals.numeralProgression) signalLines.push(`Numeral progression detected: ${signals.numeralProgression}`)

  const prompt = `${intentionLine}

## Spread: ${spreadMode}
${spreadPromptConfig.spreadSummary}
${cardLines}

## Pre-Computed Structural Signals (use these as given facts — do not re-derive from card names)
${signalLines.join('\n')}

## This Person's Sky Right Now
Sun in ${natalSunSign}, Moon in ${natalMoonSign}, Ascendant in ${natalAscSign}
Personal Day: ${authorizedPersonalDay}
Personal Year: ${authorizedPersonalYear}
Moon: ${payload.moonPhaseName} in ${currentMoonSign}
${payload.advanceCategory ? `Advance signal: ${payload.advanceCategory} — ${payload.advanceReason ?? ''}` : ''}

## Daily Transit Context
${dailyTransitSummary ?? 'No daily transit summary available.'}

## Weekly Transit Context
${weeklyTransitSummary ?? 'No weekly transit summary available.'}

INSTRUCTION: You must return the reading using the exact labeled sections below so the app can render them. Do not add any extra headings.

OPENING_SENTENCE: One sentence only. Name all three cards together as a single symbolic statement — the constellation they form, not a list.

MAIN_THEME: One short paragraph on the living theme of the whole spread, using the exact logic of this spread type rather than treating it as a generic three-card pull.

MAIN_TENSION: One short paragraph on the main tension or living problem in the spread.

DIRECTION: ${spreadPromptConfig.directionInstruction.replace(/^DIRECTION:\s*/, '')}

HIDDEN_INFLUENCE: ${spreadPromptConfig.hiddenInstruction.replace(/^HIDDEN_INFLUENCE:\s*/, '')}

ADVICE: ${spreadPromptConfig.adviceInstruction.replace(/^ADVICE:\s*/, '')}

PSYCHOLOGICAL_PATTERN: ${spreadPromptConfig.psychologicalInstruction.replace(/^PSYCHOLOGICAL_PATTERN:\s*/, '')}

ASTROLOGY_SYNTHESIS: One short paragraph that keeps the three-card constellation central while connecting it to the natal chart, Daily Transit Context, and Weekly Transit Context. Do not drift into a standalone astrology reading. Explain how the current sky activates this exact spread, and explicitly connect at least one daily transit feature and one weekly transit feature back to the cards.

TIMING: ${spreadPromptConfig.timingInstruction.replace(/^TIMING:\s*/, '')}

REFLECTION_PROMPTS:
- First reflection question
- Second reflection question
- Third reflection question

Tone: mystical but grounded, symbolic not deterministic, emotionally intelligent, never fear-inducing. Speak in second person. Do not predict outcomes. Every section must stay centered on the three-card constellation rather than becoming a generic transit reading. You must fully respect the spread logic above; do not reinterpret this spread as past-present-future unless that is explicitly the spread.`

  const result = await retryWithBackoff(() =>
    callOpenAI(
      [
        {
          role: 'system',
          content: `You are a symbolic interpreter and reflective guide reading a ${spreadMode} Tarot spread as a single constellation — not three independent readings placed side by side. The three cards form a sentence the psyche is speaking to this person right now. Your task is to hear that sentence and speak it back with depth, specificity, and emotional intelligence. You speak in second person. You are mystical but grounded, poetic but never vague. You do not predict events. You illuminate patterns. You never evoke fear, never claim certainty about outcomes. Every constellation has a through-line — your job is to find it and name it. The astrology must deepen the Tarot reading, not replace it: natal chart, daily transits, and weekly transits must always be interpreted through the meaning of these exact three cards. Return the response using exactly the requested labels and no additional headings.`,
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.85, max_tokens: 1100 },
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
  let natalMoonPhase = payload.natalMoonPhase
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
      const dailyTransitData = calculateTransits(natalChart, 'daily')
      const weeklyTransitData = calculateTransits(natalChart, 'weekly')
      dailyTransitSummary = formatTransitSummary(dailyTransitData, 'Daily')
      weeklyTransitSummary = formatTransitSummary(weeklyTransitData, 'Weekly')
      currentMoonSign = dailyTransitData.currentPlanets.find(planet => planet.name === 'Moon')?.sign ?? payload.moonSign
    }
  }

  const { cards, positions } = payload

  const cardLines = cards.slice(0, 10).map((card, i) => {
    const pos = positions[i]
    const reversalText = card.reversed ? ' (reversed)' : ' (upright)'
    return `${i + 1}. ${pos.label} — ${card.name}${reversalText}
   ${card.symbolicTheme}. ${card.coreMeaning}
   Sky connection: ${card.astroHeadline}`
  }).join('\n\n')

  const majorCount = cards.filter(c => c.arcana === 'major').length
  const reversedCount = cards.filter(c => c.reversed).length
  const elementMap = cards.reduce<Record<string, number>>((acc, c) => {
    if (c.element) acc[c.element] = (acc[c.element] ?? 0) + 1
    return acc
  }, {})
  const dominantElement = Object.entries(elementMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const hasFoolOrWorld = cards.some(c => c.id === 'the-fool' || c.id === 'the-world')

  const intentionLine = payload.userIntention
    ? `This reading was drawn with the intention: "${payload.userIntention}"`
    : 'This is an open Celtic Cross — no specific question was stated.'

  const prompt = `${intentionLine}

## The Ten Cards of the Cross

${cardLines}

## Structural Overview (treat as pre-computed facts)
Major Arcana: ${majorCount} of 10 (${majorCount >= 5 ? 'major-arcana-heavy — archetypal forces dominant' : majorCount <= 2 ? 'minor-arcana-heavy — practical everyday matters dominant' : 'balanced'})
Reversed: ${reversedCount} of 10 (${reversedCount >= 5 ? 'high reversal — inner friction, blocked flow, or resistance at work' : reversedCount === 0 ? 'all upright — direct, surface-level energies' : 'mixed polarity'})
Dominant element: ${dominantElement ?? 'no clear dominant — elemental balance or fragmentation'}
${hasFoolOrWorld ? 'The Fool or The World is present — beginning or completion framing shapes this entire reading.' : ''}

## This Person's Living Sky
Sun in ${natalSunSign}, Moon in ${natalMoonSign}, Ascendant in ${natalAscSign}
${natalMoonPhase ? `Natal Moon Phase: ${natalMoonPhase}` : ''}
Life Path: ${authorizedLifePath}
Personal Year: ${authorizedPersonalYear}, Personal Day: ${authorizedPersonalDay}
Current Moon: ${payload.moonPhaseName} in ${currentMoonSign}
${payload.advanceCategory ? `Advance signal: ${payload.advanceCategory} — ${payload.advanceReason ?? ''}` : ''}

## Daily Transit Context
${dailyTransitSummary ?? 'No daily transit summary available.'}

## Weekly Transit Context
${weeklyTransitSummary ?? 'No weekly transit summary available.'}

## Structure Your Synthesis in These Named Sections

**The Constellation**
Open with one paragraph that reads all ten cards together as a single symbolic field — not position by position, but as a complete pattern: what this spread, taken as a whole, reveals about where this person stands in the arc of their life. This paragraph is the most important in the entire reading.

**The Central Cross**
The immediate reality (position 1) and what opposes or crosses it (position 2). What tension is named here?

**The Roots and the Horizon**
Positions 3, 4, 5, 6: unconscious influence, recent past, conscious goal, near future. What does the sequence from below and behind reveal about the direction ahead?

**The Inner World**
Inner state (position 7) vs. external environment (position 8): what does this person carry that others cannot see? Where does the inner and outer world diverge or align?

**Hopes, Fears, and Outcome**
Position 9 (hopes/fears are one card — it names both) and position 10 (outcome). What is this person secretly hoping for or afraid of — and what is actually taking shape?

**Psychological Dynamics**
The dominant psychological pattern this ten-card constellation reveals — a single named quality or dynamic that runs through the entire reading like a thread.

**Astrology Resonance**
Where do the natal chart, daily transits, and weekly transits echo the spread's symbolic themes? Be specific — name the sign or transit that directly amplifies a card's meaning. Connect at least one daily transit feature and one weekly transit feature back to specific cards in this spread.

**Practical Integration**
Not prescriptive steps. Invitations: what does this constellation invite this person to move toward, release, or hold differently?

**Reflection Prompts**
Three distinct reflection questions, numbered 1–3. Each must be specific to this person's actual constellation — not generic tarot questions. They should feel like questions only this spread could have generated.

Tone throughout: mystical but grounded, symbolic not deterministic, emotionally intelligent, never fear-inducing. Speak in second person. Do not predict specific outcomes. Do not use the word "fate." Treat the spread as a portrait of energy and possibility — not a verdict.`

  const result = await retryWithBackoff(() =>
    callOpenAI(
      [
        {
          role: 'system',
          content: `You are a master symbolic reader conducting a Celtic Cross Tarot consultation. You read ten cards as a single constellation — not as ten independent interpretations. You are writing a document the person will return to, not a response to a question. You work at the intersection of Tarot, psychology, and astrology. You speak in second person, with depth and precision. You are never generic. You are never fatalistic. You treat the spread as a portrait of this person's present moment in full complexity — shadow and light, surface and depth, past and horizon. Your output has named sections as instructed. Each section is substantive — not filler, not padding. You do not use the word "fate" or predict specific events. You illuminate what is already present and invite the person to engage with it consciously.`,
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
  const result = await retryWithBackoff(() =>
    callOpenAI(
      [
        {
          role: 'system',
          content: `You are a symbolic interpreter and reflective guide continuing a conversation about someone's Tarot reading. You are not a fortune teller. You read Tarot as a language of the psyche — symbolic, not predictive. Use the full reading context below to answer questions with depth, specificity, and personal directness. Reference the actual cards drawn, their positions, and the person's stated intention when relevant. Connect Tarot symbolism to the astrological context when the connection is direct and unmistakable. Stay in the mystical but grounded register — poetic but precise. Never predict outcomes. Never claim certainty. Never induce fear. If asked about a "scary" card (The Tower, Death, Ten of Swords), reframe within the symbolic register without dismissing the person's concern.

${payload.discussContext}`,
        },
        ...payload.messages,
      ],
      { temperature: 0.85, max_tokens: 1500 },
    ),
  )
  return result || 'Unable to generate a response.'
}
