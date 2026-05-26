# Proposal: Draw Ritual and Deck Shuffle Animation

- **Type:** Feature
- **Slug:** `tarot-draw-ritual`
- **Filename:** `feat-tarot-draw-ritual.md`
- **Originated by:** Jobs, Miyazaki
- **Sprint:** 0023
- **Status:** Active

---

## User Guidance

Drawn directly from `aios/guidelines.md` ritual and pacing sections:

> "Every reading should feel like a ritualized symbolic encounter."

> "The experience should feel: Mystical but modern / Emotionally immersive / Visually cinematic / Psychologically insightful / Fast and reliable / Personal rather than generic"

> "The user: Sets an intention or timeframe / Shuffles/draws a card / Reveals the card"

> "This should feel: Slow / Deep / Symbolic / Reflective / Sacred / Beautiful / Not like rapidly consuming content."

> "Before the final synthesis: 'The cards are now being read as a constellation.'"

> "Visual Goals: Animated decks / Smooth card flips / Atmospheric transitions / Ritual-like pacing / Mobile-first tactile interaction"

And from the Miyazaki voice review:

> "When a person draws a card, something happens before the card is turned over. There is a breath. There is a moment of not-knowing. That space between 'I have drawn this card' and 'I now see what it is' — that pause — is where Tarot lives. If you rush through it, you have built a slot machine, not a Tarot reading."

And from the Jobs voice review:

> "The draw has to feel like something is *actually happening*. The user sets their intention — types a question, or selects a focus like 'Love' or 'Decision' — and then there is a brief, weighted pause. The deck breathes. The pacing should feel like a held breath. Three seconds minimum. Not a loading spinner. A *ritual*."

> "This sequencing changes everything. It means the user arrives at the draw having already done inner work. The card that appears feels like a response to their question, not a random outcome."

---

## Problem / Opportunity

Without a deliberate ritual, tarot feels like any other data display. A shuffle button followed by an immediate card render is a UI state change, not a draw. The magic is in the pacing: the breath before the flip, the moment of not-knowing, the weight of intention meeting symbol. Digital Tarot almost universally fails this test. Apps show a card instantly; the user receives information but not experience. This module has the opportunity to build the ritual correctly from the beginning — not as decoration, but as the primary emotional architecture of the feature. The ritual *is* the product. The card content is what delivers the message; the ritual is what makes the message land.

The draw ritual also gates everything else. If the intention-setting moment is weak, the entire reading feels arbitrary. If the shuffle animation is a spinner, the draw feels computational. If the flip is auto-triggered, the user is a spectator rather than a participant. Every weakness in the ritual propagates forward into the interpretation and synthesis experience.

---

## Vision

Every draw feels like a genuine pause — the app slows down with you, not at you. The user arrives at the first screen with a question already forming. The intention is set before a single card is touched. The deck breathes while the user breathes. The flip happens when the user is ready, not when the timer completes. The transition between phases is a darkening and returning — a visual breath — not a page swap. When the reading ends, the user's own words are reflected back above the synthesis, completing the loop: you came with a question, here is what the cards found. The ritual is not a UI pattern. It is the reason this app feels different from every other Tarot app in existence.

---

## Specifications

### 1. Navigation Flow

The complete navigation flow for a Tarot reading is:

```
TarotIntentionScreen → TarotModeSelector → DeckShuffleAnimation
  → [card draw, user-gated flip] → CardReveal (per card)
  → TarotInterpretationPanel (per card) → synthesis panel
```

The intention screen is always first. The mode selector is always second. No user can reach the draw without passing through both. The "Skip and draw" affordance on the intention screen still routes through the mode selector before the draw begins.

---

### 2. TarotIntentionScreen.tsx

**File:** `src/components/tarot/TarotIntentionScreen.tsx`

**Purpose:** The first screen the user sees when opening the Tarot module. Sets the ritual frame before anything else is chosen.

