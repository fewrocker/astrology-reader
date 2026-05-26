# issue-single-card-ritual-gap

**Type:** Issue Fix
**Originated by:** Jobs, Miyazaki, Carmack
**User guidance:** "on one card reading, after shuffle, we leave a card standing there and the Seeking clarity on: Love text goes away. After the animation ends, lets put a glowing animation on the card with the text: Visualize your intention and click on the card to start the ritual"

## Problem

After `DeckShuffleAnimation` completes and the parent (`TarotPage.tsx > ShuffleRitualFlow`) calls `onRevealComplete`, control transfers to `SingleCardReading`. The component enters the phase gate `selectedCount > 0 && !revealed` — `selectedCount` is immediately 1 because the ritual path pre-picks the card via `handlePickCard` in `SingleReadingFlow.useEffect`, and `revealed` stays `false` for 480ms until `handleSelect` fires `setRevealed(true)` via `window.setTimeout`.

During this gap, the render state is:
- `card` is not null — `CardReveal` renders with the back face
- `revealReady` is true — container transitions to `opacity: 1`, `translateY(0)`, fully visible
- `revealed` is false — card shows the back face
- No instruction text, no glow, no click handler wired to the card back

The "Seeking clarity on:" text that gave the user context during the shuffle was owned by `DeckShuffleAnimation` and unmounts with it. `SingleCardReading` renders nothing in its place. The `CardReveal` component at this phase receives no `onClick` prop — it is treated as a pure display component, relying entirely on the timer. The instruction text the fix will add invites the user to click something that currently has no click handler. The functional bug is the missing click handler, not only the missing text.

**Reproduction:** Follow the single-card ritual path. Type an intention, proceed through the shuffle animation. Observe: the card appears fully visible, face-down, with no text and no interactivity cue. The user sees a card standing in silence with no signal of what to do or whether anything is responding.

**File:** `src/components/tarot/SingleCardReading.tsx`, lines 193–249 (card visual section) and `handleSelect` (line 144).

## Expected behavior

When `revealReady && !revealed` (the phase gate between shuffle completion and card reveal), `SingleCardReading` renders:

1. A glowing pulse animation on the card back container — the same keyframe approach used in `ThreeCardReading.tsx` for `tarot-ring-pulse`. Applied to the wrapping `div` with `maxHeight: 'none'`, not to `CardReveal` internally, to preserve the shared component's layout contract.

2. The instruction text "Visualize your intention and click on the card to start the ritual" rendered beneath the card visual. This is an invitation into a private act — the moment before the card is turned, when the user is asked to be present with their intention before they see what the cards say. The text must carry that weight, not read as a UI tooltip.

3. A click handler wired to the card back — `onClick` that fires `setRevealed(true)` immediately when `revealReady && !revealed`, shortcutting the 480ms timer. The timer remains as the fallback for the non-interactive ritual path; direct click bypasses it. Without this handler, the affordance text is inviting the user to interact with something that does not respond.

The card name banner (rendered only when `revealed`, lines 213–239) and all downstream interpretation panels remain unchanged. This is a one-spot conditional block addition at the phase gate with no state machine change and no new hooks.
