# Review: feat-shuffle-ritual-wiring

**Task:** sprint-0024-task-0005-feat-shuffle-ritual-wiring
**Date:** 2026-05-26
**Status:** Completed

---

## Summary

`DeckShuffleAnimation.tsx` is now wired into the Single Card and Three-Card reading flows. The component was previously built and complete but unused — users navigated directly from mode selection to the deck fan. This change inserts the shuffle ritual as the mandatory threshold between mode selection and reading.

---

## Spec-by-spec review

### Flow and Navigation

**Spec 1** — After intention + mode selection (Single or Three-Card), the product transitions to the shuffle ritual before presenting the deck.
- Implemented: `TarotHomeView.tsx` now dispatches `NAVIGATE_TAROT` to `'shuffle-ritual'` instead of `'single-reading'`/`'three-reading'`. The mode selector and deck fan do not appear simultaneously with the ritual.

**Spec 2** — Ritual receives intention string, focus area, and reading mode; outputs drawn card indices via `onRevealComplete`.
- Implemented: `ShuffleRitualFlow` derives `focusArea` from the intention string via `deriveFocusArea()`, maps the context `ReadingMode` to `DeckShuffleAnimation`'s `ReadingMode` via `toShuffleReadingMode()`, and passes `drawnCardIndices` from `onRevealComplete` into context via `SET_RITUAL_CARD_INDICES`, then navigates to the reading view.

**Spec 3** — Celtic Cross does not pass through the shuffle ritual.
- Implemented: `TarotHomeView.tsx` Celtic Cross button navigates directly to `'celtic-reading'`. The `'shuffle-ritual'` subView is never entered for Celtic Cross.

**Spec 4** — Saved Readings does not pass through the shuffle ritual.
- Implemented: `'saved-readings'` navigation is unchanged and does not pass through `'shuffle-ritual'`.

### Phase Progression

**Spec 5** — On entering ritual view, component enters `intention-set` phase. Intention appears above the deck. Three face-down cards appear with staggered breath animation.
- Implemented by `DeckShuffleAnimation.tsx` (pre-existing): `useEffect` on mount dispatches `START_INTENTION`. Intention echo and staggered `tarotDeckBreathe` animations are rendered.

**Spec 6** — After 600ms in `intention-set`, automatically advances to `shuffling`.
- Implemented by `DeckShuffleAnimation.tsx`: `useEffect` on `intention-set` phase sets a 600ms timeout to dispatch `BEGIN_SHUFFLE`.

**Spec 7** — During `shuffling`, fan animation runs. 2000ms minimum duration.
- Implemented by `DeckShuffleAnimation.tsx`: fan animations (`tarotFanLeft`, `tarotFanCenter`, `tarotFanRight`) run during shuffle. `drawCards()` is called synchronously; `setTimeout` enforces 2000ms minimum before dispatching `CARD_READY`.

**Spec 8** — When shuffle concludes, fade-through-black overlay transitions to `card-selected`. Three cards resolve to one.
- Implemented by `DeckShuffleAnimation.tsx`: `RitualFadeOverlay` activates on `card-selected` entry (500ms). The deck (`showDeck`) hides and the single card (`showSingleCard`) appears.

**Spec 9** — In `card-selected`, single face-down card is centered, breathes, is focusable and interactive.
- Implemented by `DeckShuffleAnimation.tsx`: `tarotCardBreathe` animation, `role="button"`, `tabIndex={0}`, `aria-label="Reveal card"`, `cardRef.current?.focus()`.

**Spec 10** — On first use, after 1200ms, hint appears. Auto-dismisses after 3s. LocalStorage key set.
- Implemented by `DeckShuffleAnimation.tsx`: `hintSeen` reads `tarot_hint_seen` from localStorage. Hint timer fires at 1200ms if not seen, sets the key, auto-hides after 3s.

**Spec 11** — User tap/click advances to `revealing`. Hint disappears.
- Implemented by `DeckShuffleAnimation.tsx`: `handleFlip` dispatches `USER_FLIP`. `setShowHint(false)` occurs when the phase changes away from `card-selected`.

