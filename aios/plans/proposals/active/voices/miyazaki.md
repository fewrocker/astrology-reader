# Voice: Hayao Miyazaki — Sprint 0023 Tarot Module Review

*Soul, craft, and respect for the user.*

---

## My First Reaction

I read the spec and felt something I often feel when I encounter ideas that are technically complete but not yet human: it is well-organized, intelligently considered, and almost soulless. The spec describes *what* Tarot should do with great precision. It does not yet tell me what it should *feel like* to be the person sitting with the card at the moment of the reveal. That is what I want to talk about.

The app itself — I read the code carefully — is quietly good. The copy has restraint: "Your chart is ready. Everything you explore from here is yours." That is the kind of sentence that earns trust. "The sky is wider now. ✦" — I smiled at this. These are not the words of a developer. They are the words of someone who cares. The `DiscussModal` with its orbiting glyphs and the `RevealText` that streams word-by-word — someone thought about these things. That person must not be forgotten when Tarot is built.

Tarot must be earned the same way.

---

## What Has Soul Here, and What Does Not

### The Astro+Tarot Integration — This Is the Heart

The decision to make card meanings dynamically adapt to the current sky is the right instinct. The Tower during a Uranus transit means something different than The Tower on an ordinary Tuesday. This is the truth of the system, and it is stated clearly in the spec.

But the spec describes it as a *lookup table*: `transitAdaptations.ts`, a static mapping of card × transit combinations. I understand why. You need reliability before you can have poetry. But there is a danger here: if the lookup table is built by an engineer in a hurry, it will be a list of keyword substitutions rather than a genuine shift in *emphasis and tone*. The Tower during Uranus transit should not just have the word "liberation" inserted. It should feel like the entire reading leans forward — like something in the text is leaning *toward* the disruption rather than describing it at arm's length.

The data must be written with care. Every entry in `transitAdaptations.ts` should be written by a human who understands both the card and the planet, not derived by formula. This is not a programming task. It is a writing task that looks like a programming task.

### The Card Reveal — The Ritual That Can Break Everything

This is where I feel most strongly. The spec mentions "cinematic card reveals" and "card flip animations" and gives animation parameter requirements. These are correct specifications. But they describe the *mechanism*, not the *ritual*.

When a person draws a card, something happens before the card is turned over. There is a breath. There is a moment of not-knowing. That space between "I have drawn this card" and "I now see what it is" — that pause — is where Tarot lives. If you rush through it, you have built a slot machine, not a Tarot reading.

In the app today, the `GptSkeleton` shimmer is the equivalent of that pause for AI synthesis: the shimmer says "something is being prepared for you." This is the right instinct. The card flip must have its own version of this — not a loading state, but a *preparation state*. A moment where the card is face-down and the user is invited to breathe before they tap.

I would propose this: the face-down card should be in a state of very gentle, almost imperceptible slow breathing — a 3-second pulse, subtle, like a sleeping animal's chest. Not animation for animation's sake. Animation that says: *this is alive, and it is waiting for you*.

Then, and only then, the flip. Not on a timer — on a tap. The user must choose the moment. Forced timing violates the ritual.

### The Shuffle Animation — Do Not Make It a Loading Spinner

The spec calls for a `DeckShuffleAnimation.tsx`. I understand the impulse. But I have seen too many apps where the "shuffle" is a spinning animation while a calculation runs in the background, with no real meaning. That is dishonest design.

The shuffle should be the user's act, not the computer's. On mobile, this could be a swipe gesture — the user literally moves the deck. On desktop, a deliberate click sequence: "Draw." But the deck should not simply spin. It should look like something is being gathered and unsettled. Cards should shift, briefly visible, then settle. The metaphor of shuffle — of randomization, of possibility — must be *present* in the animation, not implied by a progress indicator.

The card that emerges should feel chosen, even though it wasn't.

### The Three-Card Synthesis — Where Most Implementations Fail

The spec is admirably clear: "the synthesis should treat the three cards as a constellation, not three independent readings." This is exactly right and extremely difficult to get right.

