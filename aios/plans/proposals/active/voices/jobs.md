# Voice: Steve Jobs — Tarot Module Review
## Sprint 0029

---

Let me tell you what I actually saw when I used this product today.

The single-card ritual path is the most important user journey in this entire product. Someone holds their phone, types in what they're seeking clarity on, watches the deck shuffle, sees a card emerge from the dark — and then nothing. The card stands there. The "Seeking clarity on: Love" text has vanished from `DeckShuffleAnimation.tsx`, which handled that line during the shuffle phase. Control has transferred to `SingleCardReading.tsx`. The card is visible. The user has set an intention. And the screen is silent.

That gap — however brief — is the emotional heartbeat of the experience. It's the moment between breath and breath. And we've filled it with nothing. A card standing at 72% opacity with no instruction, no glow, no permission to proceed. The user looks at the card and thinks: am I broken? Did something go wrong? The state machine has moved to `selectedCount > 0 && !revealed`, which in `SingleCardReading.tsx` produces a card that renders but does not yet speak. The bug is real. But more important than the mechanics is what the bug destroys: the ritual feeling that this product is supposed to produce. You never get a second chance to make that moment sacred.

The fix the vision document describes is exactly right: a glowing pulse on the card back with the text "Visualize your intention and click on the card to start the ritual." That's not a patch — that's the experience we should have built from the beginning.

Now the three-card flow. A user draws all three cards. The deck selection completes. The cards are placed face-down in their three positions. The instruction box says "All three cards are placed. Reveal them one by one." The first card should glow. The user should be able to tap it. But `handleCardTap` in `ThreeCardReading.tsx` is a `useCallback` with `[activeCardIndex, triggerRevealOverlay]` in its dependency array. When `placementComplete` transitions to `true` and React reconstructs `activeCardIndex = 0`, there's a staleness window. The closure still holds `null`. The first tap on the first card hits `if (index !== activeCardIndex) return` and exits silently. The user taps again. Nothing. They tap the second card. Nothing. They think the product is broken.

This isn't a subtle bug. This is the primary interaction in the three-card flow — the reveal — failing at its first and most important moment. We built six sprints of astrological sophistication on top of an interaction that doesn't respond to touch. The user never gets to experience any of it.

The Celtic Cross has its own wound. Card clicked. User expects to see the interpretation. The `InterpretationPanel` has mounted below the fold. On mobile — and almost everyone is on mobile — the panel is somewhere around 600 to 800 pixels below where the user's eyes are. Nothing moves. The screen looks unchanged. The user taps again, wondering if the touch registered. They tap again. What they needed was for the screen to scroll to show them what they came to see. One `scrollIntoView` call with `behavior: 'smooth'`, guarded by `prefers-reduced-motion`. That's the entire fix. But without it, the most ceremonial product interaction — ten cards revealed one at a time, each with its own contemplation hold — produces no visible feedback on the tap that initiates it.

The positional awareness failure is the deepest one. Look at `computeInstantInterpretation` in `src/engine/tarot.ts`. When it calls `adaptInterpretationToPosition`, `getThreeCardSpreadProfile` returns `null` for any `celtic-cross` spread type — it's explicitly excluded with `position.spreadType === 'celtic-cross'`. Which means every one of the ten Celtic Cross positions receives the card's generic meaning with zero awareness of whether it landed in "Present Situation" or "Outcome" or "Unconscious Influence." The positions are rich — `CELTIC_CROSS_POSITIONS` has both `name` and `description` on every position, long and specific descriptions. But `positionLabel` and `positionMeaning` arrive as `null` in the `InterpretationPanel`. The panel shows a card's generic text. Ten times. Across the most complex reading this product offers.

This is the product saying to a user who has spent 20 minutes drawing and contemplating ten cards: we don't know where you are. Every card is the same card. Every position is the same position.

The GPT failure on Celtic Cross synthesis is the kill shot. A user sits through the full ritual — drawing, contemplating, the cross-staff transition text, the constellation overlay, the synthesis loading indicator — and receives an error. The vision document is correct that the crash is likely at `pos.label` when `positions[i]` returns `undefined` because the slice produces fewer than 10 cards, or at `calculateChart` throwing when birth context is missing fields. The payload being sent (you can see it in `aios/guidelines.md`) passes `personalYear: 0` and `lifePathNumber: 0` as hardcoded zeros in `buildCelticSynthesisPayload` — a function in `CelticCrossReading.tsx`. That's not the crash site, but it means even a working synthesis receives permanently wrong numerological data. The crash site is somewhere in `handleTarotCelticSynthesis` on the server, and it's killing the most premium experience in the product every single time.

Here is what I care about in this sprint: not the technical fixes as such, but what they restore.

The single-card ritual is the product's handshake. The moment after shuffle, before reveal, is where the user decides whether this is a product that was designed for them or a product that was wired together. A glowing card and six words of instruction — "Visualize your intention, click to reveal" — is the difference between those two experiences.

The three-card reveal interaction not responding to the first tap is not a React closure bug. It's a trust failure. When a person taps something and nothing happens, they learn not to trust this product. You cannot recover that trust with better GPT synthesis downstream.

The Celtic Cross auto-scroll fix is not about convenience. It's about ceremony. Ten cards. Ten reveals. Each one should feel like opening a door. If the door doesn't move when you turn the handle — if the content appears invisible — the ceremony collapses into confusion.

The positional awareness gap is not a content deficiency. It's an identity failure. A Celtic Cross reading is built on the premise that where a card lands is as important as which card lands. "The Two of Swords in the Outcome position" is a fundamentally different statement than "The Two of Swords." A reading that doesn't know where the card is — that shows the same text regardless of position — is not a Celtic Cross reading. It's ten single-card readings with the cards stacked.

And the GPT synthesis always failing is not a server bug. It's the end of the experience going dark at the exact moment when it should illuminate.

These five bugs are not incidental regressions. They are systematic failures at the specific moments when the experience should feel most designed. The infrastructure is excellent — 193 transit adaptations, orb-weighted transit selection, chart ruler threading, natal resonance notes, constellation preview. All of it invisible to users who can't get past a stuck three-card reveal or who wait through the Celtic Cross ritual only to receive an error where the synthesis should be.

Fix these first. Not because they're easy, but because nothing else can matter until they work.

---

*Written as Steve Jobs, advisory voice for sprint-0029 planning.*