**Spec 12** — In `revealing`, 3D Y-axis rotation in 600ms. Reduced motion: opacity crossfade.
- Implemented by `DeckShuffleAnimation.tsx`: `setIsFlipped(true)` triggers `rotateY(180deg)` with 600ms transition. Reduced-motion branch uses opacity swap.

**Spec 13** — After flip, advances to `revealed`. Screen-reader announcement. Parent receives drawn card indices.
- Implemented by `DeckShuffleAnimation.tsx`: 600ms timer dispatches `FLIP_COMPLETE`. `ariaLiveRef` is updated. `onRevealComplete` fires, which in the wiring navigates to the reading view with `ritualCardIndices` set.

### Card Backs and Visual Language

**Spec 14** — Face-down cards render with full card-back design: indigo field, eight-pointed star, gold border.
- Implemented by `DeckShuffleAnimation.tsx`: local `CardBack` component renders `background: '#1a1040'`, `border: '1px solid rgba(201,168,76,0.2)'`, and `EightPointedStar` SVG.

**Spec 15** — Single card in `card-selected` is 160×250px vs 140×220px for the three-card deck.
- Implemented by `DeckShuffleAnimation.tsx`: `SELECTED_W = 160`, `SELECTED_H = 250` vs `CARD_W = 140`, `CARD_H = 220`.

**Spec 16** — Eight-pointed star visible at low opacity in `card-selected`, disappears as flip begins.
- Implemented by `DeckShuffleAnimation.tsx`: `EightPointedStar` is on the back face (opacity 0.15 fill). When `isFlipped` becomes `true`, the back face's `backfaceVisibility: 'hidden'` hides it.

### Intention Echo

**Spec 17** — Echo shows typed intention (≤60 chars, ellipsis) or chip label in title case. Shown during `intention-set` and `shuffling`.
- Implemented by `DeckShuffleAnimation.tsx`: `intentionLabel` is derived from `intention.trim()` or `focusArea.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())`. Truncated at 60 chars.

**Spec 18** — Echo fades slightly from `intention-set` (opacity ~0.7) to `shuffling` (opacity ~0.65).
- Implemented by `DeckShuffleAnimation.tsx`: `opacity: ctx.phase === 'intention-set' ? 1 : 0.65` on the `<p>` with `transition: 'opacity 400ms ease'`.

