# Technical Analysis — Tarot Module (Sprint 0024)
*Voice: John Carmack*

---

## What I Actually Read Before Writing This

I read the sprint 0024 vision, the guidelines, and then the actual shipped code: `src/engine/tarot.ts` (full), `server/services/gptTarot.ts` (full), `src/services/gptInterpretation.ts` (full, both the proxy layer and the Celtic synthesis adapter), `src/context/TarotContext.tsx`, `src/components/tarot/TarotPage.tsx`, `src/components/tarot/CelticCrossReading.tsx`, `src/components/tarot/ThreeCardReading.tsx`, `src/components/tarot/TarotDeckSelection.tsx`, `src/components/tarot/CardBack.tsx`, `src/components/tarot/DeckShuffleAnimation.tsx`, `src/components/tarot/TarotHomeView.tsx`, `src/data/tarot/spreadPositions.ts`, `src/components/tarot/types.ts`, and spot-checks of `astroConnections.ts` and `transitAdaptations.ts`. What follows is what I actually found, not what the vision document predicts.

---

## The Single Biggest Architectural Problem: The Stub That Was Never Removed

The vision document calls this out clearly, and it is exactly as bad as described. In `src/components/tarot/CelticCrossReading.tsx`, lines 76–92, there is a local function named `computeInstantInterpretation` that shadows the real engine function of the same name. It says so in the comment: `// ─── Stub: instant interpretation ─── Engine (task-0006) will provide a proper computeInstantInterpretation.`

Task-0006 landed. The real `computeInstantInterpretation` exists in `src/engine/tarot.ts` and it is the real thing — it does transit lookups, element affinity scoring, three-level fallback, position-aware meaning adaptation, lunar phase notes, advance category notes, numerology matching. The stub in `CelticCrossReading.tsx` does none of this. It constructs a flat `InstantInterpretation` object from the card's raw data fields and a one-line reversal sentence. No position awareness. No astro context. No transit influence.

This means every card in the Celtic Cross `InterpretationPanel` during the reveal sequence — the moment the user is sitting with each card — is reading from a dictionary entry that would apply identically regardless of which position the card occupies, what day it is, what the sky looks like, or what the user asked. The Tower in Position 3 (Unconscious Influence) under a Saturn transit reads the same as the Tower in Position 10 (Outcome) during a New Moon. That is not a minor gap. That is the feature not working.

The fix is mechanical and not architecturally complex. In `CelticCrossReading.tsx`, `handleActualDeckSelect` calls the local stub. Replace it with the real engine function. The real `computeInstantInterpretation` takes `(card: TarotCard, reversed: boolean, position: SpreadPosition | null, astroContext: TarotAstroContext)`. The component already has `tarotAstroContext` as a prop. The Celtic Cross positions are in `CELTIC_CROSS_POSITIONS`. The card data is in `deck` as `DataTarotCard`. The only missing piece is that `CelticCrossReading.tsx` uses a local `TarotAstroContext` type from `./types` and the engine uses `EngineCtx` from `src/engine/tarot.ts` — there's a type impedance mismatch between the two, and that mismatch is the actual reason the stub exists. The real fix is to make `CelticCrossReading.tsx` accept the engine's `EngineCtx` or to add a converter in `TarotPage.tsx` alongside the existing `buildCelticAstroCtx`.

Speaking of which: `buildCelticAstroCtx` in `TarotPage.tsx` (lines 155–167) is itself a problem. It returns a `CelticCtx` with `currentMoonPhase: ''` and `significantTransits: []`. It computes personal day and year from birth date, but nothing about the actual sky. Compare this to `buildThreeAstroCtx` (lines 128–153) which receives `dailyTransitSummary` and `weeklyTransitSummary` as computed parameters. The three-card flow wires actual transits. The Celtic Cross flow hardcodes empty strings. The same `calculateTransits` calls are right there in the same file — `ThreeReadingFlow` computes them. `CelticCrossReading` just never receives them. This is a wiring omission, not an architectural limitation.

---

## The Second Biggest Problem: Dual Draw Mechanisms

The codebase has two completely separate deck shuffle and card draw implementations.

`DeckShuffleAnimation.tsx` has its own `drawCards(count: number)` (line 80–87) that uses `Math.random()` directly with Fisher-Yates. It has its own local `CardBack` component. It manages its own state machine with `useReducer` and `ritualReducer`. It is a full standalone ritual flow with a 2000ms shuffle animation, fade transitions, intention echo, and progressive reveal.

