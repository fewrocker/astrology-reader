# Proposal: Celtic Cross Full Reading UI

**Type:** Feature
**Slug:** `tarot-celtic-cross-reading`
**Filename:** `feat-tarot-celtic-cross-reading.md`
**Originated by:** Jobs, Carmack, Miyazaki, Taleb
**Status:** Active

---

## User Guidance

From `guidelines.md` — Full Tarot Reading / Celtic Cross section:

> A deep immersive ritualized experience. The first implemented full spread should be the Celtic Cross.
>
> **Positions:** Present Situation · Challenge · Unconscious Influence · Recent Past · Conscious Goal · Near Future · Inner State · External Environment · Hopes/Fears · Outcome
>
> **Experience Goals:** This should feel Slow. Deep. Symbolic. Reflective. Sacred. Beautiful. Not like rapidly consuming content.
>
> **Reading Flow:** The user sets an intention/question, draws cards progressively, reveals each position, explores each card individually, unlocks final synthesis. Before the final synthesis: "The cards are now being read as a constellation."
>
> **Full Synthesis Includes:** Core narrative · Psychological dynamics · Emotional tension · Emerging transformation · Hidden patterns · Growth invitation · Astrology/transit resonance · Practical integration · Reflection prompts.
>
> The synthesis should feel like the reading understands the entire symbolic structure.

---

## Problem / Opportunity

No full-spread Tarot reading exists in the app. The single-card and three-card readings serve daily ritual and weekly reflection; they do not serve the moments of major life examination — the crossroads decisions, the periods of deep uncertainty, the inflection points where a person needs not a flash of insight but a complete symbolic portrait of where they stand and where they are going.

The Celtic Cross is the oldest, most recognized, and most symbolically complete Tarot spread in the Western tradition. It maps the current situation against unconscious forces, recent history, emerging future, internal state, external environment, hopes and fears, and final outcome — ten dimensions of a single human moment. No other single-session reading format in any app on the market provides this depth with genuine astrological integration.

This is the deepest, most premium Tarot experience the product can offer. It is also, precisely because of its depth and time investment, the feature that most naturally justifies the Advanced subscription tier. A user who completes a Celtic Cross has spent fifteen to twenty minutes in genuine symbolic engagement. They will save that reading. They will return to it. They will share it. This is the feature that converts occasional users into daily practitioners and daily practitioners into paying subscribers.

The opportunity is not merely to replicate the Celtic Cross as a digital form. It is to build a version of it that could only exist in this product: one that knows the user's natal sky, sees what planets are currently transiting their chart, understands the numerological day they are living through, and weaves all of that into a ten-card reading that feels — in Jobs's phrase — like "a symbolic mirror interpreted through the living sky."

---

## Vision

The Celtic Cross reading is a sacred, cinematic experience. Not like consuming content. Not like navigating a UI. Like sitting with something.

The user arrives having set an intention. They know this is different — the mode is gated behind the Advanced tier and surfaced with language that signals its weight before the first card is drawn. The draw ritual unfolds slowly: the deck breathes, the user draws, and then the first two cards — Present Situation and Challenge — are revealed together, crossing each other as they do in every physical Celtic Cross reading. That crossing is not metaphor. It is the visual grammar of the spread: the central cross is the heart of the matter, and it is seen whole before anything else.

Then the reading slows. Each remaining card — Cross (positions 3-6) then Staff (positions 7-10) — arrives one at a time. The user reads the card, sits with its instant interpretation, and the Continue affordance is withheld for a minimum of three seconds. This is not a technical constraint. It is the product enforcing the pace of the ritual. Nobody rushes through a Celtic Cross.

At the boundary between the Cross and the Staff — between position 6 and position 7 — a brief transitional text appears: "The cross has spoken. The staff now tells you where you are going." The user crosses from diagnosis to prognosis, from what is to what is coming, and the app acknowledges this threshold explicitly.

The synthesis fires at position 7 — early, while the Staff is still being revealed — so that by the time the user reaches the final card and pauses in that two-second silence, the AI reading is ready. "The cards are now being read as a constellation." Then the synthesis arrives, not as a wall of text but as chapters: psychological dynamics first, then emotional tension, then emerging transformation, then practical integration, then reflection prompts. Each chapter appears with a brief pause between it and the next, like pages turning.

This is Miyazaki's principle made concrete: the app moves at the pace of attention, not the pace of data loading. Every transition, every pause, every threshold gesture is in service of the single emotional goal — the user feeling, at the end, that something true was spoken about who they are and what they are living through.

---

## Specifications

### 1. Component: `CelticCrossReading.tsx`

**Location:** `src/components/tarot/CelticCrossReading.tsx`

