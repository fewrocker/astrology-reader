# Voice: Steve Jobs — Tarot Module Review
## Sprint 0023

---

I've read every document. I've walked through the code. And I want to tell you what I think, honestly, because that's the only way we get this right.

---

## The Emotional Core

The spec says the Tarot module should feel like "a symbolic mirror interpreted through the living sky." That's actually a beautiful idea. But I want to be precise about what that *means* as an emotional experience, because right now the spec describes a feature and I want us to build a feeling.

Here's the feeling: **the shock of recognition.**

Not the shock of surprise. The shock of recognition — when someone draws a card and the interpretation is so precise, so tuned to *who they are* and *what moment they're living through*, that they feel seen. That is the emotional core. Everything else — the animations, the synthesis layers, the Celtic Cross — all of it exists to serve that single moment of recognition.

A generic horoscope doesn't create that feeling. Neither does a random card draw with a canned description. What creates it is the convergence: *this* card, with *your* natal Venus in Scorpio, during *this* Pluto transit, on a personal day 7 — and the interpretation understands all of that. That's the magic. That's what they'll show a friend.

---

## The Three Signature Moments

I want to cut through the feature list and name three specific interactions that will define this product. These are the moments we cannot compromise on. Everything else is secondary.

### 1. The Draw

The moment between intention and revelation. Before the card flips.

Most digital Tarot implementations get this catastrophically wrong. They show you a "Shuffle" button and then a card appears. That's not a ritual. That's a UI state change.

The draw has to feel like something is *actually happening*. The user sets their intention — types a question, or selects a focus like "Love" or "Decision" — and then there is a brief, weighted pause. The deck breathes. Maybe there's a subtle particle effect, a shimmer, a slow rotation of the card back. The pacing should feel like a held breath. Three seconds minimum. Not a loading spinner. A *ritual*.

When the card face reveals — the flip animation must be unhurried. Not instant. Not a CSS transition that completes in 200ms. A deliberate arc, like turning over a physical object. The face emerges from darkness. Gold accents catch the light. The name of the card fades in last, not first.

That is the moment that determines whether this app feels profound or feels like a toy.

### 2. The Astro Connection Landing

This is the differentiator. This is the thing that makes the product unlike every other Tarot app in the world.

When the interpretation panel appears, the Tarot+Astrology layer must land with its own visual weight — not buried as a paragraph in a wall of text. The user draws The Hermit during Mercury retrograde with a strong Saturn transit. The card means solitude and introspection on any ordinary day. But right now, given *their sky*, it means something more specific: a call to deliberate withdrawal, to review rather than advance, to trust the slowness.

That shift — the way the current sky *inflects* the card's meaning — needs to be legible at a glance. I'd give it its own section header, maybe something like "In Your Sky Now." The section should list the one or two most relevant transit connections in plain, striking language. Not a paragraph. Not a disclaimer. A statement.

"Mercury retrograde amplifies the Hermit's call to review and reconsider. Saturn conjunct your natal Sun reinforces the theme of deliberate solitude."

That's it. Two sentences, maximum. Sharp. Personal. Undeniable.

### 3. The Three-Card Synthesis — The Pattern Emerging

The moment after all three cards are revealed, when the synthesis section opens with the header: "The Pattern Emerges."

This is the moment that earns the product's depth. Right now the spec describes this correctly — it must treat the three cards as a constellation, not three separate readings. But I want to be specific about what *earns* this moment emotionally.

The reveal of each card should create a feeling of accumulation. The first card is a statement. The second card creates tension or resonance with the first. The third card is resolution or complication. By the time all three are revealed, the user should already sense a story before the synthesis loads.

The synthesis section must open with a single sentence that names the constellation. Not a paragraph — one sentence that cuts through. Something like: "The arc here is one of necessary withdrawal leading to a forced reckoning, with the promise of emergence on the other side." Then the rest.

That opening sentence is the hardest thing to generate well. It's also the most valuable. The GPT prompt for `tarot-three-synthesis` must be engineered to produce that sentence first, before anything else.

---

## What to Kill

I'm going to be direct about the things in the spec that dilute the focus.

**Kill the "Advanced spread types" subscription promise.** The spec mentions "advanced spread types" as an Advanced tier benefit. But we haven't defined what those are. A feature you can't describe is a promise you can't keep. Cut it. If we build an extraordinary Celtic Cross, that is enough. We do not need a vague future spread to sell the subscription.

