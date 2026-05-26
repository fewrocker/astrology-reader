# Proposal: Single Card Reading UI

**Type:** Feature
**Slug:** `tarot-single-card-reading`
**Originated by:** Jobs, Carmack, Miyazaki
**Impact:** High
**Effort:** High
**Sprint:** 0023
**Depends on:** `feat-tarot-card-data-layer`, `feat-tarot-engine`, `feat-tarot-card-visual-assets`, `feat-tarot-draw-ritual`

---

## User Guidance

> From `aios/guidelines.md` — Single Card Reading:
>
> *"Fast, elegant, daily-use guidance. The user selects an intention or timeframe, shuffles/draws a card, reveals the card, and receives: instant interpretation, astrology/transit connection, AI synthesis, reflection guidance. Every single-card reading should include: core meaning of the card, upright/reversed interpretation, symbolic emotional meaning, practical guidance, astrology connection, transit connection, numerology resonance, and a reflection question. The experience should feel mystical but modern, emotionally immersive, visually cinematic, psychologically insightful, fast and reliable, personal rather than generic."*

---

## Problem / Opportunity

The app has no Tarot surface at all. The single card reading is the one Tarot format that creates a daily habit — the reading a user does with their morning coffee, the card they carry with them through the day. Without it, the Tarot module has no heartbeat.

Every other Tarot format (three-card spread, Celtic Cross) is a special occasion. The single card is an everyday ritual. It is the reason a user returns tomorrow. If the single card reading is extraordinary, the product has a user for life.

The opportunity is specific: no other Tarot app connects the card to the user's natal chart, current transits, numerology personal day, and advance scoring signals simultaneously. That convergence — this card, your sky, your number, your timing — creates the shock of recognition that no generic Tarot app can produce. That is what this feature delivers.

---

## Vision

The card lands, the sky speaks — a clean reading that feels personal and complete.

The user draws a card. The interpretation is so precise, so tuned to who they are and what moment they are living through, that they feel seen. The Hermit during Mercury retrograde and Saturn transits does not say "withdrawal and introspection" in the same flat voice it uses every other day. It leans forward. The sky has inflected the card's meaning, and the reading knows it. The user's personal day number is a 7 — the same as the card. The reading notices this too. Nothing is generic. Everything is theirs.

This is not a card catalog with an AI footer. It is a symbolic encounter between one person and their sky.

---

## Specifications

### 1. `SingleCardReading.tsx` — Layout Structure and Component Hierarchy

**File:** `src/components/tarot/SingleCardReading.tsx`

**Props interface:**

```typescript
interface SingleCardReadingProps {
  card: TarotCard
  reversed: boolean
  interpretation: InstantInterpretation
  personalDay: number
  onBack: () => void
  onSave: () => void
  onDiscuss: () => void
}
```

**Layout — mobile-first vertical scroll, `max-w-2xl mx-auto px-4 pb-24`:**

```
← Back                              [Save]

[CardReveal — centered, full revealed state]

Card Name (Cormorant Garamond, large)
Arcana / Suit / Number row

[TarotInterpretationPanel]
  1. Core meaning
  2. Symbolic / emotional
  3. Practical guidance
  4. In Your Sky Now (AstroConnection)
  5. Numerology resonance (with card number display)
  6. Reflection question

[TarotSynthesisPanel]
  (loading | success | unavailable | rate-limited)

[✦ Discuss button — sticky bottom or inline below synthesis]
```

**Component hierarchy:**

```
SingleCardReading
├── BackButton + SaveButton (flex row, space-between)
├── CardReveal (reversed={reversed}, revealed={true}, card={card})
├── CardIdentity (name, arcana label, number glyph)
├── TarotInterpretationPanel (interpretation, personalDay, card)
└── TarotSynthesisPanel (card, reversed, interpretation, onDiscuss)
```

The `CardReveal` component is passed `revealed={true}` — the flip animation has already completed before `SingleCardReading` mounts. The draw ritual (`DeckShuffleAnimation.tsx`) handles the unrevealed state; by the time this component appears, the card is face-up and the animation is at rest.

---

### 2. Card Display — CardReveal at Top

