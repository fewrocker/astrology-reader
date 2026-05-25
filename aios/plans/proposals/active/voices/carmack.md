# Technical Analysis — Tarot Module (Sprint 0023)
*Voice: John Carmack*

---

## What I Actually Read Before Writing This

I read the full sprint vision, the guidelines spec, the existing GPT dispatch chain in `server/services/gpt.ts`, the client-side proxy in `src/services/gptInterpretation.ts`, the `handleGptRequest` switch in `server/services/gpt.ts` (15 dispatch cases, all following the same pattern), `src/engine/types.ts`, `src/engine/advanceScoring.ts`, `src/engine/numerology.ts`, `src/engine/lunar.ts`, `src/context/appState.ts`, `src/components/discuss/DiscussModal.tsx`, `server/middleware/gptRateLimit.ts`, `server/routes/entries.ts`, `src/data/interpretations/planetInSign.ts` (120 entries, ~2 lines each), the full list of server engine files, and the component tree. This is a mature codebase. The patterns are clear. Here is what the Tarot module actually requires, technically.

---

## The Real Complexity Budget

The spec says this is the "largest and most architecturally complex feature the app has ever built." That's accurate. But the complexity is not evenly distributed. Here's where the time actually goes:

**High complexity (will take 10x longer than estimated):**
1. The 78-card data layer with full field coverage for every card
2. The `transitAdaptations.ts` lookup table (the differentiating feature)
3. Card visual assets — the entire asset pipeline decision
4. The Celtic Cross progressive reveal UX