`CelticCrossReading.tsx` has its own `shuffleTarotDeck()` (lines 47–54) and `computeCardReversal()` (line 56–58), also using `Math.random()`. `TarotPage.tsx` has yet another `shuffleTarotDeck()` (lines 33–42) and `computeCardReversal()` (line 44–46).

That is three separate shuffle implementations in three files. The deterministic seed-based `drawCards` in `src/engine/tarot.ts` — which is architecturally correct, produces reproducible draws, and was designed to be the canonical draw function — is used only by the single-card and three-card flows via `TarotPage.tsx`. The Celtic Cross bypasses the engine entirely and uses a fresh `Math.random()` shuffle on every mount.

This creates a bug: the Celtic Cross draw is not reproducible. If a user saves a Celtic Cross reading and loads it later, there is no way to verify which cards were drawn. The saved reading stores `cardId` and `reversed` for each position, so display is fine, but the draw mechanism is detached from the deterministic engine that was built to handle this. The single-card flow uses a deterministic seed (`computeDailyDrawSeed` or a UUID-based approach); the Celtic Cross does not.

The correct architecture is one draw path. `drawCards` and `assignReversals` in `src/engine/tarot.ts` should be the only shuffle implementation in the codebase. `DeckShuffleAnimation.tsx` should receive the pre-drawn card indices from the parent (as a prop), not draw them internally. Right now `DeckShuffleAnimation.tsx` is a component that draws cards, which mixes presentation with game logic.

---

## Type Proliferation: Four Parallel Type Systems

This is technical debt that is already causing real bugs and will cause more.

There are four separate `TarotAstroContext` interfaces in the codebase:

1. `src/engine/tarot.ts` — `TarotAstroContext` (the canonical engine type, has `currentTransits: TransitAspect[]`, `retrogradeplanets: string[]`, `dominantTransitPlanet: string | null`, `lunarPhaseName`, `lunarPhaseSymbol`, `personalDay`, `advanceCategory`, `advanceReason`)
2. `src/context/TarotContext.tsx` — `TarotAstroContext` (React context type, has `moonPhase: unknown | null`, `transitAspects: unknown[] | null`, `dominantElement: 'Fire' | 'Water' | 'Air' | 'Earth' | null`) — note `unknown` types, which means this context is carrying data that nothing can safely use
3. `src/components/tarot/types.ts` — `TarotAstroContext` (Celtic component type, has `significantTransits: string[]`, `currentMoonPhase: string`, `numerologyYear: number`)
4. Implied by `buildThreeAstroCtx` in `TarotPage.tsx` — a fourth structural variant used for the three-card flow that has `dailyTransitSummary`, `weeklyTransitSummary`, `moonSignNatal`, `dominantElement` as string (not Element type), etc.

There are also two separate `InstantInterpretation` interfaces:
- `src/engine/tarot.ts` — the canonical one with `astroConnection: AstroConnection`, `positionLabel`, `positionMeaning`, `numerologyNote`, etc.
- `src/components/tarot/types.ts` — a flatter version used by `CelticCrossReading.tsx` with `position: number`, `positionName`, `positionDescription`, `astroConnection: string` (just a string!), and no `numerologyNote` or `astroHeadline`

And two separate `DrawnCard` interfaces:
- `src/engine/tarot.ts` — has `card: TarotCard`, `reversed: boolean`, `interpretation: InstantInterpretation`
- Multiple component files — flat structure with `cardId`, `cardName`, `arcana`, `suit`, `element`, `reversed`, `coreMeaning`, `symbolicTheme`, `emotionalMeaning`, `astroConnection: string`

The adapter functions (`adaptSingleCard`, `adaptSingleInterp`, `adaptThreeDrawnCard`, `adaptThreeInterp`) in `TarotPage.tsx` exist entirely to convert between these parallel type systems. They are boilerplate that would not exist if there were one canonical type. Every time a field needs to be added to the interpretation layer, it has to be added in multiple places. The `astroConnection` field in the Celtic component type is a `string` — it carries the minimal information from `toDrawnCard` in `CelticCrossReading.tsx` (line 71: a join of `rulingPlanet` and `rulingSign` with a fallback), instead of the full `AstroConnection` object that the engine computes.

The fix: `src/engine/tarot.ts` types should be the single source of truth. The component types in `src/components/tarot/types.ts` should either re-export from the engine or be eliminated. The React context type in `TarotContext.tsx` has `unknown` types — that interface should be defined or removed, not left as a floating parallel definition with phantom fields.