**Props interface:**
```typescript
interface TarotIntentionScreenProps {
  onIntentionSet: (intention: string, focusArea: FocusArea) => void
  onSkip: () => void
  defaultFocusArea?: FocusArea
}

type FocusArea =
  | 'todays-energy'
  | 'love-relationships'
  | 'career-purpose'
  | 'growth'
  | 'custom-question'
  | 'general'
```

**Layout and content:**

The screen renders in full-height centered column layout, matching the app's charcoal background. No card visuals appear on this screen — this is the moment before the draw, and visual anticipation is built through restraint.

Header text (Cormorant Garamond, large, dim gold):
```
What would you like clarity on today?
```

Subtext (small, muted, fading in 600ms after mount):
```
Your words will shape the reading.
```

**Intention textarea:**
- Full-width, minimum 3 rows, max 8 rows (auto-grows)
- Placeholder text: `What are you seeking guidance on?`
- Border: `1px solid rgba(201, 168, 76, 0.2)`, focused: `rgba(201, 168, 76, 0.5)`
- Background: `rgba(255, 255, 255, 0.03)`
- Font: body font (not heading), 16px, line-height 1.6
- No resize handle
- `maxLength={280}`
- Character counter behavior: counter div is `opacity: 0` until the textarea value reaches 50 characters, then transitions to `opacity: 0.45` over 300ms. Counter reads `{count}/280` in 11px muted text, bottom-right corner of the textarea wrapper. This signals attentiveness without being prescriptive.

**Focus-area chips:**

Rendered in a wrapping flex row below the textarea, 8px gap. Each chip:
- Label, small (13px), letter-spacing: 0.08em
- Default state: `border: 1px solid rgba(201, 168, 76, 0.2)`, background transparent, muted text
- Selected state: `border-color: rgba(201, 168, 76, 0.7)`, background `rgba(201, 168, 76, 0.08)`, text at full opacity
- Transition: 200ms ease

Chips (in order):
1. Today's Energy
2. Love & Relationships
3. Career & Purpose
4. Growth
5. Custom Question
6. (implicit, no chip) — General (default when no chip selected and no text)

Selecting a chip sets the `focusArea` state. Typing in the textarea while a chip is selected keeps the chip selected (the chip refines the question, it does not replace it). If the user selects "Custom Question," the textarea receives focus automatically.

**Primary CTA:**
- Label: `Set Intention & Continue`
- Enabled when: textarea has at least 1 character OR a chip other than implicit-general is selected
- Style: full-width button, gold border, minimal background
- On tap: calls `onIntentionSet(intentionText, resolvedFocusArea)`

**Skip affordance:**
- Small text link, bottom center: `Skip and draw`
- Muted color, no underline, tap area 44px minimum
- On tap: calls `onSkip()` which sets intention to `''` and focusArea to `'general'`, then routes to mode selector

**First-time vs returning user:**

On first open (determined by `TarotContext.hasDrawnBefore === false`): the subtext fades in 600ms after mount. On subsequent opens: subtext is visible immediately.

**Accessibility:**
- Textarea `aria-label="Reading intention"`
- Chips use `role="radio"` inside a `role="radiogroup"` with `aria-label="Focus area"`
- Skip link has `aria-label="Skip intention and proceed to card draw"`

---

### 3. TarotModeSelector.tsx

**File:** `src/components/tarot/TarotModeSelector.tsx`

**Purpose:** Shown immediately after intention is set. Reading type selection: single card, three-card spread, Celtic Cross.

**Props interface:**
```typescript
interface TarotModeSelectorProps {
  intention: string
  focusArea: FocusArea
  onModeSelected: (mode: ReadingMode) => void
  onBack: () => void
  userTier: 'free' | 'basic' | 'advanced'
}

type ReadingMode = 'single' | 'three-card' | 'celtic-cross'
```

**Layout:**

Three reading type cards rendered in a vertical stack (mobile) or 3-column grid (desktop ≥768px). Each card:

