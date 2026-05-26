# Proposal: Three-Card Spread UI and Synthesis

- **Slug:** `tarot-three-card-reading`
- **Type:** Feature
- **Filename:** `feat-tarot-three-card-reading.md`
- **Originated by:** Jobs, Carmack, Miyazaki
- **Sprint:** 0023
- **Status:** Active

---

## User Guidance

> From `aios/guidelines.md` — Three-Card Reading:
>
> *Cards are revealed sequentially. Each reveal should feel meaningful and cinematic. After all cards are revealed: "The Pattern Emerges" — a complete synthesis becomes available.*
>
> *Per-Card Interpretation: Each card receives position meaning, card meaning, upright/reversed meaning, emotional interpretation, practical interpretation, astrology/transit resonance.*
>
> *Full Reading Synthesis: After all 3 cards are drawn, the reading should generate: main theme, main tension, direction of movement, hidden influence, advice for navigation, psychological pattern, astrology synthesis, timing/context layer. The synthesis should understand interactions between cards rather than interpreting them independently.*

---

## Problem / Opportunity

No three-card spread UI exists in the app. The single-card reading delivers a one-note symbolic encounter. For users who want to understand a situation in motion — not just a current state but a tension, a direction, a resolution — the three-card spread is the natural next step. It is the reading type most suited to the questions real people bring to Tarot: not "what is my energy today?" but "why is this thing happening, and where is it going?"

The opportunity is specific: a well-built three-card surface gives the app a medium-depth ritual that is meaningful enough to remember and share, fast enough to complete in a single sitting, and personal enough — through the Tarot+Astrology integration — to feel unlike any reading available elsewhere. It is also the reading type most likely to convert free users to Advanced tier, because the synthesis that emerges from three cards in dialogue is qualitatively richer than what three separate card descriptions can produce, and that richness is visible to the user precisely at the moment they want to save it.

---

## Vision

Three cards that accumulate meaning, then crystallize into a pattern the user recognizes.

The first card is a statement. The second card creates tension or resonance with the first. The third card is resolution or complication. By the time all three are face-up, the user should already sense a story — something half-named, moving toward articulation. The synthesis panel does not generate that story from nothing; it names what the user has already begun to feel.

This is the emotional arc Jobs named: the shock of recognition. Not surprise — recognition. The synthesis opens not with a paragraph of preamble but with a single sentence that names the constellation of all three cards together, before any expansion. That sentence is the hardest thing to produce well and the most valuable thing in the entire reading. Everything in the GPT prompt design serves that sentence.

The three-card surface is also the place where the spread mode does real interpretive work. The same three cards drawn in Past/Present/Future mode versus Mind/Heart/Action mode mean genuinely different things. The position labels are not decorative headers — they inflect the meaning of each card at the engine level. The proposal must specify how that inflection is carried through from data to display to synthesis.

---

## Specifications

### 1. `ThreeCardReading.tsx` — Layout, Props, and State Machine

**File path:** `src/components/tarot/ThreeCardReading.tsx`

**Props interface:**

```typescript
interface ThreeCardReadingProps {
  spreadMode: SpreadMode
  drawnCards: DrawnCard[]           // exactly 3, pre-drawn by DeckShuffleAnimation
  instantInterpretations: InstantInterpretation[]  // one per card, pre-computed
  astroContext: TarotAstroContext
  userIntention: string | null
  onSave: () => void
  onDiscard: () => void
  onOpenDiscuss: () => void
}
```

The component does not draw cards itself. Cards are drawn by `DeckShuffleAnimation.tsx` upstream, before `ThreeCardReading` mounts. By the time this component is rendered, the three `DrawnCard` objects and their `InstantInterpretation` results are already computed and passed as props. `ThreeCardReading` is responsible for sequential reveal, accumulation display, and synthesis orchestration — not for the draw ritual.

**State machine:**

```typescript
type RevealState =
  | { phase: 'idle' }                          // all three cards face-down
  | { phase: 'card-revealed'; index: 0 | 1 | 2 }  // one card has been revealed
  | { phase: 'all-revealed' }                  // all three face-up, synthesis unlocks
  | { phase: 'synthesis-loading' }             // GPT request in flight
  | { phase: 'synthesis-ready' }               // full reading complete
  | { phase: 'synthesis-error'; retryable: boolean }
```