---

## The Celtic Synthesis Payload Delivers Less Than the Server Can Use

`TarotCelticSynthesisPayload` in `server/services/gptTarot.ts` (lines 94–110) does not have `dailyTransitSummary` or `weeklyTransitSummary` fields. The single and three-card synthesis payloads do. So the Celtic GPT synthesis — the most complex and highest-stakes call in the system, at 3000 tokens — goes to the server without the detailed transit information that makes the single-card synthesis concrete.

Look at the Celtic synthesis prompt in `handleTarotCelticSynthesis` (lines 497–546). The "Living Sky" section is: natal signs, life path, personal year and day, current moon phase, advance signal. That is all. No transit aspects. No retrogrades. No ingresses. The single-card prompt has a full `## Daily Transit Context` and `## Weekly Transit Context` section — structured, named, concrete. The Celtic prompt has none of this.

The section labeled `**Astrology Resonance**` in the Celtic synthesis instructs the model to "be specific — name the sign or transit that directly amplifies a card's meaning." But the prompt provides no transit data to be specific from. The model will hallucinate transit data or default to natal placements. That is not a prompt-writing problem; it is a missing data problem. The payload type needs `dailyTransitSummary: string | null` and `weeklyTransitSummary: string | null`, and `handleTarotCelticSynthesis` needs to recompute them for authenticated users the same way `handleTarotThreeSynthesis` already does.

The client-side adapter in `gptInterpretation.ts` (lines 546–595, `getTarotCelticSynthesis`) constructs the `TarotCelticSynthesisPayload` from a `CelticSynthesisPayload`. That adapter passes `number: 0` for every card (line 558: `number: 0`) and blank strings for `practicalGuidance`, `reflectionQuestion`, `numerologyResonance`, and `transitInfluence`. These are stripped out during the type conversion from the Celtic's local `DrawnCard` format to the server payload. The server never receives practical guidance or transit influence per card for the Celtic synthesis. For a 3000-token synthesis, this is a significant data loss.

---

## The Intention Is Not Threaded

The sprint vision says intention must be "threaded explicitly through the interpretation, the GPT prompt payload, the chapter framing, and the Discuss follow-ups." Here is what actually happens:

In `buildCelticSynthesisPayload` (line 130 in `CelticCrossReading.tsx`), `userIntention` is passed through to the payload. In `handleTarotCelticSynthesis`, the `intentionLine` is placed at the very top of the prompt (line 493): `"This reading was drawn with the intention: "..."`. Then it appears nowhere else in the 50-line prompt. Not in the Constellation section instruction, not in the Psychological Dynamics section, not in the Reflection Prompts instruction. The model receives the intention once, at the top, and then is given no further instruction to integrate it.

In `adaptInterpretationToPosition` in `src/engine/tarot.ts` (lines 295–320), the function accepts `position: SpreadPosition | null` but no `intention` parameter. The position-specific framing is spread-type-aware but intention-unaware. A three-card reading about "career" and a three-card reading about "love" with the same three cards in the same spread type would produce identical instant interpretations from the engine. The intention is not wired into the interpretation layer at all — only into the GPT synthesis prompt as a prefix line.

The fix for the engine layer is simple: add `intention: string | null` as an optional parameter to `computeInstantInterpretation`, pass it to `adaptInterpretationToPosition`, and use it to select or bias the reflection question and core framing. Not a rewrite — a targeted addition.

---

## Elemental Dignity and Card-Combination Logic: Absent

The three-card `computeThreeCardSynthesis` in `src/engine/tarot.ts` computes `fireWaterTension` (line 777), which is correct and useful. But elemental dignity — the classical tarot system where Fire cards support Air cards and Water cards support Earth cards, while opposite pairs weaken each other — is not computed anywhere. The engine knows each card's element. The engine knows all three cards together. The computation `cardA.element supports/opposes cardB.element` is trivial. But it does not happen.

In `computeThreeCardSynthesis`, the `astroResonanceNote` built at lines 807–820 is the only place where card combinations affect output. That note goes into the GPT prompt as a single string. The GPT model does not receive explicit signals about whether cards 1 and 2 form a harmonious or opposing pair by element, whether court cards are present in a relational dynamic, or whether the numerological sequence is ascending, descending, or non-sequential.

