# Proposal: Tarot Card Visual Assets and Reveal Component

- **Slug:** `tarot-card-visual-assets`
- **Type:** Feature
- **Filename:** `feat-tarot-card-visual-assets.md`
- **Originated by:** Jobs, Carmack, Miyazaki, Taleb
- **Sprint:** 0023
- **Status:** Active

---

## User Guidance

From `guidelines.md` — Visual & Emotional Direction:

> The Tarot module should feel: **Elegant. Dark. Cosmic. Dreamlike. Fluid. Emotional. Premium.**
>
> Visual Goals: Beautiful custom tarot cards. Rounded modern aesthetic. Deep gradients. Gold/silver glow accents. Animated decks. Smooth card flips. Atmospheric transitions. Ritual-like pacing. Mobile-first tactile interaction.
>
> The cards themselves should feel collectible and iconic.

This proposal specifies precisely how those directives translate into component architecture, CSS properties, animation keyframes, and typographic decisions.

---

## Problem / Opportunity

No card visual system exists in the codebase. The Tarot module has no `src/components/tarot/` directory, no card face specification, no flip animation, and no shared reveal component. Without these, there is nothing to reveal — the most emotionally charged moment in the entire experience cannot occur.

The card reveal is not a nice-to-have. It is the axis around which the ritual turns. Every voice agrees on this: Jobs names it as one of three signature moments the product cannot compromise on. Miyazaki identifies "the moment between intention and revelation" as where Tarot lives. The quality of this moment determines whether the app feels profound or feels like a toy.

Additionally, the visual asset decision has been left open in the sprint vision as an unresolved risk. Taleb flags it as the highest schedule risk in the entire module — mishandling it produces either a legal dispute (Rider-Waite reproduction copyright), a scope explosion (custom SVG art for 78 cards), or a placeholder artifact that ships against the sprint's own stated quality bar ("not an experience without visual identity"). This proposal resolves that decision permanently and specifies the complete implementation path.

---

## Vision

Cards feel collectible, iconic, and beautiful. The flip is a ritual act, not a state change. A face-down card breathes — it is alive and waiting. The moment the card face emerges, something feels revealed rather than loaded. A reversed card communicates "off-axis" through posture, not a clinical badge. The element of the card inflects the room it inhabits: fire warms, water cools. The whole system uses the existing design language — charcoal, gold, Cormorant Garamond — but deepens it into something that feels native to Tarot specifically. Nothing looks imported.

The implementation is the v1 visual standard, not a placeholder. It ships designed.

---

## Specifications

### 1. Visual Asset Decision: CSS Symbolic Cards for v1

**Decision: option (c) — CSS symbolic cards with rich treatment — is the v1 visual standard.**

Rationale:

- **Legal safety.** Rider-Waite scans (option b) carry jurisdiction-specific copyright risk. The original 1910 printing is in the US public domain, but colorized versions, digitized versions, and "Rider-Waite-Smith" reproductions with any modifications may carry copyright. Using images sourced from the internet without per-file license verification is an unacceptable business risk for a production app. A DMCA notice post-launch is worse than shipping option (c).
- **Scope control.** Full custom SVG card art for 78 cards (option a) is a design project of weeks, not a sprint task. It blocks the module from shipping and produces unbounded scope.
- **Design control.** CSS symbolic cards allow the visual language to be exactly calibrated to the existing app aesthetic: the right gold, the right charcoal, the right Cormorant Garamond weight. Third-party art cannot be tuned this way.
- **Iterability.** CSS cards render at any resolution, load instantly (no asset pipeline), and can be updated without file replacements. The `imageUrl?: string` prop specified below allows future art injection without a component rewrite.

This is not a concession. Miyazaki's principle: a specific symbol — even a simple one — tells the user "someone thought about this one." A deeply art-directed CSS card with a meaningful glyph, gold typography in Cormorant Garamond, and a warm ivory face is closer to a Tarot card than a hastily optimized JPEG of the 1910 scan.

**Future path:** When custom illustrated card art is commissioned as a deliberate design project (not under sprint pressure), it is injected via `imageUrl` on the `TarotCard` component and the CSS symbolic face is suppressed. No component rewrite required.

---

### 2. `TarotCard.tsx` — Visual Component

**File path:** `src/components/tarot/TarotCard.tsx`

