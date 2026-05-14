---
**Task:** sprint-0013-task-0004-code-upgrade-modal-checkout-race
**Status:** done

## Summary

Fixed a stale-closure race condition in `UpgradeModal.tsx` that caused unauthenticated users to be looped back into the auth modal after successfully logging in when clicking a checkout CTA.

The root cause was `handleAuthComplete` calling `handleCheckout` via a closure that captured the pre-login `authenticated` prop value. Even with a 300ms artificial delay, React's reconciliation had not guaranteed a re-render with the updated prop before the closure executed — so `handleCheckout` still saw `authenticated === false` and re-opened the auth modal.

The fix uses Option 2 from the card: `handleAuthComplete` now only closes the auth modal. A new `useEffect` with `[authenticated, authModalOpen, runCheckoutSession]` deps fires after React re-renders with the fresh `authenticated === true` prop, reads `pendingTierAfterAuth.current`, and calls `runCheckoutSession` directly — no closure staleness, no artificial delay.

Additionally, `runCheckoutSession` (using `useCallback`) and the new `useEffect` hooks were moved before the early-return guard (`if (!isOpen && !authModalOpen) return null`) to comply with React's rules of hooks — the partially-implemented version had `useCallback` called after the early return, which is a rules-of-hooks violation.

## Checklist

- ✓ `pendingTierForAuth` state replaced with `pendingTierAfterAuth` ref (`useRef<{ tier: 'basic' | 'advanced'; priceId: string } | null>(null)`)
- ✓ `ceremonyStartedAt` state replaced with `ceremonyStartedAtRef` ref (`useRef<number>(0)`) — catch block reads synchronously correct elapsed time
- ✓ `runCheckoutSession` extracted as `useCallback` (stable reference, correct deps `[]`)
- ✓ `handleAuthComplete` fixed — no more stale closure, no 300ms setTimeout; simply closes auth modal
- ✓ `useEffect` triggers checkout after auth completes with fresh `authenticated` prop from React render cycle
- ✓ `runCheckoutSession` and post-auth `useEffect` moved before early return to satisfy rules of hooks
- ✓ TypeScript clean (`npx tsc --noEmit` passes with zero errors)

## Blocking Issues

None.
