# issue-spread-position-import-broken-test

**Type:** Issue Fix

**Originated by:** Carmack, Taleb

---

## Problem

`src/engine/__tests__/tarot.test.ts` has a failing test that has been deferred through two consecutive sprints:

```
adapts the instant interpretation text to the actual spread position
```

The test calls `SPREAD_POSITIONS.find(...)` at lines 350–351, but `SPREAD_POSITIONS` is never imported as a value — only `SpreadPosition` is imported as a type. The test fails at runtime with a reference error before any assertion fires.

This test covers production behavior: whether `computeInstantInterpretation` correctly adapts its text when passed a `situation` position versus an `advice` position. This is the position adaptation logic shipped in sprint 0026 and refined in sprint 0027. The test is supposed to be the regression guard for that logic. It has been silently absent for over two sprints.

The sprint-0027 changelog notes "1 pre-existing failure" and defers it. At the current rate of deferral, the test will remain broken indefinitely while the position adaptation code it guards continues to evolve.

---

## Proposed Solution

Add `SPREAD_POSITIONS` to the import in `src/engine/__tests__/tarot.test.ts`:

```typescript
// Before (type-only import — value not available):
import type { SpreadPosition } from '../../data/tarot/spreadPositions'

// After (value also imported):
import { SPREAD_POSITIONS } from '../../data/tarot/spreadPositions'
import type { SpreadPosition } from '../../data/tarot/spreadPositions'
```

Or combined:

```typescript
import { SPREAD_POSITIONS } from '../../data/tarot/spreadPositions'
import type { SpreadPosition } from '../../data/tarot/types'
```

One line. The test then passes as written.

---

## Why This Is an Issue Fix, Not a Code Enhancement

This is a broken test, not a quality improvement. The test exists and is correctly written — the production code it covers (position-adapted interpretation) works. The failure is a missing import that prevents the test from running at all. This is a defect in the test infrastructure, not a refactoring opportunity.

---

## Impact

**High.** A broken test is an absent regression guard. Every sprint that touches position adaptation (`adaptInterpretationToPosition`, `getPositionRegister`, `THREE_CARD_SPREAD_PROFILES`) is running without safety net coverage for that behavior. Sprint 0027 modified this exact code path (single-card position register fix). The test should have caught any regression introduced by that change. It did not, because it cannot run.

**Effort:** Trivial (one line).

---

## Dependencies

None. Standalone fix.

---

## Implementation Summary

**File:** `src/engine/__tests__/tarot.test.ts`

**Change:** Add `SPREAD_POSITIONS` value import. Run the test suite and confirm the previously-failing test now passes. The test at line 348 (`adapts the instant interpretation text to the actual spread position`) should pass as-is — the production code is correct, only the import was missing.

Expected result: test suite goes from 55 passing / 1 failing to 56 passing / 0 failing on the pre-existing failure.