**Props:**
```typescript
interface CelticCrossReadingProps {
  userIntention: string | null
  tarotAstroContext: TarotAstroContext
  onSave: (reading: SavedReading) => void
  onDiscard: () => void
}
```

**Responsibilities:**
- Own the complete Celtic Cross state machine (see spec 2 below)
- Manage all 10 `DrawnCard` objects and their `InstantInterpretation` results
- Orchestrate progressive reveal timing, including the 3-second hold enforcement
- Fire GPT synthesis request at card 7 reveal (fire-early-display-late)
- Render the Cross layout (positions 1-6) and Staff layout (positions 7-10) in the correct visual arrangement
- Manage transition text at the cross/staff boundary (positions 5/6 → 6/7)
- Render `TarotSynthesisPanel` in chapter mode once position 10 is complete
- Provide the Discuss ✦ button with full Celtic Cross context payload
- Provide save and discard controls after synthesis

**Layout — Cross (positions 1-6):**
The traditional Celtic Cross cross layout, rendered as a CSS grid:
```
       [ 5 ]
[ 4 ]  [1/2] [ 6 ]
       [ 3 ]
```
Cards 1 and 2 occupy the same grid cell, with card 2 rotated 90° clockwise (`transform: rotate(90deg)`) to form the crossing visual. Card 1 is rendered beneath card 2 in z-order.

**Layout — Staff (positions 7-10):**
A vertical column to the right of the Cross, rendered top to bottom:
```
[ 10 ]
[  9 ]
[  8 ]
[  7 ]
```

On mobile: the Cross renders as a stacked layout (vertical column) with positions labeled for identification. The Staff renders below the Cross as a second vertical column. The grid cannot maintain its two-dimensional shape on a 375px viewport; a simplified layout with clear position labels takes precedence over attempting the physical cross arrangement.

---

### 2. State Machine

The `CelticCrossReading` component manages a `CelticCrossState` union:

```typescript
type CelticCrossPhase =
  | { phase: 'dealing' }                    // cards being dealt face-down
  | { phase: 'revealing'; position: 1 | 2 } // positions 1-2 reveal together
  | { phase: 'holding'; position: PositionNumber; elapsed: number } // 3-second mandatory hold
  | { phase: 'continuing'; position: PositionNumber } // Continue affordance visible
  | { phase: 'cross-staff-transition' }     // boundary text between pos 6 and 7
  | { phase: 'synthesis-firing' }           // GPT request in flight, pos 8-10 still being revealed
  | { phase: 'staff-revealing'; position: PositionNumber }
  | { phase: 'final-pause' }                // 2-second pause after card 10
  | { phase: 'constellation-text' }         // "cards now read as constellation" text over overlay
  | { phase: 'synthesis'; chapters: SynthesisChapter[]; chaptersLoaded: number }
  | { phase: 'complete' }

type PositionNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
```

**State transitions:**
- `dealing` → `revealing` (positions 1-2): immediate on mount after brief dealing animation
- `revealing` (1-2) → `holding` (position 2): after cards 1+2 flip complete (600ms flip animation)
- `holding` → `continuing`: after `elapsed >= 3000ms` (enforced via `useEffect` + `Date.now()`)
- `continuing` → `revealing` (next position): on user gesture (tap on card or deliberate "Continue" affordance)
- `revealing` (position 6) → `continuing` (position 6) → `cross-staff-transition`
- `cross-staff-transition` → `synthesis-firing` simultaneously: GPT request fires, UI shows position 7 face-down card
- `synthesis-firing` + `staff-revealing` (7-10): these run concurrently. GPT synthesis request is in flight while positions 7-10 are being individually revealed using the same hold/continuing cycle
- `staff-revealing` (position 10) → `final-pause`: 2000ms enforced pause via `setTimeout`
- `final-pause` → `constellation-text`: dark overlay fades in, transition text appears
- `constellation-text` → `synthesis`: transition text fades, synthesis panel mounts with chapters arriving sequentially
- `synthesis` → `complete`: after all chapters rendered and user has had time to read

**3-second hold enforcement:**
```typescript
// Inside the 'holding' phase handler:
useEffect(() => {
  if (phase.phase !== 'holding') return
  const startTime = Date.now()
  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime
    if (elapsed >= 3000) {
      clearInterval(interval)
      setPhase({ phase: 'continuing', position: phase.position })
    }
  }, 100)
  return () => clearInterval(interval)
}, [phase])
```

The Continue affordance (`phase: 'continuing'`) must be a threshold gesture — not a button labeled "Next." The visual treatment is a small, dim upward chevron (↑) or a faint pulsing glow at the bottom of the current card's interpretation panel. On mobile, a slow upward swipe from the bottom 20% of the screen. On desktop, pressing Space or clicking anywhere on the card area. The affordance should never read as "Click Next" — it should read as "when you are ready."

