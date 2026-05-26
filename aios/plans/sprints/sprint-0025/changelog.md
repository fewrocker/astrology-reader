# Sprint 0025 — Changelog

**Sprint focus:** Tarot integration layer — wiring saving, live transit context, house awareness in GPT synthesis, richer Discuss context, shared utilities
**Merged:** 2026-05-26

---

## Bug Fixes

### Advance Score Never Reached Tarot Engine (`task-0001`)
- **Problem:** `buildEngineCtx` in `TarotPage.tsx` always passed `null` as the `advanceScore` argument to `buildTarotAstroContext`. This made `advanceCategory` and `advanceReason` permanently null throughout the tarot engine, causing `buildAdvanceCategoryNote` to always return `''`. All five entries in `ADVANCE_CATEGORY_NOTES` (`power`, `favorable`, `challenging`, `shift`, `neutral`) were dead code — never returned for any reading.
- **Solution:** Added `readTodayAdvanceScore()` helper that reads the user's current advance score from `advanceSnapshotSessionCache` (the same pattern used in `TodayPage.tsx`). `buildEngineCtx` now passes the live score into `buildTarotAstroContext`. A Power Day draw now returns "Today's sky is heightened — this card's energy arrives with unusual force and clarity."

### Discuss Panel Had No Knowledge of the User or Reading (`task-0002`)
- **Problem:** The `discussContext` strings in `SingleCardReading.tsx` and `ThreeCardReading.tsx` contained only card-level data, omitting natal signs, transits, lunar phase, and synthesis text. The Discuss assistant had no awareness of who the person is astrologically or what the reading said.
- **Solution:** Both flows now build a full discuss context via a dedicated `buildDiscussContext` helper mirroring the Celtic Cross pattern. Context includes natal Sun/Moon/Ascendant signs, dominant element, lunar phase, personal day, advance category, daily transit summary, all interpretation fields, and the full GPT synthesis text when loaded.

### Save Was Wired to No-Ops in All Three Reading Flows (`task-0003`)
- **Problem:** `TarotPage.tsx` passed `onSave={() => {}}` — a literal no-op — to all three reading components. When a user tapped Save, the UI showed "Saved ✓" while the database received nothing. The `SavedReadingsPage` had no readings to display. The `CelticCrossReading` was building a payload of the wrong type. The save error state in `ThreeCardReading` was structurally unreachable.
- **Solution:** Each reading flow now has a real async `handleSave` that builds a `SaveReadingRequest`, calls `saveReading()`, and dispatches `SAVE_READING` with the returned ID. Confirmation UI only appears after DB success. Error states are reachable and show retry UI. Auth token is supplied by the flow container, not hardcoded.

### Phantom `instantInterpretations` in ThreeCardReading Dependency Array (`task-0004`)
- **Problem:** A `useEffect` in `ThreeCardReading.tsx` listed `instantInterpretations` in its dependency array — a variable that no longer exists anywhere in the component scope. The phantom reference caused inaccurate dependency tracking.
- **Solution:** Removed `instantInterpretations` from the dependency array.

### Transit Context Always Null — 397+ Adaptations Unreachable (`task-0005`)
- **Problem:** `buildEngineCtx` always passed `null` for transit data, leaving `currentTransits`, `retrogradeplanets`, and `dominantTransitPlanet` empty in every `TarotAstroContext`. `buildTransitInfluence` always fell through to the Level 3 baseline fallback. The 397+ entries in `TRANSIT_ADAPTATIONS` were unreachable.
- **Solution:** `buildEngineCtx` now accepts `dailyTransitData: TransitData | null`. All three reading flows already computed this value — they now pass it through. `buildTransitInfluence` can now reach Level 1 (card-specific transit adaptations) and Level 2 (element-affinity notes). The Tower drawn under a Pluto transit now shows the Pluto-specific note.

---

## Code Enhancements

### Tarot Shared Utilities Module (`task-0006`)
- **Problem:** `shuffleTarotDeck` and `computeCardReversal` were defined identically in `TarotPage.tsx` and `CelticCrossReading.tsx`. Transit calculation setup was reproduced across all three reading flow containers. `formatTransitSummary` was duplicated client and server side. Any change had to be applied in multiple places.
- **Solution:** Created `src/components/tarot/tarotUtils.ts` as the canonical shared utility module containing `shuffleTarotDeck`, `computeCardReversal`, `formatTransitSummary`, `computePersonalDay`, `computePersonalYear`, `buildEngineCtx`, and `useTransitData` hook. All three flows import from this module; duplicate definitions are removed.

---

## Features

### Natal House Context in Tarot Engine and GPT Synthesis (`task-0007`)
- **What it is:** The tarot engine now carries the natal house number of the Moon, Venus, North Node, and Mars. GPT synthesis for all three reading types now includes house-aware natal lines. The synthesis can say "Moon in Cancer in your 8th house" instead of "Moon in Cancer" — connecting the natal placement to the domain of life it governs, not just its emotional quality.
- **How to use it:** No UI changes. The improvement is in synthesis text. When you draw a card, the GPT synthesis knows which house your natal Moon occupies. Moon in Cancer in the 8th house is interpretively different from Moon in Cancer in the 2nd — the synthesis now makes that distinction.

### Saved Reading Detail View (`task-0008`)
- **What it is:** The Saved Readings detail modal no longer renders synthesis as raw `JSON.stringify` output. A proper three-path rendering pipeline handles plain string, Celtic Cross chapters, and three-card structured objects. The detail view also shows: all drawn cards with spread position labels and reversal state, element tint background, lunar phase with `☽` glyph, absolute date display for older readings, user intention in italic gold, and a gold divider above the synthesis region.
- **How to use it:** Open the app → Saved Readings → tap any saved reading tile. The detail modal now shows the complete reading as it was experienced — not a developer debugging artifact.

---

## Failed / Deferred Tasks
None — all 8 tasks delivered.
