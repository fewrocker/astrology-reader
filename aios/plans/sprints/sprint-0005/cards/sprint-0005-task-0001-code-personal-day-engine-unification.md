# Sprint 0005 — Task 0001: code-personal-day-engine-unification

**From proposal:** `proposals/active/code-personal-day-engine-unification.md`

---

# Proposal: Personal Day Engine Unification

**Type:** Code Enhancement
**Originated by:** Carmack + Taleb
**Impact:** Low (quality/maintainability)
**Effort:** Low

---

## Problem

`src/components/reading/DailySnapshotCard.tsx` defines a local `calculatePersonalDay(birthDate: string): number` function at line 72. This function imports `reduceToSingleDigit` from `engine/numerology` and reimplements the personal day calculation locally.

`src/engine/numerology.ts` already exports `calculatePersonalDay(birthDate: string): number` at line 69 — a canonical, tested version of the same calculation.

Two implementations of the same function exist. A maintainer reading `DailySnapshotCard.tsx` has no way to know which one is canonical. The risk: if the formula is ever corrected or updated in the engine, `DailySnapshotCard` will silently diverge.

Note: Both functions are currently equivalent in output due to the casting-out-nines property of digital root arithmetic. There is no active user-facing bug. This is a code quality and maintainability issue.

## Proposed Solution

1. **Delete** the local `calculatePersonalDay` function from `DailySnapshotCard.tsx` (lines 72–82)
2. **Update** the import from `../../engine/numerology` to include `calculatePersonalDay` alongside the existing `reduceToSingleDigit` import
3. **Remove** the now-unused `reduceToSingleDigit` import from `DailySnapshotCard.tsx` (it was only used by the local function)

The rest of `DailySnapshotCard.tsx` is unchanged — `calculatePersonalDay(birthDate)` is called at line 102 and the call signature is identical in both the local and engine versions.

## Why This Is a Code Enhancement, Not a Feature

No user-facing behavior changes. No new capability added. The output is identical. This is pure deduplication that makes the codebase cleaner and reduces the risk of future divergence.

## Implementation Summary

**Files to modify:**
- `src/components/reading/DailySnapshotCard.tsx`
  - Remove import of `reduceToSingleDigit` from `../../engine/numerology`
  - Add `calculatePersonalDay` to import from `../../engine/numerology`
  - Delete local `calculatePersonalDay` function (approximately lines 72–82)
  - No other changes needed

## Dependencies

- None. Engine function already exists and is exported.

## Acceptance Criteria

- [ ] `DailySnapshotCard.tsx` no longer defines a local `calculatePersonalDay` function
- [ ] `calculatePersonalDay` is imported from `../../engine/numerology`
- [ ] `reduceToSingleDigit` is not imported in `DailySnapshotCard.tsx` (unused after removal)
- [ ] DailySnapshotCard renders the same personal day number as before
- [ ] TypeScript compiles with zero errors after the change
- [ ] No other files affected
