# Code Review — sprint-0018-task-0001-issue-advance-monthly-midnight-reset

**Reviewer:** Code Review Agent (automated)
**Worktree:** /tmp/worktrees/sprint-0018-task-0001
**Branch:** sprint-0018-task-0001-issue-advance-monthly-midnight-reset
**Base:** sprint-0018
**Date:** 2026-05-15

---

## Summary

The diff is a single-line change in `src/components/reading/AdvanceTab.tsx`. The change is correct, minimal, and does not introduce any regressions.

---

## Diff Reviewed

```diff
-      targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate())
+      targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate(), 12, 0, 0)
```

**File:** `src/components/reading/AdvanceTab.tsx`, line 180 (inside `preCalculateSnapshots`, monthly branch)

---

## Findings

### Correctness — PASS (no blocking issues)

**[suggestion]** The fix exactly matches the card specification. The six-argument `new Date(year, month, day, hour, minute, second)` form creates a local-time date at noon (12:00:00), which is consistent with the `T12:00:00` suffix applied to `baseDate` in `TransitReadingPage.tsx`. No other branches are touched.

**[suggestion]** The daily/weekly branch (`new Date(baseDate.getTime() + i * config.msPerStep)`) already preserves the original timestamp's time-of-day via arithmetic. This branch is correctly left unchanged.

**[suggestion]** Offset 0 continues to use `baseDate` directly (the loop hands it in unmodified when `i === 0`... actually, the loop always constructs `targetDate` — for monthly at `i=0`, the new constructor yields `new Date(year, month+0, day, 12, 0, 0)`, which is noon on the same calendar date as `baseDate`. This is correct and consistent with the intent.

### TypeScript — PASS

TypeScript type check (`tsc --noEmit`) completed with zero errors or warnings after the change.

### Scope — PASS (no blocking issues)

No extraneous files were modified. The commit touches exactly one file, one line. The commit message follows the project convention (`fix(advance): ...`).

### Edge Cases — PASS (no blocking issues)

**[suggestion]** DST transitions: using the local six-argument constructor means that on a DST spring-forward day, noon may shift slightly in UTC. However, this is identical in behavior to the `T12:00:00` convention already in use throughout the codebase and is the accepted approach. No change needed.

**[suggestion]** The comment `// Use proper month arithmetic to avoid drift` remains accurate — the fix does not change the month arithmetic, only the time-of-day component.

---

## Verdict

**No blocking issues. No warnings. Fix is correct and complete.**

The change is approved. The one-line addition of `12, 0, 0` to the monthly Date constructor in `preCalculateSnapshots` is the minimal correct fix as specified in the task card. All monthly advance snapshots (offsets 1–36) will now be anchored at noon local time, resolving the systematic Moon position error described in the card.
