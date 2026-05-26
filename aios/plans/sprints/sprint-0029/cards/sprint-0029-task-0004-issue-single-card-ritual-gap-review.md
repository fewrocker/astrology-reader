# Review — sprint-0029-task-0004-issue-single-card-ritual-gap

## Summary

The ritual gap in `SingleCardReading` is closed. Three changes were made in a single conditional block at the `revealReady && !revealed` phase gate:

1. **Keyframe animation** — `@keyframes tarot-ring-pulse` injected via `<style>` tag, identical to the definition in `ThreeCardReading.tsx` (box-shadow gold ring pulsing from 0.2 to 0.55 opacity, 2s ease-in-out infinite). Applied on the card wrapper div via `animation` style property.

2. **Click handler** — `onClick={() => setRevealed(true)}` wired to the card wrapper div only when `revealReady && !revealed`. Fires immediately, bypassing the 480ms `window.setTimeout` in `handleSelect`. The timer remains as fallback for the non-interactive path. `cursor: 'pointer'` applied at the same phase.

3. **Instruction text** — `<p>` rendered below the card flex container when `revealReady && !revealed`. Text: "Visualize your intention and click on the card to start the ritual". Styled in `font-heading` at 0.85rem, gold at 65% opacity, wide letter-spacing — matching the register of the surrounding tarot UI without shouting.

## Implementation notes

- The `<style>` tag sits just above the card visual section; the keyframe is scoped to the phase gate via the conditional `animation` property (cleared to `undefined` when `revealed` or before `revealReady`).
- No new state, no new hooks, no new components. One conditional block, one style injection.
- `borderRadius: '0.75rem'` added to the card wrapper so the pulsing box-shadow matches the card's rounded corners.
- The instruction text uses negative `marginTop` to tuck under the `mb-12` of the flex container without disrupting spacing once `revealed` replaces the text with the card name banner.

## Build

`npm run build` — clean, zero TypeScript errors.
