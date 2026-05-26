# Code Review — sprint-0025-task-0001-issue-advance-signal-always-null

## Reviewer
Code Review Agent (subagent)

## Files Changed
- `src/components/tarot/TarotPage.tsx` — 25 insertions, 2 deletions

---

## Summary

The fix is correct and complete. Two new imports are added (`SnapshotScore` type from `../../engine/advanceScoring` and `advanceSnapshotSessionCache` from `../reading/AdvanceTab`). A module-level helper `readTodayAdvanceScore(chartData)` is introduced — it mirrors the established TodayPage.tsx pattern exactly: builds the same `chartKey` string, finds today's ISO date, iterates the cache in priority order (daily > weekly > monthly), skips neutral scores, and returns the first non-neutral `SnapshotScore` or null. Both `buildEngineCtx` and the inline `buildTarotAstroContext` call inside the exported `TarotPage` component now pass `readTodayAdvanceScore(chartData)` as the fourth argument instead of the hardcoded `null`.

The build passes cleanly (0 TypeScript errors, 0 warnings related to this change).

---

## Findings

### suggestion — `readTodayAdvanceScore` is a pure synchronous function; could be exported to a shared utility module
The function is well-scoped at the module level and avoids duplication compared to TodayPage.tsx, but both callers still contain an identical implementation. If a third consumer is added (e.g. a future TransitReadingPage tarot integration), this will diverge again. Extracting to `src/utils/advanceScore.ts` or `src/services/advanceSignal.ts` would be a cleaner long-term home. This is not a defect — the sprint card explicitly sanctions replication at the call site — but worth noting for sprint 0026.

### suggestion — `neutral` scores are skipped in the lookup (matching TodayPage.tsx behaviour)
The condition `if (!todaySnap || todaySnap.score.category === 'neutral') continue` is copied faithfully from TodayPage. For `neutral`, `ADVANCE_CATEGORY_NOTES['neutral']` does have a populated entry ("The sky holds steady — this card speaks on its own terms, uncolored by dramatic transits."). Skipping neutral means that entry is still unreachable. This is consistent with the existing app design (neutral categories are considered non-events), but it is a latent inconsistency worth documenting. Not a bug introduced by this PR.

### suggestion — `buildEngineCtx` memoisation dependency array does not include advance cache
`SingleReadingFlow` and `ThreeReadingFlow` call `useMemo(() => buildEngineCtx(chartData, birthDate), [chartData, birthDate])`. Because `advanceSnapshotSessionCache` is a module-level singleton (not a React state), React cannot detect when it is populated after mount. If the user opens the Tarot tab before visiting Advance/Today in the same session, the memo runs before the cache is populated and the score will be null — which is the documented graceful-degradation behaviour. This is correct per the sprint card spec ("if no advance score is cached… the fourth argument remains null and behaviour is unchanged"). No action required.

---

## Verdict

No blocking issues. The implementation is correct, minimal, and consistent with the established pattern. The build is clean.