This is the visual card rendering component. It renders either the card face or the card back, and accepts a future `imageUrl` for art injection.

**Props interface:**

```typescript
interface TarotCardProps {
  card: TarotCard                  // from src/data/tarot/cards.ts
  face: 'up' | 'down'             // which face to render
  reversed?: boolean               // applies rotate(-4deg) tilt on face-up
  imageUrl?: string                // future: custom art URL; suppresses CSS symbolic face
  size?: 'sm' | 'md' | 'lg'      // 'md' is default
  glowOnReveal?: boolean          // enables inner glow animation on mount
  'aria-label'?: string           // accessibility override
}
```

**Size constants (aspect ratio 2:3.5, matching standard tarot dimensions):**

| Size | Width  | Height |
|------|--------|--------|
| `sm` | 80px   | 140px  |
| `md` | 120px  | 210px  |
| `lg` | 160px  | 280px  |

These values are set as CSS custom properties (`--card-w`, `--card-h`) on the root element so responsive overrides are localized.

**Component behavior:**

- When `face === 'down'`: renders the card back design (see §4). Does not render card identity.
- When `face === 'up'` and `imageUrl` is provided: renders `<img src={imageUrl} />` filling the card face. CSS symbolic content is not rendered.
- When `face === 'up'` and no `imageUrl`: renders the CSS symbolic card face (see §3).
- When `reversed === true` and `face === 'up'`: the `rotate(-4deg)` tilt is applied to the outer wrapper via inline style or a `data-reversed` CSS attribute selector. The tilt is baked into the card wrapper, not the flip animation transform — these are independent transforms.
- `aria-label` defaults to `"${card.name}${reversed ? ', reversed' : ''}"` if not overridden.

---

### 3. Card Face Design

The card face is the CSS symbolic implementation. It must feel designed, not placeholder.

**Structure per arcana type:**

**Major Arcana cards:**

```
┌─────────────────────────────────┐
│  roman numeral (top left, sm)   │
│                                 │
│         [SVG symbol]            │  ← centered, ~48px, gold stroke
│       (distinctive per card)    │
│                                 │
│   CARD NAME (bottom center)     │  ← Cormorant Garamond small caps, gold
└─────────────────────────────────┘
```

- Background: warm ivory `#f5f0e8` with a very subtle radial gradient darkening at the four corners (vignette). Not white — ivory communicates "aged paper" and feels premium.
- Border: 1px `#c9a84c` at 40% opacity. Rounded corners matching the app's border-radius convention (`rounded-xl`, 12px).
- Roman numeral: top-left, 10px, Cormorant Garamond italic, `#b8b8c0` (silver). The Fool is `0`, not labeled with a numeral (The Fool sits outside the numbered sequence).
- SVG symbol: centered vertically in the upper two-thirds of the card. Size ~48px × 48px. Stroke color `#c9a84c` (gold), stroke-width 1.5, fill none. Each Major Arcana card has one distinctive symbol (see §3a below).
- Card name: bottom-center, Cormorant Garamond small caps, 11px, letter-spacing 0.12em, `#c9a84c`. Text is not all-caps (`THE TOWER`) — it is "The Tower" rendered in CSS small-caps (`font-variant: small-caps`). The card name is spoken with dignity, not announced as a warning.

**Minor Arcana cards:**

```
┌─────────────────────────────────┐
│  pip count (top left, sm)       │
│                                 │
│      [suit symbol × count]      │  ← arranged in traditional pip grid
│   (max ~5 visible, then glyph)  │
│                                 │
│  SUIT NAME · CARD NAME (bottom) │
└─────────────────────────────────┘
```

- Background: warm ivory `#f5f0e8` with a very faint element-colored tint applied at 4% opacity (Fire=`#e8603c`, Water=`#4a90d9`, Air=`#b0c8e0`, Earth=`#8a6f3c`). Subliminal — not a colored card, just a warmth.
- Pip count: top-left, `#b8b8c0` (silver), 10px, Cormorant Garamond.
- Suit symbol: the primary visual element. For Ace through 7, suit symbols are arranged in the traditional pip grid pattern (Ace: single centered; Two: top+bottom; Three: two top + one bottom; etc.). For Eight through Ten and Court cards, one large suit symbol is centered with the count displayed. SVG symbols per suit:
  - Wands: a stylized flame-tipped rod `🜂`-inspired shape
  - Cups: an elegant goblet/chalice outline
  - Swords: a single-edged blade pointing upward
  - Pentacles: a five-pointed star within a circle (pentacle)
