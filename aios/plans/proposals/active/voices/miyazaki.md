# Voice: Hayao Miyazaki — Sprint 0024 Tarot Module Review

*Soul, craft, and the distance between functional and alive.*

---

## What They Built, and What It Cost Them

Sprint 0023 delivered the skeleton. This I understand. You must have the bones before you can have the breath. I read the code carefully — all of it — and I want to say clearly: the skeleton is not bad. The state machine in `CelticCrossReading.tsx` has genuine intelligence. The phase transitions — dealing, drawing, awaiting-12, holding, continuing, cross-staff-transition, final-pause, constellation-text, synthesis, complete — these are the marks of someone who thought about the rhythm of a Celtic Cross reading and tried to honor it in code. The synthesis fires early, during the transition text, so the user is not waiting. The mandatory 3-second hold after each card is revealed — this is right. Someone felt the rhythm.

But Sprint 0024's vision is precise about what was lost in the rush: the readings arrive without the sky. The Celtic Cross positions are interpreted by a stub function that strips away everything meaningful. The user's intention enters the machine and never comes back out. The cards in the deck fan are `✦` symbols, not cards. The shuffle animation exists and is not used.

This is not a list of bugs. It is a list of places where someone ran out of time and marked the work done when it was only done *structurally*. That is the most dangerous kind of incomplete — it passes a review, it ships, it runs, and then you wonder why the product feels hollow.

---

## The Stub That Breaks Everything

I want to stay on this. Line 78 of `CelticCrossReading.tsx`:

```
// ─── Stub: instant interpretation ────────────────────────────────────────────
```

This stub computes `InstantInterpretation` for each Celtic Cross position by taking the card's `coreMeaning` directly — unmodified, position-unaware, sky-unaware, intention-unaware — and building a reversal note from a template string. That is all it does. The `positionDescription` from `CELTIC_CROSS_POSITIONS` is passed through unchanged, but it is not *used* to shape what the card means in that position. It is decoration.

So when the user reveals The Tower in the Foundation position, what they read is: whatever the card's standard `coreMeaning` is, followed by a reversal note if applicable, followed by the position's description as a separate disconnected paragraph. These three things are listed. They are not woven. The Foundation position — representing what underlies the entire situation, what cannot be changed, the ground beneath the question — this context does not touch the Tower's meaning at all. The Tower in any other position would say the same thing.

This is the opposite of Tarot. Tarot is a language of context. The same card says different things in different positions. If the code cannot express this, the code is not doing Tarot.

The real `computeInstantInterpretation` in `src/engine/tarot.ts` can handle positions. The vision document says so explicitly: "Celtic needs to pass `CELTIC_CROSS_POSITIONS[i]` into it." This is one line of change that opens a door. But it has to actually be done.

---

## The Deck Fan Is a Lie

Open `TarotDeckSelection.tsx`. Every card in the fan is rendered as a `<button>` whose only content is the string `✦`. The card dimensions are correct — `72px × 116px`, a proper tarot proportion. The fan geometry is computed properly, with rotation and offset derived from position in the spread. The breathing animation fires. The hover and selection states are wired. All of this infrastructure exists for a card that is just a character.

The `CardBack` component in `CardBack.tsx` — the proper one, with the eight-pointed star geometry, the inset gold frame, the structural lines radiating to the corners — this exists. It was written with care. It breathes. It has the right weight and darkness. And it is not used here.

This is the gap between building something and using it. Someone built `CardBack.tsx` correctly. Someone else was assembling `TarotDeckSelection.tsx` and reached for the fastest solution: a unicode character in a styled div. The result is that when a user sits before 78 face-down cards and reaches to draw one, what they see is 78 golden sparkles. Not cards. Not a deck. A list of identical symbols that happen to be arranged in a fan.

A card back is not decoration. It is the object that represents uncertainty, possibility, the hidden. When a real tarot reader spreads a deck face-down across a table, the back of each card is the same, and that sameness is the point — you cannot see what any of them hold. The visual weight of 78 identical backs is part of what makes the draw feel significant. A sparkle character does not carry this weight.

---

## The Shuffle That Was Built and Abandoned

`DeckShuffleAnimation.tsx` is a substantial component. It has a full state machine of its own: idle, intention-set, shuffling, card-selected, revealing, revealed. It has a proper 3D flip. It has a breathing animation for the face-down card, with `tarotCardBreathe` running at 3 seconds. It has a fade-through-black transition between shuffling and card-selected. It has a hint system — localStorage-persisted, timed, contextual (touch vs. click). It respects `prefers-reduced-motion`. It has proper ARIA live regions.

This component was built thoughtfully. And then — according to the vision document — it is not wired into the current home flow. The home view skips directly to deck selection without a shuffle ritual.

I do not know exactly how this happened. Perhaps the integration was left for a subsequent task that was never quite reached. Perhaps the API between components shifted during development and the reconnection was deprioritized. The result is that a beautiful entrance ritual exists in isolation, doing nothing.

