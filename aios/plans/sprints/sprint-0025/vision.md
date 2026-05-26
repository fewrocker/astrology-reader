# Sprint 0025 — Vision

## Sprint Focus

Complete the tarot integration layer: wire saving across all three reading flows, bring natal house data and the live advance signal into the engine context, make the Discuss panel carry the full reading context, and sharpen the interpretation voice so that every tarot word is grounded in this person's actual sky. The module is structurally complete after sprint 0024. What remains is the connective tissue — the wiring that turns a well-designed architecture into a reading the user can trust, save, return to, and deepen through conversation.

---

## Why Now

Sprint 0024 closed every structural gap it was given: Celtic Cross now calls the real `computeInstantInterpretation`, card backs show in the fan, the type system is unified, elemental dignity shapes three-card synthesis, intention is threaded through all four GPT handlers, and the shuffle ritual is wired. The module is end-to-end functional and depth-calibrated at the GPT layer.

But a close reading of the current code reveals a cluster of wiring failures that sit directly between "it works" and "it can be trusted as a daily practice tool":

**Save is not actually wired.** `TarotPage.tsx` passes `onSave={() => {}}` (a no-op) to every reading flow — lines 217, 284, and 329. `SingleCardReading.tsx` calls `onSave()` when the user taps Save, but the parent does nothing with it. `ThreeCardReading.tsx` calls `onSave()` after synthesis completes. `CelticCrossReading.tsx` calls `onSave(reading)` with the full reading payload — but the TarotPage handler discards it. The `SavedReadingsPage` reads from the database correctly, but no reading ever reaches the database. A user who taps Save receives no error — they receive a deceptive "Saved" label and a silent no-op. This is the most urgent defect in the module.

**The engine context never carries live transits at context-build time.** In `TarotPage.tsx`, `buildEngineCtx` calls `buildTarotAstroContext(chartData, null, ...)` — the second argument is always `null`. This means `dominantTransitPlanet`, `retrogradeplanets`, and `currentTransits` are always empty arrays in the `TarotAstroContext` that flows into `computeInstantInterpretation`. The instant interpretation always falls through to Level 3 (baseline astro note), never finding a transit adaptation or element-affinity note. The daily and weekly transit summaries are computed separately and sent to GPT, but the instant interpretation layer — the one the user sees before GPT loads — is always transit-blind. The fix is to build the `TarotAstroContext` with actual transit data, not null.

**Natal house data is absent from the engine.** `buildTarotAstroContext` extracts Sun sign, Moon sign, Ascendant sign, dominant element, and dominant modality from the natal chart — but nothing about houses. There is no house context in the `TarotAstroContext` type. The GPT synthesis prompts include Big Three signs and transit aspects, but no statement about, for example, which house the user's natal Moon occupies, or which house a given transit planet is activating. House awareness is the difference between "Saturn transits your Mercury" and "Saturn transits your Mercury in the 7th house" — the same transit, radically different meaning. This is the single largest remaining gap in interpretive depth.

**The Discuss panel context is thin.** In `SingleCardReading.tsx`, the `discussContext` string that feeds `TarotDiscussPanel` lists: card name, reversal, arcana, core meaning, symbolic theme, emotional meaning, practical guidance, reflection question, and personal day. It does not include: natal Sun/Moon/Ascendant signs, current transit aspects, advance category, lunar phase, or any indication of what the synthesis said. A user asking "what does this card mean for my relationship?" in Discuss gets a response grounded in the card alone — not in the natal Venus placement or the Venus transit that may be most relevant. The Discuss context must be built from the same rich payload that reaches GPT synthesis.

**The advance signal does not flow into the engine context at the module level.** `buildTarotAstroContext` accepts an `advanceScore` argument, but `buildEngineCtx` in `TarotPage.tsx` always passes `null`. The advance score is available in the app's session cache from `AdvanceTab.tsx` (via `advanceSnapshotSessionCache`). Threading it into the tarot engine context would allow `computeInstantInterpretation` to generate the `advanceCategoryNote` for every card, not just in GPT prompts.

---

## Where to Look

**Save wiring — the immediate defect:**
- `/projects/astrology-reader/src/components/tarot/TarotPage.tsx` — lines 217, 284, 329: the three `onSave={() => {}}` no-ops. Each reading flow must call `saveReading` from the readings service.
- `/projects/astrology-reader/src/services/readingsService.ts` — `saveReading` is already implemented and tested through `CelticCrossReading.tsx`'s `onSave` callback; the pattern exists, just needs to be replicated in `SingleReadingFlow` and `ThreeReadingFlow`.
- `/projects/astrology-reader/src/components/tarot/SingleCardReading.tsx` — `handleSave` at line 85 calls `onSave()` with no payload; the save call needs card, reversed state, synthesis, intention, and spread mode.
- `/projects/astrology-reader/src/components/tarot/ThreeCardReading.tsx` — save is called at lines 854 and 867; likewise needs a payload.
- `/projects/astrology-reader/src/context/TarotContext.tsx` — `SAVE_READING` action dispatches a `readingId`, so the flow after save is already designed; it just needs to be connected.

