# Sprint 0019 — State

**Status:** complete
**Branch:** sprint-0019
**Started:** 2026-05-16
**Completed:** 2026-05-16

## Tasks

| Task | Status | Worktree Branch |
|------|--------|-----------------|
| sprint-0019-task-0001-issue-advance-applying-aspect-accuracy | completed | sprint-0019-task-0001-issue-advance-applying-aspect-accuracy |
| sprint-0019-task-0002-issue-advance-snapshot-cache-key | completed | sprint-0019-task-0002-issue-advance-snapshot-cache-key |
| sprint-0019-task-0003-issue-advance-tooltip-overflow | completed | sprint-0019-task-0003-issue-advance-tooltip-overflow |
| sprint-0019-task-0004-code-advance-category-diversity | completed | sprint-0019-task-0004-code-advance-category-diversity |
| sprint-0019-task-0005-code-advance-combination-scoring | completed | sprint-0019-task-0005-code-advance-combination-scoring |
| sprint-0019-task-0006-code-advance-house-anchored-interpretation | completed | sprint-0019-task-0006-code-advance-house-anchored-interpretation |
| sprint-0019-task-0007-feat-advance-couple-tab | completed | sprint-0019-task-0007-feat-advance-couple-tab |

## Merge Summary

All 7 task branches merged into sprint-0019 with clean build after each merge. Sprint branch pushed to origin and merged into master. Master pushed to origin (commit d04d430).

## Conflict Resolutions

### task-0005 merge (combination scoring)

**Priority 2/3/4 `computeEnergyRating` calls**: task-0001 added `.filter(a => a.applying)` to each `computeEnergyRating` call. Task-0005 removed `computeEnergyRating` entirely, replacing the approach with combination-weight scoring that already operates exclusively on applying aspects. Resolution: kept task-0005's approach; the applying-filter intent from task-0001 is preserved because `computeCombinedWeight` only receives the already-filtered `tightApplyingHarmonious`/`tightApplyingChallenging` arrays.

**Pure shift return object**: HEAD (task-0003) added `bannerBoldFragment: stationPlanet`. Task-0005 replaced the static reason string with the enriched `shiftReason` (nearest natal planet context). Resolution: kept task-0005's `reason: shiftReason` AND task-0003's `bannerBoldFragment: stationPlanet`. Both changes preserved.

### task-0006 merge (house-anchored interpretation)

**SnapshotScore interface**: task-0003 added `bannerBoldFragment?: string`. Task-0006 added `guidance?: string`. Resolution: kept both fields in the interface.

**`buildPowerReason` return type**: task-0003 returned `{ reason, bannerBoldFragment }`. Task-0006 returned `{ reason, guidance? }`. Resolution: merged to `{ reason, bannerBoldFragment, guidance? }`. POWER_DAY_PHRASES entries spread-merged with `bannerBoldFragment: planet`.

**`buildAspectReason` function**: task-0003 returned `{ reason, bannerBoldFragment }` with simple domainMap fallback. Task-0006 added house-anchored main path (TRANSIT_PLANET_PHRASES + ASPECT_HOUSE_CONTEXT + ASPECT_GUIDANCE) with `{ reason, guidance? }` return. Resolution: merged to `{ reason, bannerBoldFragment, guidance? }` — all three return sites in the function (house-anchored path, fallback path) now include `bannerBoldFragment: planet`.

**scoreSnapshot Priority 2/3/4 intensity**: Task-0005 uses `Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)`. Task-0006 attempted to revert to `Math.abs(rating.score - 3) / 2` (an incorrect revert since `rating` no longer exists after task-0005). Resolution: kept task-0005's intensity calculation in all three priority blocks.

**scoreSnapshot return objects**: All Priority 2/3/4 return objects now include `bannerBoldFragment` (task-0003), `guidance` (task-0006), and use combination-weight intensity (task-0005).

**Banner render in JSX**: task-0003 used `bannerBoldFragment` for bold text rendering. Task-0006 wrapped in a `<div>` and added a `guidance` paragraph but reverted to first-word bold. Resolution: kept task-0003's `bannerBoldFragment` bold logic inside task-0006's `<div>` wrapper with the guidance paragraph.

**Duplicate `houseOrdinal` function**: task-0005 added a version at the top of the file section; task-0006 added its own version later. Resolution: removed the task-0005 duplicate (lower in file), kept task-0006's version in the `// ─── House ordinal helper ─────────────────────────────────────────────────────` section.
