# Proposal: Tarot GPT Synthesis Integration

**Slug:** `tarot-gpt-synthesis`
**Type:** Feature (bundled with `code-refactor-gpt-service-extraction`, proposal #13)
**Filename:** `feat-tarot-gpt-synthesis.md`
**Originated by:** Carmack, Taleb, Jobs
**Status:** Active
**Sprint:** 0023

---

## User Guidance (from guidelines.md)

The guidelines establish two governing principles that directly shape this proposal:

**AI Synthesis Layer:**
> "After the instant interpretation loads, GPT generates deeper synthesis. The AI layer should: understand combinations of cards, understand symbolic themes, connect tarot to astrology/transits, create emotional coherence, generate reflection prompts, offer practical integration. Tone: mystical but grounded, deep but understandable, symbolic rather than deterministic, emotionally intelligent, never fear-inducing. The system should avoid: fatalism, certainty about events, predicting death/disaster, manipulative spirituality."

**Discuss ✦:**
> "Every Tarot reading surface should support Discuss ✦ exactly like the other app modules. The AI chat receives full contextual loading of: Tarot cards, spread positions, upright/reversed states, full tarot interpretation, natal chart, current transits, numerology cycles, current energetic/timing signals, reading topic/question. The AI should behave like a symbolic interpreter and reflective guide — not a fortune teller."

These are not aspirational guidelines. They are implementation constraints. Every prompt written in this proposal must satisfy both the tone spec and the context-loading spec as literal requirements, not suggestions.

---

## Problem / Opportunity

The Tarot module delivers an AI-free instant interpretation layer that works immediately for every card draw. That layer is reliable, fast, and offline-resilient — and it is the floor, not the ceiling. The ceiling is GPT synthesis: the layer that understands card combinations as a constellation, connects the symbolic output to the user's actual sky, and generates the kind of depth that makes a user return to their saved reading three days later to re-read it.

No GPT integration for Tarot exists in the codebase today. The `handleGptRequest` switch in `server/services/gpt.ts` has 15 dispatch cases covering transits, synastry, solar return, dream interpretation, journal annotation, and discuss — none of them Tarot-aware. The four Tarot synthesis types (`tarot-single-synthesis`, `tarot-three-synthesis`, `tarot-celtic-synthesis`, `tarot-discuss`) must be added, and they must be added with the same engineering discipline as the existing cases: server-side natal reconstruction from `resolveUserBirthContext`, explicit `max_tokens` per handler, explicit `temperature`, `AbortController` timeout parity, and graceful degradation on failure.

The opportunity beyond "adding four cases" is structural. `server/services/gpt.ts` is already 1,019 lines with 15 dispatch cases. Adding 4 Tarot cases inline makes it 19 cases in a monolith where a bug introduced at line 400 may not surface until a developer reads line 1,200. This proposal bundles the structural extraction (proposal #13, `code-refactor-gpt-service-extraction`) with the Tarot integration work, so both land in the same PR and the switch statement never reaches 19 inline cases. The refactor is estimated at 30 minutes; the debugging session it prevents is estimated at 3 hours.

---

## Vision

GPT enriches the Tarot reading with genuine depth, emotional coherence, and personal synthesis that the AI-free layer cannot produce alone. The single-card synthesis makes one card feel personally addressed to this person at this moment in their life. The three-card synthesis treats three cards as a single sentence the universe is speaking — a constellation, not three independent clauses. The Celtic Cross synthesis functions as a full symbolic portrait, a document the user will want to keep.

The Discuss ✦ integration transforms the reading from a monologue into a dialogue: the user can ask what the Three of Swords means in the context of their Scorpio Moon, probe the tension between the Hermit and the Ace of Pentacles in a Past/Present/Future spread, or simply sit with the constellation and ask the AI to say more about one thread. The AI knows the full context — cards, positions, reversals, natal chart, transits, numerology, intention — and responds as a symbolic interpreter and reflective guide, not a chatbot answering tarot trivia.

The quality bar is not "GPT adds text to the screen." The quality bar is: after the reading, the user feels that something genuinely understood them.

---

## Bundled Structural Work: gptTarot.ts Extraction (Proposal #13)

Before a single Tarot handler is written, the extraction must be planned. The four new handlers will live in `server/services/gptTarot.ts` and be imported into the `handleGptRequest` switch in `server/services/gpt.ts`. This is not optional architecture — it is the architecture required to keep `gpt.ts` maintainable.

The extraction pattern:

```typescript
// server/services/gptTarot.ts — new file
// Exports four handler functions, all typed and documented.
// Imports resolveUserBirthContext, callOpenAI, retryWithBackoff, GptServiceError from gpt.ts (re-exported).
// No behavior change from the switch perspective.

export async function handleTarotSingleSynthesis(
  payload: TarotSingleSynthesisPayload,
  userId?: number,
): Promise<string> { ... }

export async function handleTarotThreeSynthesis(
  payload: TarotThreeSynthesisPayload,
  userId?: number,
): Promise<string> { ... }

export async function handleTarotCelticSynthesis(
  payload: TarotCelticSynthesisPayload,
  userId?: number,
): Promise<string> { ... }

export async function handleTarotDiscuss(
  payload: TarotDiscussPayload,
): Promise<string> { ... }
```

```typescript
// server/services/gpt.ts — the switch gains four new cases, each delegating to gptTarot.ts
import {
  handleTarotSingleSynthesis,
  handleTarotThreeSynthesis,
  handleTarotCelticSynthesis,
  handleTarotDiscuss,
} from './gptTarot.js'

// Inside handleGptRequest switch:
case 'tarot-single-synthesis':
  return handleTarotSingleSynthesis(payload as TarotSingleSynthesisPayload, userId)
case 'tarot-three-synthesis':
  return handleTarotThreeSynthesis(payload as TarotThreeSynthesisPayload, userId)
case 'tarot-celtic-synthesis':
  return handleTarotCelticSynthesis(payload as TarotCelticSynthesisPayload, userId)
case 'tarot-discuss':
  return handleTarotDiscuss(payload as TarotDiscussPayload)
```

The switch in `gpt.ts` never sees the handler bodies — only the case delegation lines. `gptTarot.ts` is a standalone module that can be read, tested, and debugged in isolation.

### Internal utilities gptTarot.ts requires from gpt.ts

`gptTarot.ts` needs access to three non-exported utilities from `gpt.ts`: `resolveUserBirthContext`, `callOpenAI`, and `retryWithBackoff`. These must be exported (or re-exported) from `gpt.ts` as part of this PR. Since they are internal utilities with no route-level exposure, making them named exports does not change the external API.

```typescript
// server/services/gpt.ts — add export keywords to existing declarations
export function resolveUserBirthContext(userId: number): BirthContext | null { ... }
export async function callOpenAI(...): Promise<string> { ... }
export async function retryWithBackoff<T>(...): Promise<T> { ... }
export class GptServiceError extends Error { ... }
export interface BirthContext { ... }
```

---

## Specifications

### 1. New file: `server/services/gptTarot.ts`

**File responsibility:** All four Tarot GPT handler functions. No other responsibilities.

**Imports at top of file:**

```typescript
import {
  callOpenAI,
  retryWithBackoff,
  resolveUserBirthContext,
  GptServiceError,
  type BirthContext,
} from './gpt.js'
import {
  calculateChart,
  getMoonInfo,
  getActiveTransitAspects,
} from '../engine/chartEngine.js'
import {
  calculatePersonalDay,
  calculatePersonalYear,
  calculateLifePath,
} from '../engine/numerologyEngine.js'
import {
  calculateCurrentPositions,
  calculateTransitAspects,
} from '../engine/transitEngine.js'
```

---

### 2. Shared type definitions (top of gptTarot.ts)

These types are the contracts between the client-side payload builders and the server-side handlers. They must be defined in `gptTarot.ts` and imported where needed on the client side.

```typescript
// A single drawn card as the client prepares it for GPT payload
export interface TarotCardPayload {
  id: string            // 'the-hermit', 'three-of-swords', etc.
  name: string
  arcana: 'major' | 'minor'
  suit?: string
  number: number
  element: string | null
  reversed: boolean
  // AI-free interpretation output — serialized for GPT context
  coreMeaning: string
  symbolicTheme: string
  emotionalMeaning: string
  practicalGuidance: string
  reflectionQuestion: string
  numerologyResonance: string
  // Astro connection from computeInstantInterpretation
  astroHeadline: string       // max 20 words — the "In Your Sky Now" sentence
  transitInfluence: string    // from TRANSIT_ADAPTATIONS or fallback
  lunarPhaseNote: string | null
}

// Spread position for three-card and Celtic Cross
export interface SpreadPositionPayload {
  index: number
  label: string       // 'Past', 'Present', 'Challenge', etc.
  meaning: string     // the spread-position meaning text
}

// Pre-computed structural signals for three-card synthesis
export interface ThreeCardSignals {
  dominantArcana: 'major-heavy' | 'minor-heavy' | 'balanced'
  majorArcanaCount: number
  elementDistribution: Record<string, number>  // { Fire: 2, Water: 1 }
  polarityCount: { upright: number; reversed: number }
  hasFoolOrWorld: boolean        // Major Arcana 0 or 21 present
  dominantSuit: string | null    // if all three minor and same suit
  numeralProgression: string | null // e.g. '3-4-5' if sequential
}

// Payload for tarot-single-synthesis
export interface TarotSingleSynthesisPayload {
  card: TarotCardPayload
  position: SpreadPositionPayload | null   // null for open/daily draws
  userIntention: string | null
  // Client-provided astro context (displayed in UI) — server reconstructs natal authoritatively
  natalSunSign: string
  natalMoonSign: string
  natalAscSign: string
  personalDay: number
  personalYear: number
  advanceCategory: string | null
  advanceReason: string | null
  moonPhaseName: string
  moonSign: string
  spreadMode: string | null     // 'Today\'s Energy', 'Career', 'Decision', etc.
  localDate: string             // YYYY-MM-DD for server date resolution
}

// Payload for tarot-three-synthesis
export interface TarotThreeSynthesisPayload {
  cards: [TarotCardPayload, TarotCardPayload, TarotCardPayload]
  positions: [SpreadPositionPayload, SpreadPositionPayload, SpreadPositionPayload]
  spreadMode: string            // 'Past/Present/Future', 'Situation/Challenge/Advice', etc.
  signals: ThreeCardSignals
  userIntention: string | null
  // Astro context
  natalSunSign: string
  natalMoonSign: string
  natalAscSign: string
  personalDay: number
  advanceCategory: string | null
  moonPhaseName: string
  moonSign: string
  localDate: string
}

// Payload for tarot-celtic-synthesis
export interface TarotCelticSynthesisPayload {
  cards: TarotCardPayload[]     // exactly 10, indexed 0–9
  positions: SpreadPositionPayload[]   // exactly 10
  userIntention: string | null
  // Astro context
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

// Payload for tarot-discuss
// NOTE: the client pre-serializes the full context into a single string.
// Do NOT send raw nested objects — this is the token-budget discipline Taleb specified.
export interface TarotDiscussPayload {
  discussContext: string        // pre-serialized, user intention at TOP
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}
```

---

### 3. Handler: `tarot-single-synthesis`

**Request type string:** `'tarot-single-synthesis'`

**Purpose:** Generate a focused, personal AI synthesis for a single drawn card. This is the daily reading surface — the synthesis must feel directly addressed to the person, not a card description with the user's name inserted.

**Input payload shape:** `TarotSingleSynthesisPayload` (defined above)

**Server-side natal reconstruction:**
The handler calls `resolveUserBirthContext(userId)` and, if successful, recomputes `personalDay` server-side (same pattern as `handleTodaySynthesis`). If userId is absent or birth context unavailable, falls back to client-provided values with no error.

```typescript
async function handleTarotSingleSynthesis(
  payload: TarotSingleSynthesisPayload,
  userId?: number,
): Promise<string> {
  // Server-side natal reconstruction
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
```

**max_tokens:** 400 — This is a focused single-card reading. Three to four sentences is the target output. 400 tokens is generous for that range and prevents runaway responses that undermine the "fast and reliable" promise of the single-card surface.

**temperature:** 0.85 — Slightly warmer than the transit handlers (0.8) to allow the symbolic register to feel evocative without becoming incoherent.

---

### 4. Handler: `tarot-three-synthesis`

**Request type string:** `'tarot-three-synthesis'`

**Purpose:** Generate a full constellation synthesis for a three-card spread. This is the primary medium-depth reading. The synthesis must open with a single sentence that names all three cards together before any expansion — GPT defaults to list-format preamble without this explicit instruction, and that default must be overridden by the prompt structure.

**Input payload shape:** `TarotThreeSynthesisPayload` (defined above)

**Card serialization order by spread mode:** The order in which cards are presented to GPT matters for narrative coherence. The implementation must serialize cards in spread-appropriate order:
- `Past/Present/Future`: Past → Present → Future (temporal order)
- `Situation/Challenge/Advice`: Situation → Challenge → Advice (premise → tension → resolution)
- `Mind/Heart/Action`: Mind → Heart → Action (cognitive → emotional → behavioral)
- `Self/Other/Bridge`: Self → Other → Bridge (internal → external → synthesis)
- `Theme/Shadow/Gift`: Theme → Shadow → Gift (surface → depth → integration)

This ordering is computed by the client before constructing the payload — the `cards` and `positions` arrays are already in spread-appropriate order when they arrive at the handler.

**Server-side natal reconstruction:** Same pattern as single synthesis — `resolveUserBirthContext`, recompute `personalDay` if userId available.

```typescript
async function handleTarotThreeSynthesis(
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
    return `
${pos.label}: ${card.name}${reversalText}
  Position meaning: ${pos.meaning}
  Core meaning: ${card.coreMeaning}
  Symbolic theme: ${card.symbolicTheme}
  Emotional: ${card.emotionalMeaning}
  Practical: ${card.practicalGuidance}
  Astro connection: ${card.astroHeadline}${card.transitInfluence ? ` — ${card.transitInfluence}` : ''}`.trim()
  }).join('\n\n')

  const intentionLine = payload.userIntention
    ? `The person drew this spread seeking clarity on: "${payload.userIntention}"`
    : 'Open reading — no specific intention stated.'

  // Build signal description for GPT
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
```

**max_tokens:** 800 — Three to five paragraphs plus opening sentence and closing reflection question. 800 tokens is the correct budget for this depth without padding.

**temperature:** 0.85 — Same as single synthesis. The three-card reading requires the same warmth and symbolic register.

**Critical prompt constraint:** The explicit instruction to open with ONE sentence naming all three cards is non-negotiable. Without this instruction (and the attached example of what the sentence should look like), GPT defaults to: "In this Past/Present/Future spread, we see three cards that work together to..." — exactly the list-format preamble the spec explicitly rejects. The example sentence anchors the model's register.

---

### 5. Handler: `tarot-celtic-synthesis`

**Request type string:** `'tarot-celtic-synthesis'`

**Purpose:** Generate a full symbolic portrait from the Celtic Cross 10-position spread. This is a categorically different output from the three-card synthesis: it is slower to generate, longer to read, structured in named sections, and treated by the user as a document they will revisit. The GPT synthesis request fires at card 7 (the "fire early, display late" pattern), so synthesis is ready when the user reaches the final screen after card 10.

**Input payload shape:** `TarotCelticSynthesisPayload` (defined above)

**Server-side natal reconstruction:** Full reconstruction — `resolveUserBirthContext`, recompute `personalDay`, `personalYear`, and `lifePathNumber` when userId is available. The Celtic Cross is the highest-context reading and the server-side reconstruction must be correspondingly thorough.

**Prompt structure:** The prompt instructs GPT to generate output in explicit named sections matching the spec. Each section gets a header. The sections, in order:

1. **The Constellation** — one opening paragraph naming all ten cards as a single symbolic field, before any positional analysis
2. **The Central Cross** (positions 1–2: Present Situation + Challenge) — the immediate reality and what stands against it
3. **The Roots and the Horizon** (positions 3, 4, 5, 6: Unconscious Influence, Recent Past, Conscious Goal, Near Future) — the history and trajectory
4. **The Inner World** (positions 7–8: Inner State, External Environment) — the divide between what is felt and what is visible to others
5. **Hopes, Fears, and Outcome** (positions 9–10) — the full arc from what is secretly hoped for or feared to what is taking shape
6. **Psychological Dynamics** — the dominant psychological pattern this spread reveals
7. **Astrology Resonance** — where the natal chart and current transits echo the spread's symbolic themes
8. **Practical Integration** — not prescriptive action steps, but invitations toward movement
9. **Reflection Prompts** — three distinct reflection questions, numbered, specific to this person's constellation

```typescript
async function handleTarotCelticSynthesis(
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

  // Serialize all 10 cards with their positions for the prompt
  const cardLines = cards.slice(0, 10).map((card, i) => {
    const pos = positions[i]
    const reversalText = card.reversed ? ' (reversed)' : ' (upright)'
    return `${i + 1}. ${pos.label} — ${card.name}${reversalText}
   ${card.symbolicTheme}. ${card.coreMeaning}
   Sky connection: ${card.astroHeadline}`
  }).join('\n\n')

  // Compute structural signals for Celtic Cross
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
```

**max_tokens:** 3000 — Nine named sections of substantive content. 3000 tokens is the correct budget for this reading type. The Celtic Cross synthesis is a document, not a paragraph. At 3000 tokens the output will be approximately 2,200–2,400 words — appropriate for a 10-card reading that the user will read over 5–10 minutes.

**temperature:** 0.85 — Same register as single and three-card synthesis.

**Fire-early pattern:** The client fires the `tarot-celtic-synthesis` request when the user reveals card 7 (the spread is committed at this point — no cards can be taken back, and cards 8–10 are predestined by the draw seed). By the time the user has been through cards 8, 9, and 10 (each with their own reveal and instant interpretation moment), the synthesis is ready. The server does not return it early — the client holds it and displays it only after the "The cards are now being read as a constellation" transition.

---

### 6. Handler: `tarot-discuss`

**Request type string:** `'tarot-discuss'`

**Purpose:** Enable conversational exploration of any Tarot reading through the Discuss ✦ interface. This handler mirrors the existing `astro-discuss` and `numerology-discuss` patterns exactly — a pre-serialized context string plus a message array. The critical Tarot-specific distinction is that the client places the user's stated intention at the very top of the `discussContext` string, before the card list. This changes the quality of AI responses: it is the difference between a symbolic interpreter working in a dark room and one working with a question in hand.

**Input payload shape:** `TarotDiscussPayload` (defined above)

**Client-side context serialization (in `src/services/gptInterpretation.ts`):**
The `discussContext` string is built by `buildTarotDiscussContext()` on the client. The structure, in order:

```
READING INTENTION: [user intention, or "Open reading — no specific question"]

CARDS DRAWN ([spreadType]):
1. [Position Label]: [Card Name] ([upright/reversed]) — [symbolicTheme]. [coreMeaning]. Sky: [astroHeadline].
2. ...
[up to 10 entries]

GPT SYNTHESIS (if loaded):
[full synthesis text, or "Synthesis not yet loaded."]

NATAL CHART:
Sun in [sign], Moon in [sign], Ascendant in [sign]
Life Path: [n], Personal Year: [n], Personal Day: [n]

CURRENT SKY:
[moonPhaseName] Moon in [moonSign]. [advanceCategory if present]. [top 2 transit aspects].

READING TYPE: [single-card | three-card | celtic-cross]
SPREAD MODE: [if applicable]
```

The intention line is first. GPT reads context strings top-down; placing intention first means every response is framed around the user's actual question. This is not a UI decision — it is a prompt engineering decision.

**Token budget control:** For a Celtic Cross reading with full synthesis, the `discussContext` string will reach 3,000–4,000 tokens. This is within the model's context window for `gpt-4o-mini` (128k tokens) but represents a significant per-call cost. The client builds the context once when the Discuss modal opens and does not rebuild it on subsequent turns — the message array grows, but the system prompt context is fixed.

```typescript
async function handleTarotDiscuss(
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
```

**max_tokens:** 1500 — Discuss responses must be substantive enough to advance the conversation (more than a paragraph) but not so long they feel like another synthesis. 1500 tokens allows 3–5 paragraphs of direct, specific response.

**temperature:** 0.85 — Matches all other Tarot handlers.

---

### 7. Client-side functions in `src/services/gptInterpretation.ts`

Four new exported async functions, following the established pattern of `callProxy` → error handling → typed return:

```typescript
// Tarot synthesis functions
export async function getTarotSingleSynthesis(
  payload: TarotSingleSynthesisPayload,
): Promise<string> {
  try {
    const result = await callProxy('tarot-single-synthesis', payload)
    return (result as string) || 'Unable to generate synthesis.'
  } catch (err) {
    if (err instanceof RateLimitError) throw err
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}

export async function getTarotThreeSynthesis(
  payload: TarotThreeSynthesisPayload,
): Promise<string> {
  try {
    const result = await callProxy('tarot-three-synthesis', payload)
    return (result as string) || 'Unable to generate synthesis.'
  } catch (err) {
    if (err instanceof RateLimitError) throw err
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}

export async function getTarotCelticSynthesis(
  payload: TarotCelticSynthesisPayload,
): Promise<string> {
  try {
    const result = await callProxy('tarot-celtic-synthesis', payload)
    return (result as string) || 'Unable to generate synthesis.'
  } catch (err) {
    if (err instanceof RateLimitError) throw err
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}

export async function getTarotDiscussResponse(
  discussContext: string,
  messages: ChatMessage[],
): Promise<string> {
  try {
    const result = await callProxy('tarot-discuss', { discussContext, messages })
    return (result as string) || 'Unable to generate a response.'
  } catch (err) {
    return err instanceof Error ? err.message : GPT_SERVER_ERROR
  }
}

// Context builder — called once when Discuss modal opens
export function buildTarotDiscussContext(
  readingType: 'single-card' | 'three-card' | 'celtic-cross',
  spreadMode: string | null,
  cards: TarotCardPayload[],
  positions: SpreadPositionPayload[],
  synthesis: string | null,
  natal: { sunSign: string; moonSign: string; ascSign: string; lifePathNumber: number; personalYear: number; personalDay: number },
  sky: { moonPhaseName: string; moonSign: string; advanceCategory: string | null; topTransits: string[] },
  userIntention: string | null,
): string {
  const intentionLine = userIntention
    ? `READING INTENTION: "${userIntention}"`
    : 'READING INTENTION: Open reading — no specific question'

  const cardLines = cards.slice(0, 10).map((card, i) => {
    const pos = positions[i]
    const rev = card.reversed ? 'reversed' : 'upright'
    return `${i + 1}. ${pos.label}: ${card.name} (${rev}) — ${card.symbolicTheme}. ${card.coreMeaning}. Sky: ${card.astroHeadline}`
  }).join('\n')

  const synthesisSection = synthesis
    ? `GPT SYNTHESIS:\n${synthesis}`
    : 'GPT SYNTHESIS: Not yet loaded.'

  const transitsLine = sky.topTransits.length > 0
    ? sky.topTransits.slice(0, 2).join('; ')
    : 'No tight transit aspects.'

  const advanceLine = sky.advanceCategory ? ` ${sky.advanceCategory} period.` : ''

  return [
    intentionLine,
    '',
    `CARDS DRAWN (${spreadMode ?? readingType.toUpperCase()}):`,
    cardLines,
    '',
    synthesisSection,
    '',
    'NATAL CHART:',
    `Sun in ${natal.sunSign}, Moon in ${natal.moonSign}, Ascendant in ${natal.ascSign}`,
    `Life Path: ${natal.lifePathNumber}, Personal Year: ${natal.personalYear}, Personal Day: ${natal.personalDay}`,
    '',
    'CURRENT SKY:',
    `${sky.moonPhaseName} Moon in ${sky.moonSign}.${advanceLine} ${transitsLine}`,
    '',
    `READING TYPE: ${readingType}`,
    spreadMode ? `SPREAD MODE: ${spreadMode}` : '',
  ].filter(line => line !== undefined).join('\n').trim()
}
```

**Note on type imports:** `TarotSingleSynthesisPayload`, `TarotThreeSynthesisPayload`, `TarotCelticSynthesisPayload`, and `TarotCardPayload` are defined in `server/services/gptTarot.ts` (server-side). The client needs mirrored type definitions. The canonical approach is to define these shared types in a `src/types/tarot.ts` file that both the client and server import. The server handler file imports from that shared path; the client `gptInterpretation.ts` imports the same. This prevents type drift between client payload construction and server payload consumption.

---

### 8. Tone guidelines embedded in all prompts

All four handlers embed the following constraints via the system prompt. These are not soft preferences — they are guardrails:

- **"Symbolic not deterministic"**: GPT must not say "this card means X will happen." It says "this card speaks to the energy of X."
- **"Never fear-inducing"**: The Tower, Death, Ten of Swords — all must be reframed within the symbolic register. The Tower is not a disaster; it is the moment the false structure gives way so the true one can stand.
- **"Not a fortune teller"**: The AI does not predict outcomes. It illuminates patterns already present in the psyche and the sky.
- **"Mystical but grounded"**: Poetic precision, not spiritual performance. The difference is specificity: a mystical reading names the actual card, the actual natal placement, the actual transit. A performance uses evocative words without referencing the data.

These constraints appear in both the system prompt (governing the AI's persona for the session) and the user prompt (as explicit closing instructions). Double-embedding is intentional — GPT is more likely to respect constraints stated in both locations.

---

### 9. Cache strategy for synthesis results

Synthesis results are expensive to generate (latency, cost, quota) and deterministic for a fixed input set. The client caches synthesis output in the component that owns the reading state (the `TarotContext`) for the duration of the session. No synthesis result is re-fetched on re-render.

The server does not cache synthesis results. Server-side caching of GPT outputs introduces stale-content risk and adds infrastructure complexity that is not warranted at current scale.

On session end (user navigates away, closes app), the synthesis is lost unless the reading is saved. When the reading is saved (`readings` table in `server/db.ts`), the full interpretation payload (including synthesis) is stored in the `full_interpretation_payload TEXT` column as a tagged union `{ version: 1, payload: { synthesis: string, ... } }`. When the user revisits a saved reading, the synthesis is loaded from the stored payload and not re-fetched from GPT.

**Synthesis state machine in `TarotSynthesisPanel.tsx`:**

Four explicit states, as specified by Taleb:

| State | What the UI shows |
|---|---|
| `idle` | Nothing (before GPT request fires) |
| `loading` | Skeleton with considered copy: "Reading the constellation..." (single), "Reading the cards as a whole." (three), "The full sky is being read." (celtic) |
| `success` | Synthesis text, rendered with section parsing for Celtic Cross |
| `gpt-unavailable` | "The synthesis is resting. The instant interpretation above is complete." + retry button |
| `rate-limited` | Opens `UpgradeModal` — caught via `instanceof RateLimitError` check |

The `gpt-unavailable` state is triggered by any error that is not a `RateLimitError`: GPT_SERVER_ERROR, GPT_TIMEOUT, GPT_OFFLINE. The instant interpretation (AI-free layer) is never hidden in the error state — it remains fully visible. The synthesis section simply collapses to the error state message. A reading that works without AI is a feature, not a consolation prize.

---

### 10. Error handling and AbortController timeout

All four handlers use `retryWithBackoff` (3 attempts, exponential backoff starting at 1 second). The `callOpenAI` function already implements:

- `AbortController` with `SERVER_OPENAI_TIMEOUT_MS - 2000` (28 seconds) — fires 2 seconds before the client-side 30-second timeout
- `OpenAI.APIConnectionTimeoutError` rethrow (not wrapped in `GptServiceError`) so retry does not loop on timeouts
- `GptServiceError` for 4xx/5xx OpenAI API errors, with retryable set `{429, 503, 504}`

The client-side `callProxy` in `gptInterpretation.ts` wraps the fetch in its own `AbortController` at `GPT_REQUEST_TIMEOUT_MS = 30_000`. On abort, it throws `GPT_TIMEOUT` which the calling synthesis function maps to the `gpt-unavailable` state in `TarotSynthesisPanel.tsx`.

No new timeout infrastructure is needed. The existing pattern covers Tarot synthesis without modification.

The Celtic Cross synthesis (max_tokens: 3000) may take longer than simpler handlers. At observed `gpt-4o-mini` generation rates (~80 tokens/second), 3000 tokens takes approximately 37 seconds. This may approach the 30-second client timeout for worst-case response times. The "fire early at card 7" pattern gives the server a head start — by the time the user has seen cards 8, 9, and 10 (approximately 60–90 additional seconds of interaction), the synthesis will have arrived. The 30-second client timeout is reset from the point the client actually initiates the fetch, which happens at card 7, not when synthesis is displayed.

If the synthesis has not arrived by the time the user reaches the synthesis screen, `TarotSynthesisPanel` shows the loading skeleton. If the AbortError fires before the synthesis screen is reached, it transitions to `gpt-unavailable` with the retry button.

---

### 11. `request_type` logging to `gpt_usage`

The existing `gptRateLimit.ts` middleware records usage in the `gpt_usage` table. The current schema does not distinguish between request types — all calls increment the same counter regardless of whether the call was a `daily-snapshot` (300 tokens, fast) or a `tarot-celtic-synthesis` (3000 tokens, slow).

The `gpt_usage` table must gain a `request_type TEXT` column at the time the Tarot handlers ship. This column is added via the existing additive migration pattern (`ALTER TABLE gpt_usage ADD COLUMN IF NOT EXISTS request_type TEXT DEFAULT NULL`). The middleware must be updated to record the `type` from the request body into this column.

The column is not used for quota enforcement in this sprint — enforcement stays on the daily count. But the `request_type` column enables future quota scoping (Celtic Cross counts double, daily card counts half) without a schema migration. Adding it now costs 30 minutes; retrofitting it later requires a migration and a data gap in historical usage.

```typescript
// server/middleware/gptRateLimit.ts — add request_type logging
db.prepare(`
  INSERT INTO gpt_usage (user_id, date, count, request_type)
  VALUES (?, ?, 1, ?)
  ON CONFLICT (user_id, date)
  DO UPDATE SET count = count + 1, request_type = excluded.request_type
`).run(userId, today, requestType)
```

Note: the `ON CONFLICT` clause is simplified here for illustration — the actual upsert must update `count` but not overwrite `request_type` with each increment (since a user makes multiple calls of different types in a day). The correct behavior is: on conflict, increment `count` and do not touch `request_type` (which records the first call of the day). Alternatively, store the `request_type` of the current call as a separate log entry rather than a single row per user-day — but that requires schema changes beyond this sprint's scope. For v1: record the type of the first call of the day in the existing single-row-per-user-day schema.

---

## Out of Scope

The following are explicitly excluded from this proposal:

- **UI components**: `TarotSynthesisPanel.tsx`, `TarotDiscussModal.tsx`, and their state management. This proposal specifies the server-side handlers and the client-side service functions. The UI components are specified in proposals #5, #6, and #7 (single-card UI, three-card UI, Celtic Cross UI).
- **Subscription gate logic**: The `gptRateLimit` middleware extension for Tarot-specific limits is specified in proposal #11. The rate limiter TEST MODE fix is specified in proposal #12. Both must ship before or alongside this proposal's work, but are not implemented here.
- **Tarot-specific rate limit counters**: The `tarot_usage` table specified by Taleb is proposal #11's domain.
- **Saved readings storage**: The `readings` DB table and `server/routes/readings.ts` are proposal #10's domain.
- **GPT streaming for Celtic Cross synthesis**: See Open Questions section.
- **`src/data/tarot/` card data**: Proposal #1.
- **`src/engine/tarot.ts`**: Proposal #2.
- **`ThreeCardSignals` computation**: The `computeThreeCardSynthesis` function that generates the `ThreeCardSignals` object lives in `src/engine/tarot.ts` (proposal #2). This proposal specifies the shape it must produce and how the synthesis handler consumes it.

---

## Open Questions

**1. Whether to use streaming for Celtic Cross synthesis**

`gpt-4o-mini` supports streaming responses via the OpenAI streaming API. For Celtic Cross synthesis at max_tokens: 3000 and observed generation latency of 35–40 seconds, streaming would let the user begin reading the synthesis while it is still being generated — the sections would appear progressively, like paragraphs loading one at a time.

Arguments for streaming:
- Reduces perceived wait time dramatically for the longest synthesis type
- The section-based structure of the Celtic Cross output maps naturally to streamed display (each section header signals a new displayable unit)
- The existing 30-second client timeout is no longer a ceiling concern — the connection remains open and delivers tokens as they arrive

Arguments against streaming:
- Requires changes to the server route (`/api/gpt/interpret` currently uses `res.json({ result })` — streaming requires `res.writeHead(200, { 'Content-Type': 'text/event-stream' })` and a different response model)
- Requires changes to `callProxy` in `gptInterpretation.ts` — currently a simple `fetch` with `response.json()`
- The `gptRateLimit` middleware's `releaseSlot` callback pattern assumes a complete response; streaming complicates when the slot is released
- Sections-based display requires the client to parse incomplete text for section headers — non-trivial

**Recommendation for v1:** Do not stream. The "fire early at card 7" pattern solves the latency problem for the happy path. The synthesis is ready when the user arrives at the synthesis screen. Reserve streaming as a v2 enhancement once the reading surface is proven and stable.

**2. `gpt-4o` vs `gpt-4o-mini` for Celtic Cross synthesis**

The current `callOpenAI` hardcodes `model: 'gpt-4o-mini'`. Celtic Cross synthesis at 3000 tokens and max context complexity is a case where `gpt-4o` would produce meaningfully better output — deeper symbolic connections, more coherent section structure, better handling of 10-card relationship dynamics.

The cost difference is approximately 15× per token. For a low-volume high-touch product, the quality gain may justify the cost for Celtic Cross specifically — but this requires usage volume data to evaluate. For v1, `gpt-4o-mini` across all four handlers is the correct default. A per-handler `model` parameter in `callOpenAI` is a v2 consideration.

**3. Maximum message history for `tarot-discuss`**

The `messages` array in `tarot-discuss` grows with each turn. At 10 turns of conversation, each message averaging 200 tokens, the message history alone is 2,000 tokens — on top of the system prompt (discussContext). The `astro-discuss` handler has the same issue and currently sends the full message history without truncation.

For v1, send the full history (matching existing discuss behavior). Add a message count warning in `TarotDiscussModal.tsx` UI when the conversation exceeds 8 turns, suggesting the user save and start a new conversation if they want to continue. A sliding window truncation strategy (keep the last N messages) is a v2 engineering decision once the token cost structure is understood empirically.

---

## Implementation Order

The work must be done in this sequence to minimize integration risk:

1. Export `resolveUserBirthContext`, `callOpenAI`, `retryWithBackoff`, `GptServiceError`, and `BirthContext` from `server/services/gpt.ts` (5-minute change — add `export` keywords)
2. Create `server/services/gptTarot.ts` with all four handler stubs (returning `'stub'`) and type definitions
3. Add the four switch cases to `handleGptRequest` in `server/services/gpt.ts` delegating to the stubs
4. Implement `handleTarotSingleSynthesis` — easiest handler, validates the pattern end-to-end
5. Add `getTarotSingleSynthesis` to `src/services/gptInterpretation.ts` — wire to the client
6. Test single synthesis against the running server with a real card payload
7. Implement `handleTarotThreeSynthesis` — structural signals require careful prompt validation; test with all five spread modes
8. Add `getTarotThreeSynthesis` to client
9. Implement `handleTarotCelticSynthesis` — validate section structure in output; test with both high-major and high-minor-arcana draws
10. Add `getTarotCelticSynthesis` to client; validate "fire early" timing logic in `CelticCrossReading.tsx`
11. Implement `handleTarotDiscuss` and `buildTarotDiscussContext` — write the context builder, validate token size with a real Celtic Cross payload
12. Add `request_type` column migration to `gptRateLimit.ts`
13. Integration test: single-card → discuss, three-card → discuss, celtic → discuss — each with full context round-trip

---

## Acceptance Criteria

- [ ] `server/services/gptTarot.ts` exists and exports exactly four handler functions
- [ ] `handleGptRequest` in `server/services/gpt.ts` has exactly four new cases, each delegating to `gptTarot.ts` — no handler body code inline in the switch file
- [ ] `tarot-single-synthesis` returns a string, 3–4 sentences, that mentions the card name and a specific natal or sky element — not a generic card description
- [ ] `tarot-three-synthesis` output begins with a single sentence naming all three cards together before any expansion
- [ ] `tarot-celtic-synthesis` output contains all nine named section headers in order
- [ ] `tarot-discuss` uses the `discussContext` string (client-pre-serialized) as the system prompt context, not raw nested objects
- [ ] All four handlers use `retryWithBackoff` and explicit `max_tokens` (not the default 2000)
- [ ] Server-side natal reconstruction runs in `tarot-single-synthesis`, `tarot-three-synthesis`, and `tarot-celtic-synthesis` when `userId` is present — `personalDay` and natal signs come from `resolveUserBirthContext`, not the payload
- [ ] `gpt_usage` table has `request_type TEXT` column after migration
- [ ] `TarotSynthesisPanel.tsx` implements four states: loading, success, gpt-unavailable, rate-limited
- [ ] On GPT failure, the AI-free instant interpretation remains visible — only the synthesis panel transitions to error state
- [ ] `RateLimitError` is caught separately from other errors in client-side synthesis functions and throws (not swallowed) to allow `TarotSynthesisPanel` to open `UpgradeModal`
- [ ] `buildTarotDiscussContext` places user intention as the first line of the context string
- [ ] All four handlers have system prompts that include the tone constraints: symbolic not deterministic, never fear-inducing, not a fortune teller