State transitions:
- `idle` → `card-revealed` (index 0): user taps card 0
- `card-revealed` (index 0) → `card-revealed` (index 1): user taps card 1
- `card-revealed` (index 1) → `card-revealed` (index 2): user taps card 2
- `card-revealed` (index 2) → `all-revealed`: automatic, 400ms after last card flips (the interpretation panel fades in, then the synthesis section header appears)
- `all-revealed` → `synthesis-loading`: automatic, triggered as soon as `all-revealed` is entered; the GPT request fires immediately so loading time is hidden behind the user reading the third card's interpretation
- `synthesis-loading` → `synthesis-ready`: on GPT response
- `synthesis-loading` → `synthesis-error`: on GPT failure or timeout
- Any `synthesis-error` with `retryable: true`: user can tap "Try again" to re-enter `synthesis-loading`

**Layout — three zones:**

1. **Card row** — three `CardReveal` components in a horizontal row, centered. On mobile, the cards are slightly smaller and the row is scrollable horizontally if the viewport is narrow. On desktop, all three cards sit in a single visible row with comfortable spacing. Cards maintain their fixed aspect ratio (portrait) regardless of viewport. The card row is pinned at the top of the screen during synthesis scroll, so the three revealed cards remain visible as an anchor.

2. **Per-card interpretation zone** — below the card row, a vertical stack of `TarotInterpretationPanel` instances, one per revealed card, appearing in sequence as each card is revealed. Cards not yet revealed have no panel below them. The panel for each card fades in over 400ms after the card flip animation completes.

3. **Synthesis zone** — after all three cards are revealed, this zone appears below the last interpretation panel. It begins with the threshold element (see §10) and contains the `TarotSynthesisPanel` component.

---

### 2. Five Spread Modes

The five spread modes are defined in `src/data/tarot/spreadPositions.ts`. Each mode specifies three positions; each position has a label, a short positional meaning (2–3 sentences), and a serialization order for the GPT prompt.

**Past / Present / Future**

| Position | Label | Positional Meaning |
|---|---|---|
| 0 | Past | What has brought you to this moment; the energy or pattern that has been operating beneath the surface |
| 1 | Present | The active situation; what is true right now, neither amplified nor minimized |
| 2 | Future | The direction of movement; what is emerging if the present trajectory continues |

GPT serialization order: Past → Present → Future (temporal sequence).

**Situation / Challenge / Advice**

| Position | Label | Positional Meaning |
|---|---|---|
| 0 | Situation | The current circumstances as they stand; the premise of the reading |
| 1 | Challenge | The central obstacle or the energy working against resolution |
| 2 | Advice | What the symbolic field suggests; not a command but an invitation |

GPT serialization order: Situation → Challenge → Advice (narrative logic: premise, complication, resolution path).

**Mind / Heart / Action**

| Position | Label | Positional Meaning |
|---|---|---|
| 0 | Mind | The cognitive frame; what you are thinking, planning, or over-analyzing |
| 1 | Heart | The emotional truth; what you are feeling beneath the thinking |
| 2 | Action | What the synthesis of mind and heart calls you toward |

GPT serialization order: Mind → Heart → Action (inside-out, from cognition to feeling to behavior).

**Self / Other / Bridge**

| Position | Label | Positional Meaning |
|---|---|---|
| 0 | Self | Your energy, your position, what you are bringing into this situation |
| 1 | Other | The external energy — a person, a situation, or a force outside your control |
| 2 | Bridge | What connects or could connect these two energies; the point of meeting |

GPT serialization order: Self → Other → Bridge (the bridge card is always the synthesis, read last).

**Theme / Shadow / Gift**

| Position | Label | Positional Meaning |
|---|---|---|
| 0 | Theme | The dominant energy or pattern currently active in your life |
| 1 | Shadow | What is hidden, avoided, or unacknowledged; the unconscious dimension |
| 2 | Gift | What becomes available when the shadow is integrated |

GPT serialization order: Theme → Shadow → Gift (the gift is only legible after the shadow is named, so it is serialized last).

**In all five modes:** the positional meaning text is displayed as a small, muted label below the position name in the interpretation panel, giving the user context for why their card means what it means in that position. The label uses the app's existing muted-text treatment (same opacity class as secondary content in `TodayPage.tsx`).

---

### 3. Spread Mode Selector

The spread mode selector is presented before the draw, during the draw ritual orchestrated by `DeckShuffleAnimation.tsx`. The mode selector appears after intention-setting and before the draw gesture — the sequencing is: intention → spread mode → draw.