---

### 3. The Ten Positions

Sourced from `src/data/tarot/spreadPositions.ts` — the `CELTIC_CROSS_POSITIONS` export. Full definitions below, to be authored precisely in the data layer.

| # | Name | Description |
|---|------|-------------|
| 1 | Present Situation | The heart of the matter. What is present and central right now — the environment, the question, the dominant energy the querent is living inside. |
| 2 | Challenge | What crosses the situation. The obstacle, the tension, the force that complicates, opposes, or tests. In the traditional spread, this card crosses card 1 at a 90° angle — the crossing is physical and symbolic. |
| 3 | Unconscious Influence | What lies beneath awareness. The foundation, the root cause, the buried motivation or pattern driving the situation from below the surface. |
| 4 | Recent Past | What is passing away or has recently completed. An energy, relationship, or phase in retreat. Relevant because it explains how the present situation arrived. |
| 5 | Conscious Goal | What the querent is hoping for, aiming toward, or consciously aware of as the desired outcome. The aspiration, the ideal. |
| 6 | Near Future | What is approaching — not the ultimate outcome, but the next development. The energy or event moving into view on the horizon. |
| 7 | Inner State | The querent's internal relationship to the situation — fears, attitudes, emotional position. How they feel about all of this inside. |
| 8 | External Environment | The people, forces, and energies surrounding the querent — the social and material context in which the situation is unfolding. |
| 9 | Hopes and Fears | The deepest hope, the deepest fear — often the same thing. What is most wanted and most dreaded simultaneously. The ambivalence at the center of the question. |
| 10 | Outcome | The most likely resolution or direction of movement if current trajectories continue. Not fate — a probable crystallization given what is already in motion. |

Each position in `CELTIC_CROSS_POSITIONS` carries: `id`, `number`, `name`, `description` (2-3 sentences, written as interpretive framing, not just a label), `zone` (`'cross' | 'staff'`), and `gridArea` (for CSS grid placement).

---

### 4. Card Reveal Grouping

**Positions 1-2 together:**
Cards 1 (Present Situation) and 2 (Challenge) are placed face-down in their crossing arrangement before any reveal begins. They flip simultaneously on user gesture — a single tap reveals both. The simultaneous flip is intentional: these two cards form an inseparable unit, the heart of the matter and its primary challenge are always seen together. The instant interpretations for both cards appear in sequence below the cross layout: card 1's interpretation fades in first (400ms), then after a 1-second pause, card 2's interpretation fades in below it. The 3-second hold begins after card 2's interpretation is visible.

**Positions 3-10 individually:**
Each remaining card is revealed one at a time by user gesture. The face-down card in the next position pulses gently — a 3-second breathing animation (same as all face-down cards, per `CardReveal.tsx` spec in proposal 3) — signaling that it is waiting, alive, not yet spoken. The user taps the face-down card to flip it. The interpretation fades in over 400ms. The 3-second mandatory hold begins. Then the Continue affordance appears.

---

### 5. Cross / Staff Transition