I read the existing `DiscussModal` code. When the synthesis panel first shows the `GptSkeleton`, it says "Reading today's sky for you..." — that is the right voice. For the three-card reading, the moment before synthesis should have text that says something like: *"The cards are being read as a whole."* Not in a loading spinner style — as a considered statement, visible for the full duration of the skeleton. The user should feel that something is actually being *understood*, not computed.

The AI-free three-card synthesis structure (the `computeThreeCardSynthesis` engine function) must be built so that card interactions are explicitly detected. If two Major Arcana appear in the same spread, the synthesis should acknowledge this. If all three cards share an element, this should surface. If there is a progression (low number → high number → very high number in the Major Arcana), the synthesis should read this as a journey. These are not AI tasks — they are pattern recognition tasks that belong in the engine, running instantly, enriching the skeleton before GPT ever loads.

### The Celtic Cross — Sacred or Rushed

The spec says the Celtic Cross should feel "Slow. Deep. Symbolic. Reflective. Sacred. Beautiful. Not like rapidly consuming content." And then the spec gives no concrete guidance on *how*.

This concerns me. "Sacred pacing" is not a CSS property. Let me be specific about what I mean.

The Celtic Cross has 10 positions. Each position should be revealed only after the user actively requests it. Not a "Next" button — something more deliberate. Perhaps: after each card is revealed and its instant interpretation shown, the next position is unlocked by a gesture that feels like turning a page. On mobile, a slow upward swipe from the bottom of the screen. On desktop, a spacebar press or a click on a "Continue" element that is not styled as a button — styled as a threshold, a doorway.

Between position 5 and 6, there should be a natural pause point. The first five cards form the cross; the last five form the staff. The app should acknowledge this structure explicitly — not as UI labels, but as a brief text that says something like: *"The cross has spoken. The staff now tells you where you are going."* This is the kind of thing that costs nothing to implement and makes everything feel intentional.

The synthesis text for Celtic Cross should not arrive as one block. It should arrive in sections — psychological dynamics first, then emotional tension, then practical integration, then the final reflection prompts. Each section should appear with a brief pause after the previous one, like chapters being opened.

---

## Specific Proposals

### Proposal 1: The Intention-Setting Moment

Before any card is drawn, the user should have a brief, unhurried moment to set their intention. This already exists in the spec as an input field. But it should not look or feel like a form field. It should feel like a journal entry. The prompt text should not say "Enter your question." It should say something like: *"What would you like clarity on today?"* And below that, very small and dim: *"Your words will shape the reading."*

This moment should not be skippable. It can be bypassed (a "Skip and draw" link, small, at the bottom), but the default is to arrive here first. The user who skips it draws a card without intention. The user who pauses learns something about themselves before the card is even turned.

I would also suggest: after the reading is complete, if the user provided an intention, show it back to them above the synthesis. Not as a header — as a reference point. *"You asked for clarity on ——. Here is what the cards found."*

### Proposal 2: The Face of the Cards

The spec calls for "beautiful custom tarot cards that feel collectible and iconic" and then lists three options: SVG in code, public domain Rider-Waite, or CSS placeholder cards. The spec asks for a "concrete decision."

My decision: SVG in code, but designed with specific visual intent for each Major Arcana. The Minor Arcana can share suit-based designs — each suit has a consistent visual language (Wands: fire and wood texture, Cups: water and reflection, Swords: geometry and edge, Pentacles: earth and geometry). The Major Arcana each need one distinctive visual element — not a full illustration, but a symbol. The High Priestess: a crescent moon and two pillars. The Tower: a single falling figure. The Star: a solitary figure pouring water under a sky of eight stars.

These do not need to be intricate. They need to be *specific*. A rectangle with a name printed on it is not a Tarot card. A rectangle with a specific symbol, a name in Cormorant Garamond, and a number that carries symbolic weight — that is already closer to a Tarot card. The symbol tells the user: "someone thought about this one."

The card back — the face-down state — should be a single design consistent across all 78 cards. Deep charcoal with a faint eight-pointed star, very faint gold lines radiating outward. This should feel like the cover of a book you would want to pick up.

### Proposal 3: Reversed Card Presentation

When a card is reversed, most Tarot apps either rotate the entire card upside-down or add a small "Reversed" badge. Both are wrong.

Rotating the card upside-down creates visual confusion and breaks the reading flow. A badge is too clinical.

