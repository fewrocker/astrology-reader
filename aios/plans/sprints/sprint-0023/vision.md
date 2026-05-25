# Sprint 0023 — Vision

## Sprint Focus

Sprint 0023 is the Tarot module. This is the largest and most architecturally complex feature the app has ever built: a fully personalized Tarot reading system that synthesizes card symbolism with natal chart identity, current transits, lunar phase, numerology cycles, and advance scoring signals. The sprint must deliver the complete module — not a prototype, not a teaser — covering the single-card reading, the three-card spread, the Celtic Cross full reading, the AI-free instant interpretation layer, the GPT synthesis layer, the Discuss ✦ chat interface, saved readings with journal integration, the subscription gate, and the visual/emotional experience that makes the module feel ritual-like and cinematic. Because the module is so large, every proposal must be written with full implementation depth: precise data shapes, file paths, component structures, database tables, and prompt payloads. Shallow specs will produce shallow implementations.

---

## Why Now

The app's interpretive infrastructure is mature enough to support Tarot without significant scaffolding work. The engine layer already computes everything Tarot needs: natal chart positions and dominants from `src/engine/astronomy.ts` and `src/engine/types.ts`, current transits via the server's `transitEngine.ts`, lunar phase from `src/engine/lunar.ts`, numerology personal year/month/day from `src/engine/numerology.ts`, and advance scoring category from `src/engine/advanceScoring.ts`. The GPT proxy infrastructure (server-side `gpt.ts` service with retry/timeout/rate-limiting) is battle-tested across six request types. The Discuss ✦ modal pattern (`src/components/discuss/DiscussModal.tsx`) already shows the exact chat UX model Tarot needs. The journal integration point (`src/components/journal/CosmicJournalPage.tsx` + server `entries.ts`) exists and is stable. The subscription tier gate (`UpgradeModal.tsx`, `gptRateLimit` middleware) is in place. The visual language — deep charcoal, gold accents, Cormorant Garamond headings, cinematic card reveals — is defined and proven in prior feature surfaces.

There is no prerequisite work blocking this sprint. Every system Tarot depends on is already built and working. The only thing missing is the Tarot module itself.

Additionally, Tarot is the product's highest-leverage growth surface. It is the one feature that gives users a reason to return daily (single card), weekly (three-card spread), and for significant life moments (Celtic Cross). It also provides the most natural subscription upgrade trigger: free users get limited draws, advanced users get the full Celtic Cross, saved readings, and deep AI synthesis. This is the feature that converts the app from a one-time novelty into a daily practice tool.

---

## Where to Look

### 1. New module root — `src/components/tarot/`

This directory does not exist. The entire Tarot module lives here. Key files to create:

- `TarotPage.tsx` — top-level page with mode selection (single card / three-card / Celtic Cross)
- `SingleCardReading.tsx` — single card draw, reveal, and interpretation
- `ThreeCardReading.tsx` — sequential reveal, spread mode selector, synthesis
- `CelticCrossReading.tsx` — 10-position full reading with progressive reveal
- `CardReveal.tsx` — animated flip component shared across all reading types
- `DeckShuffleAnimation.tsx` — the ritualized draw/shuffle UI
- `TarotInterpretationPanel.tsx` — the instant interpretation display (AI-free)
- `TarotSynthesisPanel.tsx` — the GPT synthesis display with skeleton loading
- `TarotDiscussModal.tsx` — the Discuss ✦ chat, analogous to `DiscussModal.tsx`
- `SavedReadingsPage.tsx` — list and review of saved readings
- `TarotJournalBridge.tsx` — attach a reading to a journal entry

### 2. Tarot data layer — `src/data/tarot/`

This directory does not exist. It must contain:

- `cards.ts` — the complete 78-card deck: Major Arcana (0–21) and Minor Arcana (14 cards × 4 suits). Each card record: `id`, `name`, `arcana`, `suit` (if minor), `number`, `element`, `planet` (for Major Arcana), `keywords: string[]`, `uprightMeaning: string`, `reversedMeaning: string`, `symbolicTheme: string`, `emotionalMeaning: string`, `practicalGuidance: string`, `reflectionQuestion: string`, `numerologyResonance: string`.
- `astroConnections.ts` — the static mapping layer connecting each card to astrological themes: Major Arcana to their ruling planet/sign, suit elements (Wands=Fire, Cups=Water, Swords=Air, Pentacles=Earth). Used to compute the Tarot+Astrology integration without GPT.
- `spreadPositions.ts` — definitions for every spread: three-card spread modes (Past/Present/Future, Situation/Challenge/Advice, Mind/Heart/Action, Self/Other/Bridge, Theme/Shadow/Gift) with per-position meaning text; Celtic Cross 10-position definitions with positional meanings.
- `transitAdaptations.ts` — a lookup table of archetype overrides by card × transit combination. For example: `{ card: 'the-hermit', transitPlanet: 'Mercury', transitType: 'retrograde', emphasis: 'withdrawal, review, reflection, internal restructuring' }`. This is the static foundation for the Tarot+Astrology synthesis that runs before GPT.