- Background: `rgba(255,255,255,0.02)`, border `rgba(201,168,76,0.15)`, border-radius 16px
- On hover/focus: border brightens to `rgba(201,168,76,0.35)`, background to `rgba(201,168,76,0.04)`
- Title (Cormorant Garamond, 22px, gold)
- Subtitle (body font, 13px, muted)
- Time estimate (very small, 11px, muted, italic)
- Tag pill showing `Free`, `Free (1/week)`, or `Advanced` as appropriate to the user's tier

Reading type cards:

**Single Card**
- Title: `Single Card`
- Subtitle: `A focused moment of guidance`
- Time: `2–4 minutes`
- Free tier: unlimited (1 per day)

**Three-Card Spread**
- Title: `Three-Card Spread`
- Subtitle: `Past, present, and what emerges`
- Time: `8–12 minutes`
- Free tier: 1 per week; on tap for free user who has used their weekly draw: route to UpgradeModal

**Celtic Cross**
- Title: `Celtic Cross`
- Subtitle: `A full symbolic portrait of your moment`
- Time: `20–35 minutes`
- Free tier: locked; on tap: route to UpgradeModal with `intendedTier='advanced'`
- Lock state: card renders with `opacity: 0.55`, a small lock glyph (✦ replaced by a padlock SVG) in top-right

If intention text was provided on the previous screen, show a small echo line above the cards:
```
You're seeking clarity on: [first 60 chars of intention, truncated with …]
```
This reminds the user their words are carried forward and reinforces the ritual coherence.

Back affordance: small arrow-left + text `Change intention` at top-left, routes back to `TarotIntentionScreen` with intention and focusArea pre-populated.

---

### 4. State Machine — The Full Draw Ritual

**Component:** `DeckShuffleAnimation.tsx`  
**File:** `src/components/tarot/DeckShuffleAnimation.tsx`

The state machine is the single source of truth for the draw ritual. Every phase transition must pass through it. No component outside this machine may advance the ritual state.

#### States

```typescript
type RitualState =
  | 'idle'           // component mounted, not yet started
  | 'intention-set'  // intention confirmed, briefly shown before shuffle
  | 'shuffling'      // deck animation running, minimum duration enforced
  | 'card-selected'  // card determined, face-down card visible, waiting for user
  | 'revealing'      // flip animation in progress
  | 'revealed'       // card face visible, interpretation may begin loading
```

#### State transitions

```
idle
  → intention-set     on mount with valid intention (auto, 0ms delay)

intention-set
  → shuffling         after 600ms display of intention echo
                      (the "what you came with" moment before the deck moves)

shuffling
  → card-selected     after MIN(actual computation time, 2000ms)
                      ENFORCED MINIMUM: shuffling state lasts at least 2000ms
                      even if card was pre-determined. The ritual cannot be rushed.

card-selected
  → revealing         ONLY on explicit user gesture (tap on face-down card, mobile;
                      deliberate click on face-down card area, desktop)
                      NO auto-advance. NO timer. The user completes the ritual.

revealing
  → revealed          after flip animation completes (600ms)
                      transition is automatic — the flip has a natural end
```

#### Minimum enforced durations

| State | Minimum Duration | Notes |
|---|---|---|
| `intention-set` | 600ms | Brief echo before deck moves |
| `shuffling` | 2000ms | Hard floor; computation may finish sooner |
| `card-selected` | User-gated | No maximum; no auto-advance |
| `revealing` | 600ms | CSS animation duration |

These minimums are enforced with `setTimeout` + a `canAdvance` flag. The computation result is stored in a ref when it arrives; the state advances only when both the minimum duration has elapsed and the computation is complete.

#### Props interface

```typescript
interface DeckShuffleAnimationProps {
  intention: string
  focusArea: FocusArea
  readingMode: ReadingMode
  spreadMode?: ThreeCardSpreadMode        // required if readingMode === 'three-card'
  onCardSelected: (cardIndex: number) => void   // called on card-selected entry
  onRevealComplete: (state: RevealedState) => void
  cardCount: number                       // 1, 3, or 10
}
```

