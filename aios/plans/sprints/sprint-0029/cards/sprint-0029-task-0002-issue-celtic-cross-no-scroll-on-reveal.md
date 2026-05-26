# issue-celtic-cross-no-scroll-on-reveal

**Type:** Issue Fix
**Originated by:** Jobs, Miyazaki, Carmack
**User guidance:** "on celtic cross, when the user clicks on a card, the screen should scroll down for the content of the reading"

## Problem

When a user taps a card in the Celtic Cross reading, `handleContinue` in `CelticCrossReading.tsx` calls `reveal(next)` and transitions `phase` to `'holding'`. This causes `InterpretationPanel` to mount below the card grid — on mobile at approximately 600–800 pixels below the viewport fold, on desktop well below the lower edge of the cross/staff layout. The user sees no visible change on screen after their tap. The screen appears static. There is no feedback that anything happened.

The affected interaction spans every card reveal in the reading — positions 3 through 10, including the cross-to-staff transition at position 7. Only the initial dual reveal of positions 1+2 (via `handleReveal12`) is exempt, since the panel that mounts for that pair is the first to appear and may or may not be below fold depending on device.

**Reproduction:**
1. Open a Celtic Cross reading on any mobile device or a desktop viewport narrower than the full card grid height.
2. Complete the drawing phase (select all 10 cards from the deck).
3. Tap the heart of the cross to reveal positions 1+2.
4. Wait through the 3-second hold. The `'continuing'` phase begins and the next glowing card appears.
5. Tap the glowing card to advance to position 3.
6. Observe: the `InterpretationPanel` mounts but the viewport does not move. The screen appears unchanged from the user's perspective.
7. The user taps again. Still no feedback. Some users tap a different card. The ceremony has broken at the moment it should be deepest.

**Relevant files:**
- `src/components/tarot/CelticCrossReading.tsx` — `handleContinue` (line ~566), `InterpretationPanel` component (line ~883), render site for `InterpretationPanel` (line ~781)

The `InterpretationPanel` is a stateless presentational component. It has no `ref` attached to its root element. There is currently no scroll behavior of any kind triggered after a card reveal.

## Expected behavior

After each card reveal — specifically whenever `InterpretationPanel` mounts or updates with a new `activePosition` — the viewport should scroll to bring the top of the `InterpretationPanel` into view. The scroll should feel like the reading is drawing the user toward what they tapped to see: purposeful, unhurried, directional.

**Implementation requirements:**

1. Attach a `ref` to the root `<div>` of `InterpretationPanel`.
2. In the parent (`CelticCrossReading`), after each call to `reveal(next)` — or in a `useEffect` that watches `activePosition` and `revealedPositions` — call `ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })`.
3. Guard the `behavior` value: if `window.matchMedia('(prefers-reduced-motion: reduce)').matches` is true, use `behavior: 'instant'` instead of `'smooth'`. Users who have expressed a motion preference must not receive a scroll animation.
4. The scroll should trigger only when a new position is revealed during the `'holding'` or `'continuing'` phase — not during synthesis, not during the constellation overlay, not at phase transitions unrelated to card reveal.
5. The scroll speed — when smooth — should be the natural browser `scrollIntoView` smooth speed. No custom CSS transitions or artificial delays. The animation timing should feel like attention moving from the card grid to the interpretation, not like a mechanical correction.

After the fix, every card tap in the Celtic Cross reading produces visible, immediate feedback: the screen moves, the content arrives in view, the ceremony continues. Ten reveals. Ten moments where the door opens when the handle is turned.