**Spec 19** — In `card-selected`, echo may remain or fade — must not compete with card.
- Implemented: the echo is not rendered during `card-selected` (it's conditionally shown only for `intention-set` and `shuffling`). Card has undivided visual attention.

### Reduced Motion

**Spec 20** — Fan animation suppressed under reduced motion. Deck remains still.
- Implemented by `DeckShuffleAnimation.tsx`: fan `animation` value is `'tarotFanX ...'` only when `!prefersReduced.current`.

**Spec 21** — Fade-through-black suppressed under reduced motion.
- Implemented by `DeckShuffleAnimation.tsx`: `RitualFadeOverlay` `setFadeActive(true)` is only called when `!prefersReduced.current`.

**Spec 22** — Breathing animation suppressed under reduced motion.
- Implemented by `DeckShuffleAnimation.tsx`: the 3D flip branch includes `animation: ctx.phase === 'card-selected' ? 'tarotCardBreathe 3s ease-in-out infinite' : 'none'`, and the reduced-motion branch uses a static `div` with no animation.

**Spec 23** — 3D flip replaced with opacity crossfade under reduced motion.
- Implemented by `DeckShuffleAnimation.tsx`: the `prefersReduced.current` branch uses `opacity: isFlipped ? 0 : 1` / `opacity: isFlipped ? 1 : 0` transitions instead of `rotateY`.

### Error and Retry

**Spec 24** — Draw failure surfaces recovery affordance. Retry re-runs shuffling phase.
- Implemented by `DeckShuffleAnimation.tsx`: `ctx.error && ctx.phase === 'card-selected'` renders "Something shifted." with "Tap to draw again." button that dispatches `RETRY`, which re-enters `shuffling` with a fresh 2000ms timer.

### Accessibility

**Spec 25** — Live region announces card ready.
- Implemented by `DeckShuffleAnimation.tsx`: `ariaLiveRef.current.textContent = 'Your card has been selected. Tap or click the card to reveal it.'` on `card-selected`.

**Spec 26** — Live region announces card revealed.
- Implemented by `DeckShuffleAnimation.tsx`: `ariaLiveRef.current.textContent = 'Card X has been revealed.'` on `revealed`.

**Spec 27** — Face-down card carries `role="button"`, `tabIndex={0}`, `aria-label="Reveal card"`. Keyboard Enter/Space triggers flip.
- Implemented by `DeckShuffleAnimation.tsx`: both motion and reduced-motion branches set these attributes when `ctx.phase === 'card-selected'`. `handleKeyDown` handles Enter and Space.

**Spec 28** — During `shuffling`, deck is `aria-hidden="true"`.
- Implemented by `DeckShuffleAnimation.tsx`: `aria-hidden={isShuffling ? 'true' : undefined}` on the deck wrapper.

### Integration with Reading Modes

**Spec 29** — Single Card: one card index passed to reading flow via `onRevealComplete`.
- Implemented: `ShuffleRitualFlow` passes `cardCount=1` for single mode. `onRevealComplete` fires with `drawnCardIndices` (length 1). `SET_RITUAL_CARD_INDICES` stores it. `SingleReadingFlow.useEffect` auto-picks `ritualCardIndices[0]` on mount.

**Spec 30** — Three-Card: three card indices passed. Spread proceeds with all three pre-selected.
- Implemented: `ShuffleRitualFlow` passes `cardCount=3` for three-card mode. `ThreeReadingFlow.useEffect` iterates `ritualCardIndices` and calls `handlePickCard` for each, pre-filling all three positions without user interaction with the deck fan.

**Spec 31** — Shuffle ritual is self-contained. Does not render mode selector, deck fan, or reading UI. `onRevealComplete` replaces ritual with reading view.
- Implemented: `ShuffleRitualFlow` renders only `DeckShuffleAnimation`. `onRevealComplete` triggers `NAVIGATE_TAROT` which replaces the ritual with `SingleReadingFlow` or `ThreeReadingFlow`.

### Re-draws

**Spec 32** — If user navigates back to home and starts new reading, ritual runs fresh.
- Implemented: `RESET_READING` clears `ritualCardIndices: []`. On next ritual entry, `DeckShuffleAnimation` mounts fresh with its own `drawCards()` call.

**Spec 33** — Retry within session re-runs shuffle with 2000ms minimum and new random draw.
- Implemented by `DeckShuffleAnimation.tsx`: `RETRY` action re-enters `shuffling` phase; the `useEffect` on `shuffling` calls `drawCards()` and sets a 2000ms timer.

---

## Out of Scope — Confirmed Not Touched

- Celtic Cross draw ceremony: untouched
- `TarotDeckSelection.tsx`: untouched
- GPT synthesis prompts: untouched
- Saved readings page: untouched
- Backend changes: none

---

## Files Modified

- `src/context/TarotContext.tsx` — Added `'shuffle-ritual'` to `TarotSubView`, `ritualCardIndices: number[]` to `TarotState`, `SET_RITUAL_CARD_INDICES` action, initializer and reducer case
- `src/components/tarot/TarotHomeView.tsx` — Changed Single Card and Three-Card navigation to target `'shuffle-ritual'` instead of the reading views directly
- `src/components/tarot/TarotPage.tsx` — Added `ShuffleRitualFlow`, `deriveFocusArea()`, `toShuffleReadingMode()`, updated `SingleReadingFlow` and `ThreeReadingFlow` with `ritualCardIndices` prop and auto-pick `useEffect`, added `'shuffle-ritual'` case to `TarotPageInner` switch