**Medium complexity (clear engineering path, just work):**
5. `src/engine/tarot.ts` — the draw, reversal, and context-building functions
6. The three new GPT dispatch cases + the discuss case
7. `TarotDiscussModal.tsx` (it's `DiscussModal.tsx` with a different context builder)
8. `server/routes/readings.ts` + DB table

**Low complexity (pattern already exists, copy and adapt):**
9. Rate limiting extension for Tarot — the `gptRateLimit` middleware is already parameterized by tier
10. AppState extension with `'tarot'` view
11. `SavedReadingsPage.tsx` (standard CRUD UI over `entries.ts` pattern)

The vision document buries the asset decision in item 8 of the "Where to Look" section. It should be item 1. **The card visual decision is the schedule risk**, not the AI synthesis or the data model.

---

## Data Model for 78 Cards × Positions × Upright/Reversed

This is a pure data problem. The spec gives the field list. Here is what the TypeScript shape should be:

```typescript
// src/data/tarot/cards.ts

export type TarotSuit = 'wands' | 'cups' | 'swords' | 'pentacles'
export type TarotArcana = 'major' | 'minor'

export interface TarotCard {
  id: string                    // 'the-fool', 'ace-of-wands', 'ten-of-cups', etc.
  name: string
  arcana: TarotArcana
  suit?: TarotSuit              // only minor arcana
  number: number                // 0–21 for major; 1–14 for minor (14 = Page, 15 = Knight... wait, see note below)
  element: 'Fire' | 'Water' | 'Air' | 'Earth' | null   // null for some majors
  rulingPlanet?: string         // Major Arcana only
  rulingSign?: string           // Major Arcana only
  keywords: string[]
  uprightMeaning: string        // 1–2 sentences, specific
  reversedMeaning: string       // 1–2 sentences, specific
  symbolicTheme: string         // one evocative phrase
  emotionalMeaning: string      // 1 sentence, what it feels like
  practicalGuidance: string     // 1 sentence, what to do
  reflectionQuestion: string    // the contemplation prompt
  numerologyResonance: string   // connection to numerology
}
```

**Note on card numbering:** The court cards (Page=11, Knight=12, Queen=13, King=14) break the Ace-through-10 pattern. The id-based system handles this cleanly — use slug strings, not raw numbers, as primary keys. `number` is for sort order, not identity.

**The real data work:** 78 cards × ~8 text fields = ~624 distinct text entries that must be authored, not generated. This is the single biggest work item in the sprint. Do not underestimate it. `src/data/interpretations/planetInSign.ts` has 120 entries and it's already a significant file. The tarot card data will be 3x larger. Splitting it into `majorArcana.ts` and four suit files (`wands.ts`, `cups.ts`, `swords.ts`, `pentacles.ts`) is the right call for both maintainability and initial loading (though at 78 cards the whole thing is probably 50KB, well within reason for a bundled data file).

**The reversal problem:** Reversed meanings cannot just be "the upright meaning negated." The Hermit reversed is not "extroversion" — it's isolation, refusal to share wisdom, being lost in one's own head. Every reversed meaning must be independently authored. That doubles the card authoring work. No shortcuts here.

**The transitAdaptations lookup table:** The spec proposes `{ card, transitPlanet, transitType, emphasis }`. This is the right structure, but the combinatorial space is 78 cards × 10 planets × (direct|retrograde|ingress) = 1,560 potential entries. Nobody is going to write 1,560 entries. The practical approach:

```typescript
// src/data/tarot/transitAdaptations.ts

type TransitCondition = {
  planet: string
  condition: 'retrograde' | 'direct' | 'any'
  emphasis: string   // replaces or supplements the card's standard meaning
}

// Most cards have no specific transit adaptation — the engine falls back to
// element-affinity scoring (card element vs. transit planet nature).
// Only the ~40 most symbolically loaded card × planet combinations get explicit entries.
export const TRANSIT_ADAPTATIONS: Partial<Record<string, TransitCondition[]>> = {
  'the-hermit': [
    { planet: 'Mercury', condition: 'retrograde', emphasis: 'withdrawal, internal review, silence as wisdom' },
    { planet: 'Saturn', condition: 'any', emphasis: 'chosen solitude, the necessity of the inner journey' },
  ],
  'the-tower': [
    { planet: 'Uranus', condition: 'any', emphasis: 'sudden liberation through disruption, ego structures collapsing to reveal truth' },
    { planet: 'Pluto', condition: 'any', emphasis: 'irreversible transformation, the old order cannot be rebuilt' },
  ],
  // ...~38 more symbolically loaded combinations
}
```

This is achievable. 40 cards with 2–3 transit adaptations each = ~100 entries. Focused symbolic logic, not an exhaustive matrix.

**Element-affinity fallback in `computeInstantInterpretation`:** When no explicit transit adaptation exists, the engine computes element resonance between the card's element and the transiting planet's natural element (Mars/Aries=Fire, Venus/Taurus=Earth, Mercury/Gemini=Air, Moon/Cancer=Water, etc.). A Tower card during a Mars transit gets a "direct confrontation, force" emphasis even without an explicit entry. This fallback makes the system feel dynamic without requiring 1,560 authored entries.

---

## The AI-Free Instant Interpretation Layer

The spec is right that this must be complete for all 78 cards before GPT is even called. Here is the exact function signature I'd write:

```typescript
// src/engine/tarot.ts

export interface InstantInterpretation {
  cardName: string
  arcana: string
  reversed: boolean
  positionLabel: string | null       // 'Past', 'Present', etc. — null for single-card
  positionMeaning: string | null     // the spread position's significance
  coreMeaning: string                // uprightMeaning or reversedMeaning
  symbolicTheme: string
  emotionalMeaning: string
  practicalGuidance: string
  reflectionQuestion: string
  astroConnection: AstroConnection   // the live calculation
  numerologyNote: string
}

export interface AstroConnection {
  cardElement: string | null
  natalDominantElement: string | null
  resonanceNote: string              // "Your natal Fire dominant amplifies this card's..."
  transitInfluence: string | null    // from TRANSIT_ADAPTATIONS lookup or element fallback
  lunarPhaseNote: string | null      // "The waning moon underscores this card's theme of..."
  advanceCategoryNote: string | null // "Today's favorable transit timing..."
}
```

The `buildTarotAstroContext` function pulls from already-computed data: `ChartData` (already in AppState), current transits (server-side via the authenticated path, same as `today-synthesis`), `calculateCurrentMoonPhase()` from `src/engine/lunar.ts`, personal day from `src/engine/numerology.ts`, and the advance category from `advanceScoring.ts`. **All of this data is already computed and cached in the client** for authenticated users who have been through the Today page. The Tarot engine can consume it directly from AppState rather than recomputing it.

One thing I want to flag: the spec says `buildTarotAstroContext` should accept `transitData: TransitData | null`. This is fine. But for the server-side GPT calls, the authenticated path in `handleGptRequest` should recompute the astro context server-side from birth data (same as `handleTodaySynthesis` already does), not trust the client-provided payload. Look at how `handleTodaySynthesis` cross-checks `personalDay` against the server-computed value — the same pattern applies to Tarot. Pass the full context in the payload for display, but the server reconstructs it for the GPT prompt.

---

## The GPT Integration Pattern

The existing pattern is clear: `callProxy(type, payload)` in `gptInterpretation.ts` → `handleGptRequest(type, payload, userId)` switch in `server/services/gpt.ts` → per-handler async function. Four new cases needed:

**`'tarot-single-synthesis'`** — simplest case. Payload: the InstantInterpretation object + user intention/question + full astro context. Returns a string (same as today-synthesis, dream-interpretation). `max_tokens: 800`. This is one card, one moment — keep it focused.

**`'tarot-three-synthesis'`** — more complex. Payload: all three DrawnCards with their InstantInterpretations + the ThreeCardSynthesis skeleton + spread mode + astro context. The synthesis skeleton from `computeThreeCardSynthesis` gives GPT the structure (main theme, tension, direction, etc.) so the model is filling in narrative prose rather than discovering the structure itself. This is a better prompt pattern than sending raw cards and asking GPT to synthesize from scratch. `max_tokens: 1500`.

**`'tarot-celtic-synthesis'`** — the largest. 10 cards, 10 positions, 10 InstantInterpretations. The prompt will be long. Budget `max_tokens: 3000`. The real challenge here is the system prompt: it must instruct the model to treat the 10 cards as a single symbolic constellation, not 10 separate readings. Look at how `buildSynastryPrompt` in `server/engine/synastryEngine.ts` handles the "read these together" framing — the same principle applies.

**`'tarot-discuss'`** — identical pattern to `'astro-discuss'` and `'numerology-discuss'`. The context string is the full reading (cards, positions, reversal states, instant interpretations, GPT synthesis if loaded, natal chart, transits, numerology, advance category). The system prompt says "you are a symbolic interpreter and reflective guide — not a fortune teller." Copy the discuss handler pattern exactly, parameterize the context.

One thing that looks simple but isn't: **the three-card synthesis prompt ordering.** The order in which card data is presented to GPT matters for coherence. For Past/Present/Future: present the cards in temporal order (Past first). For Situation/Challenge/Advice: present in narrative order (Situation first, because it's the premise). For Mind/Heart/Action: Mind first (cognitive frame), then Heart (emotional state), then Action (output). The spread mode drives the serialization order of cards in the prompt. This needs to be explicit in `handleTarotThreeSynthesis`, not left to chance.