- Court cards (Page, Knight, Queen, King): single large suit symbol centered, with the court title (Page / Knight / Queen / King) rendered above the card name in 9px silver Cormorant Garamond italic.
- Card name: bottom-center in same treatment as Major Arcana (small caps, gold, Cormorant Garamond, 11px).

**§3a — SVG Symbol Specifications Per Major Arcana (v1 set):**

These are single, distinctive symbols chosen for immediate recognizability within the constraints of a 48px SVG. Each is a line-art glyph, not an illustration.

| Card | Number | Symbol |
|------|--------|--------|
| The Fool | 0 | A single step over an edge: horizontal line with a circle above and a downward-pointing foot |
| The Magician | I | An infinity lemniscate (∞) above a wand pointed upward |
| The High Priestess | II | Two vertical pillars with a crescent moon between them |
| The Empress | III | A Venus symbol (♀) with a wheat sheaf beneath |
| The Emperor | IV | A ram's-head throne silhouette (simplified triangle on cube) |
| The Hierophant | V | A triple-tiered crown with two crossed keys below |
| The Lovers | VI | Two figures (circles) under a radiant angel wing arc |
| The Chariot | VII | A crowned helm above two sphinx silhouettes facing opposite directions |
| Strength | VIII | A woman's hands around a lion's open jaw (simplified arc with claws) |
| The Hermit | IX | A robed figure (simplified) holding a lantern aloft |
| Wheel of Fortune | X | A wheel with eight spokes and the letters T-A-R-O at cardinal points |
| Justice | XI | A balanced scale (⚖) with a raised sword |
| The Hanged Man | XII | A figure suspended from one foot from a horizontal bar |
| Death | XIII | A single scythe on a horizon line with a rising sun behind it |
| Temperance | XIV | Two cups pouring into each other, arcing streams crossing |
| The Devil | XV | Baphomet's head silhouette (inverted pentagram above two chained figures) |
| The Tower | XVI | A tower struck by a lightning bolt, with a falling crown |
| The Star | XVII | Eight-pointed star with a figure pouring water below |
| The Moon | XVIII | A full moon with two towers below and a crustacean emerging from water |
| The Sun | XIX | A radiant sun above a child on horseback |
| Judgement | XX | A trumpet above rising figures from coffins |
| The World | XXI | A dancing figure within a laurel wreath oval |

These symbols are open questions at the individual SVG path level — they are named here to define the concept. The exact SVG path data is an open question (see §Open Questions). The symbols must be line-art only (no fills), stroke `#c9a84c`, stroke-width 1.5, viewBox `0 0 48 48`.

---

### 4. Card Back Design

The card back is the face-down state, shared across all 78 cards. It must feel like a book you would want to pick up.

**Specification:**

- Background: deep indigo `#1a1040`. This is distinct from the app's primary charcoal `#1a1a2e` — it tilts toward violet rather than gray, marking the card back as a liminal object.
- Border: 1px solid `rgba(201, 168, 76, 0.35)` (gold at 35% opacity). Border-radius: 12px (`rounded-xl`).
- Central motif: an eight-pointed star (`✦` extended into full 8-point geometry), rendered as SVG lines in `rgba(201, 168, 76, 0.25)` — present but not dominant. Size: 60% of card width, centered.
- Outer geometric frame: a thin gold rectangle inset 8px from the border, at `rgba(201, 168, 76, 0.15)`. This creates the sensation of a contained, enclosed symbolic space.
- Gold lines: four diagonal lines from each star point to the inner rectangle corners, at `rgba(201, 168, 76, 0.08)`. Barely visible — a sense of structure beneath the surface.
- No text, no card name, no suit identity. The back reveals nothing.

---

### 5. `CardReveal.tsx` — Flip Animation Component

**File path:** `src/components/tarot/CardReveal.tsx`

This is the shared flip animation component used by `SingleCardReading.tsx`, `ThreeCardReading.tsx`, and `CelticCrossReading.tsx`. All card reveals in the app go through this one component.

**Props interface:**

