# feat-three-card-constellation-preview

**Type:** Feature

**Originated by:** Jobs, Miyazaki, Taleb

---

## Problem or Opportunity

The three-card reading currently has a gap between the end of the card-picking experience and the arrival of GPT synthesis. After the user draws all three cards, each card has an individual interpretation panel. What the reading does not immediately surface is what the three cards are saying **together** — the constellation picture that gives three individual cards their combined meaning.

`computeThreeCardSynthesis` in `src/engine/tarot.ts` already computes this constellation picture. It produces:
- `astroResonanceNote` — a single string that identifies the most structurally interesting feature of the three-card combination: "Fire and Water meet across the spread under a Saturn sky" or "All three cards draw from Water against a Neptune-dominant sky — the element is amplified"
- `elementDistribution.dominant`, `.allSame`, `.crossElement`, `.fireWaterTension`
- `polarityProfile.reversedCount`, `.allReversed`, `.allUpright`, `.centerReversed`
- `dominantArcana` — whether the spread is major-heavy, minor-heavy, or balanced
- `archetypeFraming.hasFool`, `.hasWorld`, `.hasDeathOrTower`

This data is computed, passed to GPT as context, and then discarded from the user's view. The user sees three interpretation panels and waits for GPT to arrive with synthesis. The GPT synthesis often opens with a sentence that names the constellation structure. But the user has to wait 5-15 seconds to see that sentence.

The fix is not a replacement for GPT synthesis — it is a bridge to it. A constellation preview that says "here is the structural picture of what you drew" allows the user to begin interpreting while GPT loads. It makes the waiting feel purposeful rather than empty. The reading gains forward momentum immediately after the third card is drawn.

---

## Proposed Solution

After all three cards are drawn in `ThreeCardReading.tsx`, compute the synthesis input using the already-available `computeThreeCardSynthesis` call and render the `astroResonanceNote` above the GPT synthesis skeleton.

The preview should:
- Appear immediately after the third card's interpretation panels are visible
- Show the `astroResonanceNote` string from `computeThreeCardSynthesis` in a distinct but understated visual treatment — not competing with the card interpretations, but visible as a constellation note
- Include one or two additional lines derived from the synthesis signals:
  - If `allMajorArcana`: "All three cards are Major Arcana — archetypal forces are in motion, not merely personal patterns."
  - If `elementDistribution.fireWaterTension`: "Fire and Water in tension across these positions — creative drive and emotional depth are in direct conversation."
  - If `polarityProfile.allReversed`: "All three cards are reversed — the spread is working from the inside out, with blocked or internalized energy throughout."
  - If `polarityProfile.centerReversed && !polarityProfile.allReversed`: "The center card is reversed — the core of the matter is working beneath the surface."
  - If `archetypeFraming.hasFool || archetypeFraming.hasWorld`: name the significance of The Fool or The World appearing.

These notes are pure client-side — no GPT call, no latency. They are generated from the synthesis signals that `computeThreeCardSynthesis` already returns.

The constellation preview should visually appear as a transition element between the individual card panels and the GPT synthesis section — a thin divider with a small constellation note, making visible the shape of what was drawn before the AI interpretation arrives.

---

## Why This Is a Feature, Not a Code Enhancement

This adds new user-visible content to the three-card reading — a constellation preview section that did not exist before. It requires UI changes in `ThreeCardReading.tsx`, a new rendering path for synthesis signals, and potentially a new small component. It is new interpretive surface, not a refactoring of existing behavior.

---

## Impact

**High** (user experience, reading flow). Addresses the dead period between card selection and GPT synthesis for the most common multi-card spread type. Makes the structural reading intelligence visible to users immediately instead of hiding it inside a network call. The `astroResonanceNote` already produces readable, meaningful sentences — they just need a surface to render on.

**Effort:** Low-Medium. The computation already exists. The change is primarily in `ThreeCardReading.tsx`: identify where synthesis input is computed, extract the signals, render them in the appropriate UI position. No engine changes, no new data files, no GPT changes.

---

## Dependencies

- `computeThreeCardSynthesis` is already called in `ThreeCardReading.tsx` (or equivalent) to build the GPT synthesis payload — its output just needs a rendering path before the GPT call completes
- `ThreeCardSynthesisInput.astroResonanceNote` is a string field — already typed and populated
- All signal fields (`elementDistribution`, `polarityProfile`, etc.) are typed and populated

---

## Implementation Summary

**Primary file:** `src/components/tarot/ThreeCardReading.tsx`

**Changes:**
1. After all three cards are selected (when `drawnCards.length === 3`), compute `computeThreeCardSynthesis(drawnCards, positions, astroContext)` — this may already be called for the GPT payload; if so, capture and reuse the result
2. Extract `astroResonanceNote` and key structural signals from the synthesis input
3. Render a "constellation preview" section between the card interpretations and the GPT synthesis loading state:
   - The `astroResonanceNote` string as the primary note
   - Conditional additional lines based on polarity, arcana, and archetype signals
4. Keep the visual treatment understated — a small italicized note in `text-mystic-muted/80`, not a prominent section header

**Optional companion file:** A small `ThreeCardConstellationPreview.tsx` component to keep the rendering logic clean and isolated from the main reading flow.

**Tests:** The `computeThreeCardSynthesis` function already has test coverage. No new engine tests needed. The UI rendering is testable via component snapshot tests if the project uses them.
