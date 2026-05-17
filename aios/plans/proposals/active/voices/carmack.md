# John Carmack: Sprint 0021 — Technical Assessment

---

## 1. The Couple Advance Intensity Bug: Exact State and Exact Fix

The sprint vision describes this correctly but misses one detail about Priority 2. Here is the precise state of the code.

**File:** `src/components/reading/CoupleAdvanceTab.tsx`

Line 3 imports `computeEnergyRating` from `../../engine/transits`. Line 460 calls it unconditionally at the top of `scoreCoupleSnapshot`:

```ts
const rating = computeEnergyRating(snapshot.transitAspects)
```

This value is then used at three sites:

- Line 555 (Priority 2, co-shift path): `const baseIntensity = Math.abs(rating.score - 3) / 2`
- Line 619 (Priority 3, favorable): `const baseIntensityFav = Math.abs(rating.score - 3) / 2`
- Line 669 (Priority 4, challenging): `const baseIntensityChal = Math.abs(rating.score - 3) / 2`

The synastry axis augmentation (lines 569, 633, 683) then applies `Math.min(1.0, baseIntensity * 1.25)`, which compounds the error by amplifying an already incorrect base value.

The reference implementation in `AdvanceTab.tsx` at lines 696, 771, and 804 uses:
```ts
const intensity = Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)
```

where `combinedWeight` is the result of the `computeCombinedWeight` call that already decided whether to fire the marker.

**Priority 2 has one extra step.** In `AdvanceTab.tsx` line 692, before computing intensity, there is:
```ts
const combinedWeight = isFavorable ? harmoniousWeight : challengingWeight
```

In `CoupleAdvanceTab.tsx` Priority 2 (lines 540–590), `harmoniousWeight` and `challengingWeight` are computed separately (lines 540–541) but never combined into a single `combinedWeight` before the `baseIntensity` line at 555. The fix at line 555 needs a preceding variable declaration:
```ts
const combinedWeight = isFavorable ? harmoniousWeight : challengingWeight
const baseIntensity = Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)
```

Priorities 3 and 4 are simpler — each already has a single `combinedWeight` in scope (lines 611 and 661). The fix is one line each: replace `Math.abs(rating.score - 3) / 2` with `Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)`.

**Complete change set:**
1. Add `COMBINATION_WEIGHT_NORMALIZE` to the import block (lines 14–21). It is already exported from `AdvanceTab.tsx` at line 112.
2. Remove `computeEnergyRating` from the engine import on line 3.
3. Remove the `const rating = ...` call on line 460 (dead after step 2).
4. Add `const combinedWeight = isFavorable ? harmoniousWeight : challengingWeight` before line 555 in Priority 2.
5. Replace lines 555, 619, 669 with `Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)`.

That is the complete fix. The synastry augmentation multiplier on lines 569, 633, 683 remains correct — it operates on whatever `baseIntensity` returns, and after the fix, `baseIntensity` is correctly derived.

**Verification:** Load a couple advance strip and find a Saturn or Pluto transit to a composite planet that passes the gate. Note the dot size. Then open the individual advance for one of the charts on the same date. The dot sizes should be proportional to the same sky — they will not be identical (the charts differ) but a high-weight constellation should produce a large dot in both contexts, not a randomly sized one.

---

## 2. The Today Page Advance Signal: Cache Architecture Reality

The vision says "if the advance snapshots are already in the component-level cache, the Today page should read from that cache." The premise is wrong. There is no shared cache.

**How the current caches work:**

`AdvanceTab` has `const snapshotCache = useRef<Map<string, AdvanceSnapshot[]>>(new Map())` at line 1284. This lives inside the component instance. When the component unmounts, the ref is gone. The same pattern exists in `CoupleAdvanceTab` (line 848) and `SolarReturnAdvancePreview`.

`TransitReadingPage` (lines 237–261) does the right thing for its own context: it lifts snapshot state out of `AdvanceTab` into the parent, using `const snapshotCache = useRef<Map<string, AdvanceSnapshot[]>>(new Map())` at line 243 and passing `snapshots` down as a prop to `AdvanceTab`. This is why the Timeline tab can read advance data without recomputing — they share the same parent state.

`TodayPage` is mounted in a completely different view from `TransitReadingPage`. By the time the user opens Today, the transit reading components have unmounted. Their refs are gone.

**The correct implementation path:**

Export a module-level cache from `AdvanceTab.tsx`:

```ts
// Module-level — survives component unmounts within a browser session
const _advanceSnapshotCache = new Map<string, AdvanceSnapshot[]>()

export function getAdvanceSnapshotCache(): Map<string, AdvanceSnapshot[]> {
  return _advanceSnapshotCache
}
```

The existing component-level `useRef` caches then write into this module cache in addition to (or instead of) their local refs. `TodayPage` imports `getAdvanceSnapshotCache` and does a lookup with the same key format. If it misses — no advance data has been computed this session — the signal is simply absent. This matches the vision: "absent rather than blocking."

**Design tension the vision doesn't address:**

