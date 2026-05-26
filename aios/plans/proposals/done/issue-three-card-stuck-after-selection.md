# issue-three-card-stuck-after-selection

**Type:** Issue Fix
**Originated by:** Jobs, Carmack, Taleb
**User guidance:** "on three cards there is a bug, After the three cards are selected for the three positions, we stay stuck, and the click on the first card shine and trigger click are not there so the user cant proceed"

## Problem

In `ThreeCardReading.tsx`, after all three cards have been selected for their spread positions (`selectedCount === 3` and `drawnCards.length === 3`), the component sets `placementComplete = true` and derives `activeCardIndex = 0`. At this point, card 0 should be interactive: the `tarot-ring-pulse` animation should glow on its back face and tapping it should fire `handleCardTap(0)`, which flips the card and advances the phase from `'idle'` to `'card-revealed-0'`.

The failure is in the `handleCardTap` `useCallback`. Its dependency array is `[activeCardIndex, triggerRevealOverlay]`. When `placementComplete` transitions from `false` to `true`, React re-renders and `activeCardIndex` moves from `null` to `0`. However, there is a staleness window — the old `handleCardTap` closure, which captured `activeCardIndex === null`, is still the version attached to the card's `onTap` prop at the moment of the first tap. The guard at the top of `handleCardTap`:

```typescript
if (index !== activeCardIndex) return
```

evaluates as `if (0 !== null) return` — which is always true — and exits silently. The first tap produces no visual or state change. The user sees a card face that is not glowing and does not respond.

The `CardReveal` component at index 0 does receive `isActive={true}` and the `tarot-ring-pulse` animation is present in the CSS. The visual affordance (glow) may or may not appear depending on whether React has finished the transition cycle before the user taps. The click handler guard is the reliable failure: even when the glow renders, the first tap is dropped.

**Reproduction path:**
1. Open a three-card reading and draw all three cards from the deck.
2. The `TarotDeckSelection` unmounts. The instruction panel reads "All three cards are placed. Reveal them one by one."
3. Tap the first card position. Nothing happens.
4. The user is stuck with no way to proceed to the reveal phase.

**Secondary symptom:** Because `synthesisStartedRef` is set to `true` inside the `placementComplete` `useEffect` and the synthesis fetch begins immediately at placement, the background synthesis load starts correctly — but the user never reaches the reveal flow to consume it.

**Root state chain:** `selectedCount === 3 && drawnCards.length === 3` → `placementComplete = true` → `activeRevealIndex = 0` → `activeCardIndex = 0` → `handleCardTap` reconstructed with new `activeCardIndex` → old closure still attached to `CardReveal.onTap` during the first render cycle → tap guard fires with stale `null`, interaction dropped.

**File:** `src/components/tarot/ThreeCardReading.tsx`, `handleCardTap` (line ~722) and its `useCallback` dependency array (line ~751).

## Expected behavior

After all three cards are placed, the first card position glows with the `tarot-ring-pulse` animation and responds to the first tap without requiring the user to tap twice or wait for a second render cycle. Tapping card 0 immediately:

1. Fires `triggerRevealOverlay()` (screen flash).
2. Sets `revealedMask[0] = true`, triggering the 3D flip animation.
3. Sets `phase` to `'card-revealed-0'`.
4. After 600ms, sets `flipDoneMask[0] = true`, rendering the card face.

The fix must ensure `handleCardTap` always reads the current `activeCardIndex` at call time rather than the captured value from the previous render cycle. The established approach is to store `activeCardIndex` in a `useRef` that is updated synchronously before any render, and read from the ref inside `handleCardTap` instead of the closure-captured variable — keeping the `useCallback` dependency array stable and eliminating the staleness window entirely.

No new state, no new flags, no change to the reveal phase machine. The fix is local to `handleCardTap` and its ref management.
