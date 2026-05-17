---
# Couple Advance Intensity Parity Fix

**Type:** Issue Fix
**Originated by:** Jobs, Carmack, Taleb

## Problem

In `scoreCoupleSnapshot` (`/projects/astrology-reader/src/components/reading/CoupleAdvanceTab.tsx`), Priorities 2–4 gate on `computeCombinedWeight` and `COMBINATION_WEIGHT_THRESHOLD` — matching the logic in `AdvanceTab` — but then derive `baseIntensity` from the unrelated `computeEnergyRating` path instead of from the weight that passed the gate.

The three divergent derivations are:

- **Line 555** (Priority 2, shift+aspect coShift branch): `const baseIntensity = Math.abs(rating.score - 3) / 2`
- **Line 619** (Priority 3, favorable branch): `const baseIntensityFav = Math.abs(rating.score - 3) / 2`
- **Line 669** (Priority 4, challenging branch): `const baseIntensityChal = Math.abs(rating.score - 3) / 2`

All three read from `rating`, which is computed at line 460:

```ts
const rating = computeEnergyRating(snapshot.transitAspects)
```

`computeEnergyRating` produces a 1–5 energy score over all transit aspects regardless of orb, applying status, or slow-planet weighting. The formula `Math.abs(rating.score - 3) / 2` maps that score to [0, 1] in a way that is entirely independent of `combinedWeight`. A Saturn+Pluto cluster that barely clears `COMBINATION_WEIGHT_THRESHOLD` but has a mid-range energy rating will produce a low intensity even though the weight-based gate judged it significant. Conversely, a fast-planet cluster with high overall energy can reach an inflated intensity.

The correct formula used by `scoreSnapshot` in `AdvanceTab.tsx` for the same three priorities is:

- **Line 696** (Priority 2 coShift): `const intensity = Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)`
- **Line 771** (Priority 3, favorable): `const intensity = Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)`
- **Line 804** (Priority 4, challenging): `const intensity = Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)`

`COMBINATION_WEIGHT_NORMALIZE` is defined at line 112 of `AdvanceTab.tsx` as `export const COMBINATION_WEIGHT_NORMALIZE = 12`. It is not imported anywhere in `CoupleAdvanceTab.tsx` (confirmed: the symbol does not appear in that file's import list at line 14–21). This makes the divergence invisible at compile time — the file compiles without error while silently using a different intensity model.

**Observable effect:** For identical sky conditions on the same date, an individual advance strip (`AdvanceTab`) and a couple advance strip (`CoupleAdvanceTab`) will render marker dots of different sizes. The individual strip's dot size reflects constellation weight; the couple strip's dot size reflects an unweighted energy average. A Saturn+Pluto cluster that produces a large, saturated dot in the individual view may produce a small, dim dot in the couple view, and vice versa.

This divergence was explicitly deferred from the sprint-0020 merge conflict resolution and is called out in the sprint-0021 vision as the must-ship item for the sprint.

## Expected Behavior

After the fix, `scoreCoupleSnapshot` Priorities 2–4 should derive intensity from the same formula as `scoreSnapshot`:

```ts
Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)
```

where `combinedWeight` is the value already computed in each priority block to determine whether the gate fires. `COMBINATION_WEIGHT_NORMALIZE` must be added to the named import from `AdvanceTab` at line 14–21 of `CoupleAdvanceTab.tsx`.

The `computeEnergyRating` import (line 3) and the `rating` variable (line 460) become dead code once the three `baseIntensity` derivations are replaced; both should be removed.

The synastry-axis augmentation boost (`Math.min(1.0, baseIntensity * 1.25)`) applied in each priority block is correctly structured and should be preserved — only the `baseIntensity` seed changes.

After the fix, identical transit conditions evaluated against a natal chart in `AdvanceTab` and against a composite chart in `CoupleAdvanceTab` should produce the same relative intensity values, making dot sizes on the individual and couple strips visually consistent for the same sky.