The `CardReveal` component sits at the top of the reading surface, centered, as the primary visual anchor. On mobile it occupies approximately 40% of the viewport height. On desktop it sits left-centered with interpretation content flowing alongside it on wide viewports (>= 768px: card pinned left, content scrolls right in a two-column layout).

Reversed state: `CardReveal` receives `reversed={true}`, which applies `transform: rotate(-4deg)` to the card face — a tilt communicating "off-axis" without clinical badge labeling. The interpretation panel does not say "Reversed" anywhere. It presents the reversed meaning as the reading, without announcing its orientation. Let the tilt speak.

Card back: already flipped in by `DeckShuffleAnimation`. The `CardReveal` mounting here is in the `revealed` state — no animation fires on mount unless the component detects a fresh draw from `TarotContext`.

---

### 3. Card Name, Arcana/Suit, and Number Rendering

**Card Identity block** — sits between `CardReveal` and `TarotInterpretationPanel`:

```
[The Hermit]                      ← Cormorant Garamond, 2rem, gold #c9a84c, text-center
[Major Arcana  ·  IX]             ← Inter, 0.75rem, mystic-muted, uppercase tracking-widest
```

For Minor Arcana, the sub-line reads: `[Suit of Swords  ·  Three]`

The card name is always in title case: "The Hermit", "Three of Swords", "The High Priestess". Never all-caps. Cormorant Garamond's small caps weight may be used for the arcana line only.

---

### 4. `TarotInterpretationPanel.tsx` — Section Structure

**File:** `src/components/tarot/TarotInterpretationPanel.tsx`

**Props:**

```typescript
interface TarotInterpretationPanelProps {
  interpretation: InstantInterpretation
  card: TarotCard
  personalDay: number
}
```

The panel is a vertical stack of labeled sections. Each section uses the same container treatment as existing reading sections: `border border-mystic-gold/20 rounded-xl bg-mystic-surface/50 p-6 mb-4`. Section headers use Inter, `text-xs uppercase tracking-widest text-mystic-muted mb-3`.

---

#### 4.1 Core Meaning (Section 1)

**Header:** `Core Meaning`

Displays `interpretation.coreMeaning` — either `card.uprightMeaning` or `card.reversedMeaning` depending on the draw. This is the foundational 1–2 sentence reading of the card.

Typography: Inter, `text-sm text-mystic-text/90 leading-relaxed`.

No label of "Upright" or "Reversed" appears. If the card is reversed, the reversed meaning is simply what appears here. The tilt on the card has already communicated the orientation.

---

#### 4.2 Symbolic / Emotional Meaning (Section 2)

**Header:** `What It Carries`

Displays `interpretation.symbolicTheme` (one evocative phrase, displayed in Cormorant Garamond italic, `text-lg text-mystic-gold/80`) followed by `interpretation.emotionalMeaning` (one sentence, Inter body text).

The symbolic theme renders as a pull-quote: larger, indented, set apart from the body text. It is the image at the center of the card's feeling, expressed in language.

---

#### 4.3 Practical Guidance (Section 3)

**Header:** `Today's Invitation`

Displays `interpretation.practicalGuidance` — one sentence answering "what to do with this."

Typography: Inter, `text-sm text-mystic-text/90 leading-relaxed`. No bullet points. A direct address in the second person ("Consider...", "Notice...", "Allow yourself to...").

---

#### 4.4 "In Your Sky Now" — AstroConnection Section (Section 4)

**Header:** `In Your Sky Now`

This section is the differentiator. It receives its own visual treatment to mark it as a different register from the card's inherent meaning: personal, sky-specific, alive to this moment.

**Section container:** same border/background as other sections, but with a subtle left border accent: `border-l-2 border-l-mystic-gold/40` in addition to the standard border.

**Rendering structure:**

```
[In Your Sky Now]                    ← section header, same style as others

[AstroConnection.headline]           ← Cormorant Garamond italic, 1.125rem,
                                       text-mystic-gold, mb-3
                                       one sentence, max 20 words

[transit note 1]                     ← Inter, text-sm, text-mystic-text/80
[transit note 2]                     ← (1–2 transit notes max, each max 20 words)

[lunarNote]                          ← if present: Inter, text-sm, text-mystic-muted/80,
                                       mt-2, preceding moon phase glyph
```

