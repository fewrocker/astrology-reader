# Review: sprint-0029-task-0005-issue-three-card-stuck-after-selection

## Status: Complete

## What was fixed

`ThreeCardReading.tsx`, `handleCardTap` — stale closure on `activeCardIndex`.

When `placementComplete` transitions to `true`, React derives `activeCardIndex = 0` on
the new render. But the `useCallback` that was already memoized still held `null` from
the previous closure. The first tap hit the guard `if (0 !== null) return` and exited
silently. The user was stuck.

## Fix

Added `activeCardIndexRef = useRef<number | null>(null)` and assigned
`activeCardIndexRef.current = activeCardIndex` synchronously in the render body — this
keeps the ref always in sync with the latest derived value without an async effect cycle.

`handleCardTap` now reads `activeCardIndexRef.current` instead of the closure-captured
`activeCardIndex`. `activeCardIndex` was removed from the `useCallback` dependency array;
the callback is now stable across renders and the staleness window is eliminated.

## Changes

- `src/components/tarot/ThreeCardReading.tsx`: added `activeCardIndexRef`, updated guard
  in `handleCardTap`, removed `activeCardIndex` from dependency array
- `src/components/tarot/__tests__/threeCardRevealGuard.test.ts`: 4 regression tests —
  demonstrates the stale closure bug, verifies the ref pattern, checks non-active cards
  are still blocked, and walks all three reveals in sequence

## Build & tests

- `npm run build`: clean, no TypeScript errors
- `npx vitest run`: 73/73 passed (4 new tests in `threeCardRevealGuard.test.ts`)
