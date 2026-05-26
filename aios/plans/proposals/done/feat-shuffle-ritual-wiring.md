# feat-shuffle-ritual-wiring

**Type:** Feature

**Originated by:** Jobs, Miyazaki, Carmack

---

## User Guidance

n/a

---

## Problem / Opportunity

`DeckShuffleAnimation.tsx` is a complete, thoughtful component with a full 6-phase state machine (`idle → intention-set → shuffling → card-selected → revealing → revealed`), a 2-second enforced shuffle minimum, a 3D card-flip ritual, a breathing animation for the face-down card, a localStorage-persisted hint system, a fade-through-black transition between phases, `prefers-reduced-motion` support, and proper ARIA live regions. It was built with clear purpose.

It is not used. `TarotHomeView.tsx` collects the user's intention and then immediately presents mode selection — Single Card, Three-Card, Celtic Cross. No shuffle occurs. When the user selects Single or Three-Card and arrives at the deck, they see cards represented by ✦ symbols in a fan. The ritual the component was designed to provide — the moment between setting an intention and drawing a card — simply does not exist in the current flow.

This is a debt with a compound cost. The user's first interaction with the deck is administrative: a list of mode buttons, then a fan of symbols to click. There is no transition, no weight, no acknowledgment that they came with a question. The shuffle ritual exists in the codebase as theater without an audience. Until it is wired in, the product's strongest opening moment is absent.

---

## Vision

The user opens the Tarot section carrying a question. They choose a focus — a chip or a few words typed — and that moment of choice should be the last administrative action they take before the experience begins.

After intention is set and a reading mode is confirmed, the product accepts the intention and the mode and hands the user over to the shuffle ritual. The screen transitions. The three face-down cards appear — the real card backs, with their eight-pointed star geometry and indigo depth. The user's intention echoes above them in small italic gold: *"Seeking clarity on: Decision."* The cards begin to move — fanning left, right, returning, the deck alive in the way a real deck feels when someone who knows what they are doing handles it. This lasts just long enough to feel deliberate: two seconds minimum, never abrupt.

Then the shuffle settles. Three cards become one. That single card sits at the center of the screen, face down, breathing slowly. The user understands without being told that this card was drawn for them. If they have never used the product before, a light hint appears — *"Tap to reveal"* — barely visible, the color of old gold at low opacity. If they have done this before, the card simply waits.

The user taps. The card rotates in 3D — back face sweeping away, front face arriving — in 600ms. The flip completes. The reading begins.

This same rhythm holds across modes. For a three-card spread, the ritual runs once and yields all three card indices. For the Celtic Cross, the ritual is not used — its draw sequence is embedded in the Celtic state machine and that machine has its own ceremony — and the shuffle component correctly remains out of that flow.

The shuffle ritual is not an animation layered on top of the product. It is the threshold crossing between intention and reading. When it is wired in, the user's question has somewhere to land before the card appears. The product becomes something you enter, not a tool you operate.

---

## Specifications

### Flow and Navigation

1. After the user sets an intention (via chip selection, typed text, or skip) and selects a reading mode (Single Card or Three-Card), the product transitions to the shuffle ritual view before presenting the deck. The mode selection and deck display do not appear simultaneously; the shuffle ritual occupies the full screen between them.

2. The shuffle ritual receives the user's intention string, the selected focus area, and the resolved reading mode as inputs. It outputs the drawn card indices (one for Single, three for Three-Card) to the reading flow upon reveal completion.

3. The Celtic Cross reading mode does not pass through the shuffle ritual. Celtic Cross navigates directly from mode selection into its own draw ceremony, which is managed entirely by the Celtic state machine.

4. The Saved Readings view does not pass through the shuffle ritual.

### Phase Progression

5. On entering the ritual view, the component immediately enters the `intention-set` phase. The user's intention appears above the deck in italic gold at reduced opacity: *"Seeking clarity on: [intention or focus label]."* The three face-down cards appear with a single breath animation each, staggered by 50ms.

6. After 600ms in `intention-set`, the ritual automatically advances to `shuffling`. The transition requires no user action.

7. During `shuffling`, the three face-down cards enter the fan animation — left card fans left, right card fans right, center card shifts — in a looping motion that conveys the sense of a deck being worked. The minimum duration of the shuffling phase is 2000ms regardless of how quickly the card selection computation completes.

8. When the shuffle phase concludes (2000ms minimum elapsed and cards drawn), the view transitions to `card-selected` with a fade-through-black overlay. The three fanned cards resolve into a single centered card.

9. In `card-selected`, the single face-down card is centered on screen. It breathes — a slow scale pulse at 3 seconds per cycle. The card is focusable and interactive. The intention echo above may remain at lower opacity.

10. On first use (no prior `tarot_hint_seen` localStorage entry), after 1200ms in `card-selected`, a hint appears below the card — *"Tap to reveal"* or *"Click to reveal"* depending on device capability — at very low opacity, in the product's small gold type. The hint auto-dismisses after 3 seconds and the localStorage key is set to prevent future appearances.

11. When the user taps or clicks the card (or activates it via keyboard Enter or Space), the ritual advances to `revealing`. The hint, if visible, disappears.

12. In `revealing`, the card executes a 3D Y-axis rotation: the back face sweeps away, the front face arrives, completing in 600ms. For users with `prefers-reduced-motion` active, the flip is replaced by an opacity crossfade at the same duration.

13. After the flip animation completes, the ritual advances to `revealed`. A screen-reader announcement confirms the reveal. The parent reading flow receives the drawn card indices and the reading proceeds.