**UI:** Five options displayed as a vertically stacked list on mobile, or a 2-3 column grid on wider viewports. Each option shows the spread name in Cormorant Garamond and a one-line description of what the spread is for (e.g., "Past / Present / Future — understand a trajectory"). The currently selected mode has a subtle gold border treatment. The default selected mode is Past / Present / Future.

The mode selector is shown in full before any cards are drawn. It does not persist as a header during the reading — once cards are being revealed, the chosen mode name appears as a small label below the card row (e.g., "Past · Present · Future"), and the selector is gone. There is no mode-change option mid-reading.

The `spreadMode` value is passed to `ThreeCardReading` as a prop. The engine uses `spreadMode` to select positional meanings from `spreadPositions.ts` and to determine the GPT serialization order.

---

### 4. Sequential Card Reveal

Cards begin face-down. All three `CardReveal` components are rendered in the face-down state when `ThreeCardReading` mounts. The face-down state is not a placeholder — it is the waiting state: the card back (deep charcoal with faint eight-pointed star, as specified in the visual assets proposal) with a very gentle 3-second breathing pulse animation (`opacity` cycling from 1.0 to 0.92 and back, `animation-duration: 3s`, `animation-timing-function: ease-in-out`, `animation-iteration-count: infinite`). The pulse communicates presence and waiting.

Reveal sequence is strictly linear: card 0, then card 1, then card 2. Cards 1 and 2 cannot be revealed before card 0 is revealed. The face-down card for the next-to-reveal position has a subtle visual hint that it is the active tap target: a faint ring of light around its border, pulsing gently in gold. Cards further in the sequence have no such hint — they are present but quiet.

The tap target for reveal is the face-down card itself — not a button labeled "Reveal" or "Flip." On mobile, a tap anywhere on the card face triggers the flip. On desktop, a click on the card. There is no keyboard-accessible alternative required for v1, but the card element should carry `role="button"` and `aria-label="Reveal card"` for screen readers.

The flip animation: 600ms `ease-in-out` CSS 3D Y-axis rotation. Parent element: `perspective: 1200px`. Both faces: `backface-visibility: hidden`. Pre-flip state: `transform: scale(0.95) brightness(0.8)` on the card back, giving the sense of potential energy held before release. The flip completes at `rotateY(180deg)`. If the card is reversed, a `transform: rotate(-4deg)` is applied to the face-up card after the flip completes — the card is at a slight tilt, not rendered upside-down. This tilt communicates "off-axis" without a clinical label.

Between card reveals, a brief fade-through-black transition occurs: a quarter-second darkening of the background (the overlay goes from 0 to 0.25 opacity over 250ms) followed by brightening (250ms return). This breath-beat between reveals — not a page transition, not a slide — marks each reveal as a distinct moment. Miyazaki specifies this costs four lines of CSS and changes the entire emotional register.

When a card is revealed, its element is reflected in the background color temperature: Fire cards (Wands element) shift the background radial gradient very slightly warmer; Water cards (Cups) slightly cooler. The shift is subliminal — perceptible only on close attention.

---

### 5. Per-Card Interpretation Panel

Each revealed card renders a `TarotInterpretationPanel` below the card row. The panel fades in over 400ms after the flip animation completes. Panels accumulate — the first panel appears, the second appears below it when card 1 is revealed, the third below that when card 2 is revealed. The user scrolls down to read each panel.

**Panel structure (in order):**

1. **Position header** — The position label (`Past`, `Mind`, `Self`, etc.) in small caps, gold, Cormorant Garamond. Below it: the positional meaning text in muted italic, smaller.

2. **Card identity** — Card name in Cormorant Garamond, slightly larger than body text. Arcana number or suit pip rendered large, architectural, gold (same visual language as the Personal Day number in `TodayPage.tsx`). For reversed cards: the name is followed by the `rotate(-4deg)` tilt visual treatment, and the reversed state is communicated through the interpretation text itself, not through a "Reversed" badge. The panel may open with a sentence like "This card arrives turned." but never labels it clinically.

3. **Core meaning** — `coreMeaning` from `InstantInterpretation` (uprightMeaning or reversedMeaning, already selected by the engine). 1–2 sentences, Cormorant Garamond regular.

4. **Symbolic theme** — `symbolicTheme` field, one evocative phrase, rendered in italic with a wider tracking value. Visual separator from the core meaning.

5. **Emotional meaning** — `emotionalMeaning` field. The feeling, not the fact.

