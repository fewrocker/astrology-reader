# Sprint 0024 — Vision

## Sprint Focus

Turn a working tarot module into a reading that feels like ritual. The mechanics are sound; what is missing is weight — the depth of interpretation, the sharpness of the GPT voice, the quality of the astro-tarot bridge, and the coherence between what the user came to explore and what they receive. This sprint tightens every layer of that chain.

## Why Now

Sprint 0023 shipped the full structural skeleton: 78-card data layer, draw mechanics, three spread types, GPT synthesis handlers, Celtic Cross state machine, saved readings, subscription gate. The module is end-to-end functional. But a structural review of the actual code reveals the gaps the guidelines are pointing at:

**The astro-tarot bridge is thin.** `buildTarotAstroContext` in `TarotPage.tsx` constructs the engine context with empty `currentTransits`, `retrogradeplanets`, and `dominantTransitPlanet` (all hardcoded to `[]`/`null` for the single and Celtic reading flows), while only the three-card flow computes actual transit data. The `CelticCrossReading` component uses a local `buildCelticAstroCtx` that sends empty `significantTransits` and `currentMoonPhase: ''` to the GPT. The Celtic synthesis payload reaches the server without daily or weekly transit summaries — a critical field the single and three-card prompts rely on. Celtic Cross interpretations therefore arrive without the live sky. The same gap exists in the single-card flow: `engineCtx` is built with no real transits, meaning `computeInstantInterpretation` always falls through to the Level 3 baseline, never finding a transit adaptation or element-affinity note.

**The Celtic position-level instant interpretations are skeletal.** `CelticCrossReading` contains a local stub labeled `// ─── Stub: instant interpretation ───` that builds `InstantInterpretation` objects from the raw card fields alone, without calling the real `computeInstantInterpretation` from `src/engine/tarot.ts`. Position meaning, spread-frame context, and all astro signal layers are dropped. The ten cards shown in the `InterpretationPanel` during the reveal sequence carry no position-awareness and no astro connection — they read like dictionary entries.

**The user's intention is not threaded.** The `userIntention` string flows into GPT prompt payloads as a single `intentionLine` prefix, but nothing in the instant interpretation engine, the spread-position adaptation layer, or the Discuss context builder explicitly shapes the card reading around the stated question. The engine's `adaptInterpretationToPosition` function respects spread position framing but has no intention-awareness. The guidelines demand that intention be "threaded explicitly through the interpretation, the GPT prompt payload, the chapter framing, and the Discuss follow-ups."

**The GPT prompt voice is capable but not yet ruthless.** The single-card and three-card prompts are well-structured. The Celtic synthesis prompt is substantive. But reading them against the guidelines reveals hedging patterns: the prompts allow the model to produce generic transit paragraphs, apply to "any other person on the platform," and enumerate correspondences rather than distilling the one true thing. The system prompt and user prompt both need tightening to enforce the "fewer, sharper sentences" and "concrete imagery over abstraction" bar.

**Card-to-card combination logic is absent.** The three-card and Celtic synthesis prompts send pre-computed structural signals (element distribution, dominant arcana, reversal count), but no guidance for reading card 1 + card 2 as a unified central image, no elemental dignity framing, no court-card dynamic logic. The guidelines specifically call out "card-to-card combinations (elemental dignities, court-card dynamics, Major/Minor dialogue, why cards 1+2 form a unified central image)" as depth that must be present.

**Visual polish has not been touched.** The card art is SVG-generated symbolic placeholders — correct for a first pass, but the guidelines call for "deck physics," "glow choreography," "reveal pacing," and "motion timing" as in-scope concerns. The `TarotDeckSelection` fan uses a static ✦ symbol for each card back rather than the `CardBack` component with its breathing pulse and star geometry. The `DeckShuffleAnimation` exists but is not wired into the current home flow (the home view skips directly to deck selection without a shuffle ritual).

## Where to Look

**Interpretation depth — position-aware astro engine for Celtic Cross:**
- `/projects/astrology-reader/src/components/tarot/CelticCrossReading.tsx` — stub `computeInstantInterpretation` at line 78, replace with real call from engine
- `/projects/astrology-reader/src/engine/tarot.ts` — `computeInstantInterpretation` already handles positions; Celtic needs to pass `CELTIC_CROSS_POSITIONS[i]` into it
- `/projects/astrology-reader/src/components/tarot/TarotPage.tsx` — `buildEngineCtx` builds the engine context with empty transit fields (lines 110–126); this needs real transit data wired in for all three reading flows