---

## What Sounds Simple But Is Actually a Rabbit Hole

**Card assets.** The vision says "beautiful custom tarot card faces that feel collectible and iconic." This is an art problem disguised as an engineering problem. Options:
- SVG card faces designed in code: 78 unique SVGs with meaningful symbolism. Months of work. Not this sprint.
- Rider-Waite scans (public domain since 1966 in the US): legally usable, but image optimization pipeline, CORS headers, bundle size (~78 images × ~100KB = ~7.8MB), lazy loading. Not trivial but tractable.
- CSS cards with symbolic placeholder treatment (suit glyph, card name, gradient background per arcana): shippable in a day, looks decent with the existing gold/charcoal palette, but "placeholder" is exactly what the spec says not to ship.

**My recommendation:** Use a curated set of public domain Rider-Waite JPEGs hosted as static assets. Optimize to 150×240px at ~15KB each = ~1.2MB total for 78 cards. Lazy-load them. The card flip animation works over the image. The visual quality is authentic to tarot tradition. This is the pragmatic path. The "beautiful custom" card design is a v2 feature.

**The deterministic card draw.** `drawCards(n, seed)` using natal chart data as a seed component. This sounds like a fun feature. It's actually a philosophical mess. If the draw is truly deterministic on natal data alone, the same person always draws the same card — meaningless. If it incorporates the current timestamp, it's not really "using natal data." The correct implementation: seed from `hash(natalFingerprint + currentDate)` for daily reading (same card all day, different each day), or `hash(natalFingerprint + timestamp)` for question-based readings (fully random but personalized by birth data as a salt). Make the determinism semantically meaningful, not just technically present.

**The three-card synthesis interaction model.** The spec says "the synthesis should understand card interactions." This is right but vague. In practice, the AI-free `computeThreeCardSynthesis` needs a static table of major archetypal pair combinations — what it means when a Major Arcana card flanks two Minor, what it means when all three are the same suit, what it means when the middle card reverses the polarity of the flanking cards. Without this structural analysis in the AI-free layer, the GPT prompt is just "here are three cards" and the output will be three interpretations with a conclusion paragraph, not a genuine constellation reading. The skeleton structure that `computeThreeCardSynthesis` returns should already identify: dominant element, arcana mix (major/minor ratio), suit spread, polarity tension (upright vs. reversed). These signals go into the prompt as computed facts, not left for GPT to discover.

