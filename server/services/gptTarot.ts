import {
  callOpenAI,
  retryWithBackoff,
  resolveUserBirthContext,
  GptServiceError,
  type BirthContext,
} from './gpt.js'
import { calculateChart } from '../engine/chartEngine.js'
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
  advanceCategory: string | null
  moonPhaseName: string
  moonSign: string
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
  localDate: string
}

export interface TarotDiscussPayload {
  discussContext: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
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

  if (userId) {
    const ctx = resolveUserBirthContext(userId)
    if (ctx) {
      const targetDate = new Date(payload.localDate)
      authorizedPersonalDay = calculatePersonalDay(ctx.birthDate, targetDate)
      const natalChart = calculateChart(ctx.birthDate, ctx.birthTime, ctx.lat, ctx.lng, ctx.tz, ctx.unknownTime)
      natalSunSign = natalChart.planets.find(p => p.name === 'Sun')?.sign ?? payload.natalSunSign
      natalMoonSign = natalChart.planets.find(p => p.name === 'Moon')?.sign ?? payload.natalMoonSign
      natalAscSign = natalChart.angles?.ascendant?.sign ?? payload.natalAscSign
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
Moon: ${payload.moonPhaseName} in ${payload.moonSign}
${payload.advanceCategory ? `Advance signal: ${payload.advanceCategory} — ${payload.advanceReason ?? ''}` : ''}
Astro connection the instant interpretation found: ${card.astroHeadline}
Transit influence on this card: ${card.transitInfluence}
${card.lunarPhaseNote ? `Lunar note: ${card.lunarPhaseNote}` : ''}

Write a 3–4 sentence synthesis that makes this card feel personally addressed to this person at this exact moment. Do not describe the card generically. Start from what the card means in combination with what this person's sky is actually doing. If they stated an intention, address it through the card's symbolic lens without treating the card as an answer to a question. The tone is mystical but grounded — symbolic, never fatalistic, never fear-inducing. End with a single reflection question that emerges from the card-sky combination, not a generic prompt from the card data.`

  const result = await retryWithBackoff(() =>
    callOpenAI(
      [
        {
          role: 'system',
          content: `You are a symbolic interpreter and reflective guide — not a fortune teller. You read Tarot as a language of the psyche, enriched by the living sky. You speak directly to the person in second person. You are personal, specific, and never generic. You do not predict events. You illuminate what is already present. The tone is mystical but grounded: poetic precision, not spiritual performance. You never evoke fear, never claim certainty about outcomes, and never use Tarot to manipulate or destabilize. Every reading ends with possibility, not fate.`,
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.85, max_tokens: 400 },
    ),
  )
  return result || 'Unable to generate synthesis.'
}

export async function handleTarotThreeSynthesis(
  payload: TarotThreeSynthesisPayload,
  userId?: number,
): Promise<string> {
  let authorizedPersonalDay = payload.personalDay
  let natalSunSign = payload.natalSunSign
  let natalMoonSign = payload.natalMoonSign
  let natalAscSign = payload.natalAscSign

  if (userId) {
    const ctx = resolveUserBirthContext(userId)
    if (ctx) {
      const targetDate = new Date(payload.localDate)
      authorizedPersonalDay = calculatePersonalDay(ctx.birthDate, targetDate)
      const natalChart = calculateChart(ctx.birthDate, ctx.birthTime, ctx.lat, ctx.lng, ctx.tz, ctx.unknownTime)
      natalSunSign = natalChart.planets.find(p => p.name === 'Sun')?.sign ?? payload.natalSunSign
      natalMoonSign = natalChart.planets.find(p => p.name === 'Moon')?.sign ?? payload.natalMoonSign
      natalAscSign = natalChart.angles?.ascendant?.sign ?? payload.natalAscSign
    }
  }

  const { cards, positions, signals, spreadMode } = payload

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
${cardLines}

## Pre-Computed Structural Signals (use these as given facts — do not re-derive from card names)
${signalLines.join('\n')}

## This Person's Sky Right Now
Sun in ${natalSunSign}, Moon in ${natalMoonSign}, Ascendant in ${natalAscSign}
Personal Day: ${authorizedPersonalDay}
Moon: ${payload.moonPhaseName} in ${payload.moonSign}
${payload.advanceCategory ? `Advance signal: ${payload.advanceCategory}` : ''}

INSTRUCTION: Begin with exactly ONE sentence that names all three cards together as a single symbolic statement — the constellation they form, not a list. This sentence is the most important line you will write. Example of the kind of sentence this should be (do not copy it — generate one specific to these three cards): "The Hermit, Death, and The Star together trace a journey of deliberate withdrawal, necessary dissolution, and the quiet radiance that emerges when the old structure is finally released."

After that opening sentence, write 3–5 paragraphs covering: the main tension in this spread, what the ${positions[1].label} card reveals about the dynamic between ${positions[0].label} and ${positions[2].label}, the astrological resonance of this constellation, what the structural signals (arcana composition, elements, polarity) amplify or complicate, and a closing practical integration thread. End with one reflection question that could only be asked of this specific person with these specific three cards.

Tone: mystical but grounded, symbolic not deterministic, emotionally intelligent, never fear-inducing. Speak in second person. Do not predict outcomes.`

  const result = await retryWithBackoff(() =>
    callOpenAI(
      [
        {
          role: 'system',
          content: `You are a symbolic interpreter and reflective guide reading a ${spreadMode} Tarot spread as a single constellation — not three independent readings placed side by side. The three cards form a sentence the psyche is speaking to this person right now. Your task is to hear that sentence and speak it back with depth, specificity, and emotional intelligence. You speak in second person. You are mystical but grounded, poetic but never vague. You do not predict events. You illuminate patterns. You never evoke fear, never claim certainty about outcomes. Every constellation has a through-line — your job is to find it and name it.`,
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.85, max_tokens: 800 },
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
Current Moon: ${payload.moonPhaseName} in ${payload.moonSign}
${payload.advanceCategory ? `Advance signal: ${payload.advanceCategory} — ${payload.advanceReason ?? ''}` : ''}

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
Where do the natal chart and current sky echo the spread's symbolic themes? Be specific — name the sign or transit that directly amplifies a card's meaning.

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
