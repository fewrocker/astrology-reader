# Proposal: Tarot Engine

**Slug:** `tarot-engine`
**Type:** Feature
**Filename:** `feat-tarot-engine.md`
**Originated by:** Carmack, Jobs, Taleb, Miyazaki
**Status:** Active

---

## User Guidance

From `aios/guidelines.md` (Tarot Module — Product Spec):

> "Every reading must work instantly without AI. The app should contain built-in interpretations for every tarot card, upright/reversed meanings, every spread position, combined card-position interpretations. This ensures: Fast response, Reliability, Offline resilience, Consistent symbolic foundation. AI enriches the reading afterward rather than generating the entire reading from scratch."

> "The Tarot system should understand: Natal chart identity, Dominant elements/modalities, Current transits, Retrogrades, Lunar phase, Advance scoring signals, Numerology cycles. Tarot meanings should dynamically adapt based on the sky."

> "The synthesis should understand interactions between cards rather than interpreting them independently."

These three mandates define the engine's contract. The engine is the guarantor of the first mandate; the astro context layer is the mechanism for the second; `computeThreeCardSynthesis` is the implementation of the third. All three must be provably correct — not aspirationally described — before GPT is called.

---

## Problem / Opportunity

No tarot computation logic exists anywhere in this codebase. When a card is drawn today, nothing can answer: *What does this card mean for this specific person, under this specific sky, on this specific day?* That question has two failure modes: outsource the entire answer to GPT (slow, unreliable, costly, and produces generic prose that ignores the user's natal identity), or answer it with static card text that pretends the sky doesn't exist (fast but dishonest about the personalization the product promises).

The engine proposed here is the third path: a deterministic, AI-free computation layer that answers every question about a drawn card completely — card meaning, reversal state, spread position, astro connection, transit influence, numerology resonance, lunar phase note — before GPT receives a single token. GPT then enriches a fully-formed interpretation rather than constructing one from nothing.

The opportunity is architectural clarity. Every piece of tarot intelligence that can be computed without a network call must live in `src/engine/tarot.ts`. The GPT layer then has a precise job: narrative synthesis over a structured input, not discovery of structure from raw card names. This distinction changes GPT output quality dramatically. It also means that when GPT is unavailable, the user still has a complete, meaningful reading — not a spinner and an apology.

---

## Vision

The engine is the invisible brain that makes readings feel magical and personal. A user draws The Tower during a Uranus transit to their natal Sun, on the day before a Full Moon, on a personal day of 16 (the Tower's own number). None of this coincidence is left for GPT to notice. The engine notices it first, computes it deterministically, and surfaces it as a structured fact. GPT receives that fact and writes prose about it. The user reads prose that feels uncannily personal because it *is* uncannily personal — the data was true before a word of synthesis was written.

The engine is also the reliability guarantee. A user with no network connection, a rate-limited user, a user whose GPT call times out after a 10-card Celtic Cross reveal — all of them receive a complete reading from the engine layer. The synthesis panel may show "Synthesis resting. The interpretation above is complete." But the interpretation above *is* complete. That is what this engine must ensure.

---

## Specifications

### 1. Module Location and Exports

**File:** `src/engine/tarot.ts`

This file is the single engine module for all AI-free tarot computation. It exports the following named functions and types. Nothing else. No default export.

```typescript
// Functions
export function drawCards(spreadType: SpreadType, seed: string): TarotCard[]
export function assignReversals(cards: TarotCard[], seed: string): boolean[]
export function buildTarotAstroContext(
  natalChart: ChartData,
  transits: TransitData | null,
  numerologyDay: number,
  advanceScore: SnapshotScore | null,
): TarotAstroContext
export function computeInstantInterpretation(
  card: TarotCard,
  reversed: boolean,
  position: SpreadPosition | null,
  astroContext: TarotAstroContext,
): InstantInterpretation
export function computeThreeCardSynthesis(
  cards: DrawnCard[],
  positions: SpreadPosition[],
  astroContext: TarotAstroContext,
): ThreeCardSynthesisInput

// Types
export type { TarotAstroContext, InstantInterpretation, ThreeCardSynthesisInput, DrawnCard }
```

The engine imports from:
- `../data/tarot/cards` — the 78-card dataset (`TarotCard[]`)
- `../data/tarot/transitAdaptations` — the `TRANSIT_ADAPTATIONS` lookup table
- `../data/tarot/astroConnections` — the `ASTRO_CONNECTIONS` element/planet static mappings
- `../data/tarot/spreadPositions` — the `SPREAD_POSITIONS` record
- `./types` — `ChartData`, `Element`, `PlanetName`
- `./transits` — `TransitData`, `TransitAspect`
- `./advanceScoring` — `SnapshotScore`

The engine does **not** import from any React context, any server module, or any GPT service. It is a pure computation module — no side effects, no async functions, no network calls.

---

### 2. `drawCards(spreadType, seed)` — Deterministic Card Selection

**Signature:**
```typescript
export function drawCards(spreadType: SpreadType, seed: string): TarotCard[]
```

**SpreadType:**
```typescript
export type SpreadType =
  | 'single'
  | 'three-past-present-future'
  | 'three-situation-challenge-advice'
  | 'three-mind-heart-action'
  | 'three-self-other-bridge'
  | 'three-theme-shadow-gift'
  | 'celtic-cross'
```

Card counts by spread type: `single` → 1 card; all `three-*` → 3 cards; `celtic-cross` → 10 cards.

**Seed Strategy:**

The seed string is always constructed by the caller, never inside the engine. Two distinct seeding strategies apply:

*Daily single-card draws:* The caller constructs the seed as:
```
SHA-256(userId + ":" + birthDate + ":" + localDateStr + ":" + spreadType)
```
where `localDateStr` is `YYYY-MM-DD` in the user's wall-clock timezone. This guarantees: the same card is drawn all day (stable), a different card is drawn each day (variable), and two users born on the same date draw different cards (collision-free because `userId` is included). The `birthDate` component makes the sequence feel natal-anchored without being calendar-harmonic. This seed is computed client-side by the component calling the engine. For question-based or multi-card readings that are not daily habits, the caller uses `crypto.randomUUID()` as the seed — truly random, but stored with the reading record so the exact draw can be reproduced.

*Implementation:*

The function uses a seeded linear congruential generator (LCG) initialized from the seed string. The seed string is converted to a numeric seed by summing the char codes of the SHA-256 hex output (or UUID string). The LCG then produces a shuffled index sequence over `[0, 77]` using Fisher-Yates with the LCG as the random source. The first N indices in the shuffled sequence are the drawn cards, where N is the card count for the spread type.

```typescript
function seedToNumber(seed: string): number {
  return seed.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 5381)
}

function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = Math.imul(1664525, s) + 1013904223 >>> 0
    return s / 0x100000000
  }
}
```

The Fisher-Yates shuffle operates on a copy of all 78 card IDs, not on the card objects themselves. The function returns `TarotCard[]` objects looked up by the selected IDs after shuffle.

**Guarantees:** Given the same `spreadType` and `seed`, `drawCards` always returns the identical sequence of cards in the identical order. This is testable and must be tested.

---

### 3. `assignReversals(cards, seed)` — Reversal Determination

**Signature:**
```typescript
export function assignReversals(cards: TarotCard[], seed: string): boolean[]
```

**Returns:** An array of booleans, one per card, where `true` means the card is reversed. Array length equals `cards.length`.

**Probability:** Each card has a 30% probability of being reversed. This is the traditional tarot practice: the minority of cards appear reversed, making a reversed draw meaningful rather than routine.

**Implementation:** A second LCG is initialized from a transformed version of the draw seed — specifically `seedToNumber(seed + ":reversals")` — so reversal determination is independent of draw order but still deterministic for the same inputs. For each card position, if `lcg() < 0.30` the card is reversed.

**Rationale for 30% (not 50%):** A 50% reversal rate makes reversals feel like noise. At 30%, a reversed card is notable — the user notices it. At 20%, reversals become so rare they feel contrived when they appear. 30% is the empirically calibrated sweet spot for symbolic weight without artificially inflating reversals.

**Guarantees:** `assignReversals` is deterministic. The same `cards` array and `seed` always produce the same boolean array. Reversal state is stored alongside the drawn cards in saved readings so historical draws can be reproduced exactly.

---

### 4. `buildTarotAstroContext(natalChart, transits, numerologyDay, advanceScore)` — Context Assembly

**Signature:**
```typescript
export function buildTarotAstroContext(
  natalChart: ChartData,
  transits: TransitData | null,
  numerologyDay: number,
  advanceScore: SnapshotScore | null,
): TarotAstroContext
```

**What it returns — TypeScript shape:**

```typescript
export interface TarotAstroContext {
  // Natal identity signals
  natalSunSign: string
  natalMoonSign: string
  natalAscendantSign: string
  natalDominantElement: Element | null   // computed from planet distribution across elements
  natalDominantModality: 'Cardinal' | 'Fixed' | 'Mutable' | null

  // Current sky signals
  currentTransits: TransitAspect[]       // all active transit aspects; empty array if transits is null
  retrogradeplanets: string[]            // planet names currently retrograde
  dominantTransitPlanet: string | null   // highest-weight transiting planet (Saturn, Uranus, Pluto > others)

  // Lunar context
  lunarPhaseName: string | null          // computed from current transits; null if transits unavailable
  lunarPhaseSymbol: string | null        // glyph character for the phase

  // Numerology
  personalDay: number                    // 1–9 (or 11/22 master numbers)

  // Advance scoring
  advanceCategory: 'power' | 'favorable' | 'challenging' | 'shift' | 'neutral' | null
  advanceReason: string | null           // one-line human sentence from SnapshotScore
}
```

**Natal dominant element computation:** Count natal planet positions across Fire/Earth/Air/Water using `SIGN_ELEMENTS` from `src/engine/types.ts`. The Sun, Moon, and Ascendant are each weighted 2×; other planets are weighted 1×. The element with the highest weighted count is `natalDominantElement`. If two elements tie, the element containing the Sun is preferred; if the Sun is not in either tied element, `null` is returned to signal no dominant.

**Transit sourcing:** `buildTarotAstroContext` consumes already-computed `TransitData` from the caller — it does not invoke `calculateTransitAspects` internally. This is intentional: for users arriving from `TodayPage`, their transit data is already in memory. The engine avoids redundant ephemeris calculations. The `transits` parameter is nullable; when null, `currentTransits`, `retrogradeplanets`, `dominantTransitPlanet`, and `lunarPhaseName` are all set to their null/empty defaults without error.

**Dominant transit planet:** Among all currently active transit aspects in `transits.transitAspects`, the dominant planet is selected by a priority weighting: Pluto (10) > Neptune (9) > Uranus (8) > Saturn (7) > Jupiter (5) > Mars (3) > Sun (2) > Venus (2) > Mercury (1) > Moon (1). If no aspects exist, `dominantTransitPlanet` is null.

**Lunar phase:** Derived from `transits.currentPlanets` by finding the Moon and Sun positions and computing the phase angle. Uses the same logic as `src/engine/lunar.ts` `phaseAngleToName`. Does not re-import `lunar.ts` — the calculation is two lines using positions already present in `transits.currentPlanets`. If either body is absent from `currentPlanets`, `lunarPhaseName` is null.

**This function never throws.** All inputs are validated defensively. Missing or malformed natal chart data produces null values for the affected fields, not exceptions. The calling component renders gracefully degraded context rather than crashing.

---

### 5. `computeInstantInterpretation(card, position, astroContext)` — Three-Level Fallback Chain

**Signature:**
```typescript
export function computeInstantInterpretation(
  card: TarotCard,
  reversed: boolean,
  position: SpreadPosition | null,
  astroContext: TarotAstroContext,
): InstantInterpretation
```

**Return type:**
```typescript
export interface InstantInterpretation {
  cardId: string
  cardName: string
  arcana: 'major' | 'minor'
  suit: TarotSuit | null
  reversed: boolean
  positionLabel: string | null         // e.g. 'Past', 'Present', 'Challenge' — null for single-card
  positionMeaning: string | null       // the spread position's own significance text
  coreMeaning: string                  // uprightMeaning or reversedMeaning based on reversed flag
  symbolicTheme: string
  emotionalMeaning: string
  practicalGuidance: string
  reflectionQuestion: string
  numerologyNote: string               // from card.numerologyResonance; may append personal day match
  astroConnection: AstroConnection
}

export interface AstroConnection {
  cardElement: Element | null
  natalDominantElement: Element | null
  elementResonanceNote: string         // always populated; never empty string
  transitInfluence: string             // always populated; never empty string — guaranteed by fallback chain
  lunarPhaseNote: string               // always populated; defaults to neutral observation if lunar data absent
  advanceCategoryNote: string          // always populated; defaults to empty string only when advanceScore is null
  astroHeadline: string                // one sentence, max 20 words; the single most striking sky connection
}
```

**The three-level fallback chain for `transitInfluence`:**

This is the specification-critical behavior. `transitInfluence` must never be an empty string. The engine tries each level in order and uses the first level that yields a non-empty result.

**Level 1 — Specific transit override from `TRANSIT_ADAPTATIONS`:**
Look up `TRANSIT_ADAPTATIONS[card.id]`. If the card has entries, iterate them. For each entry, check if any retrograde planet in `astroContext.retrogradeplanets` matches `entry.planet` (for `condition: 'retrograde'`), or if the dominant transit planet matches `entry.planet` (for `condition: 'direct'` or `condition: 'any'`). If a match is found, use `entry.emphasis` as `transitInfluence`.

Example: The Hermit (`id: 'the-hermit'`) during Mercury retrograde → "withdrawal, internal review, silence as wisdom." The Tower during a Uranus transit → "sudden liberation through disruption, ego structures collapsing to reveal truth."

**Level 2 — Element affinity fallback:**
When no specific transit override applies, compute the element of the dominant transit planet using `PLANET_ELEMENT_MAP` (a module-level constant in `tarot.ts`):

```typescript
const PLANET_ELEMENT_MAP: Record<string, Element> = {
  Sun: 'Fire', Mars: 'Fire', Jupiter: 'Fire',
  Venus: 'Earth', Saturn: 'Earth',
  Mercury: 'Air', Uranus: 'Air',
  Moon: 'Water', Neptune: 'Water', Pluto: 'Water',
}
```

If the transit planet's element matches the card's element, produce an amplification note: "The current [Planet] transit amplifies this card's [Element] nature — [card.keywords[0]] and [card.keywords[1]] are heightened now." If the elements are different, produce a tension note: "The current [Planet] transit introduces [transit element adjective] energy into this [card element] card — [tension phrase]."

**Level 3 — Card baseline astro note:**
When no transit data is available at all (`astroContext.currentTransits.length === 0` and `astroContext.retrogradeplanets.length === 0`), use the card's ruling planet or element from `astroConnections.ts` to produce a baseline statement: "This card's [ruling planet/element] nature speaks to [card.symbolicTheme]."

**The `astroHeadline` field:** Distilled from the three-level result. One sentence, maximum 20 words. Written as a direct address ("Saturn's discipline sharpens what The Hermit asks of you today."). The headline is computed in `computeInstantInterpretation` from the transit influence text plus the card name plus the dominant transit planet. It is not GPT-generated — it is a template-filled sentence chosen from a small set of structural patterns. The Jobs voice mandated this as a first-class design primitive: it appears prominently in the UI, in italic Cormorant Garamond, before any prose. It must always be present. It must never be generic.

**Numerology note with personal day resonance:** If `astroContext.personalDay === card.number` (accounting for Major Arcana numbers 0–21 and reduced numerological equivalents), append to `numerologyNote`: "Your personal day is also a [number] — this card speaks directly into your current cycle." This surface moment — the coincidence of card number and personal day — is a specific product feature called out in the sprint vision and Single Card Reading UI proposal. The engine detects it; the UI renders it.

**`computeInstantInterpretation` never returns undefined, never returns null, never returns an object with empty string fields.** Every field has either a meaningful computed value or a well-defined neutral fallback. This is testable and must be tested.

---

### 6. `computeThreeCardSynthesis(cards, positions, astroContext)` — Pre-Computed Structural Signals for GPT

**Signature:**
```typescript
export function computeThreeCardSynthesis(
  cards: DrawnCard[],
  positions: SpreadPosition[],
  astroContext: TarotAstroContext,
): ThreeCardSynthesisInput
```

**`DrawnCard` type:**
```typescript
export interface DrawnCard {
  card: TarotCard
  reversed: boolean
  interpretation: InstantInterpretation  // already computed by computeInstantInterpretation
}
```

**Return type:**
```typescript
export interface ThreeCardSynthesisInput {
  // Structural signals — GPT receives these as computed facts, not as raw card data to discover
  dominantArcana: 'major-heavy' | 'minor-heavy' | 'balanced'
  // major-heavy: 2–3 Major Arcana; minor-heavy: 0–1 Major Arcana; balanced: exactly 1 of each type pair

  elementDistribution: {
    elements: Element[]          // one per card, null elements excluded
    dominant: Element | null     // element appearing most (null if all different or all null)
    allSame: boolean             // all three cards share the same element
    crossElement: boolean        // all three cards have different elements
    fireWaterTension: boolean    // both Fire and Water present — emotional pressure signal
  }

  polarityProfile: {
    reversedCount: number        // 0, 1, 2, or 3
    allReversed: boolean
    allUpright: boolean
    centerReversed: boolean      // second card (the present / challenge / heart) is reversed
  }

  archetypeFraming: {
    hasFool: boolean             // Major Arcana 0 is present — a beginning-of-journey signal
    hasWorld: boolean            // Major Arcana 21 is present — a completion signal
    hasDeathOrTower: boolean     // transformation cards — amplifies the reading's intensity
    numericalProgression: boolean // card numbers form an ascending or descending sequence (±1 tolerance)
  }

  suitPattern: {
    suits: (TarotSuit | null)[]  // one per card, null for Major Arcana
    allSameSuit: boolean
    noMinorArcana: boolean       // all three are Major Arcana
  }

  astroResonanceNote: string    // one sentence for the GPT prompt: "All three cards draw from Water against a Moon–Neptune sky."
  // This sentence is the engine's synthesis gift to GPT. It gives GPT a concrete observation to expand.

  // The raw interpreted cards — ordered in spread-mode-correct serialization for the GPT prompt
  interpretedCards: DrawnCard[]  // same as input, preserved for prompt construction
  spreadPositions: SpreadPosition[]
}
```

**What this structure does for GPT:**

The GPT prompt for `tarot-three-synthesis` does not ask GPT to "read three cards together." It tells GPT: "The spread contains two Major Arcana cards and one Minor (major-heavy). The elements are Fire / Water / Water — a Water dominant with Fire pressure. The center card is reversed. The Death card is present. The sky is dominated by Pluto. Here are the three instant interpretations. Write the constellation synthesis."

GPT is not discovering the structure. It is filling in narrative around a structure the engine has already articulated. This produces synthesis quality that is categorically different from "here are three card names, write a reading."

**Prompt serialization order (built by the server handler, not the engine):** The server handler for `tarot-three-synthesis` uses the spread type to order `interpretedCards` correctly in the prompt:
- `three-past-present-future`: Past first (interpretedCards[0])
- `three-situation-challenge-advice`: Situation first (interpretedCards[0])
- `three-mind-heart-action`: Mind first (interpretedCards[0])
- Other spread modes: cards in draw order

The engine does not handle this ordering — it preserves draw order. The server handler is responsible for serialization.

---

### 7. TypeScript Types — Complete Definitions

All types are defined in `src/engine/tarot.ts` and exported. The data-layer types (`TarotCard`, `TarotSuit`, `TarotArcana`) are defined in `src/data/tarot/cards.ts` and re-exported from `src/engine/tarot.ts` for consumer convenience.

```typescript
// From src/data/tarot/cards.ts (defined there, re-exported from engine)
export type TarotSuit = 'wands' | 'cups' | 'swords' | 'pentacles'
export type TarotArcana = 'major' | 'minor'

export interface TarotCard {
  id: string
  name: string
  arcana: TarotArcana
  suit: TarotSuit | null            // null for Major Arcana
  number: number                     // 0–21 for Major; 1–14 for Minor (14 = King)
  element: Element | null            // null for cards with contested/no element
  rulingPlanet: PlanetName | null    // Major Arcana only
  rulingSign: ZodiacSign | null      // Major Arcana only
  keywords: string[]                 // minimum 3 entries
  uprightMeaning: string
  reversedMeaning: string            // independently authored, not a negation
  symbolicTheme: string              // one evocative phrase
  emotionalMeaning: string
  practicalGuidance: string
  reflectionQuestion: string
  numerologyResonance: string
}

// From src/data/tarot/spreadPositions.ts
export interface SpreadPosition {
  spreadType: SpreadType
  positionIndex: number              // 0-based within the spread
  label: string                      // 'Past', 'Present', 'Challenge', etc.
  meaning: string                    // 2–3 sentences on what this position signifies
}

// Engine-defined types (src/engine/tarot.ts)
export interface TarotAstroContext { /* as specified in section 4 */ }
export interface AstroConnection { /* as specified in section 5 */ }
export interface InstantInterpretation { /* as specified in section 5 */ }
export interface DrawnCard { /* as specified in section 6 */ }
export interface ThreeCardSynthesisInput { /* as specified in section 6 */ }
```

No `any` types. No optional fields on `InstantInterpretation` or `AstroConnection` that could silently produce undefined in the rendering layer. Every field either has a value or has a documented null/empty-string contract with an explicit UI fallback defined.

---

### 8. Server-Side Natal Recomputation Pattern

The GPT handlers for `tarot-single-synthesis`, `tarot-three-synthesis`, and `tarot-celtic-synthesis` follow the security pattern already established by `handleTodaySynthesis`.

**Client sends:** The full `TarotAstroContext` in the payload, plus the drawn cards, instant interpretations, synthesis skeleton, and user intention. The client-provided context is used for display.

**Server reconstructs:** For authenticated users, the handler calls `resolveUserBirthContext(userId)` (the existing server-side pattern) to retrieve birth data and recompute natal chart fields independently. The server-computed `natalSunSign`, `natalMoonSign`, and `natalAscendantSign` are used in the GPT prompt, not the client-provided values. The `personalDay` is recomputed server-side using `calculatePersonalDay(birthDate, serverLocalDate)` and cross-checked against the client-provided value.

**Why:** The natal chart data is sensitive to manipulation. A client that sends `natalSunSign: 'Aries'` when the user's actual sun is in Virgo would receive a falsely personalized GPT synthesis. The server recomputes the ground truth. This is not paranoia — it is the pattern already in place in this codebase, and Tarot must follow it.

The `TarotAstroContext` passed to GPT prompts is the server-reconstructed version for natal fields, merged with the client-provided live transit data (since transit computation is expensive and the client's transit data is already accurate for the current moment).

---

### 9. Error Handling and Graceful Degradation

**Engine-level:** All five exported functions are synchronous and pure. They cannot fail from network errors, database errors, or GPT failures. They can only fail from malformed input or corrupt card data. A missing card in the deck (e.g., a card ID returned by `drawCards` that does not exist in `cards.ts`) is a programming error, not a runtime error — it indicates a data integrity failure and throws with a descriptive message in development. In production, it falls back to The Fool (card ID `'the-fool'`) with a console warning.

**Component-level failure states for `computeInstantInterpretation`:** If `buildTarotAstroContext` received null transit data, `astroConnection.transitInfluence` still has a Level 3 fallback value. The UI must not show an empty "In Your Sky Now" section — it must show the Level 3 baseline text. This is tested.

**`TarotSynthesisPanel` states (specified for the UI layer, mandated by the engine contract):**
The engine layer provides `computeThreeCardSynthesis` output as a fallback synthesis skeleton. When GPT is unavailable, the panel must surface this skeleton rather than showing a broken state. The synthesis skeleton produced by `computeThreeCardSynthesis` is sufficient to construct a meaningful AI-free synthesis paragraph in the panel — it is not a debug dump of structural metadata. The panel renders: the `elementDistribution.dominant` element note, the `archetypeFraming` observations, and the `astroResonanceNote`. This is a complete reading without GPT. The panel labels it accordingly: "The synthesis above is drawn from the cards and sky directly — no AI layer required."

**Server-level degradation for Celtic Cross:** When the GPT call for `tarot-celtic-synthesis` fails after the user has completed a 10-card reveal, the server returns a 503. The client shows the `ThreeCardSynthesisInput`-equivalent structure pre-computed for all 10 cards — the same engine that generates the three-card skeleton generates a Celtic Cross skeleton. The panel renders 10 instant interpretations fully, with a structural summary from the engine, and offers a retry button. The user's 10-minute Celtic Cross experience is not wasted.

---

### 10. Where the Engine Is Called From

The engine is called exclusively from React components. It is never called from server code (the server has its own `server/engine/` modules and never imports from `src/engine/`).

**Client-side call sites:**

`SingleCardReading.tsx`:
1. Constructs `seed` (SHA-256 or UUID, based on reading mode)
2. Calls `drawCards('single', seed)` — returns 1 card
3. Calls `assignReversals([card], seed)` — returns 1 boolean
4. Calls `buildTarotAstroContext(chartData, transitData, personalDay, advanceScore)` — returns `TarotAstroContext`
5. Calls `computeInstantInterpretation(card, reversed, null, astroContext)` — returns `InstantInterpretation`
6. Renders `TarotInterpretationPanel` with the `InstantInterpretation`
7. Fires `getTarotSingleSynthesis(interpretation, userIntention, astroContext)` asynchronously
8. Renders `TarotSynthesisPanel` with loading/success/error state

`ThreeCardReading.tsx`:
1–5. Same as above for three cards (mapping over `drawCards` result)
6. Calls `computeThreeCardSynthesis(drawnCards, positions, astroContext)` — returns `ThreeCardSynthesisInput`
7. Fires `getTarotThreeSynthesis(synthesisInput, spreadType, userIntention)` asynchronously
8. Renders `TarotSynthesisPanel`

`CelticCrossReading.tsx`:
1–5. Same as above for ten cards
6. At card 7 reveal (the "fire early" moment), fires `getTarotCelticSynthesis(drawnCards, positions, astroContext, userIntention)` asynchronously
7. Synthesis is ready (or in its error state) by the time card 10 is revealed

All three reading components share the `TarotAstroContext` instance. It is computed once and passed down. It does not need to be recomputed between card reveals.

The `TarotAstroContext` builder accepts `TransitData | null`. For users arriving from `TodayPage`, the transit data is already in `AppState` (as `AppState.transitData`). The `TarotPage.tsx` reads it from state and passes it through. For users who arrive directly at the Tarot module without navigating through the Today page, the transit data may be null — the context degrades gracefully to Level 3 fallback interpretations throughout.

---

### 11. Testing Approach for Deterministic Functions

All five exported engine functions are pure functions. They have no side effects and no external dependencies beyond the imported data files. They are fully unit-testable.

**Required tests in `src/engine/__tests__/tarot.test.ts`:**

*Determinism tests:*
```typescript
it('drawCards returns the same cards for the same seed', () => {
  const a = drawCards('single', 'test-seed-abc')
  const b = drawCards('single', 'test-seed-abc')
  expect(a.map(c => c.id)).toEqual(b.map(c => c.id))
})

it('drawCards returns different cards for different seeds', () => {
  const a = drawCards('single', 'seed-1')
  const b = drawCards('single', 'seed-2')
  expect(a[0].id).not.toEqual(b[0].id)  // probabilistic but reliable for distant seeds
})
```

*Calendar periodicity test (Taleb's requirement):*
```typescript
it('daily card seed does not repeat within a 28-day cycle for 10 test users', () => {
  const testUsers = Array.from({ length: 10 }, (_, i) => `user-${i}`)
  const dates = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(2026, 0, 1)
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })
  for (const userId of testUsers) {
    const drawnIds = dates.map(date => {
      const seed = computeDailyDrawSeed(userId, '1990-03-15', date, 'single')
      return drawCards('single', seed)[0].id
    })
    const uniqueIds = new Set(drawnIds)
    expect(uniqueIds.size).toBeGreaterThan(14)  // expect more than 50% unique over 28 days
  }
})
```

*Three-level fallback completeness test (Taleb's requirement):*
```typescript
it('computeInstantInterpretation returns complete output for a transit combination not in TRANSIT_ADAPTATIONS', () => {
  const context = buildTarotAstroContext(mockChartData, mockTransitWithRareCombo, 3, null)
  // Use a card with a transit combination that is not in TRANSIT_ADAPTATIONS
  const card = TAROT_CARDS.find(c => c.id === 'two-of-wands')!
  const result = computeInstantInterpretation(card, false, null, context)
  expect(result.astroConnection.transitInfluence).toBeTruthy()
  expect(result.astroConnection.transitInfluence.length).toBeGreaterThan(10)
  expect(result.astroConnection.astroHeadline).toBeTruthy()
  expect(result.astroConnection.astroHeadline.split(' ').length).toBeLessThanOrEqual(20)
})
```

*`computeInstantInterpretation` with null transits:*
```typescript
it('computeInstantInterpretation produces non-empty transitInfluence when no transit data is available', () => {
  const context = buildTarotAstroContext(mockChartData, null, 5, null)
  const card = TAROT_CARDS.find(c => c.id === 'the-magician')!
  const result = computeInstantInterpretation(card, true, null, context)
  expect(result.astroConnection.transitInfluence).toBeTruthy()
  expect(result.coreMeaning).toBe(card.reversedMeaning)
})
```

*`computeThreeCardSynthesis` structural signal accuracy:*
```typescript
it('computeThreeCardSynthesis correctly identifies all-Water element distribution', () => {
  const waterCards = TAROT_CARDS.filter(c => c.element === 'Water').slice(0, 3)
  const drawnCards = waterCards.map(card => ({
    card,
    reversed: false,
    interpretation: computeInstantInterpretation(card, false, null, mockAstroContext),
  }))
  const synthesis = computeThreeCardSynthesis(drawnCards, mockPositions, mockAstroContext)
  expect(synthesis.elementDistribution.allSame).toBe(true)
  expect(synthesis.elementDistribution.dominant).toBe('Water')
  expect(synthesis.elementDistribution.crossElement).toBe(false)
})
```

*Personal day resonance detection:*
```typescript
it('computeInstantInterpretation detects personal day matching card number', () => {
  const context = { ...mockAstroContext, personalDay: 7 }
  const hermit = TAROT_CARDS.find(c => c.id === 'the-hermit')!  // Major Arcana IX = 9, not 7
  const chariot = TAROT_CARDS.find(c => c.id === 'the-chariot')!  // Major Arcana VII = 7
  const hermitResult = computeInstantInterpretation(hermit, false, null, context)
  const chariotResult = computeInstantInterpretation(chariot, false, null, context)
  expect(hermitResult.numerologyNote).not.toContain('Your personal day is also')
  expect(chariotResult.numerologyNote).toContain('Your personal day is also a 7')
})
```

All tests run without network access, without a running server, and without a real database. The engine is completely isolated from infrastructure.

---

## Out of Scope

The following are explicitly not part of this proposal:

- **UI components:** `CardReveal.tsx`, `DeckShuffleAnimation.tsx`, `TarotInterpretationPanel.tsx`, `TarotSynthesisPanel.tsx`, `TarotPage.tsx`, `SingleCardReading.tsx`, `ThreeCardReading.tsx`, `CelticCrossReading.tsx` — these are separate proposals (proposals 3, 4, 5, 6, 7, 9 in `_drafts.md`).

- **Saved readings persistence:** The `readings` DB table, `server/routes/readings.ts`, `SavedReadingsPage.tsx` — proposal 10.

- **Subscription gating:** The `tarot_usage` table, extended `gptRateLimit` middleware, Tarot-specific `UpgradeModal` copy — proposal 11.

- **GPT synthesis integration:** The four new `handleGptRequest` cases (`tarot-single-synthesis`, `tarot-three-synthesis`, `tarot-celtic-synthesis`, `tarot-discuss`), `server/services/gptTarot.ts` — proposals 8 and 13.

- **The 78-card data layer itself:** The authored content of `src/data/tarot/cards.ts`, `astroConnections.ts`, `spreadPositions.ts`, and `transitAdaptations.ts` — proposal 1. This proposal specifies the interfaces those files must satisfy; it does not specify their content.

- **`TarotContext` React state management:** The dedicated context, its state shape, and its provider — proposal 14.

- **Navigation wiring:** Adding `'tarot'` to `AppView`, updating `HomeScreen.tsx`, updating the navigation bar — proposal 9.

---

## Open Questions

**1. Engine singleton versus pure functions.**

The current proposal specifies all five functions as pure, stateless exports. There is no singleton, no module-level mutable state, and no initialization. Each call is independent.

The alternative — a factory function that returns an engine object pre-loaded with the 78-card deck and the transit adaptations table — would avoid re-loading the data files on each call and would support lazy initialization. However, the data files are bundled at build time, not loaded from the network, so "loading" is just module evaluation — it happens once when the module is first imported regardless of the function design. There is no performance advantage to a singleton.

The pure-function design is preferred: it is easier to test, easier to reason about, and consistent with every other engine module in this codebase (`numerology.ts`, `lunar.ts`, `advanceScoring.ts` — all pure functions, no singletons).

**Recommendation:** Pure functions. Close this question as resolved.

**2. Whether `buildTarotAstroContext` should call `calculateCurrentMoonPhase` from `lunar.ts` or derive the lunar phase from `TransitData`.**

The current spec derives lunar phase from `transits.currentPlanets` (Moon and Sun positions already present in transit data). This avoids importing `lunar.ts` into the engine and avoids the ephemeris calculation that `lunar.ts` performs. The downside: the phase angle calculation duplicates code from `lunar.ts`.

The alternative: import `calculateCurrentMoonPhase()` from `src/engine/lunar.ts` and call it directly. This reuses the existing calculation but runs the ephemeris computation independently of the transit data (potentially using a slightly different timestamp).

**Recommendation:** Derive from `TransitData` when available (zero additional computation cost), fall back to calling `calculateCurrentMoonPhase()` when `transits` is null. This gives the most accurate result in both cases. Leave the lunar import in place as a fallback dependency.

**3. Whether the `astroHeadline` field is generated by the engine or by the server GPT handler.**

The current spec places `astroHeadline` as an engine-computed template-filled string. This keeps it AI-free and available before GPT is called. The alternative is to have GPT generate the headline as the first sentence of the synthesis, then display it prominently — which produces higher-quality prose but adds latency and a GPT dependency to the instant layer.

This is a product question: should the "In Your Sky Now" astro headline feel like it was written (GPT) or computed (template)? The Jobs voice mandated it as a first-class UI primitive visible immediately after reveal — before GPT has loaded. That timeline mandate answers the question.

**Recommendation:** Engine-computed, template-filled, immediately available. Kept. GPT may produce a richer version of the same observation in the synthesis prose, but the headline is the engine's.
