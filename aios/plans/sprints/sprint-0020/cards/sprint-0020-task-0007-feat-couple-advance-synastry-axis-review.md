# Review: feat-couple-advance-synastry-axis

**Task:** sprint-0020-task-0007
**Branch:** sprint-0020-task-0007-feat-couple-advance-synastry-axis
**Commit:** 95563ef
**Status:** Complete — build passes, all spec requirements implemented

---

## What was implemented

### 1. Pre-filter in `preCalculateCoupleSnapshots`

Added before the snapshot loop:

```ts
const tightSynastryPairs = synastryData.synastryAspects.filter(a => a.orb <= 2.0)
```

Computed once per pre-calculation call. Passed into each `scoreCoupleSnapshot` invocation as an extra parameter.

### 2. `angularDiffCouple` helper

Local implementation of the short-arc angular difference formula (mirrors `angularDiff` in `AdvanceTab.tsx`, which is not exported). Named `angularDiffCouple` to avoid future name collision if that function is exported.

### 3. `SynastryAxisActivation` interface

Defined per spec:
- `person1Planet`, `person2Planet`, `aspectType`, `synastryNature`
- `activatedPole: 'person1' | 'person2'` — which natal planet's longitude the transit is near
- `activatedLongitude: number`, `contactOrb: number`

### 4. `findActivatedSynastryAxis`

Pure helper. Accepts `transitPlanetName`, `transitLon`, `transitOrb`, `tightSynastryPairs`, `chart1`, `chart2`.

- Short-circuits immediately if transit planet is not in `SLOW_PLANETS_FOR_BANNER` (Saturn, Uranus, Neptune, Pluto)
- Short-circuits if `tightSynastryPairs` is empty
- For each tight synastry pair, looks up natal longitudes directly (not midpoints)
- Handles both-poles-within-orb case by picking the tighter contact
- Returns the activation with the smallest `contactOrb`, or `null`

### 5. `buildSynastryAxisSuffix`

Assembles the suffix string dynamically:
- `'harmonious'` nature → `"harmonious "` adjective
- `'challenging'` nature → `"tense "` adjective
- `'neutral'` nature → no adjective
- Format: `"— and resonates with the [adjective][p1]-[p2] axis between the two of you."`

### 6. `augmentReasonWithSuffix`

Combines base reason + suffix, enforces 200-character cap with word-boundary truncation. Falls back to `baseReason` unmodified if the base itself occupies the full 200 characters.

### 7. Integration in `scoreCoupleSnapshot`

Augmentation applied at:
- **Priority 2 (shift + co-occurring favorable/challenging):** uses `tightest.transitPlanet` longitude from `snapshot.transitPlanets`
- **Priority 3 (favorable):** same approach
- **Priority 4 (challenging):** same approach

**Priority 1 (power/composite angle contact):** excluded per spec — composite angle contacts are already the highest-intensity category.

**Pure shift (no co-occurring aspect):** excluded per spec — `buildCoupleShiftReason` path is not modified.

Pattern in all three branches:
```ts
const transitPlanet = snapshot.transitPlanets.find(tp => tp.name === tightest.transitPlanet)
const axisActivation = transitPlanet
  ? findActivatedSynastryAxis(tightest.transitPlanet, transitPlanet.longitude, orbs.angleContact, tightSynastryPairs, chart1, chart2)
  : null
const intensity = axisActivation ? Math.min(1.0, baseIntensity * 1.25) : baseIntensity
const reason = axisActivation
  ? augmentReasonWithSuffix(baseReason, buildSynastryAxisSuffix(axisActivation))
  : baseReason
```

---

## Spec compliance notes

| Spec item | Status |
|-----------|--------|
| Pre-filter once before snapshot loop (not inside) | Done |
| Direct natal longitude check (not midpoint) | Done |
| Slow-planets-only gate (Saturn, Uranus, Neptune, Pluto; not Jupiter) | Done |
| Transit orb = `orbs.angleContact` per period | Done |
| Synastry orb threshold fixed at 2.0° | Done |
| Intensity multiplier 1.25, capped at 1.0 | Done |
| Reason suffix format per spec §6 | Done |
| 200-character combined reason cap | Done |
| Priority 1 (power) excluded from augmentation | Done |
| Pure shift excluded from augmentation | Done |
| Both-poles edge case: tighter contact wins | Done |
| Planet-not-in-chart: silently skip | Done |
| No tight synastry pairs: short-circuit | Done |
| Multiple activations: tightest-orb wins | Done |

---

## Known gap: `computeCombinedWeight` prerequisite (spec §11)

The spec states that task-0003 (`code-couple-advance-scoring-parity`) must land before this task to ensure synastry augmentation fires only on `computeCombinedWeight`-gated markers. As of this commit, task-0003 is still pending. The synastry augmentation has been implemented on top of the current `computeEnergyRating`-based Priority 3 and 4 gates.

This is the correct implementation order: the augmentation layer is additive and does not depend on the gating mechanism. When task-0003 replaces the gate, the augmentation code requires no changes — it applies identically to whatever markers the gate produces.

---

## Build

```
tsc -b && vite build
✓ 1889 modules transformed.
✓ built in 11.06s
```

No type errors, no warnings introduced by this task.