6. **Practical guidance** — `practicalGuidance` field. What to do or consider.

7. **In Your Sky Now** (astro connection section) — this section has its own visual section header ("In Your Sky Now") in small caps, and the text is in Cormorant Garamond italic, marking it as a different register from the prose above. The `astroConnection.headline` from `InstantInterpretation` renders prominently — one sentence, maximum 20 words, undeniable and personal — as the first line of this section. Then the `transitInfluence` string (1–2 sentences), then the `lunarPhaseNote` if present, then the `advanceCategoryNote` if present. This section is never more than a short paragraph.

8. **Numerology resonance** — the card number displayed large and architectural (same treatment as Personal Day). Below it: `numerologyNote` text. If the user's personal day number matches the card's number, a small additional line surfaces: "Your personal day is also a [N]."

9. **Reflection question** — `reflectionQuestion` from the card data. Rendered in a slightly offset style — perhaps indented, or in italic with a leading em-dash — to signal it as an invitation, not a statement.

---

### 6. Visual Accumulation as Cards Are Revealed

As each card is revealed and its panel appears, the previously revealed cards remain visible in the card row at the top of the screen. The card row is scroll-anchored (position: sticky or equivalent) so the user always sees all three cards — revealed and face-down — while reading any interpretation panel below. This is the accumulation: the user can look up at the growing set of revealed cards at any time.

The visual weight of the card row changes as cards are revealed. Face-down cards have a slightly lower visual weight (opacity 0.75, slightly reduced scale). Revealed cards have full opacity and scale. As the third card is revealed and all three are face-up, a brief visual event occurs: the card row brightens slightly across all three cards simultaneously (a 300ms flash to full brightness), signaling that the full constellation is now present. This is not a particle effect or a sparkle — it is a subtle light event.

The interpretation panels below do not collapse when subsequent cards are revealed. They remain open and scrollable. The user can read all three interpretation panels in sequence, or scroll back to compare them. No tab UI, no accordion. The full reading is a single scrollable page.

---

### 7. Full Synthesis Section — Unlocked After All Three Cards

The synthesis zone appears as a new section at the bottom of the scrollable page, below all three interpretation panels. It is not hidden behind a tab or a modal — it is part of the same page, accessed by scrolling down after all three panels are visible.

The synthesis zone is not visible until all three cards are revealed. Its entrance: a 400ms fade-in beginning immediately after the `all-revealed` state is entered. The GPT request fires at the same moment the transition into `all-revealed` occurs — "fire early, display late" — so loading time is hidden behind the user reading the third card's interpretation panel.

**Synthesis structure (all sections rendered in sequence, separated by visual spacing):**

1. Threshold element (see §10)
2. Opening constellation sentence (see §10)
3. Main theme
4. Main tension
5. Direction of movement
6. Hidden influence
7. Advice for navigation
8. Psychological pattern
9. Astrology synthesis (drawing on natal chart, transits, moon phase, numerology day)
10. Timing/context layer
11. Reflection prompts (1–3 questions, formatted as the per-card `reflectionQuestion` above)

Each section is rendered with its own heading in small caps, then body text in Cormorant Garamond. No section is a wall of text — each is 2–5 sentences. The overall synthesis is a reading, not a report.

---

### 8. Synthesis Loading Copy

The loading state for the synthesis uses `TarotSynthesisPanel.tsx` in its skeleton state. The skeleton displays:

**"The cards are being read as a whole."**

This text renders in Cormorant Garamond italic, centered, at the same position where the synthesis content will appear. It is not styled as a loading message — it is styled as a statement. The `GptSkeleton` shimmer (already used in other synthesis panels) appears below the text, covering the approximate height of the synthesis content area. The loading state persists for the full duration of the GPT call, regardless of how quickly the call completes — a minimum 2-second display prevents a jarring flash.

The skeleton text must not say "Loading synthesis...", "Please wait", or "Generating your reading." It says "The cards are being read as a whole." — present tense, active, declarative. The user is told that something is happening, not that they should wait.

---

### 9. Synthesis Structure in Full Detail

After GPT responds, the synthesis panel transitions from skeleton to content over a 400ms fade. The content renders in the structure defined in §7. The sections that require special treatment:

**Main theme** — the overarching energy or narrative that all three cards together produce. GPT must not summarize each card separately here; it must name the emergent theme.