I would suggest: the reversed card is shown at a slight tilt — maybe 3 to 5 degrees counterclockwise. Not upside-down. Not a badge. A tilt that communicates "something is slightly off-axis here." The interpretation panel immediately below it should use subtly different phrasing: not "This card is reversed," but "This card arrives turned," or simply present the reversed interpretation without naming the state, letting the reading speak for itself.

The tilt should be achieved with CSS `transform: rotate(-4deg)` and should be baked into the `CardReveal.tsx` component as a prop: `reversed: boolean`.

### Proposal 4: The Numerology Resonance Display

The spec includes `numerologyResonance` as a field on every card. Most implementations would show this as a line of text at the bottom of the interpretation panel: "Numerology resonance: The number 7 resonates with inner wisdom."

This is fine. It is also forgettable.

A better approach: show the card's number prominently in the interpretation panel, styled like the Personal Day number is styled in `TodayPage.tsx` — very large, Cormorant Garamond, gold, almost architectural. Below it: the numerology resonance text. The user who uses both the Numerology page and the Tarot page will recognize this visual language and feel a connection between the two modules. That is the reward for building a coherent design system.

Specifically, if the user's personal day number *matches* the card's number, the app should note this. Not loudly — a small line: *"Your personal day is also a 7."* This is the kind of detail that makes users feel the app is paying attention.

### Proposal 5: The Saved Reading Experience

The spec describes saved readings as a list view. I want to make a specific proposal about what this list should feel like.

Each saved reading should show: the date of the reading, the spread type, the name of the first or most significant card, a fragment of the intention the user set, and the moon phase on that day (already computed, as the journal module demonstrates this is feasible). The moon phase is not decoration — it is a timestamp that speaks the app's language.

When a user revisits a saved reading, the app should not just display the static content. It should briefly show: *"You drew this card [X days ago], during a [Moon Phase] Moon."* This is temporal grounding. It places the reading in the user's life story.

The visual design: saved readings should be displayed as cards, not as list rows. Each card has the primary card's art (the SVG symbol), the date, the moon phase glyph, and a title derived from the reading's theme. If the user saved a title, use that. If not, derive it: "The Tower · Past/Present/Future · Oct 14."

### Proposal 6: The Discuss ✦ Context Payload — A Specific Concern

The spec lists what the Discuss ✦ context payload must include and this is correct. I want to flag one thing that is missing.

The context payload should include the user's *stated intention*. If the user wrote "I am deciding whether to leave my job," and the reading included the Eight of Pentacles and the Fool, the AI conversation will be qualitatively different — and better — if it knows the intention. Without it, the AI is a skilled interpreter in a dark room. With it, the AI is a skilled interpreter who has read the question and can actually help.

The `TarotDiscussModal.tsx` context-building function must receive `userIntention: string | null` and include it at the very top of the context payload, before the card list. Not buried in a field — at the top, where it will have the most influence on the model's framing.

### Proposal 7: The Upgrade Gate for Tarot — Write It Differently

The current `UpgradeModal` copy is restrained and good: "You've read your sky for today." But for Tarot, the gate will hit at a very specific, emotionally loaded moment — mid-reading, when the user wants the Celtic Cross synthesis, or wants to save a reading they found meaningful.

The copy for the Tarot-specific gate should be different from the transit-gate copy. It should acknowledge the specific moment:

- Mid-Celtic Cross synthesis: "You've drawn the full cross. The synthesis is an Advanced feature."
- Save reading attempt: "To keep this reading in your journal, you'll need the full sky."
- After a particularly resonant three-card reading: no gate. Let it complete. The gate for three-card readings should only trigger *before* the reading starts, not after.

The principle: never interrupt a ritual in progress if you can help it. Gate at the beginning or after completion. The moment a person is emotionally engaged with a card is not the moment to present a pricing screen.

---

## What Is Lazy in the Current Spec

I want to be honest about this, because the spec is otherwise strong.

**The 78-card data file is described as a programming task.** It is not. Writing 78 cards' worth of `uprightMeaning`, `reversedMeaning`, `symbolicTheme`, `emotionalMeaning`, `practicalGuidance`, `reflectionQuestion`, and `numerologyResonance` — done with real care — is a writing project of significant scope. If it is treated as something to be generated in bulk, the readings will feel generic. "The Tower represents sudden change and upheaval." Yes. Every Tarot app says this. None of them say it in a way that makes you feel it.