The Today page advance signal is about "now" — offset 0. But `scoreSnapshot` in `AdvanceTab.tsx` returns `neutral` at offset 0 by explicit early-return guard (line ~575: `if (snapshot.offset === 0) return neutral`). This is intentional — the advance engine shows markers *ahead*.

What Today page actually wants is: "is today inside a marker window?" The closest proxy is: find the snapshot whose `dateStr` matches today's date string. For daily period, that's offset 0 (always neutral). For weekly period, offset 0 is this week's snapshot (also neutral). The actual marker that covers today would appear at some recent offset in the *previous* period's cache — which the user would have had to visit the advance tab to compute.

The practical result: the Today page advance signal will appear for users who visited the Advance tab in the same session and whose "today" falls within a marked window. That is a small fraction of Today page views. The vision correctly calls this acceptable ("absent rather than blocking"). Just be clear about this in the implementation — don't add loading states or skeleton UIs that imply a computation is happening; if the cache misses, nothing is shown.

**What to show on Today page when there is a hit:**

The nearest non-neutral snapshot to today's date from the daily cache. Display the `score.category` label and `score.reason` as a compact banner — the same JSX pattern already used in `AdvanceTab` and `SolarReturnPage` but narrower. Category label + icon + one-line reason. No guidance paragraph (that's for the full advance view). Total new JSX: ~20 lines.

---

## 3. Solar Return House Briefs: Data Is Already There, Loop Is Wrong

**Current state:** `SRStaticBriefs` (lines 352–388 of `SolarReturnPage.tsx`) hardcodes two lookups:

```ts
PLANET_IN_HOUSE[`Sun_H${sunHouse}`]?.brief
PLANET_IN_HOUSE[`Moon_H${moonHouse}`]?.brief
```

**What exists in the data:** `PLANET_IN_HOUSE` in `src/data/interpretations/planetInHouse.ts` has 120 entries covering Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto across all 12 houses. Every key is `${Planet}_H${house}`. All briefs are one sentence. The data is complete. Zero new data is needed.

**The angular house filter:**

```ts
const ANGULAR_HOUSES = new Set([1, 4, 7, 10])
const SR_MAJOR_PLANETS = new Set(['Sun', 'Moon', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'])

const placements = srChart.planets
  .filter(p => SR_MAJOR_PLANETS.has(p.name))
  .filter(p => {
    const house = p.house
    if (house < 1 || house > 12) return false      // unknown time guard
    if (p.name === 'Sun' || p.name === 'Moon') return true  // luminaries always
    return ANGULAR_HOUSES.has(house)               // others only if angular
  })
```

This produces 0–7 cards per chart depending on planetary distribution. In practice: luminaries are always shown (2 cards), plus 0–5 major planets in angular houses. On a typical chart, expect 2–4 cards total.

**The prose framing:** The existing `SRStaticBriefs` prepends "This year: " to the brief text (line 383). That prefix is reused for all cards in the expanded version. The briefs are written in natal chart second-person voice ("Your Sun in the 1st house...") which reads awkwardly with the "This year:" prefix but is acceptable. The alternative is adding SR-specific brief text to `PLANET_IN_HOUSE` for each planet × house combination — 120 new strings. That is not a sprint-0021 scope item.

**One thing to check:** `srChart.planets` contains a `NorthNode` entry (filtered out in `SRPlanetTable` at line 299 with `.filter(p => p.name !== 'NorthNode')`). The same filter applies here. `NorthNode` is not in `SR_MAJOR_PLANETS` so the `has()` check will exclude it anyway — but be explicit.

**Total change scope:** Rewrite `SRStaticBriefs` from ~36 lines to ~50 lines. Same styling. Same data. No new imports. This is the easiest task in the sprint.

---

## 4. `preCalculateCoupleSnapshots` Is Still a Manual Copy (Not a Sprint-0021 Bug, But Unfinished)

The sprint-0020 changelog says `preCalculateCoupleSnapshots` became a "thin wrapper (~15 lines)" via `runAdvancePreCalculation`. The current code at lines 711–826 of `CoupleAdvanceTab.tsx` is not that. It is a 116-line function with its own manual loop, hysteresis pass, and density cap.

The density cap algorithm in `CoupleAdvanceTab.tsx` (lines 787–812) uses a single-pass by-category grouping via `Object.keys(byCategory)`. The canonical version in `runAdvancePreCalculation` (lines 937–964 of `AdvanceTab.tsx`) uses a fixed `NON_NEUTRAL_CATEGORIES` iteration order: `['power', 'favorable', 'challenging', 'shift']`. The ordering matters when multiple categories tie on the single-highest-intensity criterion. `Object.keys` ordering is insertion-order in modern JS engines, which in this case would be the order categories first appear in the snapshot array — that is non-deterministic relative to the fixed-priority ordering in the canonical version.

This divergence is not the sprint-0021 bug. But the intensity fix (section 1 above) is being applied to a function that is also structurally diverged from the abstraction it was supposed to use. The intensity fix is still correct and safe to ship — `scoreCoupleSnapshot` is the scoring callback, and the manual loop around it produces the right data structure for the fix to operate on. The density cap divergence is a separate issue. Sprint-0021 should fix the intensity (section 1) and document the remaining structural divergence as a follow-on task rather than leaving it tacit.