**Main tension** — the central opposition, contradiction, or dynamic at work. Often the relationship between position 0 and position 1 cards.

**Direction of movement** — where the energy is flowing; what the spread suggests is becoming. Future-facing without being predictive.

**Hidden influence** — what is operating beneath the surface, implied by the spread but not stated by any single card. This is often the most valuable section for users.

**Advice for navigation** — not a command; an invitation. Uses the app's symbolic, non-directive voice.

**Psychological pattern** — the internal dynamic or recurring pattern the reading identifies. This section uses careful language: "the reading suggests" rather than "you are."

**Astrology synthesis** — how the natal chart, current transits, moon phase, and numerology personal day interact with the card constellation. This section draws on the pre-computed `TarotAstroContext` passed to the GPT prompt as structured metadata, rather than asking GPT to reason from raw chart data.

**Timing/context layer** — the advance category signal (if present) and the lunar context. When is this energy most active? When does it shift? This is never deterministic — it names a texture of time, not a date.

---

### 10. GPT Synthesis Prompt Design

**Request type:** `'tarot-three-synthesis'`

**Payload passed to server:**

```typescript
interface TarotThreeSynthesisPayload {
  spreadMode: SpreadMode
  cards: Array<{
    position: SpreadPosition       // label + positional meaning text
    card: DrawnCard                // id, name, arcana, suit, element, etc.
    reversed: boolean
    instantInterpretation: InstantInterpretation
  }>
  synthesisSignals: ThreeCardSynthesisSkeleton  // pre-computed by engine
  userIntention: string | null
  // astroContext is NOT client-provided in the security-sensitive fields;
  // server reconstructs natal context from resolveUserBirthContext(userId)
}

interface ThreeCardSynthesisSkeleton {
  dominantArcana: 'major-heavy' | 'minor-heavy' | 'mixed'   // Major Arcana ratio
  elementDistribution: Record<'Fire' | 'Water' | 'Air' | 'Earth', number>
  polarityCount: { upright: number; reversed: number }
  hasFoolOrWorld: boolean          // Major Arcana 0 or 21 = beginning/completion framing
  suitSpread: string[]             // e.g. ['Wands', 'Cups', 'Wands']
  elementConflicts: string[]       // e.g. ['Fire (card 0) vs Water (card 1)']
  positionalWeights: string[]      // e.g. ['Past: The Tower (reversed)']
}
```

**Server-side reconstruction:** The server recomputes natal context using `resolveUserBirthContext(userId)` — the same security pattern as `handleTodaySynthesis`. The client-provided `synthesisSignals` are trusted because they are pre-computed structural facts about the cards (element counts, arcana ratios), not natal data. Natal chart positions and transit data are reconstructed server-side.

**Card serialization order in the prompt:** The cards are presented to GPT in the spread-mode-appropriate order defined in §2. The prompt explicitly names the serialization rationale: "Cards are presented in narrative order: [Past] first because it establishes the premise; [Present] second because it creates the active tension; [Future] third because it names the direction."

**System prompt structure:**