**Kill the "Compare readings across time" feature — for now.** The Saved Readings page should let you *review* readings. The ability to *compare* them requires UI we haven't designed and a comparison model we haven't defined. "Compare" implies a side-by-side view with analytical overlays. That's a different product surface, and building it poorly is worse than not building it. Save it for sprint 0024. What we ship now: save, revisit, attach to journal. That is enough.

**Kill the idea of placeholder card art.** The spec hedges with option (c): "symbolic placeholder cards with rich CSS treatment as a first implementation." I understand why — the team wants to ship and come back to card art. But this is the wrong trade. The card *is* the product. The moment of reveal is the emotional core. A colored rectangle with the card name is not a tarot card. It's a wireframe.

Here's the right path: use the Rider-Waite deck, which is in the public domain. The imagery is iconic, recognized, and has genuine symbolic weight. Download the 78 SVG/PNG files, embed them in the asset pipeline. It's not perfect design — the illustrations are over a century old — but they carry real visual power. We can design our own deck later, as a premium feature, as an art direction decision made with full attention. But ship with Rider-Waite, not with rectangles.

---

## The One-Sentence Story

Here it is:

**"Draw a card that knows your sky."**

Every design decision should pass through that sentence. If a feature makes the reading feel less personal, cut it. If an animation makes the draw feel less ceremonial, simplify it. If a synthesis paragraph could have been written for anyone, rewrite it until it couldn't.

---

## Design Soul and Aesthetic Personality

The existing app has a strong visual identity — deep charcoal, Cormorant Garamond, gold accents, cinematic restraint. Tarot must feel native to that language, not like a separate app grafted on. But it should also deepen it.

Here is the specific aesthetic territory I want:

