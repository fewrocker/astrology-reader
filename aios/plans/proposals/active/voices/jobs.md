# Voice: Steve Jobs — Tarot Module Review
## Sprint 0024

---

I've used this product. I've walked through the code line by line. I want to tell you what I actually think, not what you want to hear.

Sprint 0023 shipped. The skeleton is real: 78 cards, three spread types, GPT synthesis, the Celtic Cross state machine, saved readings, the subscription gate. That team did the work. But right now — and I want to be precise about this — the product has the bones of something beautiful and none of the soul.

---

## The Emotional Core

Let me start with what this product is actually about, because the team has described a technology and I want us to build an experience.

The experience is this: you arrive with a question you've been carrying for days. Maybe you haven't said it out loud to anyone. You open the app, and you type it — or you don't, because you can't quite form it yet, so you pick "Decision." You draw a card. And when the interpretation loads, it doesn't feel like a horoscope. It feels like someone *knows*. Like the card saw the question and answered it — and then the sky above it confirms the reading in your specific terms. Your Venus, your Saturn transit, your phase of the moon. Not "in general." Yours.

That is the feeling this product must produce. Not wonder. Not entertainment. *Recognition.*

Right now it doesn't do that. Here's why: the code is building the pieces of that experience correctly but not connecting them. The Celtic Cross in `CelticCrossReading.tsx` uses a local stub at line 78 — `computeInstantInterpretation` — that builds interpretation objects from raw card fields alone, with no position-awareness and no astro data. The ten cards in the most powerful spread type in the product show up with generic text that could appear in any reading, for any person, on any day. That is the opposite of the feeling I described. That is the feeling of a vending machine.

And the `buildCelticAstroCtx` function in `TarotPage.tsx` sends empty `significantTransits` and `currentMoonPhase: ''` to GPT. The Celtic synthesis arrives at the model without the live sky. We're asking the engine to read the stars and handing it a blank chart.

That has to change. Everything in sprint 0024 is downstream of that fix.

---

## The Three Signature Moments

I want to name three specific interactions that will define whether people love this product or merely use it. These are not feature categories. These are the exact seconds that matter.

### 1. The Moment Positions 1 and 2 Flip Together in the Celtic Cross

In `CelticCrossReading.tsx`, after all ten cards are drawn, the user taps the center of the cross and positions 1 and 2 reveal simultaneously. One card crossing the other. This is the most visually and symbolically charged moment in the entire product. It's the heart of the reading.

Right now, what appears below it is text from the stub — `card.coreMeaning`, `card.emotionalMeaning`, and an `astroConnection` that is literally assembled as: `[card.rulingPlanet, card.rulingSign].filter(Boolean).join(' — ')`. That's not an interpretation. That's a data concatenation.

What should appear is a position-aware synthesis that understands this exact pairing: *this* card in the Present position, crossed by *that* card as the Crossing Force, against *this* person's sky today. A Tower crossed by the Three of Swords under a Saturn transit is not the same reading as a Star crossed by the Ace of Wands during a New Moon. The interpretation panel must show that difference. Every time. Without exception.

When we get that moment right — when someone flips positions 1 and 2 and reads two sentences that name exactly what they're living through — *that* is the moment they screenshot and send to a friend. That is the word-of-mouth mechanism. We don't get it by adding features. We get it by making that one moment undeniable.

### 2. The Constellation Sentence in Three-Card Synthesis

The GPT three-card synthesis prompt in `gptTarot.ts` already requests an `OPENING_SENTENCE`: "One sentence only. Name all three cards together as a single symbolic statement — the constellation they form, not a list."

That instruction is correct. The problem is what happens before and after it. The GPT is given card meanings, position descriptions, and a structural signals block — but no guidance on how cards 1 and 2 form a unified central image *before* card 3's direction is introduced. The sprint vision is explicit about this: "a three-card reading synthesis must include one explicit statement about what cards 1 and 2 together are saying as a pair before addressing card 3's direction." The current prompt doesn't enforce that sequence. It asks for a constellation sentence and then jumps to `MAIN_THEME`. The pair-as-image framing is missing.

When the opening sentence works — when it names the pairing of cards 1 and 2 as a single living tension and then shows card 3 as the answer or complication — that is when the user stops thinking about the product and starts thinking about their life. That is the goal of the entire exercise.

### 3. The Deck Fan Before Drawing

Open `TarotDeckSelection.tsx`. Every card in the fan renders as a `✦` symbol — a plain gold Unicode character on a dark background. That is a placeholder from a first implementation that should not survive into a product that aspires to ritual.