```typescript
interface CardRevealProps {
  card: TarotCard
  reversed?: boolean
  revealed: boolean                // false = face down; true = face up; transition is animated
  imageUrl?: string                // passed through to TarotCard
  size?: 'sm' | 'md' | 'lg'
  onRevealComplete?: () => void    // fires when flip animation ends
  delayMs?: number                 // stagger offset for multi-card layouts
  'aria-label'?: string
}
```

**Flip animation — exact CSS properties:**

The flip is a 3D Y-axis CSS rotation. The parent container establishes the 3D perspective; both faces use `backface-visibility: hidden`. The card transitions between its two faces as `revealed` toggles.

```css
/* Parent container — establishes perspective */
.card-reveal-scene {
  perspective: 1200px;
  perspective-origin: center center;
}

/* The flipping element — holds both faces */
.card-reveal-flipper {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 600ms cubic-bezier(0.4, 0, 0.2, 1);
  /* Pre-flip: slightly scaled down and dimmed — potential energy */
  /* Applied via data-revealed="false" CSS selector */
}

.card-reveal-flipper[data-revealed="false"] {
  transform: rotateY(0deg) scale(0.95);
  filter: brightness(0.8);
}

.card-reveal-flipper[data-revealed="true"] {
  transform: rotateY(180deg) scale(1.0);
  filter: brightness(1.0);
}

/* Front face (card face) */
.card-reveal-front {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  transform: rotateY(180deg);
}

/* Back face (card back) */
.card-reveal-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  transform: rotateY(0deg);
}
```

Key decisions:
- **600ms duration** with `cubic-bezier(0.4, 0, 0.2, 1)` — a standard material ease-in-out that feels deliberate but not sluggish.
- **`perspective: 1200px`** — at standard card sizes (120–160px wide), this creates a convincing 3D arc without excessive foreshortening.
- **Pre-flip state: `scale(0.95) brightness(0.8)`** — the face-down card is slightly smaller and dimmer. This communicates "potential energy" — something waiting to become. The transition from this state into `scale(1.0) brightness(1.0)` during the flip creates a sense of emergence.
- **`transform-style: preserve-3d`** is on the flipper element, not the parent, so the scene container can have `overflow: hidden` for layout without breaking the 3D context.

The `transition` property applies to the flipper, not the individual faces, so both scale and brightness transition simultaneously with the rotation.

The `onRevealComplete` callback is attached via `transitionend` listener on the flipper element, filtered to `transform` property to avoid spurious fires from child transitions.

---

### 6. Reversed Card Treatment

When `reversed === true`, the card is displayed at a **4-degree counterclockwise tilt**. This is not an upside-down render. It communicates "off-axis" without rotating the imagery 180 degrees (which would break legibility and feel clinical rather than symbolic).

**Implementation:**

```css
/* Applied to the TarotCard wrapper when reversed === true */
.tarot-card-wrapper[data-reversed="true"] {
  transform: rotate(-4deg);
  /* Extend the shadow slightly to ground the tilt */
  box-shadow: 4px 6px 20px rgba(0, 0, 0, 0.4), -2px 2px 8px rgba(0, 0, 0, 0.2);
}

/* Default (upright) shadow */
.tarot-card-wrapper {
  box-shadow: 2px 4px 16px rgba(0, 0, 0, 0.35);
}
```

The tilt is applied to the `TarotCard` wrapper, not inside the flip transform. These are independent CSS transforms: the flipper applies `rotateY` for the reveal animation; the card wrapper applies `rotate(-4deg)` for the reversed state. They compose without conflict because they operate on different elements in the hierarchy.

The interpretation panel below a reversed card uses the card's `reversedMeaning` text. It does not add a "Reversed" label or badge. The reading speaks for itself.

---

### 7. Face-Down Card: Breathing Pulse Animation

When a card is face-down (`revealed === false`), the card back displays a breathing pulse — a very gentle, almost imperceptible glow cycle that communicates "this is alive and waiting for you." This is Miyazaki's "sleeping animal" quality: not animation for animation's sake, but animation that says presence.

**CSS keyframe specification:**

```css
@keyframes card-breathe {
  0%   { box-shadow: 0 0 8px rgba(201, 168, 76, 0.08); }
  50%  { box-shadow: 0 0 16px rgba(201, 168, 76, 0.18); }
  100% { box-shadow: 0 0 8px rgba(201, 168, 76, 0.08); }
}

.card-face-down {
  animation: card-breathe 3s ease-in-out infinite;
}
```