### Card Backs and Visual Language

14. During the shuffle ritual, all face-down cards render with the full card-back design — the indigo field, the eight-pointed star SVG geometry, the gold inset border. No placeholder symbols are used.

15. The single card displayed in `card-selected` and `revealing` is larger than the three-card deck representation (160px × 250px vs 140px × 220px), giving it visual prominence appropriate to a chosen card.

16. The eight-pointed star on the card back is visible at low opacity during the `card-selected` phase and disappears as the card begins to flip.

### Intention Echo

17. The intention echo displayed above the deck during `intention-set` and `shuffling` phases shows the user's typed intention text if present, or the focus chip label rendered in title case if no custom text was entered (e.g., "Today's Energy" rather than "today-s-energy"). Long intentions are truncated at 60 characters with an ellipsis.

18. The intention echo fades slightly when transitioning from `intention-set` to `shuffling` (opacity reduces from ~0.7 to ~0.65), signaling that the phase has changed without removing the anchor.

19. In `card-selected`, the intention echo may remain visible at reduced opacity or fade fully — the visual choice must not obscure or compete with the card itself.

### Reduced Motion

20. When `prefers-reduced-motion: reduce` is detected, the fan animation during `shuffling` is suppressed. The deck remains still while the shuffle minimum timer elapses.

21. The fade-through-black transition from `shuffling` to `card-selected` is suppressed under reduced motion; the card appears without the fade overlay.

22. The breathing animation on the `card-selected` card is suppressed under reduced motion; the card appears static.

23. The 3D flip in `revealing` is replaced with an opacity crossfade under reduced motion.

### Error and Retry

24. If the card draw operation fails, the component surfaces a recovery affordance below the card in `card-selected` phase — soft copy ("Something shifted.") with an inline action ("Tap to draw again.") — and allows retry from the `shuffling` phase without returning the user to the mode selector.

### Accessibility

25. A screen-reader live region announces when the card is ready to reveal: *"Your card has been selected. Tap or click the card to reveal it."*

26. A screen-reader live region announces when the card has been revealed.

27. The face-down card in `card-selected` carries `role="button"`, `tabIndex={0}`, and `aria-label="Reveal card"`. Keyboard activation (Enter or Space) triggers the flip.

28. During `shuffling`, the deck is marked `aria-hidden="true"` to prevent the fan animation from producing spurious screen-reader announcements.

### Integration with Reading Modes

29. For Single Card readings, the ritual draws one card index and passes it to the reading flow via `onRevealComplete`. The reading flow uses this index to select the card from the pre-shuffled deck rather than running its own selection.

30. For Three-Card readings, the ritual draws three card indices and passes all three to the reading flow via `onRevealComplete`. The spread proceeds with those three cards pre-selected; the user does not manually pick from the fan after the ritual.

31. The shuffle ritual is a self-contained view that does not render the mode selector, the deck fan, or any downstream reading UI. When `onRevealComplete` fires, the parent replaces the ritual view with the appropriate reading view.

### Re-draws

32. If the user navigates back to home from a reading and begins a new reading, the shuffle ritual runs fresh — with a new shuffle — regardless of any prior session state. No card selections from a previous reading are carried forward.

33. If the user re-draws within an active session (retry path or future re-draw affordance), the shuffle phase re-runs with a minimum 2000ms duration and a new random draw.

---

## Out of Scope

- Any changes to the Celtic Cross draw ceremony. The Celtic state machine manages its own draw sequence and does not need the shuffle ritual.
- Changes to `TarotDeckSelection.tsx`. Replacing the ✦ symbol with the proper `CardBack` component in the deck fan is a separate concern addressed in another proposal.
- Any new reading mode, spread type, or navigation change beyond inserting the ritual into the existing Single and Three-Card flows.
- Changes to the GPT synthesis prompts, instant interpretation engine, or astro-tarot wiring. Those are addressed in depth work proposals.
- Changes to the saved readings page or subscription gate.
- Adding sound or haptic feedback to the ritual.
- Any backend changes.

---

## Open Questions

1. **Intention echo on `card-selected`.** Should the intention echo remain visible above the card while it waits to be flipped, or fade out fully so the card has undivided visual attention? The case for keeping it: the user is holding their question as they reach for the card. The case against: the card itself should be the only thing on screen in that moment.

2. **Timing of reading view transition.** Should the parent replace the ritual view immediately when `onRevealComplete` fires (the flip has completed), or should there be a brief hold on the revealed card state before the reading view fades in? A short pause — 400–600ms — would give the flip result a moment to register before the interpretation panel appears.

3. **Skip path and ritual.** Currently, "Skip and draw" bypasses intention entry and proceeds with an empty intention string. Should users who skip still pass through the shuffle ritual (with no intention echo above the deck), or should they bypass directly to a simplified deck selection? The ritual without an intention still provides the draw ceremony; the question is whether a ritualless skip path is ever correct.

4. **Three-card: ritual draws all three, or ritual draws one at a time?** The current component signature draws `cardCount` cards in a single shuffle and resolves them all at once. For three-card spreads, this means all three positions are filled before the first card is flipped. An alternative interpretation would be to run one shuffle ritual per position (three sequential rituals). The single-ritual approach is simpler and avoids the overhead of three separate ceremony phases; the sequential approach makes each draw feel individually chosen. Which pacing is right?

5. **Hint system reset.** The hint is suppressed after the first reveal, via localStorage. Should a returning user who has cleared their browser storage (or switched devices) see the hint again, or should a server-side preference eventually own this? For now, localStorage is the correct answer; this question flags it for future consideration.