The `AstroConnection.headline` is the sentence that earns the section its name. It is the reading's most personal line: the one sentence that could only have been written for this user, this card, this sky. It renders in Cormorant Garamond italic, gold, undeniable, not buried.

Example headlines (not copy — illustrative of voice and length):
- *"Mercury retrograde amplifies The Hermit's counsel: retreat now, speak later."*
- *"Saturn in your fourth house deepens this card's call to solitary foundations."*
- *"Your natal Venus in Scorpio resonates with The Star's vulnerable offering."*

If `interpretation.astroConnection.transitInfluence` is null (no relevant transit found), this section renders the `resonanceNote` alone (card element vs. natal dominant element) with no headline. The section remains visible — it never disappears — but its content degrades gracefully to the element-affinity layer.

If `chartData` is null (birth data not entered), the section renders a dim message: *"Enter your birth data to see your sky connection."* — same treatment as the Sky Highlights empty state in `TodayPage.tsx`.

---

#### 4.5 Numerology Resonance (Section 5)

**Header:** `Number`

This section uses the same large-number architectural treatment as the Personal Day display in `TodayPage.tsx`:

```tsx
// TodayPage.tsx reference pattern — Personal Day number
<div
  className="font-heading mb-3 leading-none"
  style={{ fontSize: 'clamp(4rem, 15vw, 7rem)', color: '#c9a84c' }}
>
  {personalDayNum}
</div>
```

The card's number renders identically — large, gold, Cormorant Garamond, architectural. For Major Arcana, this is 0–21. For Minor Arcana court cards (Page=11, Knight=12, Queen=13, King=14), the number is shown but a Roman numeral or word equivalent may be preferred for readability.

Below the large number: `interpretation.numerologyNote` — Inter, `text-sm text-mystic-text/80 leading-relaxed`.

**Personal Day Match Note:**

If `card.number === personalDay`, a small note appears below the numerology text:

```
Your personal day is also a {personalDay}.
```

Styling: `text-xs text-mystic-gold/70 mt-2 italic font-heading` — subtle, warm, intimate. Not bold or announced. The user who notices it feels the system is paying attention. The user who misses it loses nothing.

The condition for this note is exact numeric equality only. No fuzzy matching, no "related numbers" — if the card is a 7 and today is a personal day 7, the note appears. Otherwise it does not.

---

#### 4.6 Reflection Question (Section 6)

**Header:** `Sit With This`

Displays `interpretation.reflectionQuestion` — the contemplation prompt for the card.

Typography: Cormorant Garamond italic, `text-lg text-mystic-text/90 leading-relaxed`. Displayed as a standalone question with no surrounding prose. The question takes up the full width of the section container. It is the last word of the interpretation panel: the door the user walks through alone.

No "?" badge, no icon. The question mark at the end of the sentence is sufficient punctuation for a sacred prompt.

---

### 5. Typography — Global Rules for This Component

| Element | Font | Size | Color | Weight |
|---|---|---|---|---|
| Card name | Cormorant Garamond | 2rem | `#c9a84c` | Regular (or small caps) |
| Section headers | Inter | 0.75rem | `text-mystic-muted` | Uppercase, tracked |
| Astro headline | Cormorant Garamond italic | 1.125rem | `#c9a84c` | Italic |
| Symbolic theme phrase | Cormorant Garamond italic | 1.125rem | `#c9a84c` opacity 80% | Italic |
| Card number | Cormorant Garamond | `clamp(4rem,15vw,7rem)` | `#c9a84c` | Regular |
| Reflection question | Cormorant Garamond italic | 1.125rem | `text-mystic-text/90` | Italic |
| Body text (all sections) | Inter | 0.875rem | `text-mystic-text/90` | Regular |
| Dim / secondary text | Inter | 0.75rem | `text-mystic-muted/70` | Regular |

The Cormorant Garamond / Inter pairing follows the existing app convention: Cormorant Garamond for headings, personal numbers, and interpretive headlines; Inter for all body text, labels, and functional UI elements.

---

### 6. Card Number — Architectural Treatment

The card number display in Section 5 is the visual centerpiece of the numerology section. It borrows directly from the Personal Day number in `TodayPage.tsx`:

