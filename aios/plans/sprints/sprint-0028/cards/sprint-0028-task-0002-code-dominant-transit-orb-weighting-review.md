# Review: code-dominant-transit-orb-weighting

**Task:** sprint-0028-task-0002
**Status:** Complete
**Reviewer:** Claude (sprint agent)

---

## What Was Done

### Core change — `src/engine/tarot.ts`

Added `computeDominancePlanetScore(aspect: TransitAspect): number` immediately after the `PLANET_PRIORITY` constant. The function combines three factors:

- **Base priority** — `PLANET_PRIORITY[planet]`, unchanged as the base
- **Orb multiplier** — `1 + ((8 - orb) / 8) * 0.6`. At orb=0 this is ×1.6; at orb=8 it is ×1.0. Orbs beyond 8° are clamped via `Math.max(0, ...)`.
- **Applying bonus** — ×1.15 when `aspect.applying === true`, ×1.0 for separating

The single-pass loop in `buildTarotAstroContext` that tracked `topPriority` was replaced with a loop that tracks `topScore` using `computeDominancePlanetScore`.

`PLANET_PRIORITY` is untouched.

### Test change — `src/engine/__tests__/tarot.test.ts`

Two new tests added inside the `buildTarotAstroContext` describe block:

1. **Tight applying Saturn outscores wide separating Pluto** — Pluto at orb 4.8° separating (score ≈ 12.4) vs Saturn at orb 0.3° applying (score ≈ 12.69). Saturn wins. Covers the motivating defect in the card.
2. **Pluto still outscores Saturn at equal orbs** — both at orb 2.0° separating. Pluto (score ≈ 14.5) beats Saturn (score ≈ 10.15). Priority hierarchy preserved for equal-orb cases.

One pre-existing test failure was also fixed: `SPREAD_POSITIONS` was referenced in the `adapts the instant interpretation text to the actual spread position` test but was not imported. Added `SPREAD_POSITIONS` to the import from `../tarot` (it is already exported from `tarot.ts`).

---

## Correctness Verification

Score arithmetic for the two test cases:

**Saturn tight/applying vs Pluto wide/separating:**
- Pluto: `10 * (1 + (8-4.8)/8 * 0.6) * 1.0 = 10 * 1.24 = 12.4`
- Saturn: `7 * (1 + (8-0.3)/8 * 0.6) * 1.15 = 7 * 1.5775 * 1.15 ≈ 12.698`
- Saturn wins by a narrow margin — which is exactly the intended behavior.

**Pluto vs Saturn equal orbs (2.0°, separating):**
- Pluto: `10 * (1 + 0.45) * 1.0 = 14.5`
- Saturn: `7 * (1 + 0.45) * 1.0 = 10.15`
- Pluto wins — priority hierarchy intact.

The boundary behavior (orb > maxOrb clamped to 0 additional multiplier, identical-score tie going to the first encountered) is consistent with the card's spec.

---

## Build and Test Results

- `npm run build` — clean, no TypeScript errors
- `vitest run` — 58/58 tests pass (2 test files)

---

## Risk Assessment

**Low.** The change is a single function substitution in one loop. The `PLANET_PRIORITY` table, the `TransitAspect` shape, and all downstream consumers of `dominantTransitPlanet` are unchanged. The scoring function degrades gracefully for unknown planets (base priority 0, score 0, never wins over any known planet).

The only behavioral difference from baseline is that tight applying inner-planet transits can now override loose separating outer-planet transits. This is the intended correction.