**Parameters:**
- Duration: **3 seconds** per cycle. Shorter feels nervous; longer feels inert.
- Amplitude: **8px to 16px** box-shadow spread with gold color at 8%–18% opacity. Imperceptible on casual glance — perceptible when watching. The user who notices it feels the card is waiting. The user who does not notice it still benefits from the subliminal sense of life.
- The animation is paused when the card transitions to `revealed === true`. It is applied only to the `.card-reveal-back` element, not the flipper — so it stops naturally as the flip animation begins.

The face-down card does not flip on a timer. The flip begins only when the user taps (mobile) or clicks (desktop) the card. The card tap target is the full card area — not a button labeled "Flip". This is Miyazaki's principle: the user completes the ritual; the app does not complete it for them.

---

### 8. `imageUrl?: string` Prop for Future Art

The `TarotCard` component accepts `imageUrl?: string` on both the `TarotCardProps` interface and the `CardRevealProps` interface (which passes it through).

When `imageUrl` is provided:
- The CSS symbolic face (SVG symbol, pip grid, typography) is not rendered.
- An `<img>` element fills the card face area: `width: 100%; height: 100%; object-fit: cover; border-radius: inherit;`
- The card name typography is rendered as an overlay at the bottom of the image in a semi-transparent dark scrim: `background: linear-gradient(transparent, rgba(0,0,0,0.7))` over the bottom 30% of the card, with the name in Cormorant Garamond small caps gold on top.
- The breathing pulse animation on the back face is unchanged.
- The flip animation is unchanged.

This means injecting Rider-Waite images or future commissioned art requires only populating `imageUrl` in the card data or per-reading configuration. No component rewrite, no animation changes, no typography overhaul.

---

### 9. Element-Based Background Color Temperature

When a card is revealed (`revealed` transitions to `true`), the nearest page-level background container (passed by context or prop) receives a very subtle color temperature shift based on the card's element. This is subliminal — not dramatic, not a color change. A perceptible shift only on close attention.

**Element-to-temperature mapping:**

| Element | Shift | CSS Value |
|---------|-------|-----------|
| Fire (Wands, Aries/Leo/Sagittarius Majors) | Warmer | `--bg-temperature: rgba(232, 96, 60, 0.04)` |
| Water (Cups, Cancer/Scorpio/Pisces Majors) | Cooler | `--bg-temperature: rgba(74, 144, 217, 0.04)` |
| Air (Swords, Gemini/Libra/Aquarius Majors) | Neutral-cool | `--bg-temperature: rgba(176, 200, 224, 0.03)` |
| Earth (Pentacles, Taurus/Virgo/Capricorn Majors) | Neutral-warm | `--bg-temperature: rgba(138, 111, 60, 0.03)` |

**Implementation mechanism:** The reading page component (`SingleCardReading.tsx`, `ThreeCardReading.tsx`, `CelticCrossReading.tsx`) wraps card content in a container with a background overlay div:

```tsx
<div
  className="absolute inset-0 pointer-events-none transition-colors duration-1000"
  style={{ background: elementTemperatureColor }}
/>
```

The `elementTemperatureColor` value is derived from the revealed card's element. It transitions smoothly over 1 second (`transition: background 1000ms ease`). The overlay is `pointer-events: none` and `z-index: 0`, sitting below card content.

For three-card and Celtic Cross layouts, the temperature is derived from the most recently revealed card (or the dominant element if all are revealed).

---

### 10. Reveal Glow: Inner Radial Gradient on Card Face

When `glowOnReveal === true` (passed by `CardReveal.tsx` when `revealed` transitions from `false` to `true`), the card face displays a brief inner glow centered on the card's SVG symbol. This makes the card feel alive at the moment of reveal.

**CSS:**

```css
@keyframes card-reveal-glow {
  0%   { opacity: 0; }
  20%  { opacity: 1; }
  100% { opacity: 0; }
}

.card-face-glow {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    ellipse 60% 50% at 50% 40%,
    rgba(201, 168, 76, 0.18) 0%,
    transparent 70%
  );
  animation: card-reveal-glow 1800ms ease-out forwards;
  pointer-events: none;
}
```

The glow is centered on the upper portion of the card (50% horizontal, 40% vertical — where the SVG symbol lives). It fires once on reveal and fades out over 1.8 seconds. It is not a persistent effect — it is the moment of emergence.

---