#### Implementation notes

- The state is managed with `useReducer`, not `useState`, to ensure transitions are explicit and traceable in React DevTools.
- A `ritualTimerRef` tracks the shuffle minimum. On `shuffling` entry, start a 2000ms timer. When both the timer fires AND `cardSelectedReady` ref is `true`, dispatch `CARD_READY` action.
- The `card-selected` state persists indefinitely. If the user navigates away and returns, the state is preserved in `TarotContext` so they can continue the ritual.
- For three-card and Celtic Cross readings, the state machine runs once per card. The parent component (`ThreeCardReading.tsx`, `CelticCrossReading.tsx`) orchestrates multiple passes through `card-selected → revealing → revealed` sequentially.

---

### 5. DeckShuffleAnimation.tsx — Visual Specification

**Idle / intention-set state:**

A centered deck of three cards is visible, stacked with a slight offset (each card 4px below and 4px to the right of the one above). Card backs use the deep indigo `#1a1040` background with a faint eight-pointed star in gold (SVG, `opacity: 0.15`). The stack is static in `idle`; in `intention-set`, the three cards perform a single slow breath — a 1.5s scale pulse `scale(1.0) → scale(1.02) → scale(1.0)`, `ease-in-out`.

During `intention-set`, the user's intention text (or focus area label if no text was entered) fades in centered above the deck:
```
Seeking clarity on: [intention text]
```
Font: Cormorant Garamond italic, 18px, `color: rgba(201, 168, 76, 0.7)`. Max two lines, truncated. Fades in over 400ms. This is the moment of recognition — the app acknowledges what the user brought with them.

**Shuffling state:**

The three visible cards execute a staggered fan-and-collapse animation:
1. Cards fan out to left/center/right positions (±40px horizontal, ±12px vertical, ±8deg rotation) over 300ms with staggered starts (0ms, 100ms, 200ms)
2. Hold fanned state for 400ms
3. Collapse back to stack over 300ms (same stagger in reverse)
4. Repeat this cycle: fan → hold → collapse, until the 2000ms minimum expires AND computation is complete