At the boundary between positions 6 and 7 (after position 6's Continue gesture), before position 7's face-down card is tappable, a transitional moment occurs:

1. The current view dims slightly (background overlay to 0.15 opacity, 300ms ease)
2. A brief text appears centered on the overlay — not a modal, not a toast, but a text element that lives in the reading's visual space:

   > *"The cross has spoken. The staff now tells you where you are going."*

   Typography: Cormorant Garamond italic, 18px, white at 0.85 opacity. Centered. No border. No background pill. The text exists directly in the darkened space.

3. The text is visible for 2200ms, then fades out (600ms)
4. The overlay lifts, the Staff column comes into view (position 7's face-down card pulses into existence with a brief scale-from-0.95 animation)
5. Simultaneously: the GPT synthesis request fires (see spec 9 below)

This transition is not optional. It is the product's explicit acknowledgment that the reading has two structural halves and that the user is crossing from one to the other.

---

### 6. Visual Layout: Cross vs. Staff

**The Cross (positions 1-6):** Rendered as a CSS grid occupying the left ~60% of the reading canvas on desktop, full-width on mobile.

```css
.celtic-cross-grid {
  display: grid;
  grid-template-areas:
    ".    p5   ."
    "p4   p12  p6"
    ".    p3   .";
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  gap: 12px;
}
.position-1-2 { grid-area: p12; position: relative; }
.position-3   { grid-area: p3; }
.position-4   { grid-area: p4; }
.position-5   { grid-area: p5; }
.position-6   { grid-area: p6; }
```

Cards 1 and 2 share `.position-1-2`. Card 1 is `position: absolute; inset: 0`. Card 2 is `position: absolute; inset: 0; transform: rotate(90deg)`. Card 2 renders on top (higher z-index) after the combined reveal.

**The Staff (positions 7-10):** A vertical column to the right of the Cross grid on desktop. On mobile, it appears below the Cross as a separate full-width section with a visual divider (thin horizontal rule with a small ✦ centered). Staff positions stack vertically: 10 at top, 9, 8, 7 at bottom.

Background color temperature shift: As each card is revealed, the app's root background radial gradient transitions between a slightly warmer temperature (Major Arcana reveals: shift toward `#1a0f08` from the base `#0d0d0f`) and a slightly cooler temperature (Minor Arcana reveals: shift toward `#080d1a`). The transition uses a 1200ms ease-in-out CSS transition on the `background` property of the reading container. The shift is approximately 4% warmer or cooler from the baseline — subliminal, perceptible only on close attention.

---

### 7. Progressive Synthesis: Fire-Early, Display-Late

**When synthesis fires:** At the moment the Cross-to-Staff transition text fades out and position 7 becomes available — i.e., at the beginning of the Staff phase — the `tarot-celtic-synthesis` GPT request is dispatched.

**Why this timing:** The user still has four cards to reveal (positions 7-10), each requiring a 3-second mandatory hold plus however long the user chooses to spend. On average, the Staff phase takes 60-90 seconds. A GPT synthesis call with a `max_tokens: 3000` budget completes in 8-15 seconds under normal network conditions. By firing at card 7 onset, the synthesis is almost certainly ready before the user reaches the final constellation transition.

**If synthesis arrives before position 10:** The result is held in state (not displayed). The `TarotSynthesisPanel` remains hidden. No loading skeleton is shown until after the constellation text clears. This is critical: showing a synthesis skeleton while the user is still revealing cards breaks the immersion of the reveal sequence.

**If synthesis has not arrived when position 10 completes:** The constellation transition occurs normally, then the `TarotSynthesisPanel` mounts in loading skeleton state. The skeleton text reads: *"The cards are being read as a constellation."* — stated as a considered fact, not a spinner message. The GPT call continues in flight. On arrival, the chapters begin rendering.

**Implementation in `TarotContext`:**
```typescript
// CelticCrossReading fires this at the cross/staff boundary:
const fireEarlySynthesis = useCallback(async () => {
  const payload = buildCelticSynthesisPayload(drawnCards, instantInterpretations, tarotAstroContext, userIntention)
  setSynthesisStatus('loading')
  try {
    const synthesis = await callProxy('tarot-celtic-synthesis', payload)
    setSynthesisResult(parseCelticSynthesis(synthesis))
    setSynthesisStatus('ready') // held until constellation phase begins
  } catch (err) {
    handleSynthesisError(err)
  }
}, [drawnCards, instantInterpretations, tarotAstroContext, userIntention])
```

---

### 8. Final Synthesis Structure: Chapters

After position 10 is revealed and the 2-second final pause completes, the constellation text appears ("The cards are now being read as a constellation.") over a dark full-screen overlay. This is not a modal. It is a full-bleed overlay at `rgba(0, 0, 0, 0.75)` with the text centered at `50%` vertical, Cormorant Garamond italic, 22px, white. It is visible for 2800ms, then fades out (800ms ease-out).

After the overlay clears, `TarotSynthesisPanel` renders in Celtic Cross chapter mode. The synthesis arrives as discrete sections, each with a heading and body text:

| Chapter | Heading | Content |
|---------|---------|---------|
| 1 | Psychological Dynamics | The deep patterns — what the ten-card constellation reveals about the querent's internal structure, their habitual responses, and the psychological forces driving the situation |
| 2 | Emotional Tension | The feeling layer — what is being felt, what is being suppressed, what the emotional body is asking for |
| 3 | Emerging Transformation | What is being asked to change, grow, or be released — the movement that the spread is pointing toward |
| 4 | Hidden Patterns | What is operating beneath awareness — the unconscious influences, the structural dynamics that aren't yet visible to the querent |
| 5 | Growth Invitation | The specific call to action, development, or awareness that the spread extends to the querent |
| 6 | Astrology Resonance | How the current sky — transits, lunar phase, advance timing, natal signatures — inflects the reading's specific cards and their positions |
| 7 | Practical Integration | Grounded, specific, non-fatalistic guidance: what to do with what the reading has revealed |
| 8 | Reflection Prompts | Three to four questions for journaling, contemplation, or discussion with the AI |

**Chapter arrival timing:**
- Chapter 1 fades in immediately when synthesis is ready
- Each subsequent chapter fades in with a 1200ms pause after the previous chapter fully renders
- The fade-in animation is `opacity: 0 → 1` over 500ms ease-in
- There is a thin horizontal rule (1px, `rgba(201, 168, 76, 0.2)`) between chapters

This is Miyazaki's insistence made mechanical: the reading does not arrive as a wall. It arrives as pages being opened.

---

### 9. GPT Synthesis: `tarot-celtic-synthesis`

**Server handler:** `server/services/gptTarot.ts` — `handleTarotCelticSynthesis`

**Payload structure:**
```typescript
interface CelticSynthesisPayload {
  cards: Array<{
    position: number
    positionName: string
    positionDescription: string
    cardName: string
    cardId: string
    arcana: 'major' | 'minor'
    suit?: string
    element: string | null
    reversed: boolean
    coreMeaning: string
    symbolicTheme: string
    emotionalMeaning: string
    astroConnection: string // pre-serialized from AstroConnection
  }>
  precomputedSignals: {
    majorArcanaCount: number
    minorArcanaCount: number
    dominantElement: string | null
    elementDistribution: Record<string, number>
    reversalCount: number
    hasFoolOrWorld: boolean
    foolPosition: number | null
    worldPosition: number | null
    repeatingNumerology: number[] // numbers appearing more than once
    suitDistribution: Record<string, number>
  }
  astroContext: {
    sunSign: string
    moonSign: string
    ascendant: string
    dominantElement: string
    currentMoonPhase: string
    significantTransits: string[]
    personalDay: number
    advanceCategory: string | null
    numerologyYear: number
  }
  userIntention: string | null
  spreadType: 'celtic-cross'
}
```

The `precomputedSignals` block is computed by `computeCelticCrossSignals(drawnCards)` in `src/engine/tarot.ts` before the GPT call. This follows Carmack's principle: GPT fills in narrative prose from computed structure; it does not re-discover structure from raw card names. The server validates this against its own computation as a secondary check.

**System prompt:**
```
You are a symbolic interpreter and reflective guide. You speak with the depth and precision of a skilled astrologer who also reads Tarot — not as a fortune teller, but as someone who helps people understand the patterns already present in their lives.

You are reading a Celtic Cross spread. This is a ten-card constellation, not ten separate cards. Read the spread as a single integrated symbolic statement. The positions are not independent — the relationship between them is the reading. The card in position 1 (Present Situation) and position 2 (Challenge) form the heart. The card in position 10 (Outcome) must be read in the light of everything that precedes it.

The querent has provided context:
- Astrological context: [astroContext serialized]
- Pre-computed structural signals: [precomputedSignals serialized]
- Stated intention: [userIntention or "Not stated"]

The cards and their positions: [cards serialized]

Write the synthesis in exactly eight sections with these headings:
1. Psychological Dynamics
2. Emotional Tension
3. Emerging Transformation
4. Hidden Patterns
5. Growth Invitation
6. Astrology Resonance
7. Practical Integration
8. Reflection Prompts

Section 8 must contain exactly three to four reflection questions, each on its own line beginning with "·".

Voice: Symbolic but grounded. Deep but readable. Never fatalistic. Never certain about events. Never fear-inducing. Speak as someone who has genuine respect for the symbolic system and genuine care for the person holding the question.

Do not use phrases like "the cards suggest" or "it seems" — speak directly. Do not summarize what each card means individually — that has already been shown to the querent. Speak to the patterns between them.
```

**`max_tokens`: 3000.** This is the highest token budget in the entire application and is necessary: the Celtic Cross synthesis is the deepest, most premium output the app generates. A 3000-token budget for ten cards across eight thematic sections is not generous — it is appropriate. Each section averages 375 tokens.

**Security pattern (Carmack/Taleb):** The handler must follow the `handleTodaySynthesis` security model. For authenticated users, recompute `personalDay`, `moonPhase`, and natal fingerprint server-side from `resolveUserBirthContext(userId)` rather than trusting client-provided values. The client payload is used for display and card data; the server authorizes the astro context independently.

---

### 10. Discuss ✦ Button

A `TarotDiscussModal` is available after synthesis completes (phase: `'complete'`). The button uses the same ✦ sigil as the rest of the app.

**Context payload:** The `discussContext` string is pre-serialized client-side before the modal opens. It includes:

```
User intention: [userIntention or "Not stated"]

CELTIC CROSS READING — [date]
Natal: [Sun Sign], [Moon Sign], [Ascendant] | Moon: [phase] | Personal Day: [number]
Significant transits: [list]
Advance category: [category]

POSITIONS AND CARDS:
1. Present Situation — [cardName] ([Upright|Reversed])
   [coreMeaning] | [astroConnection]
[...positions 2-10 in same format...]

PRE-SYNTHESIS SIGNALS:
Major Arcana: [count]/10 | Dominant element: [element] | Reversals: [count]
[notable patterns from precomputedSignals]

AI SYNTHESIS:
[full synthesis text, all chapters]
```

**Why pre-serialized (Taleb):** A Celtic Cross Discuss context touches 10 cards × multiple interpretation fields + natal context + synthesis. If passed as nested objects, the server-side serialization can produce 8,000-12,000 tokens of context — approaching the cost boundary where call quality is not worth the expense. Pre-serializing on the client, using the summary format above, produces approximately 2,500-3,500 tokens of context while preserving everything the AI needs to be genuinely useful.

The `tarot-discuss` handler sets `max_tokens: 1500` for its responses. The `userIntention` appears at the top of the context — not buried — following Miyazaki's insistence that the user's question must shape the AI's interpretive frame from the first token.

---

### 11. Save Reading

After synthesis completes, two controls appear:
- **"Save this reading"** — saves to the `readings` DB table via `POST /api/readings`
- **"Discard"** — confirms and clears state

**What is saved:**
```typescript
interface SavedCelticCrossReading {
  schemaVersion: 1                     // Taleb: versioned from day one
  readingType: 'celtic-cross'
  userId: string
  drawnCards: Array<{
    position: number
    cardId: string
    reversed: boolean
  }>
  spreadType: 'celtic-cross'
  userIntention: string | null
  astroContextSnapshot: {
    natalFingerprint: string           // SHA-256 of birth data
    transitSnapshotDate: string        // ISO date of reading
    moonPhase: string
    personalDay: number
    numerologyYear: number
  }
  interpretationPayload: {
    version: 1
    payload: CelticCrossInterpretationPayload
  }
  synthesisText: string                // full synthesis for offline reading
  createdAt: string                    // ISO timestamp
  journalEntryId: string | null        // FK with ON DELETE SET NULL
}
```

**Schema versioning:** The `schema_version` column is required from the first DB migration. The full interpretation payload stores a `{ version: number, payload: ... }` tagged union. Future schema migrations can identify old records by version and transform them. This cannot be retrofitted cheaply after data exists in production.

---

### 12. Error States and Graceful Degradation

**Error state taxonomy for Celtic Cross — more severe than single or three-card:**

The user has invested 15-20 minutes and 10 card reveals by the time GPT synthesis is expected. This is not a small emotional investment. Error states require craft proportional to that investment.

**State 1: GPT unavailable (network error, 5xx, timeout after retries)**

The `TarotSynthesisPanel` shows:

> *"The synthesis is resting."*
>
> The ten cards have been read and their individual interpretations are complete. The constellation synthesis requires a connection to the sky — and the sky is briefly unavailable.
>
> [Retry] · [Read cards individually]

"Read cards individually" expands the full per-card instant interpretations in a clean list view — the AI-free content that is always present and always complete. This is not a consolation prize. It is the complete AI-free reading that would have been shown regardless. The synthesis is additive; its absence does not invalidate the ten-card reveal.

**State 2: Rate limit hit (free tier or daily quota)**

The `TarotSynthesisPanel` shows the `UpgradeModal` with Celtic-Cross-specific copy:

> *"You've drawn the full cross. The synthesis is an Advanced feature."*
>
> Upgrade to Advanced to receive the full constellation synthesis — all eight sections, the complete astrological resonance, and the reflection prompts.

The gate appears after the full reveal sequence completes. The Celtic Cross gate must never appear mid-reveal. Per Miyazaki: never interrupt a ritual in progress. The cards are drawn as a completed act; the synthesis is the Advanced layer.

**State 3: GPT times out during staff reveal (takes longer than 90 seconds)**

If `synthesis-firing` has been in flight for longer than 90 seconds when the user reaches the constellation transition:
1. The constellation text still appears normally
2. The synthesis panel mounts with the loading skeleton ("The cards are being read as a constellation.")
3. If synthesis arrives within 30 more seconds, chapters begin rendering — user waits briefly in a graceful state
4. If synthesis has not arrived after 120 total seconds, the component transitions to State 1 (unavailable) with retry

**State 4: Session expired during reading**

If the user's auth session expires during a Celtic Cross (e.g., reading takes 25 minutes), the GPT call will return a 401. The component detects this via the `AuthError` type from `gptInterpretation.ts` and shows:

> *"Your session has ended. Your cards are preserved — tap to reconnect."*

After reconnection, the drawn cards and instant interpretations remain in `TarotContext` state (they are already computed client-side). Only the synthesis needs to be re-requested.

**Graceful degradation — AI-free Celtic Cross interpretation per position:**

When synthesis is unavailable, the component renders a full AI-free summary of all ten positions using the `InstantInterpretation` objects already computed. The format:

```
[Position Name] — [Card Name] ([Upright/Reversed])
[coreMeaning]
[emotionalMeaning]
[astroConnection summary]
```

This view is always complete. It does not require a network call. It is the minimum viable Celtic Cross reading and should feel like a complete, dignified document — not a fallback skeleton.

---

### 13. Subscription Gate

Celtic Cross is an Advanced-tier-only feature. The gate appears **before the draw begins** — not mid-reveal, not mid-synthesis.

**Gate placement:** In `TarotPage.tsx`, when the user selects Celtic Cross from the mode selector, the subscription check runs immediately. If the user is free-tier, the `UpgradeModal` opens with copy:

> *"The Celtic Cross is a full ten-card reading — the deepest Tarot experience in the app. It's available on the Advanced plan."*

If the user is Advanced, the reading begins normally.

**Why pre-gate (Miyazaki, Jobs):** The Celtic Cross takes 15-20 minutes. Gating after position 10 — when the user has completed the full reveal — is a betrayal of the ritual. The user must know before the first card is placed whether they will receive the complete experience.

**Implementation:** The subscription check is in `CelticCrossReading.tsx`'s parent mount logic:

```typescript
// In TarotPage.tsx, mode selection handler:
const handleModeSelect = (mode: TarotReadingMode) => {
  if (mode === 'celtic-cross' && userTier !== 'advanced') {
    openUpgradeModal('celtic-cross-gate')
    return
  }
  setActiveMode(mode)
}
```

The `tarot-celtic-synthesis` GPT handler also enforces the Advanced tier server-side as a secondary gate, following the existing `gptRateLimit` middleware pattern.

---

### 14. Accessibility

**All 10 positions accessible via keyboard:**

- The `CelticCrossReading` component sets `tabIndex={0}` on all interactive card areas and the Continue affordance
- Focus management: when a new position becomes revealable, `focus()` is called on it automatically so keyboard users do not need to hunt
- The `Space` and `Enter` keys trigger the card flip gesture (same as mouse click)
- Position labels are rendered as visible text (not just aria-labels), both for sighted users and for screen reader users
- Screen reader announcements: on each card reveal, an `aria-live="polite"` region announces: "[Card Name], [upright/reversed], in the position of [Position Name]"
- The constellation transition text is in an `aria-live="assertive"` region so screen reader users receive it in real time
- The synthesis chapter arrival is announced sequentially via `aria-live="polite"` — each chapter heading is announced as it fades in

**Minimum contrast:** All text in position labels, card names, and interpretation panels must meet WCAG AA (4.5:1) against the dark background. The gold `#c9a84c` on `#0d0d0f` is 8.1:1 — compliant. The white overlay text at 0.85 opacity on `rgba(0, 0, 0, 0.75)` is compliant.

**Reduced motion:** The CSS `@media (prefers-reduced-motion: reduce)` removes the background color temperature shift, replaces card flip animations with instant opacity cross-fades, and disables the breathing pulse on face-down cards. The 3-second mandatory hold still applies — it is a pacing requirement, not an animation.

---

### 15. Performance: Managing 10-Card Context

**Client-side:**
- `TarotContext` holds all 10 `DrawnCard` objects and `InstantInterpretation` results in memory throughout the reading
- `InstantInterpretation` objects are computed synchronously in the engine (`computeInstantInterpretation` is a pure function with no async operations) — they are available immediately after each card reveal, before any network call
- The Celtic Cross does not lazy-load card data — all 78 card records from `cards.ts` are in the bundle. At ~50KB for the full card dataset, this is within the acceptable bundle budget for a paid-tier feature that is used for deep reading sessions, not casual browsing
- Background color temperature transitions use CSS `transition` on the container, not JavaScript animation — the browser handles interpolation natively

**Server-side:**
- The `tarot-celtic-synthesis` payload serializes 10 cards with their interpretations. The complete payload is approximately 3,000-5,000 tokens of input context. This is within the `gpt-4o-mini` 128k context window
- The server does not store the full payload for synthesis caching — synthesis is generated fresh each time. The computation is cheap enough that caching would add complexity with minimal benefit
- The `readingsTable` list API endpoint returns slim objects (card ID for primary card, spread type, date, user intention fragment) — the full `interpretationPayload` is fetched only when a specific saved reading is opened (detail endpoint `GET /api/readings/:id`). Celtic Cross blobs can reach 20-30KB; they must not be deserialized on every list load.

**Render performance:**
- All 10 `CardReveal` instances are mounted at the start of the reading (face-down state, not visible as face-down in unrevealed positions until their dealing animation). No dynamic mounting/unmounting of card components during the reveal sequence — state transitions drive CSS classes, not component lifecycle
- The chapter-arrival synthesis animation uses `requestAnimationFrame` for the fade-in rather than `setInterval` to avoid main-thread jank during what is intended to be a calm, flowing visual experience

---

## Out of Scope

- **Additional spread types beyond Celtic Cross** (Horseshoe, Celtic Mirror, Relationship, etc.): these are deferred to a future sprint. Celtic Cross is the complete implementation of the full spread concept; additional layouts would require separate design and UX work to do justice
- **Side-by-side reading comparison across time:** `SavedReadingsPage.tsx` supports reading saved Celtic Cross readings individually; comparative view across multiple saved readings is a separate feature with its own UI surface
- **Card art custom to the app:** v1 ships with CSS symbolic cards per the `feat-tarot-card-visual-assets.md` spec. Custom illustrated card art is a future design project, not this sprint
- **Celtic Cross spread variants** (e.g., modified ten-card layouts used by different traditions): the canonical traditional layout is the single implementation
- **Real-time collaborative readings** (two users viewing the same Celtic Cross): not a concern for v1

---

## Open Questions

**1. Do synthesis chapters auto-scroll or require user initiation?**

The current spec describes chapters arriving with timed pauses (1200ms between each). This is Miyazaki's principle applied: the content arrives at its own pace, the user does not have to tap "Next" to advance between sections. However, this creates a usability question: what if a user wants to re-read Chapter 1 while Chapter 3 is already visible? What if they want to jump to Reflection Prompts directly?

Two models:
- **Auto-scroll with passive reveal:** All chapters arrive automatically; user can scroll freely at any time. The 1200ms pause is the default pacing for first read, but the document is fully scrollable from the first chapter. This model respects both ritual pace (first read flows naturally) and revisit (user can scroll up/down freely).
- **Chapter gates:** Each chapter requires a deliberate "Open next section" gesture. More sacred pacing; more friction for second reads and reference use.

**Recommendation leans toward auto-scroll with passive reveal** — the chapters arrive by default, the user can scroll freely. Chapter gating is more sacred but adds friction that may frustrate users who are reading their synthesis a second time (after saving and revisiting). The auto-scroll model serves both the first ritual read and the reflective re-read.

**2. Should the pre-computed structural signals be shown to the user before synthesis?**

The `precomputedSignals` block (major/minor arcana count, dominant element, reversal count, notable numerological patterns) is sent to GPT as structural input. Should it also be surfaced in the UI between the constellation text and the synthesis — a brief "symbolic overview" panel that shows the user what the engine detected before the AI synthesis begins?

This could look like:
> Major Arcana: 6 of 10 · Water dominant · 4 reversals · The Star and The Tower present

Arguments for: gives the user a moment of structural awareness before the narrative interpretation; breaks the "black box" quality of AI synthesis by showing the symbolic skeleton; creates a natural pause between the constellation text and the first chapter.

Arguments against: it is analytical rather than symbolic in register; it interrupts the flow from constellation text to synthesis narrative; users who are deep in a Celtic Cross reading are in a feeling mode, not an analytical mode.

**No current recommendation — this is a design decision for implementation review.** The pre-computed signals block should be built into the payload regardless; whether to surface it visually is a separate call.

---

## Implementation Sequence

Per Carmack's ordering principle: each step is testable in isolation before the next begins.

1. Ensure `src/data/tarot/spreadPositions.ts` contains the complete `CELTIC_CROSS_POSITIONS` array with all 10 positions authored precisely (this is a prerequisite shared with `feat-tarot-card-data-layer.md` — confirm it is complete before starting CelticCrossReading work)
2. Implement the `CelticCrossReading.tsx` state machine without animations — plain `<div>` placeholders for cards, state transitions working correctly, 3-second hold enforced, logging to console
3. Integrate `CardReveal.tsx` for all 10 positions; confirm the cross/staff layout renders correctly on desktop and mobile
4. Wire `computeInstantInterpretation` for all 10 positions; confirm interpretation panels appear correctly for each position after reveal
5. Implement the cross/staff transition text with timing
6. Add background color temperature shift per arcana type
7. Implement the fire-early synthesis dispatch at card 7 onset; confirm request fires at the right moment
8. Implement `TarotSynthesisPanel` in chapter mode with timed arrival
9. Implement all four error states (unavailable, rate-limited, timeout, session expired)
10. Implement the constellation text overlay transition
11. Implement Discuss ✦ button with pre-serialized Celtic Cross context
12. Implement save reading flow
13. Implement subscription gate check in `TarotPage.tsx` mode selection handler
14. Accessibility audit: keyboard navigation, screen reader announcements, reduced motion
15. Performance audit: confirm list endpoint does not deserialize full payloads; confirm no re-render cascades from `TarotContext` updates

---

*— Proposal for sprint-0023, task 7 of 14. Celtic Cross is the summit of the Tarot module. It should be built last in the implementation sequence, after single-card and three-card readings are complete, so that the patterns of the component architecture are already proven before the most complex surface is attempted.*