### 11. Typography

All typography on card faces and in the interpretation panel follows the existing design system conventions, deepened for Tarot.

**On card faces:**

| Element | Font | Size | Weight | Color | Style |
|---------|------|------|--------|-------|-------|
| Card name | Cormorant Garamond | 11px | 400 | `#c9a84c` | `font-variant: small-caps`, `letter-spacing: 0.12em` |
| Arcana number (roman numeral) | Cormorant Garamond | 10px | 300 | `#b8b8c0` | italic |
| Court title (Page/Knight/Queen/King) | Cormorant Garamond | 9px | 300 | `#b8b8c0` | italic |

**In the interpretation panel (`TarotInterpretationPanel.tsx`):**

| Element | Font | Size | Weight | Color | Notes |
|---------|------|------|--------|-------|-------|
| Card name heading | Cormorant Garamond | 28px | 300 | `#c9a84c` | Same visual weight as TodayPage numerology heading |
| Card number (architectural) | Cormorant Garamond | 72px | 200 | `#c9a84c` at 80% | Large, gold, almost structural |
| Numerology resonance text | Cormorant Garamond | 14px | 300 | `#b8b8c0` | Below the large number |
| "In Your Sky Now" section label | Inter | 10px | 500 | `#b8b8c0` | `letter-spacing: 0.2em`, uppercase |
| Astro connection headline | Cormorant Garamond | 17px | 400 | `#e8e8f0` | Italic — marks as different register |
| Core meaning text | Inter | 15px | 400 | `#c8c8d8` | Standard body |
| Reflection question | Cormorant Garamond | 16px | 300 | `#b8b8c0` | Italic, centered |
| Keywords | Inter | 11px | 500 | `#c9a84c` at 70% | Pill chips with gold border |

The card number renders large (72px) in the interpretation panel following the same visual language as the Personal Day number in `TodayPage.tsx`. This creates cross-module recognition: users who use both Numerology and Tarot see the same architectural numerals. If the user's personal day number matches the card's number, a small note appears below: `"Your personal day is also a ${number}."` — small, silver, Cormorant Garamond italic. This surfaces automatically in `computeInstantInterpretation` when `context.personalDay === card.number`.

---

### 12. Hover and Tap States

**Face-down card (waiting to be tapped):**

```css
.card-face-down:hover {
  transform: scale(1.03) translateY(-2px);
  transition: transform 200ms ease;
  cursor: pointer;
}

.card-face-down:active {
  transform: scale(0.98);
  transition: transform 80ms ease;
}
```

The hover lift communicates interactivity. The tap press communicates response. These are subtle — not dramatic.

**Face-up card (after reveal, non-interactive):**

No hover state. The card is a revealed object, not an interactive control. Cursor is `default`.

**Exception:** In multi-card layouts (three-card, Celtic Cross), an unrevealed face-down card that is ready to be tapped shows the hover lift. A face-down card that is not yet its turn (waiting in queue) shows no hover state and `cursor: not-allowed` or `cursor: default` with reduced opacity (70%).

---

### 13. Accessibility

- `TarotCard` renders with `role="img"` and `aria-label` defaulting to `"${card.name}${reversed ? ', reversed' : ''}"`.
- Face-down cards render with `aria-label="Face-down tarot card"` and `aria-live="polite"` on the parent so screen readers announce the card name when it flips.
- `CardReveal.tsx` includes `aria-pressed` on the clickable face-down state: `aria-pressed={revealed}`.
- The flip transition respects `prefers-reduced-motion`: when the user has reduced motion enabled, the flip is instantaneous (no 600ms transition) but still semantically changes `data-revealed`. The breathing pulse animation is also suppressed under `prefers-reduced-motion`.
- All interactive card elements are keyboard-focusable (`tabIndex={0}`) with `onKeyDown` handlers for Enter and Space triggering the reveal.
- The element temperature background shift is purely visual and carries no semantic information — no accessibility requirement.

```css
@media (prefers-reduced-motion: reduce) {
  .card-reveal-flipper {
    transition: none;
  }
  .card-face-down {
    animation: none;
  }
  .card-face-glow {
    animation: none;
  }
}
```

---

### 14. Animation Timing Across Card Contexts

Different reading contexts require different animation pacing. `CardReveal.tsx` receives `delayMs` to support staggered reveals.