The deck movement communicates "possibility being gathered and unsettled" (Miyazaki's framing). No sparkle, no particles, no stars. The animation is the restraint.

**No spinner.** No loading indicator. No percentage. The deck is alive; the computation is invisible.

**Card-selected state:**

The three visible cards collapse to a single face-down card, centered, slightly larger than the deck cards (the "chosen" card steps forward). Scale transition: `scale(0.95) → scale(1.0)` over 400ms, `ease-out`.

The face-down card enters a very gentle breathing pulse — a 3-second cycle, `scale(1.0) → scale(1.015) → scale(1.0)`, amplitude so small it reads as "alive" rather than "animated." This is Miyazaki's sleeping animal's chest: presence, not performance.

On mobile: tap target is the entire card face. A subtle hint text fades in below the card after 1200ms:
```
Tap to reveal
```
11px, muted gold, `opacity: 0.4`. This appears only once and fades out after 3 seconds (it is a hint, not a persistent instruction; returning users should not see it repeatedly — use `localStorage` flag `tarot_hint_seen`).

On desktop: the card area is still the click target. The cursor changes to `pointer` on hover. Same 1200ms hint: `Click to reveal`.

**Revealing state:**

The flip animation begins. CSS 3D transform on the card element:
- Parent: `perspective: 1200px`
- Card: `transform-style: preserve-3d`, `transition: transform 600ms ease-in-out`
- Pre-flip: `rotateY(0deg)`, `scale(0.95)`, `filter: brightness(0.8)`
- Mid-flip (180deg): the card is edge-on; the face becomes visible from here
- Post-flip: `rotateY(180deg)`, `scale(1.0)`, `filter: brightness(1.0)`
- Front face: `backface-visibility: hidden`
- Back face: `backface-visibility: hidden`, `rotateY(180deg)` initial so it's hidden before flip

The name of the card fades in last, after the flip completes, over 300ms. The card image (or CSS symbolic art) reveals first; the name arrives as confirmation. This sequence — image first, name second — prevents the name from telegraphing the reveal before the face is visible.

If `reversed: true`, the final state applies `rotate(-4deg)` in addition to the flip transform. A slight tilt, not an upside-down render. Communicates "off-axis" without clinical badge labels.

---

### 6. Fade-Through-Black Transitions

Between each phase transition where a significant shift occurs, a brief fade-through-black acts as a visual breath. This is not a page transition or a slide. It is a darkening and returning.

**CSS implementation:**

```css
.ritual-fade-overlay {
  position: fixed;
  inset: 0;
  background: #0a0a0f;
  pointer-events: none;
  z-index: 100;
  opacity: 0;
  transition: opacity 250ms ease-in-out;
}

.ritual-fade-overlay.fading-out {
  opacity: 1;
}

.ritual-fade-overlay.fading-in {
  opacity: 0;
}
```

**Trigger points:**

| Transition | Fade behavior |
|---|---|
| `shuffling → card-selected` | Fade to black (250ms), then immediately fade back (250ms). Total: 500ms. |
| `card-selected → revealing` | No fade — the flip animation IS the transition. Do not double the ceremony. |
| `revealed → interpretation panel appears` | Fade to black (250ms), hold 100ms, fade back (250ms). Total: 600ms. |
| Between Celtic Cross positions 5→6 (cross to staff) | Fade to black (250ms), hold 300ms (transitional text shown in center, white, Cormorant Garamond italic), fade back (250ms). Text: *"The cross has spoken. The staff now tells you where you are going."* |
| Three-card: final card revealed → synthesis panel appears | Fade to black (250ms), hold 100ms, fade back (250ms) |

The fade-through-black is implemented as a single `<div>` overlay at the root of `DeckShuffleAnimation.tsx` and managed with the ritual state machine. The CSS class is toggled via `requestAnimationFrame` to ensure the browser completes the paint before beginning the animation.

**Reduced motion:** `@media (prefers-reduced-motion: reduce)` — remove the fade overlay entirely. Phase transitions use a simple `opacity: 0 → 1` on incoming content instead.

---

### 7. Intention Echo Above Synthesis

After a reading completes (all cards revealed and interpreted), if the user provided intention text on the intention screen, the synthesis panel is preceded by an echo block:

```
You sought clarity on:
[full intention text, up to 280 chars]
Here is what the cards found.
```

**Visual specification:**
- Container: narrow left-border accent line in gold (`border-left: 2px solid rgba(201, 168, 76, 0.4)`), padding-left 16px
- "You sought clarity on:" — 11px, muted, letter-spacing 0.1em, uppercase
- Intention text — Cormorant Garamond italic, 17px, `color: rgba(201, 168, 76, 0.8)`, line-height 1.5
- "Here is what the cards found." — 11px, muted, letter-spacing 0.1em, italic
- Fade in over 500ms after the synthesis panel container mounts
- Spacing: 32px margin-bottom before the synthesis panel content begins

If no intention was provided (user skipped), this echo block is absent entirely. No placeholder, no "No intention set" text.

---

### 8. Character Counter — Detailed Behavior

The character counter on the intention textarea obeys the following rules:

1. **Below 50 characters:** counter element has `opacity: 0`, `transition: opacity 300ms ease`. Not hidden with `display: none` — it occupies space but is invisible, so layout does not shift when it appears.
2. **At or above 50 characters:** counter element transitions to `opacity: 0.45` over 300ms.
3. **At 250+ characters (10 chars before limit):** counter text color changes to `rgba(201, 168, 76, 0.8)` (amber/gold) as a soft warning.
4. **At 280 characters (limit reached):** counter reads `280/280`, color `rgba(255, 120, 80, 0.7)` (warm red-orange). No hard block, but the textarea `maxLength` prevents further input.
5. The counter fade-in at 50 chars happens exactly once per focus session. If the user deletes back below 50 chars, the counter fades out and re-fades-in when they return to 50. This is the correct behavior — it is not a one-time-ever event.

The 50-character threshold signals attentiveness: the app begins paying closer attention when the user has committed enough words to establish intent. It discourages single-word inputs without a warning, a limit, or a validation error.

---

### 9. Focus-Area Chip Interaction Details

**Chip state model:**
```typescript
type ChipState = {
  selected: FocusArea | null
  userHasTyped: boolean
}
```

**Interaction rules:**
- Tapping a chip when no chip is selected: selects it. If the textarea is empty, the chip label becomes the reading's effective intention.
- Tapping an already-selected chip: deselects it (toggles off).
- Tapping a chip while textarea has content: selects the chip, does not clear textarea. Both values are passed to `onIntentionSet`.
- Tapping "Custom Question": selects the chip AND focuses the textarea immediately.
- The primary CTA is enabled when: `intentionText.trim().length > 0 || selectedChip !== null`.

**Resolving the effective focusArea for the reading:**
```typescript
function resolveEffectiveFocusArea(
  intentionText: string,
  selectedChip: FocusArea | null
): FocusArea {
  if (selectedChip !== null) return selectedChip
  if (intentionText.trim().length > 0) return 'custom-question'
  return 'general'
}
```

The resolved `focusArea` is passed to the engine as a hint for `computeInstantInterpretation` and included in the GPT synthesis payload so the synthesis tone can acknowledge the domain (love, career, growth) even when the specific question text is vague.

---

### 10. Empty State — First-Time User Flow

When `TarotContext.hasDrawnBefore === false` (determined by absence of any saved reading in `TarotContext.savedReadings`):

The intention screen renders with an additional introductory line above the textarea, fading in over 800ms:

```
The cards speak differently to each person.
Before you draw, take a moment.
```

Font: Cormorant Garamond, 16px, `color: rgba(201, 168, 76, 0.5)`, centered, line-height 2. This text is only shown on the first-ever session. It is stored-away after the first skip or first `onIntentionSet` call via `localStorage` flag `tarot_first_time_seen`.

The skip affordance is visually smaller and more muted on first open. Not absent — but not prominent. On subsequent opens, the skip affordance is at standard muted opacity.

---

### 11. Returning User Flow

When `TarotContext.hasDrawnBefore === true`:

- Introductory first-time text is absent.
- The intention screen shows the user's last focus-area chip pre-selected (loaded from `TarotContext.lastFocusArea`). The textarea is empty — no pre-population of prior intention text.
- The hint text below the face-down card (`Tap to reveal`) is suppressed after the `tarot_hint_seen` localStorage flag is set (set on first flip).
- The skip affordance is at standard muted opacity.

---

### 12. Error States

**Draw computation fails** (e.g., engine throws, card data missing):

The `shuffling` state completes its minimum 2000ms duration normally. On transition to `card-selected`, if an error occurred, the single face-down card displays but with a different sub-hint:

```
Something shifted. Tap to draw again.
```

Tapping the errored card triggers a re-draw attempt (calls `drawCards` again with a fresh seed). This re-draw is silent — the deck fan animation plays once more (minimum 1000ms this time, halved for retry UX), then the new card is presented. If the second attempt also fails, an error panel replaces the deck:

```
The cards are resting. Try again in a moment.
```

Small retry button below. No stack trace. No "Something went wrong" — the app speaks its own language even in error.

**Network error during GPT synthesis** (synthesis panel, not the draw ritual):

This is outside the scope of the draw ritual itself but is specified here for completeness of the error-state picture. The `TarotSynthesisPanel` (proposal 5) handles this. The draw ritual itself never depends on network — `drawCards` and `computeInstantInterpretation` are fully local.

---

### 13. Accessibility Considerations for Animations

**Reduced motion (`prefers-reduced-motion: reduce`):**

- Fade-through-black overlays: removed. Content transitions with `opacity: 0 → 1` over 150ms only.
- Deck shuffle fan animation: replaced by a static deck image with a brief pulse (`opacity: 0.6 → 1.0` over 500ms, 3 cycles) to communicate "in progress."
- Card face breathing pulse: removed.
- Card flip (600ms 3D rotation): replaced by an instant face swap — `opacity: 0` on card back, `opacity: 1` on card front, over 200ms. The ritual is preserved; the motion is absent.
- Intention echo fade-in: `opacity: 0 → 1` at 150ms, no delay.

All reduced-motion paths are implemented via `window.matchMedia('(prefers-reduced-motion: reduce)')` read once on component mount, stored in a ref, used to branch the animation paths. The state machine logic is identical; only the animation layer differs.

**Tap targets:**

- Face-down card tap target: minimum 48×48px on mobile (the card itself is larger, but the touch target is explicitly set).
- All chip tap targets: minimum 44px height.
- Skip link: minimum 44px height via padding, even though it appears as a small text link visually.

**Screen reader:**

- When the ritual enters `card-selected` state, an `aria-live="polite"` region announces: `"Your card has been selected. Tap or click the card to reveal it."`
- When `revealed` state is entered, the region announces: `"[Card name] has been revealed."` (using the actual drawn card name).
- The deck shuffle animation has `aria-hidden="true"` during `shuffling` state — the animation is decorative, not informational.
- During `revealing`, the flip animation element has `aria-hidden="true"`.

**Keyboard navigation:**

- In `card-selected` state, the face-down card element receives `focus()` automatically.
- `Enter` or `Space` on the focused card triggers the reveal (same as tap/click).
- `Escape` from any ritual state routes back to `TarotIntentionScreen` with a confirmation step ("Leave the draw?") to prevent accidental exits.

---

### 14. TypeScript Interfaces — Complete Ritual State Shape

```typescript
// src/components/tarot/DeckShuffleAnimation.tsx

type RitualState =
  | 'idle'
  | 'intention-set'
  | 'shuffling'
  | 'card-selected'
  | 'revealing'
  | 'revealed'

interface RitualContext {
  state: RitualState
  intention: string
  focusArea: FocusArea
  readingMode: ReadingMode
  shuffleStartedAt: number | null   // Date.now() when shuffling began
  canAdvanceFromShuffle: boolean    // true when both timer and computation done
  drawnCardIndices: number[]        // indices into the deck; length = cardCount
  currentCardIndex: number          // which card is currently being revealed
  error: RitualError | null
}

type RitualAction =
  | { type: 'START_INTENTION'; intention: string; focusArea: FocusArea }
  | { type: 'BEGIN_SHUFFLE' }
  | { type: 'COMPUTATION_COMPLETE'; cardIndices: number[] }
  | { type: 'SHUFFLE_TIMER_ELAPSED' }
  | { type: 'CARD_READY' }          // both computation and timer done
  | { type: 'USER_FLIP' }
  | { type: 'FLIP_COMPLETE' }
  | { type: 'RETRY' }
  | { type: 'ERROR'; error: RitualError }

type RitualError =
  | { kind: 'draw-failed'; attempts: number }
  | { kind: 'data-missing'; cardId: string }
```

---

### 15. Component File List

New files created by this proposal:

| File | Purpose |
|---|---|
| `src/components/tarot/TarotIntentionScreen.tsx` | First screen: intention textarea, focus-area chips, skip |
| `src/components/tarot/TarotModeSelector.tsx` | Second screen: single / three-card / Celtic Cross |
| `src/components/tarot/DeckShuffleAnimation.tsx` | State machine + visual shuffle + face-down card + flip orchestration |
| `src/components/tarot/RitualFadeOverlay.tsx` | Fade-through-black overlay, reusable, managed by ritual state |

Existing files touched by this proposal:

| File | Change |
|---|---|
| `src/components/tarot/TarotPage.tsx` | Renders `TarotIntentionScreen` first, then `TarotModeSelector`, then passes to reading components |
| `src/context/TarotContext.tsx` | Stores `intention`, `focusArea`, `lastFocusArea`, `hasDrawnBefore`, `ritualState` |

This proposal does NOT touch:
- `src/engine/tarot.ts` (proposal 2)
- `src/components/tarot/CardReveal.tsx` (proposal 3)
- `src/components/tarot/TarotSynthesisPanel.tsx` (proposal 5)
- Any server files

---

## Out of Scope

The following are explicitly excluded from this proposal:

- **Reading content itself** — card meanings, upright/reversed interpretations, numerology resonance, reflection questions. These are the domain of the data layer (proposal 1) and engine (proposal 2).
- **GPT synthesis** — what the synthesis says, how it is structured, how it is streamed. This is proposal 8. The draw ritual delivers the user to the synthesis panel; it does not own synthesis.
- **Subscription gating** — which reading types are free, which require Advanced, when the gate appears. This is proposal 11. The draw ritual defers to `TarotModeSelector` for gating; it does not implement gating logic itself.
- **CardReveal.tsx flip animation** — the flip is orchestrated by `DeckShuffleAnimation.tsx` but the `CardReveal` component's internal flip CSS and card face rendering is proposal 3's domain.
- **Three-card and Celtic Cross sequential reveal pacing** — the per-card ritual passes are orchestrated by `ThreeCardReading.tsx` and `CelticCrossReading.tsx`. This proposal defines the single-pass state machine; the reading-type components invoke it repeatedly in sequence.
- **Discuss ✦** — no Discuss ✦ surface is created or modified by this proposal.
- **Saved readings** — the draw ritual does not save anything. `TarotContext` holds transient ritual state; persistence is proposal 10.

---

## Open Questions

1. **Shuffle animation: canvas vs CSS.** The staggered card-fan effect can be implemented as CSS transforms on three positioned `<div>` elements (three card back renders, staggered animation timing) or as a `<canvas>` draw loop. CSS transforms are the strong default: they are GPU-accelerated, composited, and do not require a render loop. Canvas would only be necessary if the animation requires per-frame physics (e.g., realistic card physics with velocity and friction). Given the spec calls for a "staggered card-fan effect — three cards visible, fanning and collapsing with 100ms stagger" (Jobs voice), CSS transforms are sufficient. Canvas should be considered only if the animation proves insufficiently fluid on low-end Android devices during QA. **Recommendation: start with CSS. Revisit canvas only if CSS performance is demonstrably poor.**

2. **Intention persistence across sessions.** Should the last-entered intention text be pre-populated on returning visits, or should the textarea always start empty? The current spec calls for the last `focusArea` chip to be pre-selected but textarea empty. The rationale: intention text is for this reading, in this moment. Pre-populating old text implies continuity across readings that may not be intended. **Recommendation: chip pre-selected, textarea empty. Revisit if user research suggests otherwise.**

3. **Multi-card ritual: shared vs per-card state machine.** For three-card and Celtic Cross readings, each card pass runs through `card-selected → revealing → revealed`. The question is whether `DeckShuffleAnimation.tsx` resets and re-runs its full state machine per card (including a `intention-set` echo and `shuffling` animation each time), or whether only the `card-selected → revealing → revealed` slice repeats for cards 2–N. **Recommendation: the full shuffle animation runs only for the first card. Cards 2–N enter directly at `card-selected` — the face-down card appears with a 400ms fade-in and the user taps to flip. Re-running the full shuffle for each card in a three-card spread would be exhausting, not ritualistic.** This behavior should be explicitly implemented in the reading-type parent components.

---

*Proposal expanded 2026-05-25. Originated by Jobs (draw state machine, pacing as ritual, sequencing intention before mode selection), Miyazaki (the breath before the flip, user-gated reveal, fade-through-black as visual breath, the sleeping-animal pulse, intention echoed above synthesis, character counter fades in at 50 chars).*
