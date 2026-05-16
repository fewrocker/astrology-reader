# Review: Extract runAdvancePreCalculation Shared Utility

**Status:** Complete  
**Branch:** sprint-0020-task-0004-code-advance-precompute-abstraction  
**Commit:** 3c8235d

---

## What Was Done

Extracted a single `runAdvancePreCalculation` generic function in `AdvanceTab.tsx` that encapsulates the three invariant phases previously duplicated across both pre-calculators:

1. **Date-offset loop** with monthly noon normalization
2. **Hysteresis pass** (spec 14.4) — neutral gap bridging between matching flanking categories
3. **Two-phase density cap** (spec 1.13) — phase-1 category reservation via fixed `NON_NEUTRAL_CATEGORIES` order, phase-2 fill by intensity

Both `preCalculateSnapshots` and `preCalculateCoupleSnapshots` are now thin wrappers (~15 lines each) supplying a `buildSnapshot` callback and a `scoreFunc` callback.

---

## Signature

```ts
export function runAdvancePreCalculation<S extends AdvanceSnapshot>(
  period: TransitPeriod,
  baseDate: Date,
  config: { max: number; msPerStep: number },
  buildSnapshot: (date: Date, offset: number) => Omit<S, 'score'>,
  scoreFunc: (snap: S, prev: S | null) => SnapshotScore,
): S[]
```

- `config` is explicit rather than derived from `ADVANCE_CONFIG[period]`, which unblocks SR advance from using a custom 12-step config.
- `scoreFunc` receives `(snap, prev)` — `prev` is required for station-crossing detection in both scoring paths.
- Generic `S extends AdvanceSnapshot` allows future callers to return extended snapshot types.

---

## Algorithm Unification

The `CoupleAdvanceTab.tsx` density cap had diverged to an older single-pass algorithm (group by category, insert one rep per category, fill — using a conditional `if (categories.length > 1)` branch that skipped the explicit `NON_NEUTRAL_CATEGORIES` ordering). This is replaced by the canonical two-phase approach from `AdvanceTab.tsx`, which:

- Iterates categories in deterministic fixed order (`power`, `favorable`, `challenging`, `shift`)
- Uses an explicit `reservedOffsets` Set, making the reservation phase O(n) and order-independent of the snapshot array contents
- Has no conditional branch for single-category case (phase-1 simply finds no best in missing categories; phase-2 fills remaining capacity naturally)

This is a **behavioral change for CoupleAdvanceTab** in edge cases where the old single-category path (`categories.length === 1`) produced a different fill order. The new behavior is correct per spec 1.13.

---

## Files Changed

- `/projects/astrology-reader/src/components/reading/AdvanceTab.tsx` — added `runAdvancePreCalculation` export (~100 lines), replaced `preCalculateSnapshots` body with thin wrapper (~20 lines)
- `/projects/astrology-reader/src/components/reading/CoupleAdvanceTab.tsx` — replaced `preCalculateCoupleSnapshots` body with thin wrapper (~20 lines), updated imports (removed `MARKER_HYSTERESIS_ORB`, `MarkerCategory`; added `runAdvancePreCalculation`)

Net: 92 insertions, 137 deletions.

---

## Build Verification

`npm run build` passes with zero TypeScript errors.

---

## Notes for SR Advance Preview

The function is ready for the Solar Return advance preview to call directly:

```ts
runAdvancePreCalculation(
  'monthly',
  srMoment,
  { max: 12, msPerStep: ADVANCE_CONFIG.monthly.msPerStep },
  (date, offset) => buildSRSnapshot(date, offset, srChart),
  (snap, prev) => scoreSRSnapshot(snap, prev, srChart),
)
```

No modifications to `ADVANCE_CONFIG` or the existing wrapper functions are needed.