**Single-card reading:**
- No delay. The flip begins immediately when the user taps.
- Full 600ms flip animation.
- `glowOnReveal: true`.
- Element temperature shift fires on flip complete.

**Three-card reading (sequential reveal):**
- Cards are revealed one at a time on user tap.
- Each subsequent reveal has no artificial delay beyond the user's own pacing.
- `glowOnReveal: true` on each card.
- For the initial layout (before any reveal), the three face-down cards fan slightly: card 2 (center) is baseline; card 1 (left) is `rotate(-3deg) translateX(-8px)`; card 3 (right) is `rotate(3deg) translateX(8px)`. This creates a "deck" feeling rather than three identical rectangles.
- After all three are revealed, the synthesis section opens below with a thin horizontal rule + centered `✦` glyph as a threshold separator.

**Celtic Cross (progressive reveal, 10 cards):**
- Cards 1–2 (Present + Challenge) are revealed together as the central cross unit, with a 100ms stagger between them (`card1.delayMs = 0`, `card2.delayMs = 100`).
- Cards 3–6: each revealed individually on user advance gesture. No automatic progression.
- After card 5, a transitional text block appears: `"The cross has spoken. The staff now tells you where you are going."` — Cormorant Garamond italic, centered, gold, 16px. This persists for 2 seconds then fades.
- Cards 7–10: each revealed individually. After card 7 is revealed, the GPT synthesis request fires (fire-early pattern — same as `handleTodaySynthesis`).
- After card 10: a 2-second pause, then `"The cards are now being read as a constellation."` appears as overlay text (dark semi-transparent background, Cormorant Garamond, centered, 20px gold) over the full layout, transitioning to the synthesis panel.
- The "Continue" affordance after each card reveal must not appear for **at least 3 seconds** after the flip completes. This enforced minimum gives users time to sit with the card. It is implemented as a `useEffect` setTimeout that gates rendering of the advance gesture.
- `glowOnReveal: true` on all cards.

---

## File Structure

```
src/components/tarot/
  TarotCard.tsx          — visual card component (face + back)
  CardReveal.tsx         — flip animation wrapper (shared by all reading types)
```

No additional files for this proposal. `TarotCard.tsx` and `CardReveal.tsx` are the two deliverables. They are used by `SingleCardReading.tsx`, `ThreeCardReading.tsx`, and `CelticCrossReading.tsx` (specified in separate proposals).

---

## Out of Scope

- **Custom illustrated art** for any of the 78 cards. This is a design project, not a sprint task. The `imageUrl` prop is the integration point; the art itself is out of scope.
- **Animated backgrounds beyond the element temperature shift.** No particle effects, no starfields, no animated gradient loops. Restraint is the premium signal.
- **Sound design.** No audio cues on reveal. The visual rhythm is the ritual.
- **3D tilt effect on hover** (parallax card tilting via mouse position). This is a v2 enhancement — it adds complexity and motion sickness risk without contributing to the core ritual.
- **Card collection / unlock mechanics.** Cards are not "collected" in v1. Every card is always available to be drawn.
- **Dark mode / light mode toggle.** The Tarot module is always dark. The card face (ivory `#f5f0e8`) creates sufficient contrast against the app's charcoal background.

---

## Open Questions

1. **Exact SVG path data per Major Arcana symbol.** The symbol concepts are specified in §3a. The actual SVG `<path d="...">` strings for each of the 22 symbols are not written here — they require a designer or developer with SVG authoring capability to produce. This is the primary remaining creative decision in this proposal. The symbols must fit in a 48×48 viewBox at stroke-width 1.5 with no fill.

2. **Court card pip layout.** The pip grid specification for Ace through Ten is established. The court card layout (Page, Knight, Queen, King) uses a single large suit symbol. The question is whether court cards receive a second visual element (e.g., a small crown or shield) to distinguish them from numbered cards at a glance. Recommendation: add a small crown SVG (`12px`, gold, top-center) on Queen and King cards only.

3. **Element assignment for Major Arcana with disputed elements.** Some Major Arcana have multiple element associations across traditions (e.g., The Fool is sometimes Air, sometimes the quintessence). The `cards.ts` data layer specifies each card's element — this proposal follows that assignment for background temperature. If The Fool's element is `null` in `cards.ts`, no temperature shift is applied.

---

*Proposal authored 2026-05-25. Ready for task assignment.*