**Live sky wiring for Celtic Cross:**
- `/projects/astrology-reader/src/components/tarot/TarotPage.tsx` — `buildCelticAstroCtx` sends no transit summaries; the three-card flow already has the correct pattern (`buildThreeAstroCtx` with `dailyTransitData` and `weeklyTransitData`); replicate for Celtic
- `/projects/astrology-reader/server/services/gptTarot.ts` — `handleTarotCelticSynthesis` payload type `TarotCelticSynthesisPayload` has no `dailyTransitSummary` or `weeklyTransitSummary` fields; these need to be added and incorporated in the prompt

**Intention threading:**
- `/projects/astrology-reader/src/engine/tarot.ts` — `computeInstantInterpretation` and `adaptInterpretationToPosition`; intention should shape the framing of position meaning when present
- `/projects/astrology-reader/server/services/gptTarot.ts` — single, three, Celtic, and Discuss prompt templates; intention should be referenced again at the point where card meaning is synthesized, not just at the top
- `/projects/astrology-reader/src/components/tarot/CelticCrossReading.tsx` — `buildDiscussContext` (line 160) for discuss follow-ups

**GPT prompt voice and card-combination depth:**
- `/projects/astrology-reader/server/services/gptTarot.ts` — system prompts for all four handlers; user prompts, especially the Celtic 10-card prompt; the structural signals section for three-card
- Elemental dignity rules, court-card pair dynamics, and positions 1+2 unified-image framing need to be expressed as pre-computed signals passed to the GPT, not left for the model to discover

**Visual ritual and motion:**
- `/projects/astrology-reader/src/components/tarot/TarotDeckSelection.tsx` — card backs in the fan should render `CardBack` component, not a ✦ symbol
- `/projects/astrology-reader/src/components/tarot/TarotHomeView.tsx` — shuffle animation is not wired; `DeckShuffleAnimation.tsx` exists but is unused in the current home flow
- `/projects/astrology-reader/src/components/tarot/tarot.css` — glow choreography, reveal pacing, and element temperature transitions
- `/projects/astrology-reader/src/components/tarot/CardReveal.tsx` — flip animation exists; confirm the reveal pacing (stagger support) feels right in the three-card flow

**Data layer — position-level astro correspondences for Celtic:**
- `/projects/astrology-reader/src/data/tarot/spreadPositions.ts` — Celtic Cross positions have `name`, `description`, `gridArea`; position-specific planetary correspondences (e.g. position 10 / Outcome aligns with Saturn/Jupiter energy) could be added as optional fields to sharpen instant interpretations
- `/projects/astrology-reader/src/data/tarot/astroConnections.ts` — 720+ records; verify that the baseline notes are sharp and specific enough to survive the "could this apply to anyone" test

## Quality Bar

"Deep, not shallow" for this sprint means:

A Celtic Cross position-level instant interpretation must know which card it is, which position it occupies, what the position means in the spread, what the live sky looks like for this user today, and how those three layers combine into one sentence. A Tower in the Foundation position under a Saturn transit reads differently from a Tower in the Outcome position during a Waxing Gibbous — and the interpretation panel must show that difference.

A GPT synthesis is not done until: (1) it would make no sense applied to a different user with different natal placements and a different sky, (2) it names at least one concrete transit or natal placement by sign or house in the context of the actual card rather than as a parallel standalone observation, (3) it follows the spread logic rather than collapsing back into positional minimizations, and (4) the user's stated intention is traceable in more than one paragraph.

A three-card reading synthesis must include one explicit statement about what cards 1 and 2 together are saying as a pair before addressing card 3's direction — not as a separate analysis but woven into the opening constellation sentence.

The ritual feel is not complete until the deck fan shows proper card backs (not ✦ symbols), the shuffle moment has weight before drawing begins, and the element temperature shifts during the Celtic Cross reveal are perceptible enough to register as meaningful.

## What This Sprint Is NOT

- Not a new spread type or new reading mode. The three spread types (single, three-card, Celtic Cross) must be made deeper before a fourth is considered.
- Not a UI redesign or navigation change. The ReadingsModal entry point, the home flow, and the sub-view routing are correct and stable.
- Not a new data layer. The 78-card dataset, 720+ astro connections, and 397+ transit adaptations are sufficient raw material. The work is in how they are used, not in adding more records.
- Not backend infrastructure. The saved readings table, the subscription gate, and the usage tracking are working. Do not touch them unless a depth improvement requires it.
- Not generic astrological content. Do not add horoscope-style sections or general "today's energy" panels disconnected from the drawn cards. Every astro word in the UI must be anchored to a specific card in the spread.
