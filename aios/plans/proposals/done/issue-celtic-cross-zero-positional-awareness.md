# issue-celtic-cross-zero-positional-awareness

**Type:** Issue Fix
**Originated by:** Jobs, Carmack, Miyazaki, Taleb
**User guidance:** "on celtic cross, the card instant interpretations are having zero positional awareness of where they were open. We need static strings of the meaning of EACH card on EACH position for the static reading. On the reading, it should show the card name + position it was opened"

## Problem

Every one of the 10 Celtic Cross instant interpretation panels shows the card's generic upright or reversed meaning with no awareness of which position the card occupies. A card drawn in "Outcome" renders identically to the same card drawn in "Unconscious Influence." The user sees the card's core meaning — but not what that meaning becomes when it lands in this specific position.

The failure is structural and traceable to a single function. In `src/engine/tarot.ts`, `computeInstantInterpretation` calls `adaptInterpretationToPosition`, which calls `getThreeCardSpreadProfile`:

```typescript
function getThreeCardSpreadProfile(position: SpreadPosition | null): ThreeCardSpreadProfile | null {
  if (!position || position.spreadType === 'single' || position.spreadType === 'celtic-cross') return null
  return THREE_CARD_SPREAD_PROFILES[position.spreadType]
}
```

The `'celtic-cross'` spread type is explicitly excluded. `adaptInterpretationToPosition` receives `null` from this call and returns the interpretation unchanged. `computeInstantInterpretation` then resolves:

```typescript
positionLabel: position?.id !== 'single' ? (position?.label ?? null) : null,
positionMeaning: position?.id !== 'single' ? (position?.meaning ?? null) : null,
```

The `CelticCrossReading` component passes `CELTIC_CROSS_POSITIONS[n]` — a `CelticCrossPosition` object — to `computeInstantInterpretation`. But `CelticCrossPosition` uses `name` and `description` (not `label` and `meaning`), so `position?.label` resolves to `undefined`, and `positionLabel` in the returned `InstantInterpretation` is always `null` for every Celtic Cross card. `positionMeaning` is likewise always `null`.

The position data is rich: each of the 10 entries in `CELTIC_CROSS_POSITIONS` in `src/data/tarot/spreadPositions.ts` already has a `name` and a detailed `description`. None of it reaches the interpretation panel. The InterpretationPanel has the display logic for `positionLabel` and `positionMeaning` already in place — the pipeline simply never populates them.

There is also a pre-existing failing test noted by Taleb: `adapts the instant interpretation text to the actual spread position` in `src/engine/__tests__/tarot.test.ts` — its import of `SPREAD_POSITIONS` is type-only, so the value is missing. This test exercises the exact position adaptation logic that this bug breaks. It should be repaired as part of this fix.

**Reproduction:** Open any Celtic Cross reading, draw all 10 cards, and tap any card to reveal its interpretation panel. The header shows no position label. The core meaning text is the card's generic upright or reversed copy — identical to what a single-card draw of the same card would show. The position played no role.

## Expected behavior

The fix has two layers. Both are required.

**Layer 1 — Wire position name and description into the interpretation pipeline.**

At the call site in `CelticCrossReading.tsx` where `computeInstantInterpretation` is invoked, map the `CelticCrossPosition` shape (`name`, `description`) to the `SpreadPosition` shape (`label`, `meaning`) so the engine receives usable data. The cleanest path is an adapter at the call site rather than modifying the engine's internal type contracts:

```typescript
const spreadPosition: SpreadPosition = {
  id: celticPos.id,
  label: celticPos.name,
  meaning: celticPos.description,
  spreadType: 'celtic-cross',
  positionIndex: celticPos.number - 1,
}
```

After this wiring, `positionLabel` and `positionMeaning` in the returned `InstantInterpretation` will be non-null for all 10 Celtic Cross positions. The interpretation panel will display both the card name and the position it was opened in — satisfying the user's explicit requirement. The `getThreeCardSpreadProfile` function does not need to be modified; the three-card adaptation path is separate and should remain bounded to its three-card spread types.

**Layer 2 — Add static positional core meaning strings for each of the 10 positions.**

These strings are distinct from the existing `description` field on each `CelticCrossPosition`. The `description` explains what the position means in general. The new strings name what the position *demands of the card sitting in it* — the specific pressure this position exerts on any card that lands there. They are written once, static, always present before GPT synthesis loads.

The quality bar is set by the vision document and Miyazaki's analysis: "Each string should name what this position demands of the card sitting in it: 'The Outcome position asks what this card points toward when all other energies have had their say — not what it promises, but what its direction implies.' That register. Not 'This is the outcome card.'"

The test for each string: could it appear in a mass-market tarot workbook without loss? If yes, it is not specific enough. The string must be specific to this position's pressure on the card — not a summary of the position category.

For reference, the register each position's string should operate at:

- **Present Situation (1):** Names the card not as a force approaching or receding, but as a condition the querent is living inside. The card here is a weather, not a direction.
- **Challenge (2):** Names what the card becomes when it is not separate from the situation but physically and symbolically crossing it — complicating the center, qualifying it, changing what card 1 means by being placed over it.
- **Unconscious Influence (3):** Names what the querent may not see but which shapes everything above it. This position makes a claim about what has been operating without the querent's full awareness — the string should name the specific discomfort of that.
- **Recent Past (4):** Names the card as something in motion away from the querent — not fully present, but explaining how the present arrived. What did this energy leave behind?
- **Conscious Goal (5):** Names the aspiration at the surface, with an implicit tension against position 3. The string should ask what this card reveals about what the querent is consciously trying to make happen, and whether that aligns with what the unconscious influence says is actually driving them.
- **Near Future (6):** Names what is approaching — not arrived, but visible on the horizon. Not the outcome; the next development in the trajectory.
- **Inner State (7):** Names the querent's private face of the question — not how they present to others, but how they are actually inhabiting this experience.
- **External Environment (8):** Names the forces and people surrounding the querent. The gap between card 7 and card 8 is diagnostically significant — the string should acknowledge the comparison between what is carried inside and what the environment is offering or withholding.
- **Hopes and Fears (9):** Names the ambivalence at the center of the question — what is most wanted and most dreaded simultaneously. The string should make concrete the feeling of wanting something badly enough to fear it.
- **Outcome (10):** Names the card as the resolution toward which all nine other cards are pointing — not fate, not a promise, but the direction the entire constellation is traveling. Every other card converges here; the string should carry that weight of convergence.

These strings should be added as a `cardDemand` field on each `CelticCrossPosition` entry in `src/data/tarot/spreadPositions.ts`, or in a parallel keyed map in a new `src/data/tarot/celticPositionMeanings.ts` file. Either approach is acceptable; the map approach keeps the existing `CelticCrossPosition` interface stable. The strings should be surfaced in the interpretation panel beneath the `positionMeaning` (the existing position description) and before the card's `coreMeaning` — giving the reader the full positional context before the card speaks.

**Test coverage:** After this fix, the pre-existing failing test `adapts the instant interpretation text to the actual spread position` must be repaired (fix the type-only import of `SPREAD_POSITIONS`). A new test must assert that `computeInstantInterpretation` with a Celtic Cross position — using the adapted `SpreadPosition` shape — produces non-null `positionLabel` and non-null `positionMeaning`. This is the regression guard the vision document specifies and Taleb identifies as the gap that made Bug 4 invisible.