**Primary palette:** The existing charcoal background stays. Card backs should be a deep indigo (#1a1040) with a subtle gold geometric pattern — not Rider-Waite's traditional red-and-blue plaid, but a modern interpretation with the same sense of symbolic containment. Card faces sit on a warm ivory (#f5f0e8) field to honor the traditional paper feel while staying premium.

**Typography on cards:** The card name uses Cormorant Garamond in small caps, gold color (#c9a84c), tracked out. The arcana number or suit symbol is smaller, silver (#b8b8c0). Nothing else on the card face itself — the image carries the meaning.

**Interpretation panel typography:** The "In Your Sky Now" astro connection section should use a slightly different text treatment — perhaps Cormorant Garamond italic rather than the upright weight used elsewhere. It marks the text as a different register: personal, ambient, sky-specific.

**Animations:** The card flip should be a 600ms ease-in-out 3D rotation on the Y axis. The "before" state should be slightly scale-down (0.95) and slightly dimmed (brightness 0.8) to create a sense of potential energy before the flip. The deck shuffle animation should use a staggered card-fan effect — three cards visible, fanning and collapsing with a 100ms stagger. No particles, no sparkle, no stars. The restraint is what makes it feel premium.

**Color mood during Celtic Cross:** As cards are revealed progressively in the Celtic Cross, the background radial gradient should very subtly shift — warmer for major arcana reveals, cooler for minor arcana. Not dramatic. Perceptible only on close attention. A subliminal signal that something important is happening.

---

## Reference Points

Three existing products get pieces of this right:

**Headspace** — specifically the onboarding and session-start animations. There is a weighted stillness before activity begins. The breathing exercise pacing is something the shuffle ritual should study. The app doesn't rush you into the content. It creates the state first.

**Monument Valley** — the way each puzzle state feels like a complete aesthetic object, not a UI screen. Every screen is a composition. The Tarot page should feel this way — not like a form, not like a dashboard, like an image you've stepped into.

**Calm's sleep stories** — the pacing. The way content is delivered slowly, with intention, without rushing toward the next piece of information. The Celtic Cross experience needs this quality above all others. There is no hurry in a Celtic Cross reading. The spec is right that it should feel "slow, deep, symbolic, reflective, sacred." Study how Calm builds that sensation through pacing and audio tone — and ask how we create the same effect through visual pacing and typography timing.

---

## Specific Proposals

### P1: The Draw State Machine

The `DeckShuffleAnimation.tsx` component needs an explicit state machine, not just an animation. States: `idle → intention-set → shuffling → card-selected → revealing → revealed`. Each transition has a minimum duration. The `shuffling` state should last at least 2 seconds, regardless of computation speed. Even if the card is already determined, the user should experience the full ritual duration. The `revealing` state (the flip) should not begin until the user taps or clicks — there should be a held moment between "card selected" and "reveal." The user completes the ritual.

### P2: The Astro Layer as a First-Class Data Structure

The `computeInstantInterpretation` function in `src/engine/tarot.ts` must return the astro connection as a structured field, not as appended text. Something like:

```typescript
interface InstantInterpretation {
  cardMeaning: string
  reversedModifier: string | null
  emotionalLayer: string
  practicalGuidance: string
  reflectionQuestion: string
  astroConnection: {
    headline: string          // one sentence, max 20 words
    transits: TransitNote[]   // 1-2 most relevant transit connections
    lunarNote: string | null  // only if lunar phase is relevant
    numerologyNote: string | null
  }
  positionMeaning: string | null
}
```

The `astroConnection.headline` is the sentence that appears prominently in the "In Your Sky Now" section. Treat it as a design primitive, not as a side note.

### P3: The GPT Prompt for Three-Card Opening Sentence

The `tarot-three-synthesis` GPT prompt must explicitly instruct the model to begin with a single narrative sentence that names the constellation of the three cards together, before expanding into thematic analysis. The prompt should include an example of what this sounds like, to anchor the model's voice. Without an explicit example, GPT will default to list-format or paragraph-preamble output.

### P4: Celtic Cross Progressive Reveal — The Pause Protocol

Between each card reveal in the Celtic Cross, the UI must pause in a specific way. After a card is flipped, the interpretation for that position should fade in over 400ms. Then the "Continue" affordance (tap anywhere, or a subtle "Reveal next card" prompt) must not appear for at least 3 seconds. The user must have time to sit with the card before being prompted to move on. This is a UX requirement, not a nice-to-have. The Celtic Cross works at a different temporal scale than the single card reading.

### P5: The Subscription Gate Position

The subscription gate should appear *after* the three-card interpretation panel, not before the draw. Let free users complete one three-card reading per week fully. Let them see the beauty of it. Then, when they want to save it, when they want to open Discuss ✦, when they want the full synthesis rather than the abbreviated version — that's when the gate appears.

Gating at the door means the user never understands what they're being asked to pay for. Gating after the experience means they've already fallen in love with it. The product should always earn the upgrade, never demand it.

### P6: Card Art Pipeline Decision — Rider-Waite

As discussed above: use Rider-Waite public domain imagery for the initial implementation. The images should be processed through a consistent CSS filter to harmonize with the app's dark aesthetic — a slight sepia-to-warm-gold tonal shift, subtle vignette border, no harsh white backgrounds. The cards should feel like they've always lived in this app's visual world. A one-time CSS `filter` treatment on the `<img>` tag handles this without modifying the source files.

### P7: The Reading Intention Input

Before drawing any cards, the user should set an intention. This is not optional — it is the ritual frame that makes the reading meaningful. But it must be optional in terms of *text*. The user can type a specific question, or they can select a focus area from a set of chips (Love, Career, Growth, Decision, Today's Energy, General), or they can proceed with no selection (which sets an implicit "General" context).

The intention input must be the first thing the user sees when they open the Tarot module. Not the mode selector. Not a feature tour. A single question: "What is on your mind?" with the focus chips below it. The mode selection (single card / three-card / Celtic Cross) comes after the intention is set.

This sequencing changes everything. It means the user arrives at the draw having already done inner work. The card that appears feels like a response to their question, not a random outcome.

---

## What This Sprint Must Absolutely Deliver

I'll close with this: the vision document is right that "not a partial Tarot implementation" is a hard line. But if I had to name the single thing I would protect above everything else, it's this:

**The single-card reading must be perfect.**

The three-card spread must be excellent. The Celtic Cross must be complete. But the single-card reading is the daily habit. It's the thing they do at 7am with their coffee. It's the reason they come back tomorrow. If the single-card experience is extraordinary — the ritual draw, the instant interpretation with the astro layer, the card art, the Discuss ✦ depth — then this product has a user for life.

Get the single card right. Then build outward.

---

*Written as Steve Jobs, advisory voice for sprint-0023 planning.*
