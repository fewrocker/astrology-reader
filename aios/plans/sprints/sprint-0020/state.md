# Sprint 0020 — State

**Status:** complete
**Branch:** sprint-0020
**Started:** 2026-05-16
**Completed:** 2026-05-16

## Tasks

| Task | Status | Worktree Branch |
|------|--------|-----------------|
| sprint-0020-task-0001-issue-couple-advance-cache-key | completed | sprint-0020-task-0001-issue-couple-advance-cache-key |
| sprint-0020-task-0002-issue-couple-advance-banner-bold-fragment | completed | sprint-0020-task-0002-issue-couple-advance-banner-bold-fragment |
| sprint-0020-task-0003-code-couple-advance-scoring-parity | completed | sprint-0020-task-0003-code-couple-advance-scoring-parity |
| sprint-0020-task-0004-code-advance-precompute-abstraction | completed | sprint-0020-task-0004-code-advance-precompute-abstraction |
| sprint-0020-task-0005-code-transit-timeline-advance-coherence | completed | sprint-0020-task-0005-code-transit-timeline-advance-coherence |
| sprint-0020-task-0006-feat-couple-advance-guidance | completed | sprint-0020-task-0006-feat-couple-advance-guidance |
| sprint-0020-task-0007-feat-couple-advance-synastry-axis | completed | sprint-0020-task-0007-feat-couple-advance-synastry-axis |
| sprint-0020-task-0008-feat-solar-return-advance-preview | completed | sprint-0020-task-0008-feat-solar-return-advance-preview |

## Merge Summary

All 8 tasks merged into sprint-0020 on 2026-05-16. Final build: green (tsc + vite, 1889 modules).

### Tasks that merged cleanly (no conflicts)
- task-0001 (cache key) — clean auto-merge
- task-0002 (banner bold fragment) — clean auto-merge
- task-0004 (precompute abstraction) — clean auto-merge

### Tasks with conflicts and resolutions

**task-0003 (scoring parity) vs task-0002 (HEAD)**
- File: `CoupleAdvanceTab.tsx`
- Conflict: task-0003 introduced a second `COUPLE_ASPECT_GUIDANCE` table with more entries; task-0002 had already added one. Also minor variable naming differences (`planet as string`, `guidanceKey`).
- Resolution: Merged tables — kept task-0003's more detailed guidance text + added Chiron entries from task-0003. Used task-0003's variable naming. Kept precise multiline cache key format from task-0001. Preserved `guidance` field in all return objects.

**task-0005 (timeline coherence) vs HEAD**
- File: `AdvanceTab.tsx`
- Conflict: task-0005 wanted to replace `runAdvancePreCalculation` (generic, from task-0004) with a concrete `preCalculateSnapshots`. HEAD had both.
- Resolution: Kept `runAdvancePreCalculation` (still needed by CoupleAdvanceTab). Applied task-0005's `export` keyword to `preCalculateSnapshots` (needed by task-0008). Preserved task-0005's `snapshots`/`isPending` prop additions to AdvanceTab component.

**task-0006 (couple guidance) vs HEAD**
- File: `CoupleAdvanceTab.tsx`
- Conflict: task-0006 added `COUPLE_POWER_PHRASES`, `COUPLE_SHIFT_GUIDANCE`, and a third version of `COUPLE_ASPECT_GUIDANCE` with richer text.
- Resolution: Added `COUPLE_POWER_PHRASES` lookup to `buildCouplePowerReason`. Kept task-0006's richer `COUPLE_ASPECT_GUIDANCE` text; removed the duplicate from earlier merge; added Chiron entries from task-0003. Added `COUPLE_SHIFT_GUIDANCE` table and wired `guidance` into `buildCoupleShiftReason`. Preserved guidance field in all return paths.

**task-0007 (synastry axis) vs HEAD**
- File: `CoupleAdvanceTab.tsx`
- Conflict: task-0007 changed builder function return types from `{reason, bannerBoldFragment, guidance?}` to plain `string`, replaced weight-based intensity with `computeEnergyRating`, and added synastry axis detection. Also replaced `runAdvancePreCalculation` with a manual loop.
- Resolution: Kept full `{reason, bannerBoldFragment, guidance}` return objects (preserving task-0002/0006 guidance work). Adopted energy-rating-based intensity in all scoring paths. Added synastry axis augmentation to reason strings. Used manual loop with `tightSynastryPairs` parameter. Added density cap to manual loop. Fixed imports: added `computeEnergyRating`, `MARKER_HYSTERESIS_ORB`; removed unused `COMBINATION_WEIGHT_NORMALIZE`, `runAdvancePreCalculation`.

**task-0008 (solar return preview) vs HEAD**
- File: `AdvanceTab.tsx`
- Conflict: Same `runAdvancePreCalculation` vs `preCalculateSnapshots` rename conflict as task-0005.
- Resolution: Same as task-0005 — kept `runAdvancePreCalculation` with JSDoc; `preCalculateSnapshots` already exported from task-0005 merge.