**Live transit wiring into the instant interpretation engine:**
- `/projects/astrology-reader/src/components/tarot/TarotPage.tsx` — `buildEngineCtx` (lines 117–124): change `buildTarotAstroContext(chartData, null, ...)` to use the already-computed `dailyTransitData` from the reading flow, which is already calculated in `SingleReadingFlow` and `ThreeReadingFlow`. For `CelticReadingFlow`, the same pattern applies.
- `/projects/astrology-reader/src/engine/tarot.ts` — `buildTarotAstroContext` is already correct and handles `TransitData | null`; the problem is purely at the call site.

**Natal house data in the engine context:**
- `/projects/astrology-reader/src/engine/tarot.ts` — `TarotAstroContext` type needs house-relevant fields: at minimum, the house number of the natal Moon, natal Venus, and natal North Node (the three most frequently relevant to tarot readings). `buildTarotAstroContext` already has access to the full `ChartData` including planets with `house` properties.
- `/projects/astrology-reader/server/services/gptTarot.ts` — The synthesis payloads `TarotSingleSynthesisPayload`, `TarotThreeSynthesisPayload`, and `TarotCelticSynthesisPayload` need house-aware fields added. The GPT prompts "This Person's Sky Right Now" sections currently show only signs; adding "Moon in 4th house, Venus in 7th house" transforms the interpretive specificity.
- `/projects/astrology-reader/src/components/tarot/TarotPage.tsx` — The synthesis payload builders in `SingleReadingFlow` and `ThreeReadingFlow` pull from `engineCtx`; house fields added to `TarotAstroContext` will flow through automatically.

**Discuss context depth:**
- `/projects/astrology-reader/src/components/tarot/SingleCardReading.tsx` — `discussContext` (lines 64–77): needs natal sign data, live transit top aspects, advance category, lunar phase, and the GPT synthesis text if loaded.
- `/projects/astrology-reader/src/components/tarot/ThreeCardReading.tsx` — same pattern for the three-card discuss context; it should include all three card interpretations, the spread mode, and the synthesis chapters.
- `/projects/astrology-reader/src/components/tarot/TarotDiscussPanel.tsx` — the component itself is correct; only the `contextString` fed into it needs to be richer.
- `/projects/astrology-reader/server/services/gptTarot.ts` — `handleTarotDiscuss` already has good intention threading; if the context string is richer, the discuss responses will be proportionally more specific.

**Advance signal threading:**
- `/projects/astrology-reader/src/components/tarot/TarotPage.tsx` — the `advanceSnapshotSessionCache` is importable from `AdvanceTab.tsx`; the cached score for today can be read and passed into `buildTarotAstroContext` as the `advanceScore` argument.
- `/projects/astrology-reader/src/engine/tarot.ts` — `buildAdvanceCategoryNote` is already implemented; it just needs a non-null input.

---

## Quality Bar

"Deep, not shallow" for this sprint means:

**Saving must be real and trustworthy.** A user who taps Save on any reading type must get a reading that appears in their Saved Readings list when they return. The "Saved" label must reflect actual persistence, not optimistic UI over a no-op. Error states (network failure, session expired) must be surfaced, not silently swallowed.

**The instant interpretation must see today's sky before GPT loads.** When a user draws The Tower under a Pluto transit, the "In Your Sky Now" section of `TarotInterpretationPanel` must show a transit-aware note — not the Level 3 fallback baseline. The transit adaptation lookup (`TRANSIT_ADAPTATIONS`) has 397+ entries for exactly this purpose; they must actually be reached by passing live transit data into `buildTarotAstroContext`.

**House context must appear in GPT synthesis.** At minimum, the synthesis prompt for a single card must state the natal house of the Moon and the house being activated by the most significant transit aspect. A synthesis that reads "Sun in Scorpio, Moon in Cancer" when the Moon is in the 8th house and Pluto is transiting the 7th is missing the most relevant astrological dimension.

**Discuss must respond to the full reading.** If a user draws the Three of Swords in a Single Card reading with the intention "my relationship," completes the reading, reads the synthesis, and then opens Discuss to ask "is this about a breakup?" — the assistant must have access to the synthesis text, the transit aspects that shaped it, and the natal Venus placement. The response must be irreducibly specific to this person's reading at this moment, not a general Three of Swords explanation.

**Every GPT field added must be used in the prompt.** Do not add fields to payload types that are then ignored in the prompt template. Each new piece of natal or transit data added to a payload must appear explicitly in the corresponding "This Person's Sky Right Now" or "Daily Transit Context" section.

---

## What This Sprint Is NOT

- Not a new spread type. Single card, three-card, and Celtic Cross are the complete reading vocabulary. Adding a fifth or sixth spread mode is out of scope until save, discuss, and the engine context are fully correct.
- Not visual redesign or animation work. The card back, flip animation, shuffle ritual, and element temperature shifts shipped in sprint 0024. Do not re-open those surfaces unless a bug was introduced.
- Not a new subscription gate tier or usage limit change. The existing `tarot_usage` table and `useTarotGate` hook are correct. Do not modify the rate-limiting or tier-gating logic.
- Not a new data layer. The 78-card dataset, 720+ astro connection records, and 397+ transit adaptations are sufficient. The work is in using them correctly at the call sites, not in expanding the records.
- Not the Solar Return, Numerology, Today, or Synastry surfaces. Those features are stable. No work touches them unless a shared utility extraction is strictly necessary.
- Not a prompt rewrite for its own sake. The GPT prompt templates in `gptTarot.ts` are well-crafted after sprint 0024. The prompt changes this sprint are additive: inserting house-aware lines into the "This Person's Sky Right Now" section, not restructuring the prompt architecture.