### 3. Tarot engine — `src/engine/tarot.ts`

A new engine module responsible for:

- `drawCards(n: number, seed?: string): TarotCard[]` — deterministic card draw that uses the user's natal chart data as a seed component so draws are not purely random.
- `assignReversals(cards: TarotCard[], seed?: string): boolean[]` — determines upright/reversed for each drawn card.
- `buildTarotAstroContext(chartData: ChartData, transitData: TransitData | null, numerologyDay: number, advanceCategory: string | null): TarotAstroContext` — computes the full astrological context object used by both the instant interpretation layer and the GPT prompt.
- `computeInstantInterpretation(card: TarotCard, reversed: boolean, position: SpreadPosition | null, context: TarotAstroContext): InstantInterpretation` — the AI-free layer. Returns the complete per-card interpretation by combining card data, position meaning, and static transit adaptations.
- `computeThreeCardSynthesis(cards: DrawnCard[], context: TarotAstroContext): ThreeCardSynthesis` — the AI-free synthesis structure (main theme, tension, direction, hidden influence, advice, psychological pattern) before GPT enrichment.

### 4. Server GPT integration — `server/services/gpt.ts` and `server/engine/`

The server already handles GPT dispatch via `handleGptRequest`. Three new `case` branches need to be added:

- `'tarot-single-synthesis'` — generates the AI synthesis for a single card reading. Payload: card data, reversed state, instant interpretation, astro context, user question/intention.
- `'tarot-three-synthesis'` — generates the full 3-card reading synthesis. Payload: all three cards with positions, instant interpretations, the AI-free synthesis skeleton, astro context.
- `'tarot-celtic-synthesis'` — generates the Celtic Cross synthesis. Payload: all 10 cards with positions, instant interpretations, astro context, user intention.
- `'tarot-discuss'` — the Discuss ✦ chat handler, analogous to `'astro-discuss'`. Payload: full reading context (cards, positions, interpretations, natal chart, transits, numerology, advance signal, user question).

There may also be a need for a `server/engine/tarotEngine.ts` that handles server-side context assembly (the same way `chartEngine.ts`, `transitEngine.ts`, etc. handle their respective computation) if any calculation is moved server-side.

### 5. App state and navigation — `src/context/appState.ts`, `App.tsx`

A new `AppView` value `'tarot'` must be added. Tarot reading state must be incorporated into `AppState`: current reading type, drawn cards, interpretation results, saved reading IDs. Navigation from the Home screen (`HomeScreen.tsx`) and the main navigation (`src/components/navigation/`) must include a Tarot entry point.

### 6. Saved readings — server `routes/` and `db.ts`

Saved readings require a new server route (e.g., `server/routes/readings.ts`) and a new DB table. The schema should store: user ID, reading type (single/three/celtic), drawn cards + reversals, spread mode, user question/intention, astro context snapshot (natal chart fingerprint, transit snapshot date, numerology day), full interpretation payload, created timestamp, optional journal entry linkage.

### 7. Subscription gating — `src/components/subscription/UpgradeModal.tsx`, `server/middleware/gptRateLimit.ts`

The gating model from the spec:
- **Free**: limited daily card draws (e.g., 1 per day), limited three-card readings (e.g., 1 per week), limited AI synthesis (count-gated, same mechanism as existing GPT rate limiting).
- **Advanced**: unlimited draws and three-card readings, full Celtic Cross, saved readings, journal integration, deep AI synthesis, full Discuss ✦.

The existing `gptRateLimit` middleware and `UpgradeModal` pattern must be extended to handle Tarot-specific limits. The `UpgradeModal` copy should be updated to mention Tarot.

### 8. Visual assets — `src/assets/tarot/` or CSS/SVG card faces

The spec calls for beautiful custom tarot card faces that feel collectible and iconic. This is a significant design decision. Options: (a) SVG card faces designed in code, (b) a curated open-license deck (e.g., Rider-Waite in public domain), (c) symbolic placeholder cards with rich CSS treatment as a first implementation. The proposal for this area must make a concrete decision and specify the exact asset pipeline.