The `CardBack` component exists in `CardBack.tsx`. It has the proper indigo field, the eight-pointed star SVG geometry, the inset gold frame, the breathing pulse animation. It is ready. It is not being used in `TarotDeckSelection.tsx`.

The moment the user first sees the deck — before they've drawn anything, before the reading begins — is the moment the product makes its first impression. Right now that impression is: Unicode character. After the fix it should be: a deck of real cards with a proper back design, fanned across the viewport, breathing slightly. That 30-second window before the first card is drawn is the ritual opening. We are currently skipping it.

---

## What Should Be Killed

I'll be direct. These things dilute the focus and should be cut or deferred.

**The `DeckShuffleAnimation` component is orphaned.** It exists at `DeckShuffleAnimation.tsx` with a full state machine — `idle`, `intention-set`, `shuffling`, `card-selected`, `revealing`, `revealed` — including a 2-second shuffle minimum, a card-flip ritual, and a `RitualFadeOverlay`. It is not wired into the current home flow. The home view in `TarotHomeView.tsx` skips directly from intention selection to mode selection to deck display. All that ritual machinery is sitting unused. Either wire it in or delete it. A component that exists but isn't used is a debt that accumulates confusion.

**The "skip and draw" path should not be a first-class affordance.** In `TarotHomeView.tsx`, the "Skip and draw" button is visually present as soon as the intention field is shown. Allowing users to skip the intention step and proceed directly to drawing undermines the entire premise of the product — which is that the reading is personalized to your question. Yes, we should allow it. But it should not be the same visual weight as setting an intention. It should be a ghost-level action, barely visible, available for users who have drawn before and know what they're doing. Not a peer option for first-time users.

**Five three-card spread modes upfront is too many choices.** The mode selector currently shows the three-card spread option, which then reveals five sub-options: Past/Present/Future, Situation/Challenge/Advice, Mind/Heart/Action, Self/Other/Bridge, Theme/Shadow/Gift. That is five decisions before the user has drawn a single card. For most people who want a three-card reading, Past/Present/Future is the obvious starting point. Lead with it. Make it the default. Put the other four modes behind a "more spreads" disclosure. The user who needs Theme/Shadow/Gift will find it. The user who just wants to draw cards shouldn't have to navigate a menu first.

---

## What the Product Should Feel Like — The Design Soul

The current implementation has the right aesthetic vocabulary: Cormorant Garamond headings, deep charcoal ground, gold accents at `#c9a84c`, the indigo card backs at `#1a1040`. The visual DNA is correct. What's missing is the *pacing*.

Ritual is not about what you do. It's about how long you take doing it.

The `DeckShuffleAnimation` component understands this — it enforces a 2-second shuffle minimum before revealing a card. But the Celtic Cross state machine enforces a 3-second hold between cards, which is correct but not enough. The mandatory hold fires correctly (`holding → continuing` after 3 seconds), but the `continue` affordance appears as static italic text — "Tap the next glowing card when you are ready." That's a UI instruction. It's not part of the experience. It breaks the spell.

What should happen instead: the interpretation text for the current card appears, breathes, settles. After the 3-second hold, the *next* position slot begins a subtle pulse — not a hard glow, not a flashing border, but a barely-perceptible expansion and contraction, like the card is breathing. The user sees the pulse before they read the instruction. They feel what to do before they're told. That is the difference between a product that feels like a ritual and a product that feels like a form.

The element temperature shift in `bgColor` (`bgTemp === 'warm' ? '#1a0f08' : bgTemp === 'cool' ? '#080d1a' : '#0d0d0f'`) is a genuinely good idea. It toggles on every card reveal — major arcana goes warm, minor goes cool. But the transition is a 1.2-second ease-in-out on the full background. At that speed and at those hex values, the shift registers almost at the threshold of perception. That's too subtle. It needs to be perceptible without being theatrical — something like 0.8 seconds on a slightly more saturated shift. The user should register the temperature change without consciously noticing why. That's the right target.

---

## What's Mediocre That Should Be Delightful

**The constellation overlay.** When the Celtic Cross reading moves from card 10 into synthesis, a full-screen overlay appears with the text: "The cards are now being read as a constellation." That sentence is fine. The problem is what surrounds it: a plain black overlay at 75% opacity, centered text, 2.8 seconds of display time. Nothing else. No visual. No symbol. Just text on darkness.

This is the most important threshold crossing in the product. The user has sat with ten cards one by one for several minutes. Now the product tells them everything is about to be read together. This transition should have weight — not a particle system, not a spinning animation, but something: perhaps the eight-pointed star from the card back, rendered large and slowly rotating in the center of the overlay, its geometry gradually revealing as the text appears. One second of building anticipation before the sentence appears. Then the sentence fades in over 600ms. Then 2 more seconds. Then the synthesis begins.

