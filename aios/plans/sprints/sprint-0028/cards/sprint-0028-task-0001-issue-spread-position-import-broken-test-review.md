# Review: sprint-0028-task-0001-issue-spread-position-import-broken-test

## Summary

Single-line fix: added `SPREAD_POSITIONS` value import to `src/engine/__tests__/tarot.test.ts`. The file previously had only a type-only import (`import type { SpreadPosition }`) from `../../data/tarot/spreadPositions`, which made the `SPREAD_POSITIONS` array unavailable at runtime. Lines 350–351 called `SPREAD_POSITIONS.find(...)`, causing a reference error before any assertion could fire.

## Change Made

**File:** `src/engine/__tests__/tarot.test.ts`

```typescript
// Before
import type { SpreadPosition } from '../../data/tarot/spreadPositions'

// After
import { SPREAD_POSITIONS } from '../../data/tarot/spreadPositions'
import type { SpreadPosition } from '../../data/tarot/spreadPositions'
```

## Verification

- `npm run build` — passes cleanly (no TypeScript errors)
- `npx vitest run` — **56 passing, 0 failing**
  - Previously: 55 passing, 1 failing
  - The test `adapts the instant interpretation text to the actual spread position` now passes

## Notes

The production code (`computeInstantInterpretation`, `adaptInterpretationToPosition`) was already correct. The test was also correctly written. Only the missing import prevented it from running. No logic changes were needed.
