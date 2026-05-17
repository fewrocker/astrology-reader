# Sprint 0021 — State

**Status:** completed
**Branch:** sprint-0021
**Started:** 2026-05-17
**Closed:** 2026-05-17

## Tasks

| Task | Status | Worktree Branch |
|------|--------|-----------------|
| sprint-0021-task-0001-issue-couple-advance-intensity-parity | completed | sprint-0021-task-0001-issue-couple-advance-intensity-parity |
| sprint-0021-task-0002-code-snapshot-cache-lru-bound | completed | sprint-0021-task-0002-code-snapshot-cache-lru-bound |
| sprint-0021-task-0003-feat-daily-snapshot-advance-signal | completed | sprint-0021-task-0003-feat-daily-snapshot-advance-signal |
| sprint-0021-task-0004-feat-solar-return-house-briefs | completed | sprint-0021-task-0004-feat-solar-return-house-briefs |
| sprint-0021-task-0005-feat-today-advance-signal | completed | sprint-0021-task-0005-feat-today-advance-signal |

## Merge Order

1. task-0001 — clean merge
2. task-0002 — clean merge
3. task-0003 — 1 conflict in AdvanceTab.tsx (resolved, see below)
4. task-0004 — clean merge
5. task-0005 — clean merge

## Conflict Resolutions

### AdvanceTab.tsx — import block (task-0002 vs task-0003)

**Conflict:** Both tasks added a new import at line 15 of `AdvanceTab.tsx`.
- Task 0002 added: `import { LruMap } from '../../utils/lruMap'`
- Task 0003 added: `import { isQuotaError } from '../../utils/storage'`

**Resolution:** Retained both imports on consecutive lines. Both are actively used — `LruMap` for the snapshot cache references, `isQuotaError` for the localStorage write guard in the advance-today-signal write path.

### CoupleAdvanceTab.tsx — missing combinedWeight declaration (task-0001 repair)

**Issue found during build validation:** Task 0001 replaced `baseIntensity` derivation at the Priority 2 coShift branch (line 554) with `Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)`, but omitted the `const combinedWeight = isFavorable ? harmoniousWeight : challengingWeight` declaration needed in that block's scope.

**Fix:** Added the missing `const combinedWeight` declaration before the `baseIntensity` line, matching the identical pattern at `AdvanceTab.tsx:692`. Committed as a repair commit (`03ff200`) before proceeding with subsequent task merges.

## Final Build

All 5 tasks merged. `npm run build` passes with no TypeScript errors. 1890 modules transformed.

## Proposals Archived

All 5 originating proposals moved from `aios/plans/proposals/active/` to `aios/plans/proposals/done/`.
Active index updated to "No active proposals."

## GitHub

- sprint-0021 pushed to origin
- merged into master via `git merge --no-ff sprint-0021`
- master pushed to origin