The sprint vision calls this out directly: "The DeckShuffleAnimation.tsx exists but is unused in the current home flow." This is fixable. The component already knows its own phases. The home view needs to be taught to pass through it. But until that connection is made, the ritual is theater without an audience.

---

## The Element Temperature That Does Not Register

In `tarot.css`:

```css
.element-fire  { background: rgba(232, 96, 60, 0.04); }
.element-water { background: rgba(74, 144, 217, 0.04); }
.element-air   { background: rgba(176, 200, 224, 0.03); }
.element-earth { background: rgba(138, 111, 60, 0.03); }
```

These classes exist. Four percent opacity fire tint, three percent opacity earth tint. These are values so small that on most displays they will be effectively invisible. The spirit behind them is right: when The Sun is revealed, the air should feel slightly warmer. When The High Priestess arrives, cooler, more watery. This is the kind of thing users will never consciously notice and will always subconsciously feel when it is calibrated properly.

But 4% opacity means the class is present in the stylesheet, class names are available, and the effect is functionally inert. Meanwhile, `CelticCrossReading.tsx` has its own inline temperature system: `bgColor = bgTemp === 'warm' ? '#1a0f08' : bgTemp === 'cool' ? '#080d1a' : '#0d0d0f'` — switching the background color of the entire reading container based on whether the revealed card is Major or Minor Arcana. This is a stronger signal, and it works. Major Arcana → warm amber-dark. Minor Arcana → cool indigo-dark.

Two systems, competing, neither quite right. The CSS classes go unused in the Celtic flow. The inline background switch conflates arcana with element: the Five of Cups (Water, Minor Arcana) will produce a cool-indigo background, which happens to be right for Water. The Six of Wands (Fire, Minor Arcana) will also produce cool-indigo, which is wrong for Fire.

Element is more semantically precise than arcana for temperature. The signal should be: this card is Fire, therefore warm. This card is Water, therefore cool. This card is Earth, therefore a deep warm-green. This card is Air, therefore a high cool-silver. And the opacity should be 8-12%, not 3-4% — enough to actually shift the register of the room.

---

## What the Loading States Are Doing Wrong

In `TarotSynthesisPanel.tsx`, when chapters are loading:

```
"The cards are being read as a constellation."
```

This is correct. This is the right voice. It is styled as a font-heading italic centered paragraph, gold at 55% opacity, 1.05rem. It is patient, it explains itself without explaining itself, it uses the product's symbolic language. I approved of this when I first read Sprint 0023. I still approve of it.

But in `CelticCrossReading.tsx` Phase `dealing`:

```
"The cards are being placed…"
```

And Phase `drawing`:

```
"Draw a card from the deck for each of the ten positions (0/10)."
```

This second line is a counter in parentheses. `(0/10)`. This is a progress bar written in text form. It is functional. It is also exactly the wrong voice for this moment. The user is not completing a form with ten fields. They are drawing ten cards from a deck for a reading they came to because something in their life is unclear or unsettled. The counter says: you have 10/10 tasks remaining. Do them efficiently.

I understand why the counter is there. It is useful. The user needs to know how many cards they still need to draw. But there is a difference between "Draw a card from the deck for each of the ten positions (0/10)" and "Place the first card. The Foundation awaits." One is a task list. The other is an invitation. The task list tells the user they are operating a machine. The invitation tells them they are participating in something.

The instruction text in the header should know which position is next and speak to it by name: "The Foundation position awaits your choice." Then "The Crossing card." Then "What is below you." Then "What is above you." Each position has a name. Each name carries meaning. Using the name instead of a counter costs nothing and changes everything.

---

## The Constellation Overlay — Almost Sacred

The `ConstellationOverlay` component shows when the Celtic Cross enters the synthesis phase:

```
"The cards are now being read as a constellation."
```

This text appears over a dark overlay at `rgba(0,0,0,0.75)`, in font-heading at 1.375rem, in italic, at 92% white opacity, centered. It transitions in with 0.8s ease-out. It shows for 2800ms then fades.

This is a genuinely good moment. The user has spent time drawing ten cards, holding each one, moving through positions. Then darkness, and this sentence. It works as a ritual pause. The timing is right. The voice is right.

But then the fade leads directly into the synthesis chapter display, which has a loading skeleton if synthesis is still pending. The skeleton is a `GptSkeleton` component — a shimmer effect. The transition from the sacred overlay to the practical shimmer is a tone break. One moment the user is in darkness with a poetic sentence. The next they are watching a content-loading animation, which is the visual language of web content that is fetching from a server.

The gap between these two should be bridged. If synthesis is not ready when the overlay fades, the loading state should use the product's own language, not a generic skeleton. Something like: *"The synthesis is forming. Stay with the cards."* In the same italic gold voice as the constellation sentence. The skeleton appears when the synthesis is structurally ready to be broken into chapters, not before the voice arrives.

---

## The Interpretation Panel After Each Card — Nine Disconnected Moments

