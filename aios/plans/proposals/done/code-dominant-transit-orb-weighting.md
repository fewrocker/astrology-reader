# code-dominant-transit-orb-weighting

**Type:** Code Enhancement

**Originated by:** Taleb, Carmack

---

## Problem

`buildTarotAstroContext` in `src/engine/tarot.ts` selects `dominantTransitPlanet` using a static priority table:

```typescript
const PLANET_PRIORITY: Record<string, number> = {
  Pluto: 10, Neptune: 9, Uranus: 8, Saturn: 7, Jupiter: 5,
  Mars: 3, Sun: 2, Venus: 2, Mercury: 1, Moon: 1,
}
```

The function iterates through `currentTransits` and picks the planet with the highest priority score. No other factor is considered.

**The consequence:** A wide, separating Pluto trine (orb 4.8°, separating) will suppress a tight, applying Saturn opposition (orb 0.3°, applying). Pluto wins with score 10 vs Saturn's 7, regardless of the fact that the Saturn transit is the astrologically significant one for that person right now — tight, applying, and involving a structurally important angle.

This selection error is propagated through the entire tarot reading session. The `dominantTransitPlanet` is passed to `buildTransitInfluence`, which selects which Level 1 transit adaptation entry fires. A user with 193 carefully written transit entries now available gets the wrong entry shown — not because the entry is absent, but because the selection logic chose the wrong planet.

With sprint 0027's complete entry coverage, this is no longer a theoretical problem. Every card has Saturn, Pluto, and suit-appropriate planet entries. The quality of what the user reads now depends critically on which of those entries fires. The dominance selection logic determines this, and it is currently wrong in a systematic, detectable way.

---

## Proposed Solution

Replace the single-pass static priority selection with an orb-weighted scoring function:

```typescript
function computeDominancePlanetScore(aspect: TransitAspect): number {
  const basePriority = PLANET_PRIORITY[String(aspect.transitPlanet)] ?? 0
  // Reward tighter orbs: orb=0 gives full multiplier, orb=8 gives ~0.6 multiplier
  const maxOrb = 8
  const orbMultiplier = 1 + (Math.max(0, maxOrb - aspect.orb) / maxOrb) * 0.6
  // Reward applying aspects: they are building toward exact, more symbolically live
  const applyingBonus = aspect.applying ? 1.15 : 1.0
  return basePriority * orbMultiplier * applyingBonus
}
```

The dominant planet is then the highest scorer across all active transit aspects.

This preserves the outer-planet priority hierarchy (Pluto still outweighs Saturn for wide orbs) while allowing tight, applying personal transits to override loose, separating outer planet transits when the personal transit is the live one.

---

## Why This Is a Code Enhancement, Not a Feature

This is a correction to an existing computation function. No new data, no new UI, no new user-visible output type. The user-visible change is that the transit note shown in "In Your Sky Now" more often reflects the actually significant transit rather than the nominally highest-priority planet. The change is invisible as a feature but auditable by comparing the `dominantTransitPlanet` value before and after for test cases with mixed orb profiles.

---

## Impact

**High** (correctness). The quality of 193 carefully written transit adaptations depends on the selection logic being correct. Every draw where Pluto or Neptune has a wide separating transit but Saturn or Mars has a tight applying transit will benefit. This describes a meaningful fraction of active charts.

**Effort:** Low-Medium. One function change in `src/engine/tarot.ts`, updating the `buildTarotAstroContext` dominant planet computation. Test cases in `src/engine/__tests__/tarot.test.ts` will need updating if they depend on the old priority-only behavior. The mock transit data in tests uses `applying: false` and fixed orbs — these may need to be varied to test the new behavior.

---

## Dependencies

Requires `TransitAspect` to have `orb` and `applying` fields. These are already present in the type definition and populated by the transit engine. No upstream changes required.

---

## Implementation Summary

**File:** `src/engine/tarot.ts` — `buildTarotAstroContext` function, approximately lines 537–547 where `dominantTransitPlanet` is computed.

**Change:** Replace the single max-priority scan with a scoring function that weights planet priority, orb tightness, and applying/separating status. Keep `PLANET_PRIORITY` unchanged — it remains the base for scoring.

**Test update:** `src/engine/__tests__/tarot.test.ts` — add test cases that verify a tight applying Saturn transit outscores a wide separating Pluto transit. Existing transit tests that assume simple priority may need their mock data adjusted to reflect realistic orb values.