```
You are a symbolic Tarot interpreter deeply versed in astrological and numerological resonance. You write in the voice of a thoughtful guide — not a fortune-teller, not a therapist, not a data analyst. Your language is precise, poetic, and grounded. You never predict specific events. You never generate fear. You speak to what is true in the symbolic field.

You are interpreting a [SPREAD_MODE] three-card spread drawn on [DATE] during a [MOON_PHASE] Moon, personal day [NUMEROLOGY_DAY].

Natal chart context: [BIG_THREE + DOMINANT_ELEMENT + DOMINANT_MODALITY]
Active transits: [TOP_2_TRANSITS_BY_SIGNIFICANCE]
Advance category signal: [ADVANCE_CATEGORY or "neutral"]

Structural signals (pre-computed, do not re-derive):
- Arcana composition: [dominantArcana]
- Element distribution: [elementDistribution]
- Polarity: [polarityCount.upright] upright, [polarityCount.reversed] reversed
- [hasFoolOrWorld ? "The spread contains The Fool or The World — a beginning or completion frame." : ""]
- Element conflicts: [elementConflicts.join(', ') or "none"]

The three cards, in [SPREAD_MODE] order:
[CARD_0_POSITION_LABEL]: [CARD_0_NAME] ([reversed ? 'reversed' : 'upright'])
  Position meaning: [positionMeaning]
  Instant interpretation: [instantInterpretation summary]

[CARD_1_POSITION_LABEL]: [CARD_1_NAME] ([reversed ? 'reversed' : 'upright'])
  ...

[CARD_2_POSITION_LABEL]: [CARD_2_NAME] ([reversed ? 'reversed' : 'upright'])
  ...

[if userIntention] The user has set this intention for the reading: "[userIntention]"

Your response must follow this structure exactly:

OPENING_SENTENCE: Begin with a single sentence — no preamble, no "In this reading..." — that names the constellation of all three cards together as a unified symbolic event. This sentence should feel like it could not have been written before these three cards, in this order, were drawn together. It is the reading's title in prose form. Example of the correct register: "The arc here is one of necessary withdrawal leading to a forced reckoning, with the promise of emergence on the other side." Do not begin with "This reading shows" or list the card names. Name the pattern.

THRESHOLD_LINE: [inserted automatically by the UI — do not include in your response]

Then write the following sections, each labeled exactly as shown:

MAIN_THEME: [2-3 sentences on the overarching energy or narrative]
MAIN_TENSION: [2-3 sentences on the central opposition or dynamic]
DIRECTION: [2-3 sentences on where the energy is moving]
HIDDEN_INFLUENCE: [2-3 sentences on what is operating beneath the surface]
ADVICE: [2-3 sentences, non-directive, symbolic]
PSYCHOLOGICAL_PATTERN: [2-3 sentences on the internal dynamic]
ASTROLOGY_SYNTHESIS: [2-3 sentences connecting card constellation to natal + transit context; if the element distribution conflicts with natal dominant element, name this specifically]
TIMING: [1-2 sentences on the temporal texture; never a specific date]
REFLECTION_PROMPTS: [3 questions, one per line, preceded by a dash]
```

**Constellation-naming sentence requirement:** The prompt explicitly instructs GPT to produce a single opening sentence that names the constellation before any expansion, provides an example of the correct register, and explicitly prohibits "This reading shows" or card-name list openers. Without an example, GPT defaults to list-format or paragraph-preamble output. The example ("The arc here is one of necessary withdrawal...") anchors the model's voice.

---

### 11. Threshold Line and Opening Constellation Sentence

The synthesis section opens with a visual threshold element: a thin horizontal rule (1px, very faint gold, opacity 0.3) with a centered `✦` glyph (Cormorant Garamond, gold, `#c9a84c`, font-size 1.2rem). The glyph floats above the rule on a charcoal background, creating the impression of a break in the line rather than a decoration on top of it. This is the visual signal that what follows is different in kind from the per-card interpretations above. The interpretations are individual; the synthesis is the whole.

The `✦` is the same glyph used in "The sky is wider now. ✦" in the existing app. Its appearance here is intentional continuity — the user who recognizes it from elsewhere in the app understands that this is a threshold moment.

After the threshold element, the `OPENING_SENTENCE` from GPT renders in Cormorant Garamond italic, at a slightly larger font size than body text, centered, with generous top and bottom margin. This sentence is treated as an architectural element — the reading's keystone. It is not styled as a paragraph; it is styled as a heading that happens to be a sentence.

If GPT synthesis fails and the synthesis falls back to AI-free mode (see §14), the threshold element still renders, but the opening sentence is replaced by the best available AI-free summary from `computeThreeCardSynthesis`, clearly written — not a fallback placeholder.

---

### 12. The Discuss ✦ Button

The Discuss ✦ button appears at the bottom of the synthesis zone, after all synthesis sections have rendered. It is not visible until synthesis is complete (either GPT synthesis or AI-free fallback). It is styled identically to the Discuss ✦ button in other modules — same font, same gold accent, same `✦` glyph.

Tapping Discuss ✦ opens `TarotDiscussModal.tsx`, which follows the same pattern as `DiscussModal.tsx`. The context payload passed to the modal includes:

- All three drawn cards with positions, reversal states, and instant interpretations
- The GPT synthesis text (if loaded) or the AI-free synthesis skeleton
- The user's stated intention (placed at the very top of the context string, before the card list — this is Miyazaki's requirement from voices/miyazaki.md §Proposal 6)
- Natal chart: Big Three, dominant element, dominant modality, houses if available
- Current transits (top 2–3 by significance)
- Moon phase and lunar phase note
- Numerology personal day and year
- Advance category signal
- The spread mode name

The context string is pre-serialized client-side as a flat string (`discussContext: string`) rather than a nested object, following the pattern already established for `tarot-discuss` in the GPT synthesis proposal. This controls the token budget.