---

## Quality Bar

"Deep, not shallow" for sprint 0023 means the Tarot module must feel like a fully realized product feature from day one, not a skeleton to be fleshed out in future sprints.

**The AI-free interpretation layer must be complete for all 78 cards.** Every card must have upright and reversed meanings, an emotional interpretation, a practical guidance line, a reflection question, and a numerology resonance note. This is non-negotiable — the spec explicitly states that every reading must work instantly without AI. A placeholder array or a deck of 10 cards is not acceptable.

**The Tarot+Astrology integration must be dynamic, not decorative.** The astro connection cannot be a static sentence appended to every reading ("your natal sun is in Scorpio"). It must actually change the emphasis of the reading based on the current sky. The Tower card during a Uranus transit should emphasize disruption and liberation in a way the same card during a Neptune transit would not. The `transitAdaptations.ts` lookup table and the `computeInstantInterpretation` engine must handle this before GPT even loads.

**The three-card synthesis must understand card interactions.** The synthesis layer (both AI-free skeleton and GPT enrichment) must treat the three cards as a constellation, not three independent readings. If the spread shows The Hermit → Death → The Star, the synthesis should identify the theme of necessary withdrawal leading to transformation and emergence — it should not be three separate card descriptions with a paragraph break between them.

**The Celtic Cross synthesis must feel like a different class of experience from the three-card reading.** It should be slower, deeper, and more reflective. The proposal for the Celtic Cross must specify the exact UX pacing: how cards are revealed, what the user sees between reveals, what the "The cards are now being read as a constellation" transition looks like, and how the full synthesis is structured and displayed.

**The Discuss ✦ context payload must be complete.** When the user opens Discuss ✦ from any Tarot reading surface, the chat context must include: all drawn cards with positions and reversal states, the full instant interpretation, the GPT synthesis if loaded, natal chart positions (Big Three + houses), current transits, numerology personal day/year, advance category signal, and the user's stated reading question/intention. A partial context payload produces a worse AI response.

**The visual experience must be earned, not bolted on.** Card flip animations, the shuffle ritual, atmospheric transitions, and the progression from draw to reveal to interpretation to synthesis are all part of the feature quality. The proposals for visual components must specify animation parameters (duration, easing, stagger timing) and not leave them as "TODO: add animation."

**Proposals must be implementable as written.** Each task proposal must include: exact TypeScript types for new data structures, the complete list of new files to create, the specific diff to existing files (which imports to add, which `case` branches, which `AppView` values, which DB columns), and the full GPT prompt template. A proposal that says "create a card component" without specifying the props interface, the animation trigger, and the interpretation data shape is not ready for implementation.

---

## What This Sprint Is NOT

- **Not an advance engine sprint.** `AdvanceTab.tsx`, `CoupleAdvanceTab.tsx`, `advanceScoring.ts`, and `runAdvancePreCalculation` are frozen. The advance engine is referenced by Tarot as an input signal (advance category informs the Tarot interpretation tone) but is not modified.

- **Not a Today page, Transit Reading, or Synastry sprint.** These surfaces are stable after sprint 0022. No work touches `TodayPage.tsx`, `TransitReadingPage.tsx`, `SynastryPage.tsx`, or their related interpretation data files unless Tarot explicitly requires a shared component extraction.

- **Not a numerology sprint.** The numerology personal day/year numbers are consumed by the Tarot+Astrology layer as inputs, but `NumerologyPage.tsx`, `src/engine/numerology.ts`, and the numerology interpretation database are not modified.

- **Not a Solar Return sprint.** `SolarReturnPage.tsx` is not touched.

- **Not a UI system redesign.** The existing color palette, font stack, and component design language are the foundation for Tarot — not a departure from it. The Tarot module should feel native to the existing app, not like a separate product injected into it.

- **Not a partial Tarot implementation.** If the sprint scope proves too large for all three reading types plus saved readings plus subscription gating, the correct response is to prioritize the single-card and three-card readings at full depth over a skeleton of all five features. But the target is the complete module. "We'll add Celtic Cross later" is not acceptable unless a specific, explicitly scoped deferral proposal is written with a clear continuation path.

- **Not a reading experience without visual identity.** Shipping Tarot without the card flip animation, without the shuffle ritual, and with placeholder colored rectangles for card faces is shipping half a feature. The visual and emotional experience is part of the spec, not a nice-to-have.
