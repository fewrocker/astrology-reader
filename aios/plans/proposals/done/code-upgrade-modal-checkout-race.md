---
**Type:** Code Enhancement
**Originated by:** Carmack, Taleb
**Sprint:** 0013

## Problem / Opportunity

`src/components/subscription/UpgradeModal.tsx` contains a stale-closure race condition in the post-authentication checkout path that can trap an unauthenticated user in an auth loop.

The mechanism is precise. `UpgradeModal` receives `authenticated` as a prop (line 9, used at line 113). When an unauthenticated user clicks a CTA, `handleCheckout` (line 112) immediately returns after calling `setAuthModalOpen(true)` (line 115) — the checkout does not proceed. The user completes login or registration inside the `AuthModal` rendered at line 232. `AuthModal`'s `onClose` prop is wired to `handleAuthComplete` (line 161). Inside `handleAuthComplete`, after closing the auth modal (line 162), there is a `await new Promise(r => setTimeout(r, 300))` at line 168 intended to let the auth context "settle," after which `handleCheckout` is called again (line 169).

The problem: `handleCheckout` guards on `if (!authenticated)` at line 113, where `authenticated` is the prop value captured by the closure at the time `handleAuthComplete` was defined — which is the value from the render that existed before the user logged in. React has not re-rendered `UpgradeModal` with the new `isAuthenticated = true` prop by the time the 300ms timer fires, because `UpgradeModal` re-renders only when its parent re-renders. The parent's auth state update propagates from `AuthContext` (where `setUser(loggedInUser)` is called at `AuthContext.tsx` line 195 for login, or line 228 for register) through React's reconciliation cycle, which has not completed within the 300ms window under all conditions — and certainly not guaranteed to complete before the closure executes.

The result: `handleCheckout` at line 113 sees `authenticated === false`, calls `setAuthModalOpen(true)` again (line 115), and the `AuthModal` reopens. The user, having just authenticated, is shown the login screen again. The loop is bounded only by user patience.

The 300ms delay at line 168 (`// Small delay to let auth context settle`) is cargo-culted. It acknowledges the race but does not close it. The `login()` function in `AuthContext.tsx` does complete synchronously from the caller's perspective by the time its `Promise` resolves — `localStorage.setItem(AUTH_TOKEN_KEY, jwt)` at line 186 runs before `login()` returns — but the React render triggered by `setUser(loggedInUser)` at line 195 is scheduled asynchronously by React and may not have caused `UpgradeModal` to receive its new `authenticated` prop before the 300ms window closes, particularly under React's concurrent rendering scheduler. The token in `localStorage` is available immediately. The prop is not.

This is also the interaction path where a `ceremonyStartedAt` state timing issue (noted separately by Taleb) compounds: `setCeremonyStartedAt(start)` at line 120 is a `useState` setter, meaning the updated value is not readable synchronously in the same render cycle. The catch block at line 154 reads `ceremonyStartedAt` from state, which under fast failure conditions may still hold `0` (its initial value from line 65), causing `Math.max(0, 2000 - elapsed)` to always compute 2000ms regardless of actual elapsed time. This is a secondary fragility in the same component, adjacent to the primary race.

The user-facing failure path: unauthenticated user sees the UpgradeModal, clicks "Open Basic," sees the AuthModal, successfully registers or logs in, the AuthModal closes, and then — after a 300ms pause — the AuthModal reopens. If the user completes login a second time, the same cycle may repeat. The user either abandons or, by chance timing on a slower machine where React has flushed the re-render within 300ms, proceeds to checkout. This is a conversion-destroying defect on the most sensitive screen in the product.

## Desired State

`handleCheckout` should read auth state that is guaranteed to be current at the moment it executes, not state captured by a closure at render time. The prop-based closure is the wrong source of truth for this decision point.

Two acceptable shapes for a correct solution:

First: `handleCheckout` reads auth state from a `useRef` that is kept synchronously up to date with the prop — a pattern that explicitly decouples "the value I need to check right now" from "the value React gave me in the last render." A ref updated in a `useEffect` that tracks the `authenticated` prop would make the current value available to any closure without requiring a re-render.

Second: `handleAuthComplete` does not call `handleCheckout` at all. Instead, it closes both modals and lets the component re-render naturally. On re-render with `authenticated === true` and a non-null `pendingTierForAuth`, a `useEffect` observing those two values triggers the checkout. This eliminates the closure problem entirely by moving the post-auth dispatch into the React render cycle where prop freshness is guaranteed.

Either path removes the 300ms setTimeout, which should not exist. The ceremony state is correct UX; the artificial pre-ceremony delay is not.

The `ceremonyStartedAt` tracking should use `useRef` rather than `useState` so that the elapsed-time calculation in the catch block reads a synchronously correct value rather than a potentially stale state snapshot.

The correct end state is a component where: (1) an unauthenticated user who completes auth inside the modal proceeds directly to the checkout ceremony with no loop risk, (2) the auth state consulted at checkout time is never a stale closure, and (3) the ceremony timing arithmetic is correct under fast network failure conditions.