Subscription gate: For free-tier users, Discuss ✦ opens the `UpgradeModal` with Tarot-specific copy. The gate appears only when the button is tapped — not before. The reading completes fully before any gate.

---

### 13. Save Reading Button

The Save Reading button appears at the bottom of the page, below the Discuss ✦ button. It is styled as a secondary action — smaller than Discuss ✦, with a subdued border treatment rather than a filled button.

Tapping Save: for Advanced users, calls `POST /api/readings` with the full reading payload. On success, the button changes to "Saved ✓" (a non-interactive state). On failure, the button returns to the default state with a brief error message: "Could not save. Try again."

For free-tier users, tapping Save opens the `UpgradeModal` with Tarot-specific copy: "To keep this reading in your journal, you'll need the full sky." The reading is not saved for free users. This gate appears after the full reading is complete — Miyazaki's principle: never interrupt a ritual in progress.

The Save button is not visible until synthesis is complete or has definitively failed (i.e., it does not appear during the `synthesis-loading` state).

---

### 14. Error States Per Card Reveal

**Card reveal error (flip fails):** If the `InstantInterpretation` for a card is missing or malformed, the `TarotInterpretationPanel` renders in a graceful degradation state: the card flips normally, but the interpretation panel shows "The interpretation for this card is resting. Try returning to this reading." The reading is not blocked — the user can continue to the next card.

**GPT synthesis error — retryable:** Network error, timeout, or a 5xx response. The synthesis zone renders: threshold element, then "The synthesis is resting. The instant interpretations above are complete." with a "Try again" link below. The "Try again" link re-triggers the GPT call and re-enters `synthesis-loading`. Miyazaki's requirement: this message must not say "Something went wrong." The reading is not broken; one layer is temporarily absent.

**GPT synthesis error — rate limited (free tier):** The `UpgradeModal` opens. The synthesis zone below it shows the AI-free synthesis skeleton from `computeThreeCardSynthesis` as the fallback. The user has a complete reading; they are invited to upgrade for the GPT-enhanced version.

**GPT synthesis error — permanent (non-retryable, e.g. 400 or invalid payload):** The synthesis zone renders the AI-free synthesis skeleton from `computeThreeCardSynthesis` as the definitive fallback. No retry link. The threshold element renders, the opening sentence is replaced by the AI-free summary. The synthesis sections that the AI-free engine pre-computed (element distribution narrative, arcana pattern, polarity tension) are rendered where GPT content would appear. The fallback must be authored well enough that the user feels they have received a complete reading, not a broken one.

---

### 15. Navigation and Back Button Behavior

The three-card reading is a dedicated view within the Tarot module. The `AppView` is `'tarot'` and the `TarotView` within `TarotContext` is `'three-card-reading'` during the reading.

**Back button:** A back affordance is visible in the top-left corner of the screen throughout the reading (same visual treatment as back buttons in other reading surfaces). Tapping back during the reveal phase (before all three cards are revealed) shows a brief confirmation: "Leave this reading?" with "Yes, go back" and "Keep reading" options. If the user confirms, the reading state is discarded and the user returns to the spread mode selector.

Tapping back after all three cards are revealed but before synthesis completes: same confirmation, same discard behavior.

Tapping back after synthesis is complete: if the reading has been saved, navigate directly back without confirmation. If the reading has not been saved, show the confirmation with an additional option: "Save before leaving?" This option triggers the save flow before navigating.

**Navigation during GPT loading:** The back button behaves normally during `synthesis-loading`. Navigating away cancels the pending GPT request (the `AbortController` pattern already used in other GPT calls). There is no "are you sure, synthesis is loading" interruption — synthesis is an enhancement, not the gate to leaving.

---

### 16. Responsive Layout

**Mobile (default):**
- Card row: three cards in a horizontal row, each at approximately 80px wide × 136px tall (the fixed portrait aspect ratio). Row is centered, no horizontal scroll needed at this size.
- Interpretation panels: full-width, stacked vertically. Text at base mobile font size.
- Spread mode selector: full-width vertical list.
- Synthesis zone: full-width, below the third panel.

**Tablet (≥768px):**
- Card row: cards at approximately 100px × 170px. Row is centered with more spacing between cards.
- Interpretation panels: can use a 2-column layout if all three are revealed (first two panels side-by-side, third full-width below).
- Synthesis zone: full-width.

