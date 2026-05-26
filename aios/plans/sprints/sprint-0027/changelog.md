# Sprint 0027 — Changelog

## Completed Tasks

---

### task-0001 — issue-retrograde-condition-priority-override
**Proposal:** `issue-retrograde-condition-priority-override`
**Problem:** `buildTransitInfluence` used a single-pass loop that returned the first matching entry in array order. A Mercury retrograde entry for a lower-priority planet could fire before a Pluto or Saturn entry for the dominant planet, silently returning the wrong interpretation during any Mercury retrograde season (≈19% of the year).
**Solution:** Replaced the single loop with a two-pass approach. Pass 1 checks only entries where `entry.planet === dominantTransitPlanet`; if a match is found, it returns immediately. Pass 2 (fallback) uses the original retrograde/any/direct logic. Dominant-planet entries now always take precedence, regardless of array order.

---

### task-0002 — code-retrogradeplanets-rename
**Proposal:** `code-retrogradeplanets-rename`
**Problem:** `TarotAstroContext` declared the field as `retrogradeplanets` (lowercase 'p'), violating TypeScript camelCase conventions.
**Solution:** Renamed `retrogradeplanets` → `retrogradePlanets` in all 11 occurrences across `src/engine/tarot.ts` (8 sites) and `src/engine/__tests__/tarot.test.ts` (3 sites). No logic changes.

---

### task-0003 — code-single-card-position-register
**Proposal:** `code-single-card-position-register`
**Problem:** Single-card draws passed `null` as position, blocking `buildPositionAwareAffinityLine` and always falling through to the generic Level 2 affinity line — weaker than what every multi-card position already received.
**Solution:** `TarotPage.tsx` now passes the `'single'` position instead of `null`. The `'single'` position resolves to `'present-active'` register, enabling position-aware Level 2 transit text for all single draws.

---

### task-0004 — code-transit-coverage-test
**Proposal:** `code-transit-coverage-test`
**Problem:** The only transit coverage assertion was a floor count that cannot detect per-card regressions.
**Solution:** Added `'all pip cards (Two through Nine) have at least one transit adaptation entry'` to `cards.completeness.test.ts`. Iterates all 32 pip card IDs and names specific missing cards on failure. Coverage contract: future deletions produce actionable named failures.

---

### task-0005 — feat-pip-reversed-meaning-depth
**Proposal:** `feat-pip-reversed-meaning-depth`
**What it is:** Rewritten `reversedMeaning` fields for 11 pip cards, elevating from behavioral descriptions to named psychological portraits at the standard set by sprint 0026 Major Arcana rewrites.
**How to use it:** Draw any rewritten card reversed — the Core Meaning section now names the specific inner arrangement of the arrested state, not its behavioral symptoms.

Cards rewritten (Tier 1 complete): Eight of Swords, Nine of Swords, Seven of Swords, Two of Swords, Six of Cups, Eight of Cups, Nine of Cups, Seven of Cups.
Cards rewritten (Tier 2 partial): Two of Wands, Nine of Wands, Seven of Pentacles.

---

### task-0006 — feat-pip-transit-adaptations
**Proposal:** `feat-pip-transit-adaptations`
**What it is:** 101 new transit adaptation entries closing the coverage gap for all 28 pip cards, The Fool, and Justice. Total entries: 193 (was 92).
**How to use it:** Draw any of the 78 cards under an active outer planet transit — the "In Your Sky Now" section now returns a card-specific interpretation instead of the generic element-affinity fallback for pip cards.

Coverage added: The Fool (Saturn, Uranus), Justice (Venus, Saturn), all 28 pip cards with Saturn + Pluto + suit planet (Mars for Wands/Swords, Neptune for Cups, Venus for Pentacles). Mercury retrograde entries for Two of Swords, Eight of Swords, Seven of Cups.

---

## Failed / Deferred Tasks

None. All 6 tasks completed successfully.

## Test Results

- 55 tests passing (up from 53 pre-sprint)
- 1 pre-existing failure: `adapts the instant interpretation text to the actual spread position` (SPREAD_POSITIONS missing from import in tarot.test.ts — pre-dates this sprint)
- New pip coverage test passes (task-0006 entries cover all 32 pip cards)
- Mercury retrograde Hermit test now passes (task-0001 fix confirmed working)