**Saved readings DB schema.** The existing `entries` table pattern in `server/routes/entries.ts` uses a `metadata` JSON blob column. Tarot readings could go there as `kind: 'tarot-reading'` with the full reading in `metadata`. But: Celtic Cross readings with 10 cards × full interpretation fields will produce metadata blobs of 20–30KB. SQLite handles this fine (it's not a relational query target), but the API that retrieves all entries ordered by date will pull all those blobs on every load. The `SavedReadingsPage.tsx` list view only needs card names, spread type, and timestamp — the full interpretation payload should be fetched on demand. Either add a `summary` column or design the API to have a list endpoint (returns slim objects) and a detail endpoint (returns full blob). Using the existing `entries` table with `kind: 'tarot-reading'` is fine as long as the list query doesn't deserialize the full metadata on every row.

---

## Simplest Architecture That Supports the Full Vision

```
src/data/tarot/
  cards.ts          — 78 TarotCard objects, split by arcana for authoring clarity
  spreadPositions.ts — 5 three-card modes + Celtic Cross definitions
  transitAdaptations.ts — ~100 priority card×transit combinations
  astroConnections.ts — card element→suit→Major Arcana planet mappings (pure lookup)

src/engine/tarot.ts  — draw, reversal, context assembly, instant interpretation

src/components/tarot/
  TarotPage.tsx
  SingleCardReading.tsx
  ThreeCardReading.tsx
  CelticCrossReading.tsx
  CardReveal.tsx            — shared flip animation component
  DeckShuffleAnimation.tsx
  TarotInterpretationPanel.tsx
  TarotSynthesisPanel.tsx
  TarotDiscussModal.tsx
  SavedReadingsPage.tsx

server/services/gpt.ts      — 4 new cases added to handleGptRequest switch
server/routes/readings.ts   — or reuse entries route with kind='tarot-reading'
```

The AppState extension is one union type addition (`'tarot'` to `AppView`) and one new interface block (`TarotState`) with current reading, drawn cards, instant interpretations, GPT synthesis status, and saved reading list. Keep the tarot state in `appState.ts` but define its interface separately to avoid making the already-large `AppState` interface even harder to read.

---

## Where to Spend Engineering Effort vs. Take Shortcuts

**Spend real effort on:**
- The 78-card text data. This is the product. A mediocre card dataset produces mediocre readings regardless of how good the engine is. Every reversed meaning needs independent authorship.
- The `transitAdaptations.ts` table. This is the differentiating feature. The ~40 priority card×planet combinations should be carefully chosen: start with the 22 Major Arcana × the 4 outer planets (Uranus, Neptune, Pluto, Saturn) and the 5 most symbolically loaded Minor Arcana (Ace of Swords, Ten of Swords, Three of Swords, Ace of Cups, Ten of Cups). That's roughly the right coverage.
- The GPT prompt structure for three-card and Celtic Cross synthesis. The prompt is the product for the AI layer. A lazy prompt produces generic output.
- The card flip animation. This is the tactile moment of the experience. It should be a smooth CSS 3D transform with a proper timing curve — `transform: rotateY(180deg)` with `perspective: 1200px` on the parent, `backface-visibility: hidden` on both faces, `transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)`. This is 20 lines of CSS. Do it right.

**Take pragmatic shortcuts on:**
- Card assets: start with optimized public domain Rider-Waite images. Custom art is v2.
- Saved readings: reuse the `entries` table with `kind: 'tarot-reading'`. Adding a dedicated `readings` table is premature optimization for v1 scale.
- The spread positions text: `spreadPositions.ts` contains position labels and their meanings. These are short texts (2–3 sentences per position). Write them directly — don't add a framework for this.
- `TarotDiscussModal.tsx`: copy `DiscussModal.tsx` and replace the context builder. The chat UX is identical.

---

## Proposals for Specific Features, Issues, or Code Improvements

**Proposal 1 — Context reuse from TodayPage.** When the user navigates from the Today page to the Tarot module, their transit aspects, moon phase, and advance category are already computed and in memory. The `TarotAstroContext` builder should accept these as optional parameters rather than recomputing them. This avoids redundant astronomical calculations on navigation. Pass them through AppState or a React context prop. The existing `advanceScoring.ts` pre-calculation is expensive; don't run it twice.

**Proposal 2 — Server-side natal context for GPT handlers.** The `handleTarotSingleSynthesis`, `handleTarotThreeSynthesis`, and `handleTarotCelticSynthesis` handlers should follow the `handleTodaySynthesis` pattern: for authenticated users, recompute natal context server-side from `resolveUserBirthContext(userId)` rather than trusting the client-provided `astroContext` object. The client still sends the full context for display purposes, but the server reconstructs the critical fields (natal chart fingerprint, personal day) authoritatively. This is already the established security pattern in this codebase.

**Proposal 3 — `gpt_usage` scoping for Tarot.** The current `gptRateLimit` middleware counts all GPT call types against a single daily quota. For v1 this is fine. But the Tarot module introduces a use case (Celtic Cross = 1 call, Daily card = 1 call) where users will want to budget their quota. Consider adding a `request_type` column to `gpt_usage` at DB creation time even if it's not used for enforcement in v1. Retrofitting this later requires a migration.

**Proposal 4 — Card draw seeding strategy.** Implement `drawCards` as: `seed = hash(userId ?? deviceId, currentDateStr)` for daily single-card readings; `seed = crypto.randomUUID()` for question-based and multi-card readings stored with the reading record. The daily seed gives the "same card for the whole day" semantics without being deterministic across days. Store the seed with saved readings so they can be reproduced exactly.

**Proposal 5 — `computeThreeCardSynthesis` output structure.** The spec lists the fields: main theme, tension, direction, hidden influence, advice, psychological pattern, astrology synthesis, timing/context layer. Before GPT is called, the AI-free layer should compute: dominant arcana type (Major-heavy vs. Minor-heavy), element distribution across the three cards (all fire = intensity, mixed fire/water = emotion under pressure), polarity count (how many reversed), and whether any card is a Major Arcana 0 or 21 (The Fool or The World = beginning or completion framing). These are structural signals that go into the GPT prompt as computed metadata. GPT uses them to write the synthesis; it doesn't need to derive them from the raw card names.

**Proposal 6 — Celtic Cross progressive reveal pacing.** The spec asks for exact UX pacing. Here is the specific model: cards 1–2 are revealed together (Present + Challenge form a central cross — they're always shown as a unit). Cards 3–6 are revealed one at a time, each with a 1.2s pause before the user can proceed. Cards 7–10 (the staff) are revealed one at a time. After card 10, a 2-second pause, then the "The cards are now being read as a constellation" transition text appears over a dark overlay. The GPT synthesis request fires at card 7 (when the spread is committed) so it's ready by the time the user reaches the synthesis screen. This is the same "fire early, display late" pattern already used for GPT synthesis in other modules.

**Proposal 7 — The `TarotJournalBridge` can wait.** The spec includes `TarotJournalBridge.tsx` for attaching readings to journal entries. This is a nice feature but it's a UI affordance over the existing `entries` table pattern. It adds no new backend complexity. Defer it to the end of the sprint. If scope pressure hits, this is the feature to cut — the reading can always be saved and reflected on in the journal separately.

---

## What I'd Do First If I Were Writing This Code

1. Author `src/data/tarot/cards.ts` — all 78 cards with all fields. No engine, no UI, just data. This is the longest single task and it gates everything else. Get it done first.
2. Write `src/engine/tarot.ts` with `drawCards`, `assignReversals`, and `computeInstantInterpretation`. Stub `buildTarotAstroContext` to return a fixed context object. This lets you test the instant interpretation layer before transit data is wired up.
3. Build `CardReveal.tsx` and `DeckShuffleAnimation.tsx` in isolation with placeholder card faces. The flip animation is a core interaction primitive — get it right early.
4. Wire `SingleCardReading.tsx` end-to-end with the AI-free layer only. Ship that first, then add GPT synthesis.
5. Add `'tarot-single-synthesis'` to `handleGptRequest`. At this point you have a working single-card reading with full AI synthesis.
6. Extend to three-card spread. Write `computeThreeCardSynthesis`, add `'tarot-three-synthesis'` case.
7. Add `TarotDiscussModal.tsx` (copy from `DiscussModal.tsx`, takes 2 hours).
8. Celtic Cross. This is its own thing. Keep it separate.
9. Saved readings route + `SavedReadingsPage.tsx`.
10. Subscription gating last — the middleware pattern already exists.

The order matters. Each step is testable in isolation. The biggest risk is trying to build everything in parallel and ending up with nothing working end-to-end.

---

*The codebase is genuinely clean. The GPT dispatch pattern is consistent, the engine layer is well-separated from the UI, and the rate limiting infrastructure will handle Tarot without modification in v1. The work is substantial but the architecture is not the problem — the data authoring is.*