**Desktop (≥1024px):**
- Card row: cards at approximately 120px × 204px, centered, with generous spacing.
- Interpretation panels: a 3-column layout with all three panels side-by-side when all are revealed.
- Synthesis zone: max-width constrained (same as the reading prose elsewhere in the app, approximately 680px), centered.

The card row uses `position: sticky; top: 0` with a charcoal background behind it so it pins at the top of the viewport during scroll on all breakpoints. This ensures the user always sees the accumulated spread while reading interpretations below.

---

## Out of Scope

**GPT prompt implementation details** (exact system prompt token budget, retry logic, timeout values, response parsing) — covered in the GPT Synthesis Integration proposal (`feat-tarot-gpt-synthesis.md`).

**The draw ritual and shuffle animation** — covered in `feat-tarot-draw-ritual.md`. `ThreeCardReading` receives pre-drawn cards as props and does not own the shuffle state.

**Card visual assets and flip animation implementation details** (CSS transform specifics, asset pipeline, Rider-Waite decision) — covered in `feat-tarot-card-visual-assets.md`. `ThreeCardReading` uses the `CardReveal` component but does not own its internals.

**`TarotInterpretationPanel.tsx` base component** — shared with Single Card Reading; its full spec is in `feat-tarot-single-card-reading.md`. This proposal specifies which fields are rendered and in what order; it does not re-specify the component's implementation.

**Celtic Cross reading** — covered in `feat-tarot-celtic-cross-reading.md`. The three-card and Celtic Cross surfaces share `CardReveal.tsx` and `TarotSynthesisPanel.tsx` but are separate page components.

**Saved readings route, DB schema, and `SavedReadingsPage.tsx`** — covered in `feat-tarot-saved-readings.md`. The Save Reading button in this proposal specifies the trigger and UX; the backend and list view are specified separately.

**Subscription gating logic and `tarot_usage` table** — covered in `feat-tarot-subscription-gate.md`. This proposal specifies where gates appear (after the reading completes, never mid-ritual) and the copy used, but not the enforcement mechanism.

**`TarotDiscussModal.tsx` implementation** — the context payload structure is specified in §12 of this proposal; the component internals follow the `DiscussModal.tsx` pattern and are covered in `feat-tarot-gpt-synthesis.md`.

**`TarotContext` architecture** — covered in `code-refactor-tarot-context.md`. This proposal uses `TarotContext` as the state host but does not re-specify its interface.

---

## Open Questions

**1. Whether individual card panels collapse when synthesis opens.**

The current spec (§6, §7) leaves card panels open and scrollable throughout, with the synthesis zone appearing below them. This produces a long page — three interpretation panels plus synthesis — which may be comfortable on desktop and slightly fatiguing on mobile.

An alternative: when `all-revealed` is entered, the three interpretation panels collapse to a summary state (card name + position label + 1-line meaning), and the synthesis zone appears immediately below them in the primary viewport. Tapping a collapsed panel expands it back to full. This would make the synthesis feel more immediately prominent and reduce the scroll distance on mobile.

The risk of collapsing: it interrupts the accumulation narrative. The user who just finished reading the third interpretation panel is in a reading state; collapsing the panels to make room for synthesis feels mechanical. The synthesis is supposed to emerge naturally from the accumulated reading, and the spatial metaphor of scrolling down to find it supports that.

This question should be resolved before implementation begins. A prototype of both behaviors on a mobile viewport would settle it quickly.

**2. Whether the spread mode selector appears as a pre-draw screen or as part of the DeckShuffleAnimation flow.**

The current spec (§3) positions mode selection after intention-setting and before the draw gesture, as part of the `DeckShuffleAnimation` orchestration. An alternative: the mode selector appears on the `TarotPage.tsx` reading-type selection screen, as a sub-option when "Three-Card Reading" is chosen. This would mean mode is selected before entering the shuffle/draw ritual, at a more administrative moment.

The ritual argument for keeping mode inside the draw flow: the spread mode is part of the reading's intention. Choosing "Mind/Heart/Action" before drawing is part of preparing. The mode selector as a pre-draw screen keeps this choice inside the ritual frame.

The simplicity argument for moving it to reading-type selection: fewer screens inside the draw ritual, clearer UX on first use.

This question is primarily a UX judgment and should be validated with user testing, but a provisional decision is needed before implementation. The recommendation is to keep mode selection within the draw ritual (post-intention, pre-draw), since it preserves the intentionality of the choice.