Right now it's a div. It should be a ceremony.

**The interpretation panel in the Celtic Cross.** The `InterpretationPanel` component inside `CelticCrossReading.tsx` renders the position name as uppercase tiny text, the card name as a heading, and then three paragraphs in a box with a subtle gold border. The astro connection is rendered at opacity 0.4 — barely visible. It's the most important information in the panel — the bridge between the card and this person's specific sky — and we're rendering it at 40% opacity as the last element.

The astro connection should be the punctuation of the card reading, not the footnote. After the core meaning and emotional layer, there should be a visual separator — a gold hairline, a small glyph — and then the astro connection in the same weight as the interpretation text. Not italic, not faded. Full presence. This is the differentiating layer of the entire product.

**The GPT prompt voice.** I read the single-card synthesis prompt in `gptTarot.ts`. It's well-structured. The system prompt is correct in its prohibitions: no fear, no certainty, speak directly to the person. But the user prompt has a weakness: it lists the transit data exhaustively — 5 daily aspects, 7 weekly aspects, ingresses, retrogrades — and then instructs GPT to "cite at least one concrete transit feature." When you give GPT 15 pieces of data and tell it to cite one, it will cite the most obvious one. The reading will feel like a transit report with tarot dressing.

The fix is to pre-select. Before the prompt is assembled, rank the transit aspects by their relevance to the drawn card — specifically by element affinity, planetary ruler correspondence, and aspect nature. Pass only the top 2 to GPT. Tell GPT: "These are the most relevant transits for this card. Use them." When you reduce the choice set, you increase the specificity of the output. Fewer inputs, sharper reading.

---

## What's Missing That Would Make Someone Love This

**A moment of silence after the synthesis loads.** Right now, after the Celtic synthesis chapters are displayed chapter-by-chapter with 1.2-second intervals, the phase transitions to `complete` and immediately shows "Save this reading" and "Discard" and "Discuss ✦" — all at once. The reading just finished. The user is still inside it. And immediately we're asking them to make administrative decisions.

Add 4 seconds before the action buttons fade in. Let the last chapter settle. Let the experience complete itself before we ask for anything. The user who just received a 10-card Celtic Cross synthesis needs to breathe before they decide whether to save it.

**The user's intention visible throughout.** In `CelticCrossReading.tsx`, the `userIntention` renders as a faint italic subtitle under the heading "Celtic Cross." It's there at the start. But once the reading is underway — once the cards start flipping — the intention disappears from view. During the hold phase for each card, during the synthesis, during the discuss flow — the question the user came with is invisible.

It should stay visible. Not large. Not prominent. But present. A single line at the top of the interpretation panel, or as a constant subtitle in the synthesis section: "Reading intention: should I leave this relationship?" That reminder anchors every card in the question. It's the thread that makes the ten-card reading feel like a single narrative rather than ten separate stops on a tour.

**The saved reading experience should create emotion, not just recall information.** The `SavedReadingsPage` exists and presumably shows a list of past readings. But the emotional design of that page matters enormously. When you open a saved Celtic Cross reading from three months ago, what you should experience is: the date, the question you were carrying, the first card you drew, and a single sentence from the synthesis that named something true. A kind of emotional timestamp.

What most saved-readings UIs give you is a data table. Timestamp, spread type, first card name. That's an archive, not a memory. The design of the saved reading card needs to prioritize the human layer: the intention first, then the dominant card or a striking synthesis phrase, then the date. Make it feel like finding an old journal entry, not a log entry.

---

## The Single Thing I Would Protect

If sprint 0024 only accomplishes one thing, it must be this: the Celtic Cross position-level instant interpretation must use real data.

Every card in the Celtic Cross must know which position it occupies, what that position means in the context of the spread, and how the user's natal chart and current transits inflect that combination. That requires wiring the real `computeInstantInterpretation` from `src/engine/tarot.ts` into `CelticCrossReading.tsx` — replacing the stub at line 78 — and providing it with a real engine context built from actual transit data, not the empty arrays that `buildCelticAstroCtx` currently sends.

The Tower in the Foundation position during a Saturn transit is not the same card as the Tower in the Outcome position during a Waxing Gibbous Moon. The product currently cannot tell the difference. Until it can, the reading isn't personal. And a reading that isn't personal isn't what we're building.

Everything else — the visual polish, the constellation overlay, the GPT prompt sharpening, the deck fan — is important and should be done. But none of it matters if the reading isn't saying something true about this specific person in this specific moment.

Make the reading true first. Then make it beautiful.

---

*Written as Steve Jobs, advisory voice for sprint-0024 planning.*
