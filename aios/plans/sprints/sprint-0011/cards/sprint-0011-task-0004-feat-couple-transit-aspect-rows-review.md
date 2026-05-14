# Code Review — sprint-0011-task-0004-feat-couple-transit-aspect-rows

## Summary

All 14 spec items are implemented correctly. The implementation replaces the static div loop in `TransitAspectsToComposite` with `AspectRow` components, wires `computeTransitAspectBrief` with the relational-voice replace, adds the backward-compatible `natalLabel` prop to `AspectRow`, and documents the `house: 0` deferred gap in `synastry.ts`. TypeScript compiles cleanly with no errors.

## Findings

### [SUGGESTION] Pass `null` instead of `0` for the house argument for consistency with established pattern

File: `src/components/results/SynastryTransitPage.tsx:50`

Issue: The call passes `a.natalHouse ?? 0` (converting `null` to `0`). Both `TransitReadingPage.tsx` and `AdvanceTab.tsx` use an explicit `null` when no house is available, which is the declared parameter type (`number | null`) and self-documents intent. Passing `0` still hits the correct fallback branch (`!natalHouse` is truthy for `0`), so this is functionally correct — but it diverges from the codebase convention and is less readable.

Fix: `a.natalHouse ?? null` (or simply `a.natalHouse` since `natalHouse` is already `number | null` and the `?? 0` is unnecessary).

---

No other findings.

## Spec Checklist

| # | Item | Status |
|---|------|--------|
| 1 | Replace static loop with `<AspectRow>`; import from `../../components/reading/AspectRow` | PASS |
| 2 | All 8 props mapped correctly | PASS |
| 3 | `computeTransitAspectBrief(…, a.natalHouse ?? 0, …)` called for brief | PASS |
| 4 | `.replace(/\byour\b/gi, "the relationship's")` applied after computing brief | PASS |
| 5 | Inline comment on `house: 0` in `calculateCompositeChart` | PASS |
| 6 | Section subtitle "How current transits affect the relationship as a whole" preserved | PASS |
| 7 | `applying` badge present and wired normally | PASS |
| 8 | Expand/collapse present on all rows (brief is always non-null) | PASS |
| 9 | Local `natureColor` helper removed | PASS |
| 10 | No additional truncation at call site | PASS |
| 11 | Empty-state guard `if (transitData.transitAspects.length === 0) return null` preserved | PASS |
| 12 | `space-y-2` removed; wrapper is plain `<div>` | PASS |
| 13 | `natalLabel?: string` prop added to `AspectRow` (default `"Natal"`); `natalLabel="Composite"` passed from `TransitAspectsToComposite` | PASS |
| 14 | Exactly 3 files changed (comment-only change to `synastry.ts`) | PASS |

## Verdict

APPROVED WITH WARNINGS

One suggestion: align the `a.natalHouse ?? 0` argument with the codebase-wide convention of passing `null` (use `a.natalHouse ?? null` or just `a.natalHouse`). The current code is functionally correct — `0` is falsy and hits the correct generic-fallback branch in `computeTransitAspectBrief` — but the deviation from the pattern used in `TransitReadingPage.tsx` and `AdvanceTab.tsx` could confuse a future reader. No blocking issues. Safe to merge.