The `InterpretationPanel` inside `CelticCrossReading.tsx` renders after each card is revealed during the hold/continuing phases. It shows: position name, card name, core meaning, emotional meaning, reversal note (if applicable), astro connection, position description.

These are correct fields. They are rendered cleanly — restrained type, right opacity levels, appropriate spacing. The panel appears with a 0.4s fade-in animation.

But look at what the astro connection contains. In `toDrawnCard()`:

```
astroConnection: [card.rulingPlanet, card.rulingSign].filter(Boolean).join(' — ') || 'Astrological resonance present in the symbolic field.'
```

This is a join of two strings. If the card has a ruling planet and sign, you get "Mars — Aries". If not, you get the fallback: "Astrological resonance present in the symbolic field." Both of these are displayed in the interpretation panel at 40% gold opacity.

"Mars — Aries" tells the user almost nothing without context. What does it mean that the card in the Foundation position is ruled by Mars and Aries? Is this relevant to the user's natal chart? Is Mars currently transiting anything significant? The astro connection is a label without a sentence.

"Astrological resonance present in the symbolic field." is the fallback, and it is philosophically true in the same way that "matter exists" is philosophically true. It communicates nothing that is specific to this user, this card, this day.

The sprint vision addresses this directly: the Celtic synthesis needs real transit data wired in, and the instant interpretation engine needs to use it. Until that connection is made, the astro section in each card's interpretation panel is a placeholder wearing the clothes of a feature.

---

## What Would Change Everything

I am not interested in identifying problems without pointing toward what to do. Here are the things that, if addressed, would close the distance between what this product is and what it is trying to be.

**First: Use the CardBack component everywhere.** Replace the `✦` in `TarotDeckSelection.tsx` with the proper `CardBack` component. This is one import and one JSX replacement. The visual effect — a fan of actual card backs with proper geometry and breathing animation — changes the entire register of the drawing experience.

**Second: Wire the shuffle ritual back in.** `DeckShuffleAnimation.tsx` exists and is complete. The home flow should pass through it before reaching deck selection. The user should see the deck breathe, should see the intention echo above it as cards fan and shift. This component was built to do exactly this work.

**Third: Replace the position counter with a position invitation.** In the Celtic Cross drawing phase, instead of "(0/10)", show the name and meaning of the *next* position to be drawn. "The Foundation — what underlies this moment." The user draws toward something named, not toward a count.

**Fourth: Replace the stub with the real engine.** One line in `handleActualDeckSelect`: pass `CELTIC_CROSS_POSITIONS[selectionIndex]` into the real `computeInstantInterpretation` from the engine rather than the local stub. This unlocks position-aware, sky-aware, intention-threaded interpretation for all ten Celtic positions simultaneously.

**Fifth: Thread the sky into the Celtic synthesis.** The three-card flow sends `dailyTransitSummary` and `weeklyTransitSummary` to the GPT. The Celtic flow does not. The payloads need to match. Without the sky, the Celtic synthesis is a ten-card reading for an abstract person. With the sky, it is a reading for the specific human sitting in front of it.

**Sixth: Calibrate the element temperature to element, not arcana.** The background shift during Celtic Cross reveals should respond to the card's element. Fire cards → warm. Water cards → cool. Earth cards → deep. Air cards → clear. And the opacity should be high enough to actually register — not 4%, but something closer to 10%, enough to shift the perceptual register without being visible as a visual effect.

---

## The Humanity That Is Already There

I want to end honestly: there is real craft in this codebase. Someone wrote `CrossStaffTransition` — the overlay between the cross and the staff of the Celtic Cross — and gave it this text: *"The cross has spoken. The staff now tells you where you are going."* This sentence is correct in the deepest sense. It understands the Celtic Cross as a narrative structure, not just a layout. The cross is diagnosis; the staff is trajectory. The code honors this.

Someone wrote the `ConstellationOverlay` — the darkness and the sentence before synthesis — and got the timing right on the first try. 2800ms of the text, 800ms of fade, synthesis arriving as the darkness lifts. This is not the work of someone who was only engineering. This is the work of someone who felt the rhythm.

The three-card `computeAIFreeSynthesis` fallback — the one that runs when GPT is unavailable — contains this line: "Neither is wrong; both are real." Referring to elemental conflicts between cards. A developer building a fallback algorithm wrote that sentence. That sentence is true. Not every fallback algorithm contains truth.

This is not a product built by people who do not care. It is a product where caring people ran out of time and left seams where the care stopped. The seams are specific: the deck fan's content, the stub interpretation, the missing sky data, the shuffle ritual that is built but not connected. Close these seams and you have something that honors the original intention.

The user who comes to a tarot reading at ten in the morning, alone, uncertain about something they cannot name — they will not see the code. They will feel whether it was built with attention. Right now, they will feel some attention and some haste, and they will not know which to trust. The goal of Sprint 0024 is to make that ambiguity resolve clearly: everything here was made for you, made with care, and it knows you were coming.

---

*— Hayao Miyazaki, reviewing sprint 0024*