- `font-heading` (resolves to Cormorant Garamond via Tailwind config)
- `style={{ fontSize: 'clamp(4rem, 15vw, 7rem)', color: '#c9a84c' }}`
- `leading-none` — no line-height interference
- `text-center` — centered within its section
- `mb-3` — gap before the numerology note text

This visual language creates an implicit connection between the Tarot module and the Numerology module. A user who recognizes the Personal Day number display from `TodayPage.tsx` will feel the Tarot section as continuous with it — part of the same symbolic system, not a new product.

For The Fool (card number 0): render `0` in the same style. Zero is not absent — it is the beginning, before beginning, and deserves its architectural presence.

---

### 7. Personal Day Match Logic

In `SingleCardReading.tsx`, compute the match condition before rendering:

```typescript
const personalDayMatchesCard = card.number === personalDay
```

Pass `personalDayMatchesCard` as a prop into `TarotInterpretationPanel`:

```typescript
interface TarotInterpretationPanelProps {
  interpretation: InstantInterpretation
  card: TarotCard
  personalDay: number
  personalDayMatchesCard: boolean  // true when card.number === personalDay
}
```

The match note is rendered inside the Numerology section (4.5 above), not as a floating banner. It belongs to the numerology context, not to the page header.

Minor Arcana court cards: Page=11 (does not match any personal day, which ranges 1–9 or 11); Knight=12; Queen=13; King=14. The personal day number ranges from 1–9, 11 (master number), or 22 (master number). Court card matches are possible for 11 (Page) and technically 22 (the King in some systems, though the King is 14 in Carmack's interface definition). The implementation should use `card.number === personalDay` literally and not attempt to map master numbers to court cards — that complexity is outside scope.

---

### 8. `TarotSynthesisPanel.tsx` — Four States

**File:** `src/components/tarot/TarotSynthesisPanel.tsx`

**Props:**

```typescript
interface TarotSynthesisPanelProps {
  card: TarotCard
  reversed: boolean
  interpretation: InstantInterpretation
  userIntention: string | null
  onDiscuss: () => void
}
```

The panel manages its own GPT call lifecycle. On mount, it fires the synthesis request via `callProxy('tarot-single-synthesis', payload)`. It does not accept a pre-loaded synthesis prop — it owns its state.

**Internal state:**

```typescript
type SynthesisState = 'loading' | 'success' | 'unavailable' | 'rate-limited'

const [state, setState] = useState<SynthesisState>('loading')
const [text, setText] = useState<string | null>(null)
```

---

#### 8.1 State: Loading

Renders a `GptSkeleton` (the existing shimmer component from `src/components/ui/GptSkeleton.tsx`) with one of three warm loading copy variants cycling based on the elapsed time or selected randomly on mount:

**Loading copy variants (select one at random on mount):**

1. `"Reading today's sky for you..."` — default, period-neutral
2. `"The card and the sky are being read together..."` — period-aware (for daily readings)
3. `"Tracing the card's meaning through your chart..."` — more personal

The loading copy appears above or within the skeleton shimmer, in the same style as `GptSkeleton`'s existing label pattern: `text-xs text-mystic-muted italic`.

No spinner. No progress indicator. The skeleton shimmer communicates that something is being prepared.

Minimum loading display: if the GPT call resolves in under 1 second, hold the skeleton for at least 1 second before transitioning to success. The reading should not feel like a database lookup.

---

#### 8.2 State: Success

Renders the GPT synthesis text as flowing paragraphs, split on `\n` and filtered for empty lines — the same rendering pattern used in `TransitInterpretation` in `TransitReadingPage.tsx`:

```tsx
const paragraphs = text.split('\n').filter(p => p.trim().length > 0)
return (
  <div className="space-y-4">
    {paragraphs.map((p, i) => (
      <p key={i} className="text-mystic-text/90 leading-relaxed text-sm">{p}</p>
    ))}
  </div>
)
```

The section is preceded by a thin threshold line with a centered ✦ glyph:

```tsx
<div className="flex items-center gap-3 my-6">
  <div className="flex-1 h-px bg-mystic-gold/20" />
  <span className="text-mystic-gold/40 text-xs">✦</span>
  <div className="flex-1 h-px bg-mystic-gold/20" />
</div>
```

This threshold marks the boundary between the instant AI-free interpretation (which is always present) and the GPT synthesis layer (which enriches it). The visual separation communicates that these are two different kinds of knowing.

Below the synthesis text, the Discuss ✦ button (see Section 9).

---

#### 8.3 State: Unavailable

GPT failed — timeout, network error, server error. The panel does not show an error state. It shows the AI-free interpretation as complete and sufficient, with a quiet retry affordance.

**Unavailable copy:**

```
The synthesis is resting. The instant interpretation above is complete.
```

Rendered as: `text-sm text-mystic-muted/70 italic leading-relaxed`

Below this, a small retry link: `text-xs text-mystic-gold/50 hover:text-mystic-gold transition-colors cursor-pointer` — "Try again" — which re-fires the GPT call and returns to the loading state.

The reading is not broken. One layer is absent. The copy communicates this distinction. "Resting" is chosen deliberately over "unavailable" or "failed" — it is warmer, less clinical, and more consistent with the app's voice.

No broken spinner. No error icon. No stack trace. The Discuss ✦ button is still shown in the unavailable state, because the user can still chat with full context even without the GPT synthesis having loaded first.

---

#### 8.4 State: Rate-Limited

The user has exceeded their synthesis limit for the current period. The panel opens the `UpgradeModal` immediately on detecting a 429 response from the server, using the existing `UpgradeModal` trigger pattern.

**Rate-limited inline copy** (shown while the modal is closed, if the user dismisses it):

```
You've reached today's synthesis limit.
```

Below: an "Upgrade" link that re-opens the `UpgradeModal`.

The `UpgradeModal` copy for this context uses Tarot-specific language distinct from the transit-gate copy. The modal itself is the existing `UpgradeModal.tsx` component — the copy customization is passed as a prop or handled by the modal's context detection.

The Discuss ✦ button does not appear in the rate-limited state for the synthesis panel — but a separate "Discuss ✦" affordance at reduced access may appear depending on the subscription gate logic (out of scope for this proposal; see `feat-tarot-subscription-gate`).

---

### 9. Discuss ✦ Button — Placement and Behavior

The Discuss ✦ button appears at the bottom of `TarotSynthesisPanel` in the `success` and `unavailable` states. It is the same visual language as Discuss ✦ buttons elsewhere in the app — `font-heading text-mystic-gold text-sm` with a subtle border, possibly a small ✦ glyph preceding the label.

**Placement:** inline, below the synthesis text (or below the unavailable copy). Not sticky-bottom on mobile — the reading surface should scroll to its natural end before the button appears. The user should reach the Discuss ✦ button through reading, not through skipping.

**Behavior on tap:**

Opens `TarotDiscussModal.tsx` with the full reading context:

```typescript
interface TarotDiscussContext {
  userIntention: string | null      // at the very top, before card list
  card: TarotCard
  reversed: boolean
  interpretation: InstantInterpretation
  gpsSynthesisText: string | null   // null if synthesis unavailable
  natalContext: NatalContextSummary // Big Three + houses
  transitSummary: TransitSummary    // current top transits
  numerologyDay: number
  advanceCategory: string | null
}
```

Per Miyazaki's guidance: the user's stated intention (`userIntention`) is passed at the very top of the context payload — not buried in a field — because it qualitatively changes how the AI interprets the reading. A user who asked "should I leave my job?" needs a different symbolic interpreter than a user who drew the same card with no intention set.

The `TarotDiscussModal` is out of scope for this proposal but the context shape it expects is defined here to ensure `SingleCardReading.tsx` passes it correctly.

---

### 10. Save Reading Button

**Placement:** top-right of the page, in the same row as the Back button. Styled as a quiet secondary action: `text-xs text-mystic-muted hover:text-mystic-gold transition-colors font-heading uppercase tracking-widest`.

**Behavior:**

Calls `onSave()` prop, which is handled by `TarotContext` to persist the reading via `POST /api/readings`. On success, shows a brief inline confirmation: `"Saved"` replacing the button text for 2 seconds, then restoring. No modal, no toast. The save is quiet.

**Subscription gate:** If the user is on the free tier, the save button triggers the `UpgradeModal` instead of saving. This is handled by the `onSave` prop implementation in `TarotPage.tsx`, not inside `SingleCardReading.tsx`. The component is gate-agnostic — it calls `onSave()` and trusts the parent to handle tier logic.

If saving fails (network error), the button restores to "Save" with no visual error state — the user can attempt again. A silent failure on a secondary action is acceptable.

---

### 11. Navigation — Back Button Behavior

**Placement:** top-left, same row as Save.

**Label:** `← Back`

**Styling:** `text-sm text-mystic-muted hover:text-mystic-gold transition-colors font-heading` — identical to the Back button in `TodayPage.tsx`.

**Behavior:** calls `onBack()` prop. In `TarotPage.tsx`, `onBack()` returns the user to the intention-setting / mode-selection screen within the Tarot module — not to the Home screen. The user remains in the Tarot module. Pressing Back from the mode-selection screen returns to the Home screen.

If a GPT synthesis call is in progress when Back is pressed: cancel the request using the AbortController pattern established in other components (see `code-abort-controller-numerology-gpt`). Do not leave orphaned requests.

---

### 12. Empty and Error States for Each Section

Each section of `TarotInterpretationPanel` must render something meaningful even in degraded conditions. "Something meaningful" means: the section remains visible and says something true, not an error message.

| Section | Missing data condition | Fallback rendering |
|---|---|---|
| Core meaning | `coreMeaning` empty | Show `card.uprightMeaning` directly from card data (always non-empty per completeness assertion in `cards.completeness.test.ts`) |
| Symbolic/emotional | `symbolicTheme` empty | Omit the italic phrase, show `emotionalMeaning` only |
| Practical guidance | `practicalGuidance` empty | Omit section silently (do not show "Not available") |
| In Your Sky Now | No transit data | Show element resonance note only; `chartData` null: show "Enter your birth data..." |
| Numerology | `numerologyNote` empty | Show the large number only, omit the text below |
| Reflection question | `reflectionQuestion` empty | Omit section silently |

The rule: never show an error message inside a reading section. Either show something true, or show nothing. The reading is not broken because one field is missing; it is simply less complete.

---

### 13. Responsive Layout — Mobile-First

**Mobile (< 768px):**

Full-width vertical scroll. The `CardReveal` component occupies `max-h-[45vh]` to ensure it fits above the fold without crowding the interpretation content. Card is centered horizontally.

Sections stack vertically, full width, separated by `mb-4`.

The Save button in the header row is reduced to an icon only on very small screens (< 380px) — a bookmark glyph or floppy disk glyph — to prevent the header row from crowding. The Back label and icon remain as text.

Touch targets: the Discuss ✦ button and the Save button must meet 44px minimum touch target height on mobile.

**Tablet and desktop (>= 768px):**

Two-column layout: `CardReveal` pinned to the left column (approximately 280px wide, sticky within scroll), `TarotInterpretationPanel` and `TarotSynthesisPanel` in the right column (remaining width). The card stays in view as the user scrolls through the interpretation.

On very wide viewports (>= 1024px): add inner padding to constrain the reading content to `max-w-2xl` within the right column — the same max-width constraint as all other reading surfaces.

---

### 14. GPT Synthesis Loading Copy — Three Variants

The three loading copy strings live in `TarotSynthesisPanel.tsx` as a constant:

```typescript
const SYNTHESIS_LOADING_VARIANTS = [
  "Reading today's sky for you...",
  "The card and the sky are being read together...",
  "Tracing the card's meaning through your chart...",
]
```

Selection: `SYNTHESIS_LOADING_VARIANTS[Math.floor(Math.random() * 3)]` on component mount. Store in a `useRef` so it does not change on re-render.

**Period-aware selection (optional enhancement):** If the reading intention includes a temporal signal ("weekly", "monthly"), prefer variant 2. For daily readings, prefer variant 1 or 3. This selection logic is a minor enhancement and may be simplified to random selection for v1.

The loading copy is displayed as a subtitle within or above the `GptSkeleton` shimmer, not as a separate component. If `GptSkeleton` does not support a `label` prop, add one: `label?: string` displayed in `text-xs text-mystic-muted italic` above the shimmer rows.

---

## Out of Scope

- **GPT prompt content** — the exact system prompt, user prompt template, and token budget for `tarot-single-synthesis` are specified in `feat-tarot-gpt-synthesis`. This proposal specifies the payload shape and state machine only.
- **Subscription logic details** — the exact tier limits, the `tarot_usage` table schema, and the `UpgradeModal` copy variants are specified in `feat-tarot-subscription-gate`. This proposal specifies the trigger points and expected behavior only.
- **TarotDiscussModal internals** — the chat UI, message threading, and context serialization for Discuss ✦ are specified in `feat-tarot-gpt-synthesis`. This proposal specifies the context shape and trigger only.
- **Draw ritual and card reveal animation** — the flip animation, shuffle state machine, and intention-setting UI are specified in `feat-tarot-draw-ritual` and `feat-tarot-card-visual-assets`. By the time `SingleCardReading` mounts, these are complete.
- **Saved readings persistence and list view** — specified in `feat-tarot-saved-readings`.

---

## Open Questions

**Q1: Does the AI-free interpretation appear alongside the GPT synthesis, or is it replaced by it?**

The current draft assumes: the AI-free `TarotInterpretationPanel` is always visible, always complete, always primary. The `TarotSynthesisPanel` is an additive layer — it enriches rather than replaces. The threshold line (the ✦ divider) marks the boundary.

This means the user always has a full reading regardless of GPT status. The GPT synthesis is a depth layer, not the reading itself.

The alternative — GPT synthesis replaces sections of the AI-free panel when loaded — would require re-rendering existing sections and risks creating layout shift. It also blurs the clear boundary between instant and enriched content that makes the "unavailable" state graceful.

**Recommended resolution:** additive model. The AI-free panel is permanent and complete. The synthesis panel is below it, separated by the threshold line. The synthesis adds a different kind of knowing — integrative, narrative, conversational — rather than re-explaining what the sections above already said.

**Q2: Should the ✦ Discuss button be sticky-bottom on mobile?**

A sticky-bottom Discuss ✦ button increases its discoverability and reduces scroll-to-reach friction. However, it competes with the reading content on small screens and can feel pushy — the reading becomes subordinate to a CTA.

**Recommended resolution:** not sticky for v1. The button lives at the natural end of the content. If analytics show low Discuss ✦ engagement, revisit. The reading earns the interaction; the button should not demand it.

**Q3: Should the card element shift the background color temperature?**

Miyazaki proposes: Fire cards shift background slightly warmer, Water cards slightly cooler — subliminal, not dramatic. This is a compelling detail but requires coordinating a CSS variable or inline style at the `SingleCardReading` level, applied to the page background rather than the card itself.

**Recommended resolution:** yes, implement as `style={{ '--bg-tint': card.element === 'Fire' ? 'rgba(255,120,0,0.03)' : card.element === 'Water' ? 'rgba(0,80,180,0.03)' : 'transparent' }}` on the root container, applied to a subtle background gradient overlay. The amplitude is intentionally imperceptible to conscious attention. If it creates rendering complexity, defer to v2 without affecting any other feature.

---

## Implementation Notes

**Files to create:**
- `src/components/tarot/SingleCardReading.tsx`
- `src/components/tarot/TarotInterpretationPanel.tsx`
- `src/components/tarot/TarotSynthesisPanel.tsx`

**Files to modify:**
- `src/components/tarot/TarotPage.tsx` — renders `SingleCardReading` after draw is complete, passes `onBack`, `onSave`, `onDiscuss`
- `src/context/TarotContext.tsx` — provides `card`, `reversed`, `interpretation`, `personalDay`, `userIntention` via context; handles save action
- `src/components/ui/GptSkeleton.tsx` — add `label?: string` prop if not already present

**Dependencies (must exist before this component is buildable end-to-end):**
1. `TarotCard` type and card data from `src/data/tarot/cards.ts`
2. `InstantInterpretation` and `AstroConnection` interfaces from `src/engine/tarot.ts`
3. `TarotContext` from `src/context/TarotContext.tsx`
4. `CardReveal.tsx` with `reversed` prop and `revealed` state
5. `callProxy('tarot-single-synthesis', ...)` handler registered in `server/services/gpt.ts`

**Does not block and is not blocked by:**
- `ThreeCardReading.tsx` and `CelticCrossReading.tsx` — the interpretation and synthesis panel patterns established here are referenced by those proposals but do not depend on them