The three-card synthesis `signals` object passed to the server includes `dominantArcana`, `elementDistribution`, `polarityCount`, `hasFoolOrWorld`, `dominantSuit`, `numeralProgression`. That `numeralProgression` field in `ThreeCardSignals` says `string | null` — in `computeThreeCardSynthesis` in `ThreeCardReading.tsx` (the component-local version), it builds this as a string like `"Position 0: Fool, Position 1: High Priestess, Position 2: Empress"`. That is not a structural signal — that is a data dump. The server cannot derive "ascending sequence" from that string with high reliability. A boolean like `numericallyAscending: boolean` or `sequenceDirection: 'ascending' | 'descending' | 'non-sequential' | null` would be a real structural signal.

Elemental dignity between adjacent cards (not just the aggregate) would be: `adjacentCompatibility: Array<'harmonious' | 'opposing' | 'neutral' | 'neutral-missing'>` — one entry per adjacent pair. Three cards = two adjacency pairs. The GPT prompt can then say "cards 1 and 2 are in elemental opposition" as a pre-computed fact rather than asking the model to figure it out from element labels.

---

## The Deck Fan Renders the Wrong Component

`TarotDeckSelection.tsx` renders each card in the fan as a `<button>` containing the ✦ symbol (line 160). The `CardBack` component exists in `src/components/tarot/CardBack.tsx` with the full eight-pointed star geometry, inset gold frame, and structural SVG lines. It is not used in `TarotDeckSelection`. The deck fan — the primary visual affordance for the entire ritual before a card is drawn — shows a Unicode glyph inside a CSS box instead of the actual card back component that was built for exactly this purpose.

This is not a hard problem. `TarotDeckSelection.tsx` needs to `import { CardBack } from './CardBack'` and render `<CardBack />` instead of `✦` inside the button. The button dimensions (72×116px from `BASE_CARD_STYLE`) match the `CardBack` component's `width: 100%; height: 100%` sizing. It is a two-line change that makes the deck fan look like an actual deck.

---

## The DeckShuffleAnimation Is Orphaned

`DeckShuffleAnimation.tsx` is a well-built component. It has a proper state machine with `useReducer`, accessibility live regions, reduced-motion handling, keyboard support, 3D flip animation with `backface-visibility: hidden`, and a three-card fan shuffle animation. It is not connected to any current reading flow. The single-card flow uses `TarotDeckSelection` for card picking. The home view navigates directly to the reading components. The `DeckShuffleAnimation` component is imported nowhere in the active code paths.

Wiring it in would require: `TarotHomeView.tsx` → after mode selection, instead of immediately dispatching `NAVIGATE_TAROT`, show the shuffle animation → on completion, navigate to the reading view. The component's props (`onCardSelected`, `onRevealComplete`, `cardCount`) are designed for this handoff pattern. The issue is that `DeckShuffleAnimation` draws its own cards (the orphaned `drawCards` function on line 80), which needs to be replaced with cards drawn from the engine. This is not a two-line fix, but it's not a week of work either.

---

## Performance Issue: `formatTransitSummary` Duplicated Across Client and Server

`formatTransitSummary` in `src/components/tarot/TarotPage.tsx` (lines 169–203) is identical to `formatTransitSummary` in `server/services/gptTarot.ts` (lines 117–152). Character for character, same logic: daily vs. weekly label, top aspects slice, ingresses, retrogrades. It is copy-pasted.

The client-side version is used to build the transit summary strings that are sent up in the payload. The server-side version is used to rebuild them from birth context for authenticated users. Because the server rebuilds them anyway for authenticated users, the client is doing transit computation (`calculateTransits(chartData, 'daily')`) and string formatting work that the server immediately discards and recomputes. For unauthenticated users, the client-computed version is used directly.

This is fine as an architecture, but the code duplication is a maintenance liability. The shared function should live in a shared module (either `src/engine/transitFormatting.ts` or a server utility), not be copy-pasted in two places where they will inevitably diverge.

Additionally: `buildEngineCtx` in `TarotPage.tsx` (lines 110–126) creates an `EngineCtx` with all transit fields set to empty (`currentTransits: []`, `retrogradeplanets: []`, `dominantTransitPlanet: null`, `lunarPhaseName: null`, `lunarPhaseSymbol: null`). This context is used by `SingleReadingFlow` and `ThreeReadingFlow` to call `computeInstantInterpretation`. So for single-card and three-card flows, the instant interpretation at the client level always falls through to the Level 3 baseline in `buildTransitInfluence` — the `astroConn.baselineNote` or the card's ruling planet fallback — because `currentTransits` is always empty. The daily and weekly transit data is computed right there in the same component (lines 284–285, lines 368–369) but is only passed to the GPT payload, not back into the engine context that drives the instant interpretation layer. The engine receives an empty sky while the GPT receives the real sky.