---

## 5. SR Advance Preview Computes 37 Snapshots to Show 13

**File:** `SolarReturnPage.tsx`, lines 61–63

```ts
const allSnapshots = preCalculateSnapshots(srChart, 'monthly', srBaseDate)
const sliced = allSnapshots.slice(0, 13) // offsets 0–12
```

`ADVANCE_CONFIG.monthly.max = 36`. The function computes 37 snapshots (offsets 0–36), then slices to 13. The 24 discarded snapshots are computed, scored, run through the hysteresis pass, and run through the 36-step density cap — all wasted work.

More importantly: the density cap is applied at 20% of 36 = 7 markers maximum, then the slice discards months 13–36, and then a second density cap is applied at 20% of 12 = 3 markers maximum. Two density cap passes, the first of which operated on a 3× larger window than what gets displayed. A marker at month 11 with intensity 0.7 might survive the 36-step cap (as one of 7 allowed) but compete against markers at months 15–36 that are then thrown away. The 12-step secondary cap then operates on whatever survived the first pass.

The correct fix uses `runAdvancePreCalculation` directly with `{ max: 12, msPerStep: ADVANCE_CONFIG.monthly.msPerStep }` as the config. This was the intended design — the `runAdvancePreCalculation` function accepts a custom `config` parameter specifically to support non-standard windows (the sprint-0020 changelog says as much). The current implementation bypasses this in favor of the convenient `preCalculateSnapshots` wrapper that hardcodes the 36-step monthly config.

The fix for this is mechanical but not trivial — it requires calling `runAdvancePreCalculation` directly with a custom `buildSnapshot` callback instead of the `preCalculateSnapshots` wrapper. That callback is currently inlined in `preCalculateSnapshots` (lines 983–997 of `AdvanceTab.tsx`). It would need to be extracted or duplicated in `SolarReturnPage.tsx`. Not a sprint-0021 must-ship, but it is a correctness issue, not just a performance issue.

---

## 6. TodayPage Energy Bar vs. Advance Category: Potential Signal Conflict

**File:** `src/components/reading/TodayPage.tsx`, lines 186–202

The Transit Energy card shows a 1–5 dot score from `computeEnergyRating`. This function counts +1 for harmonious aspects, -1 for challenging aspects, across the top 8 transit aspects (excluding asteroids). A score of 4 or 5 is "harmonious," 1 or 2 is "challenging," 3 is neutral.

The advance engine's `challenging` marker fires when `computeCombinedWeight(tightApplyingChallenging, orbs.applyingTight)` exceeds the threshold. `computeCombinedWeight` weights slow planets (Saturn = 6, Pluto = 9) and only counts applying aspects. `computeEnergyRating` counts all aspects (applying and separating) with equal weight per planet.

A Saturn trine natal Moon at 0.5° orb, applying: advance engine sees weight 6 × (1 - 0.5/1.5) = 4.0, which is above `COMBINATION_WEIGHT_THRESHOLD = 3.0`, so it fires a `favorable` marker. `computeEnergyRating` sees +1 from that aspect, plus whatever else is in the top 8. If there are also two challenging aspects, the energy score might be 1 or 2 — a "challenging" energy bar — while the advance marker says "favorable."

If the advance signal from section 2 appears on TodayPage next to the existing energy bar, users will see conflicting signals. This is not a bug per se — the two metrics measure different things — but it will be confusing. The options are: (a) replace the energy bar with the advance category when advance data is available, (b) hide the energy bar when advance data is shown, or (c) display both with a brief label explaining the difference. Option (a) is the cleanest. Option (c) is the most honest but adds visual complexity. Option (b) is safe but loses information.

This is a UX decision, not a technical one, but it needs to be made before implementing the Today page integration.

---

## Priority Order for Sprint 0021

**1. Couple advance intensity fix (must ship first)**
`CoupleAdvanceTab.tsx` lines 460, 555, 619, 669. Adds one variable declaration in Priority 2. Removes dead `computeEnergyRating` import and `rating` variable. Adds `COMBINATION_WEIGHT_NORMALIZE` to import. Provably correct by comparing dot sizes on identical skies between individual and couple advance paths.

**2. SR house briefs expansion (fast, high value)**
Rewrite `SRStaticBriefs` in `SolarReturnPage.tsx` to loop over major planets filtered to angular houses plus luminaries. Zero data changes. ~30 lines modified.

**3. Today page advance signal (medium complexity, needs UX decision first)**
Export module-level cache from `AdvanceTab.tsx`. Read-only lookup in `TodayPage`. Decide whether to replace or supplement the energy bar. If the cache misses, nothing is shown — no loading state.

**4. SR advance preview waste (correctness, not just efficiency)**
Use `runAdvancePreCalculation` with `max: 12` directly in `SolarReturnAdvancePreview`. Eliminates the double density cap and the wasted 24-month computation. Lower urgency than 1–3, but the double density cap is a real correctness issue that affects which markers appear.