The quality bar for this data is: each card's text should be specific enough that you could not swap it with another card's text and have it still make sense. The High Priestess's `reflectionQuestion` should not be interchangeable with The Moon's. If it is, the data was written carelessly.

**The `transitAdaptations.ts` lookup table needs a minimum of 50 meaningful entries at launch.** Not 5, not 10. The most important cards (Major Arcana) combined with the most important transit types (Uranus transits, Saturn transits, Neptune transits, Mercury retrograde, Venus transits, Pluto transits) must each have a real, specific emphasis override. If this table ships with fewer than 50 entries, the Tarot+Astrology integration will produce the same reading for every user, which defeats the entire product vision.

**The visual spec mentions "atmospheric transitions" without specifying what this means.** I will specify it: when moving from the shuffle/draw state to the reveal state, and from the reveal state to the interpretation state, there should be a brief fade-through-black — a quarter-second darkening, then brightening. Like a breath. Not a page transition, not a slide. A darkening and returning. This costs perhaps four lines of CSS. It changes the entire emotional register of the experience.

---

## What Would Make a User Feel the Creators Gave a Damn

These are the small things most users will never consciously notice but will feel if they are missing:

1. **Card art has a subtle inner glow when revealed** — a very faint radial gradient centered on the card's symbol, breathing slowly. The card feels alive.

2. **The card's element is reflected in the background color temperature** — when a Fire card is drawn, the background shifts almost imperceptibly warmer. When a Water card is drawn, slightly cooler. Not enough to notice consciously. Enough to feel.

3. **The spread position labels use the app's existing visual language** — same font, same tracking, same opacity conventions as the rest of the app. Nothing should look imported from a different aesthetic tradition.

4. **The three-card spread's synthesis section has a threshold line** — a thin, very faint horizontal rule above it, with a small centered glyph (✦). This says: "what follows is different in kind from what came before." The interpretations are individual. The synthesis is the whole.

5. **Error states use the same care as happy path states** — if GPT fails during synthesis, the message should not say "Something went wrong." It should say something like: "The synthesis is resting. The instant interpretation above is complete." The reading is not broken; one layer is absent.

6. **The intention field has a character counter that fades in only after 50 characters** — a small, dim number in the corner. This tells the user the system is paying attention, and discourages one-word intentions without feeling prescriptive.

7. **On mobile, the card flip is triggered by a tap on the face-down card, not by a button labeled "Flip"** — the tap target is the card itself. This is tactile. This is correct.

8. **The saved reading timestamp uses the app's language, not a timestamp** — not "2026-05-14 at 14:32" but "fourteen days ago, on a Waxing Gibbous Moon." The app already knows the moon phase on any given date. Use this knowledge.

---

## The Humanity in This Feature

People come to Tarot at moments of uncertainty. Not always dramatic moments — sometimes just the ordinary anxiety of a Wednesday morning, or the low-grade confusion of a relationship that has become hard to read. They come looking for a mirror, not a prediction. They come hoping that something outside themselves will reflect back something they already half-know.

The app's existing voice understands this. "Your stars await." "The cosmos is in motion." These are not the words of a company. They are the words of something that is trying to meet the user with care.

The Tarot module must extend this voice. The card names should be presented with their full dignity — not "THE TOWER" in all-caps like a warning label, but "The Tower" in Cormorant Garamond, as if naming a place you have heard about. The reversed card should not be labeled "Reversed" — it should be received without judgment, its meaning explored rather than announced.

Most importantly: the module must never claim to know the future. The spec says this explicitly — "never fear-inducing," "symbolic rather than deterministic." I want to say it differently: the Tarot module should speak to the user the way a good friend who happens to know astrology would speak — not with certainty, but with genuine attention. "Here is what I notice. Here is what might be worth considering. Here is a question worth sitting with."

That is the humanity in this feature. Everything else — the animations, the data tables, the GPT prompts — is in service of that.

---

*— Hayao Miyazaki, reviewing sprint 0023*
