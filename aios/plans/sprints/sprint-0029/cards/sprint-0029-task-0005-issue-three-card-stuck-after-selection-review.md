# Review: sprint-0029-task-0005-issue-three-card-stuck-after-selection

## Summary

Three-line targeted fix in `src/components/tarot/ThreeCardReading.tsx`. A stale-closure bug in `handleCardTap` caused the first tap on card 0 to be silently dropped whenever `placementComplete` transitioned from `false` to `true`. The fix introduces a `useRef` to hold `activeCardIndex` synchronously during each render, so `handleCardTap` always reads the current value rather than the value captured at callback creation time.

## Root Cause

`handleCardTap` was wrapped in `useCallback` with `[activeCardIndex, triggerRevealOverlay]` as its dependency array. On the render where `placementComplete` first becomes `true`, React sets `activeCardIndex` from `null` to `0`. The new `handleCardTap` closure is created — but there is a staleness window: any tap that fires before React completes the full commit-and-attach cycle hits the old closure, which still sees `activeCardIndex === null`. The guard `if (index !== activeCardIndex) return` evaluates as `if (0 !== null) return` and exits silently. The user is stuck.

## Changes Made

**File:** `src/components/tarot/ThreeCardReading.tsx`

```typescript
// Added immediately after activeCardIndex is derived:
const activeCardIndexRef = useRef<number | null>(null)
activeCardIndexRef.current = activeCardIndex          // updated synchronously on every render

// Inside handleCardTap — reads ref instead of closed-over variable:
// Before:
if (index !== activeCardIndex) return
// After:
if (index !== activeCardIndexRef.current) return

// Dependency array — activeCardIndex removed (ref access is always current):
// Before: [activeCardIndex, triggerRevealOverlay]
// After:  [triggerRevealOverlay]
```

The pattern — assign `ref.current = value` at render time, read `ref.current` inside a stable callback — is the standard React idiom for breaking stale-closure cycles without changing component behaviour.

## Verification

- `npm run build` — passes cleanly, no TypeScript errors (1925 modules transformed)
- No test suite present in project; build output is the verification gate

## Notes

No new state, no new flags, no change to the reveal phase machine. The fix is strictly local to `handleCardTap` and its ref. All downstream logic (`triggerRevealOverlay`, `revealedMask`, `phase` transitions, `flipDoneMask`) is unchanged.
