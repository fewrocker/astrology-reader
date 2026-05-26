# Sprint 0024 — Changelog

**Sprint focus:** Tarot Depth & Polish — ritual feel, astrological synthesis depth, type system integrity
**Merged:** 2026-05-26

---

## Bug Fixes

### Celtic Cross Live Interpretation (`task-0001`)
- **Problem:** The Celtic Cross `computeInstantInterpretation` function in `CelticCrossReading.tsx` was a labeled stub that was never replaced by the real engine. Every card in the reveal sequence showed position-unaware, transit-unaware text. Additionally, `buildCelticAstroCtx` hardcoded `currentMoonPhase: ''` and `significantTransits: []`, and `TarotCelticSynthesisPayload` had no transit summary fields — leaving the most complex reading type flying blind on every signal it was designed to use.
- **Solution:** Replaced the stub with the real `computeInstantInterpretation` from `src/engine/tarot.ts` (position-aware, transit-aware, three-level astro fallback). Added `CelticReadingFlow` that calls `calculateTransits` for daily and weekly windows. Added `dailyTransitSummary` and `weeklyTransitSummary` to `TarotCelticSynthesisPayload` and updated `handleTarotCelticSynthesis` to inject transit context into the Celtic GPT prompt.

### Deck Fan Shows Real Card Backs (`task-0002`)
- **Problem:** `TarotDeckSelection.tsx` rendered every card in the 78-card fan as a `✦` Unicode character. The fully-built `CardBack` component existed but was never used. The first visual impression was 78 identical gold sparkles.
- **Solution:** Replaced the `✦` character in both card button variants with `<CardBack interactive={false} />`, filling the button's 72×116px footprint with the correct indigo field, SVG star geometry, gold frame, and breathing pulse.

---

## Code Enhancements

### Tarot Type System Unification (`task-0003`)
- **Problem:** Three separate, incompatible `TarotAstroContext` definitions, two parallel `DrawnCard` interfaces, two parallel `InstantInterpretation` interfaces, and four adapter functions that existed solely to convert between them. The `unknown`-typed fields in the context version and the degraded `astroConnection: string` in the Celtic component type caused silent data loss.
- **Solution:** Unified all three concepts to a single canonical definition in `src/engine/tarot.ts`. Removed duplicate definitions and all four adapter functions. Upgraded `astroConnection` to the full `AstroConnection` object everywhere. Build type-checks cleanly across all tarot surfaces with no aliasing workarounds.

---

## Features

### GPT Synthesis Depth: Card Combinations + Intention Threading (`task-0004`)
- **What it is:** The GPT synthesis layer now computes elemental dignity between adjacent card pairs, structures the three-card opening around a unified cards 1+2 pairing statement, sends a Celtic Cross structural signals block (Major Arcana weight, elemental field, court card count, crossing-pair dignity) to the server, and threads the user's original intention explicitly through every synthesis chapter and the Discuss follow-up system prompt.
- **How to use it:** No new UI. The improvement is in the synthesis text quality. In a three-card reading the opening names what cards 1+2 are doing as a pair before card 3. In Celtic Cross the synthesis opens with the full-field read anchored to the question. In Discuss, the user's intention stays present through follow-ups. Elemental dignity (Fire+Air harmonious, Fire+Water opposing, etc.) now shapes which card relationships the synthesis highlights.

### Shuffle Ritual Wired into Reading Flow (`task-0005`)
- **What it is:** `DeckShuffleAnimation.tsx` — a complete 6-phase ritual component built in sprint-0023 but never connected — is now the transition between mode selection and the reading for Single Card and Three-Card modes.
- **How to use it:** After setting an intention and selecting Single Card or Three-Card mode, the shuffle ritual plays: the intention echoes above three breathing card backs, the deck fans and shuffles for at least 2 seconds, settles to one face-down card, waits for a tap, then flips to reveal and begins the reading. Celtic Cross bypasses the ritual and uses its own ceremony. Reduced-motion is respected.

---

## Failed / Deferred Tasks
None — all 5 tasks delivered.