The fix: `buildEngineCtx` should call `buildTarotAstroContext` from `src/engine/tarot.ts` instead of manually constructing the struct with empty transit fields. That function already accepts `transits: TransitData | null` and correctly computes `dominantTransitPlanet`, `retrogradeplanets`, and `lunarPhaseName`. Pass the `dailyTransitData` that is computed a few lines later. Then the instant interpretation layer will have the real sky.

---

## Minor But Concrete: `computePersonalDay` Duplicated

`TarotPage.tsx` has its own `computePersonalDay` and `computePersonalYear` (lines 50–84). `src/engine/numerologyEngine.ts` (or equivalent) already has these. `server/services/gptTarot.ts` imports `calculatePersonalDay` from `'../engine/numerologyEngine.js'`. The client-side computation is a local reimplementation, not an import from the engine. Whether the two implementations agree numerically I do not know without running them, but having two implementations is wrong regardless. Import from the engine.

---

## What to Fix First, In Order

1. **Wire real transits into `buildEngineCtx`.** Replace the manually constructed empty-transit struct with a call to `buildTarotAstroContext(chartData, calculateTransits(chartData, 'daily'), computePersonalDay(birthDate), null)`. This immediately makes the single-card and three-card instant interpretations use the real sky. One function call change.

2. **Replace the Celtic stub with the real engine call.** In `CelticCrossReading.tsx`, import `computeInstantInterpretation` from the engine, add a proper `EngineCtx` builder for Celtic (same as `buildEngineCtx` but passed through to the component), and remove the local stub. This requires resolving the type mismatch between `CelticCtx` and `EngineCtx`.

3. **Add `dailyTransitSummary` and `weeklyTransitSummary` to `TarotCelticSynthesisPayload`.** Update the server handler to incorporate them in the Celtic prompt the same way the single and three-card handlers do. Update the client adapter to compute and include them.

4. **Replace ✦ with `<CardBack />` in `TarotDeckSelection.tsx`.** Two-line change, immediate visual improvement.

5. **Wire `DeckShuffleAnimation` into the home flow.** Adds ritual weight before drawing begins.

6. **Add elemental dignity and card-pair signals to `computeThreeCardSynthesis`.** Compute adjacency compatibility per pair, not just aggregate element distribution. Pass as structured signals to the GPT prompt.

7. **Thread intention through `adaptInterpretationToPosition`.** Add `intention: string | null` parameter, use it to bias the reflection question and core framing selection when present.

8. **Consolidate the parallel type systems.** One `TarotAstroContext`, one `InstantInterpretation`, one `DrawnCard`. Everything else derives from these.

---

## What Is Actually Good

The `buildTransitInfluence` three-level fallback system in `src/engine/tarot.ts` is solid. Level 1 (explicit transit adaptation lookup), Level 2 (element affinity with dominant transit planet, including cross-element tension), Level 3 (baseline from astro connection or ruling planet) — this is a sensible degradation ladder. When transit data is actually passed in, it will produce genuinely differentiated output per card.

The `adaptInterpretationToPosition` function is well-structured. The spread-profile system with `coreFrame`, `emotionalFrame`, `practicalFrame`, `reflectionFrame` arrays per position is clean and correct. The problem is not that it's over-engineered — the problem is that the Celtic Cross never reaches it.

The Celtic state machine phase system in `CelticCrossReading.tsx` is thoughtful. The timing logic, the `synthesisFireRef` early-fire pattern, the `chaptersDisplayed` progressive reveal, and the 90-second timeout check are all correct. The ritual sequencing works. It is the interpretation data underneath the sequencing that is hollow.

The GPT single-card and three-card system prompts and user prompts are genuinely good. The instruction to cite at least one concrete transit feature from each context block and explicitly connect it back to the card's symbolism is the right constraint. The labeled-section format for the three-card synthesis (OPENING_SENTENCE, MAIN_THEME, etc.) is the right pattern for structured extraction.

---

*The architecture is not broken. The data pipeline has clear gaps where wires were intentionally not connected in sprint 0023 and the stubs were never replaced. The sprint 0024 work is not a rewrite — it is completing the connections that were deferred. The code for making it real already exists in the engine. It just needs to be called.*
