# Proposal: Extract Shared Advance Pre-Calculation Core

**Type:** Code Enhancement
**Originated by:** Carmack

---

## Problem / Opportunity

`preCalculateCoupleSnapshots` in `/projects/astrology-reader/src/components/reading/CoupleAdvanceTab.tsx` (lines 280–393) is a structural duplicate of `preCalculateSnapshots` in `/projects/astrology-reader/src/components/reading/AdvanceTab.tsx` (lines 846–963). The two functions are ~113 lines each and implement the same three-phase infrastructure:

1. **Date-offset loop** — both normalize monthly dates to noon for offsets ≥ 1 using the identical pattern (lines 858–869 in `AdvanceTab.tsx`, lines 293–299 in `CoupleAdvanceTab.tsx`).
2. **Hysteresis pass** — both check whether a neutral snapshot is flanked by identical non-neutral categories and inherit the neighbor's score when the orb delta is below `MARKER_HYSTERESIS_ORB` (lines 899–924 in `AdvanceTab.tsx`, lines 323–345 in `CoupleAdvanceTab.tsx`).
3. **Density cap with category diversity** — both enforce a 20% marker ceiling. However, the two implementations have already diverged in their category-diversity logic: `AdvanceTab.tsx` (lines 930–960) uses a two-phase approach that reserves the best marker per category first and then fills remaining capacity from the non-reserved pool. `CoupleAdvanceTab.tsx` (lines 347–390) uses an earlier single-pass approach that groups by category, inserts one representative per category, and then fills — a structurally different algorithm that omits the explicit `reservedOffsets` set and the `NON_NEUTRAL_CATEGORIES` ordered reservation. These are not behaviorally equivalent: the `AdvanceTab.tsx` phase-1 reservation is deterministic across category order; the `CoupleAdvanceTab.tsx` path is not.

The only intentional differences between the two functions are:
- The couple version calls `scoreCoupleSnapshot` with a different signature (takes `chart1`, `chart2`, `synastryData`).
- The couple version sets `housedTransitPlanets: transitPlanets` (no house assignment) rather than calling `assignTransitHouses`.

Every other line is duplicated logic that must be kept in sync by hand.

The sprint-0020 vision specifies a Solar Return advance preview (`SolarReturnPage.tsx`) that would run the same pre-calculation loop against the SR chart for a 12-step monthly period. The vision explicitly states: "Solar Return advance is architecturally reused, not copy-pasted — the SR preview strip should import and call `preCalculateSnapshots` with the SR chart, not duplicate the pre-calculation logic." The current `preCalculateSnapshots` signature (`chartData`, `period`, `baseDate`) does not accept an external scoring callback or a custom `max` override, so the SR advance cannot simply call the existing function — it would need either its own copy or a workaround that slices the result of a 36-step run.

If the SR advance ships before this abstraction, the codebase will have three independent copies of the density cap and hysteresis algorithms. The density cap changed substantially in sprint-0019 (adding the two-phase category reservation). Propagating any future change to three copies with divergent intermediate states is a maintenance liability.

---

## Desired State

A single exported function — tentatively `runAdvancePreCalculation` in `AdvanceTab.tsx` — encapsulates the hysteresis pass and density cap and accepts the scoring callback and snapshot builder as parameters. Its signature is approximately:

```ts
export function runAdvancePreCalculation(
  period: TransitPeriod,
  baseDate: Date,
  config: AdvanceConfig,
  buildSnapshot: (date: Date, offset: number) => Omit<AdvanceSnapshot, 'score'>,
  scoreFunc: (snap: AdvanceSnapshot, prev: AdvanceSnapshot | null) => SnapshotScore,
): AdvanceSnapshot[]
```

The date-offset loop, monthly noon normalization, hysteresis pass, and density cap all live exactly once in this function. The `config` parameter is explicit rather than derived from `ADVANCE_CONFIG[period]`, which also unblocks the SR advance from using a custom 12-step config without modifying the shared constant.

`preCalculateSnapshots` and `preCalculateCoupleSnapshots` become thin wrappers that supply their respective `buildSnapshot` and `scoreFunc` callbacks. The SR advance preview supplies its own callbacks with `srChart` as `chartData` and `srMoment` as `baseDate`. No behavioral change is introduced — the refactor is purely structural.

The divergence in the density cap algorithm between the two current implementations must be resolved to the `AdvanceTab.tsx` two-phase approach (phase-1 category reservation + phase-2 fill), since that is the version that shipped with the sprint-0019 spec change. The `CoupleAdvanceTab.tsx` single-pass approach should not survive the merge into the shared core.
