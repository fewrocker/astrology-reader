# Sprint 0029 — Vision

## Sprint Focus

This sprint repairs five confirmed bugs in the Tarot feature that prevent the product
from functioning as designed — then extends the Celtic Cross instant interpretation
with static positional meanings that give the reading depth before GPT loads. All five
bugs are explicitly enumerated in `aios/guidelines.md`. No new capabilities are added
until these regressions are closed.

## Why Now

Sprints 0025–0028 built real depth: live transit context, position-aware interpretation,
natal resonance notes, three-card constellation preview, orb-weighted dominant transit
selection, and 193 transit adaptation entries. The infrastructure is excellent. The user
experience is broken in four of the three reading modes.

The guidelines file (`aios/guidelines.md`) is a firsthand account of five failures
observed in production. Two of them block the user from proceeding at all — the
three-card reveal interaction and the Celtic Cross GPT synthesis always failing. One
leaves a card standing on screen with no instruction. One is a silent UX deficiency
(Celtic Cross card clicking does not auto-scroll to content). One is a content gap
(Celtic Cross instant interpretations have zero positional awareness despite 10 richly
defined positions). These are not edge cases; they touch the core interaction loop of
the product's most premium feature.

The product is also at a pivot point: the last four sprints layered sophistication on
top of bugs that were accumulating since the Celtic Cross was shipped. Delivering sprint
0029 as a focused bug-fix + depth sprint clears that debt and restores confidence in
the foundation before any further expansion.

## Where to Look

### Bug 1 — Single-card ritual: card stands with no affordance after shuffle

**Files:** `src/components/tarot/SingleCardReading.tsx`, `src/components/tarot/DeckShuffleAnimation.tsx`

After `DeckShuffleAnimation` completes and the parent (`TarotPage.tsx > ShuffleRitualFlow`)
calls `onRevealComplete`, control transfers to `SingleCardReading`. The component renders
with `card !== null` and `revealed === false` (the flip has not happened yet). The
"Seeking clarity on: [intention]" text that lived in `DeckShuffleAnimation` is gone.
The card is visible but the `revealReady` guard prevents full opacity until `selectedCount > 0`.
Because the ritual path pre-picks the card via `handlePickCard` in `SingleReadingFlow.useEffect`,
`selectedCount` is immediately 1 — but `revealed` is still `false` until `handleSelect`
fires `setRevealed(true)` after a 480ms delay. During the gap: a card standing at 72%
opacity with no text. The fix adds a glowing pulse animation on the card back and the
text "Visualize your intention and click on the card to start the ritual" at the
`selectedCount > 0 && !revealed` phase gate.

### Bug 2 — Three-card: stuck after all three cards selected; first card has no glow or click

**Files:** `src/components/tarot/ThreeCardReading.tsx`

After `selectedCount === 3` and `drawnCards.length === 3`, `placementComplete` becomes
`true` and `activeRevealIndex` resolves to `revealedCount = 0` — so `activeCardIndex`
is `0`. The `CardReveal` at index `0` correctly receives `isActive={true}`. The
`onClick` is bound. The glow animation (`tarot-ring-pulse`) fires. But the bug is in
a subtle condition: the synthesis `useEffect` starts firing immediately when
`placementComplete` becomes true (`synthesisStartedRef.current = false` initially).
In React StrictMode, that effect fires twice in development — which resets
`synthesisStartedRef.current` to `true` on the first invocation, preventing the second
from proceeding — but the real production bug is different: the instruction panel
(the box showing "Click [Position] to reveal it") conditions its text on
`activePlacementIndex !== null`, but once all three are placed, `activePlacementIndex`
is `null`. The rendered instruction correctly says "All three cards are placed. Reveal
them one by one." — but the instruction panel itself is hidden behind the condition
`phase !== 'all-revealed'`. When `phase === 'idle'` (just transitioned from placement),
the panel renders. The real bug: the card tap handler guard `if (index !== activeCardIndex) return`
uses the captured `activeCardIndex` value from the enclosing scope. If the `useCallback`
dependency array is stale (note: `handleCardTap` depends on `[activeCardIndex, triggerRevealOverlay]`),
a re-render after `placementComplete` sets a new `activeCardIndex = 0` but the old
closure still has `null`. This is the staleness window where the first tap hits the old
`null` guard and returns without acting. Fix: ensure `activeCardIndex` is not stale
when `handleCardTap` is reconstructed, and add a brief visual state (glow + label
"Tap to reveal") that confirms interactivity after all cards are placed.

### Bug 3 — Celtic Cross: clicking a card does not scroll to interpretation content

**Files:** `src/components/tarot/CelticCrossReading.tsx`

When `handleContinue` advances to the next card position and calls `reveal(next)`,
the `InterpretationPanel` mounts below the card grid. On mobile and desktop, the
panel is well below the viewport fold. The user sees no feedback from their tap because
the content they tapped to see has rendered off-screen. The fix: after each card
reveal, `scrollIntoView` or `window.scrollTo` to the `InterpretationPanel`'s position.
A `ref` on the panel container suffices; `behavior: 'smooth'` applies only if
`prefers-reduced-motion` is not set.

### Bug 4 — Celtic Cross instant interpretations have zero positional awareness

**Files:** `src/engine/tarot.ts`, `src/data/tarot/spreadPositions.ts` (Celtic Cross positions),
optionally a new `src/data/tarot/celticPositionMeanings.ts`

In `computeInstantInterpretation`, the call to `adaptInterpretationToPosition` returns
`null` for any Celtic Cross position because `getThreeCardSpreadProfile` explicitly
returns `null` when `position.spreadType === 'celtic-cross'`. The result: every one of
the 10 Celtic Cross instant interpretation panels shows the card's generic upright or
reversed meaning with no awareness of whether it landed in "Present Situation,"
"Outcome," "Unconscious Influence," or any other position. All 10 CELTIC_CROSS_POSITIONS
have `name` and `description` fields — rich content already written — but none of it
reaches the interpretation.

The fix has two layers:
1. Surface the position `name` and `description` at the top of the `InterpretationPanel`
   (in `CelticCrossReading.tsx`) as a position header — this is already done for the
   position label and meaning in the `interp.positionLabel` / `interp.positionMeaning`
   fields, but `CELTIC_CROSS_POSITIONS` uses `name`/`description` instead of
   `label`/`meaning`. Wire them into the `computeInstantInterpretation` call so
   `positionLabel` and `positionMeaning` are populated.
2. Add static "positional core meaning" strings for each of the 10 Celtic Cross
   positions — short, direct statements of what this card draws out from this specific
   position. Not GPT text. Static strings written once, used always. These anchor
   the reading before synthesis loads. Each string should name what the position
   _demands_ of the card, not describe the position abstractly (that already exists).

### Bug 5 — Celtic Cross GPT synthesis always fails

**Files:** `server/services/gptTarot.ts`, `server/services/gpt.ts`, `src/services/gptInterpretation.ts`

The curl from `aios/guidelines.md` sends a valid `tarot-celtic-synthesis` payload to
`/api/gpt/interpret`. The handler exists (`handleTarotCelticSynthesis` is registered
in the `switch` in `handleGptRequest`). The payload structure matches the
`TarotCelticSynthesisPayload` interface. The failure is therefore at runtime, not at
routing. Candidates:

- The `resolveUserBirthContext(userId)` path in `handleTarotCelticSynthesis` may throw
  if the user's birth context is missing required fields (`lat`, `lng`, `tz`) — errors
  from `calculateChart` are not caught inside the `if (userId)` block, and would
  propagate to the route handler which returns 500.
- `retryWithBackoff(() => callOpenAI(...))` may throw with a malformed prompt if any
  template literal in the 200-line prompt is undefined. The `natalMoonPhase` field is
  typed `string | null` but used directly in the prompt — if it arrives null and is
  interpolated as the literal string `"null"` that is acceptable, but if `payload.cards`
  length is not exactly 10, `cards.slice(0, 10)` produces fewer cardLines and
  `positions[i]` returns `undefined`, which causes `pos.label` to throw.
- The payload from `buildCelticSynthesisPayload` in `CelticCrossReading.tsx` passes
  `personalYear: 0` and `lifePathNumber: 0` as hardcoded zeros instead of computing
  them from `birthDate` — this is not the cause of the GPT failure, but it means the
  synthesis always receives 0s for these fields unless the server re-derives them from
  the userId's birth context.

Diagnosis path: reproduce locally with the provided curl; observe the server-side
error log; trace through `handleTarotCelticSynthesis` to find the throw site;
add targeted error handling so partial data does not crash synthesis.

## Quality Bar

"Deep, not shallow" for this sprint means:

- Every bug fix is verified interactively, not just by reading code. The three-card
  flow must be walked through from deck selection to synthesis with the tap at each
  step confirmed working. The Celtic Cross GPT call must return chapters.
- The static positional meaning strings for the Celtic Cross (Bug 4 layer 2) must be
  written at the same register as the existing `CELTIC_CROSS_POSITIONS` descriptions
  — not generic tarot boilerplate. Each string must name what this position demands of
  the specific card sitting in it: "The Outcome position asks what this card points
  toward when all other energies have had their say — not what it promises, but what
  its direction implies." That register. Not "This is the outcome card."
- Tests: the three-card reveal interaction is regression-tested (a test that confirms
  `handleCardTap(0)` updates `revealedMask[0]` and transitions phase). The Celtic Cross
  instant interpretation test confirms that `positionLabel` and `positionMeaning` are
  non-null when called with a Celtic Cross position.
- No new flags, settings, or feature gating. These are fixes to existing functionality.

## What This Sprint Is NOT

- Not a content sprint for new pip reversed meanings (sprint 0027 handled that pattern)
- Not a transit adaptation expansion (193 entries were written in 0027; coverage contracts
  were added in 0028 — the data is sufficient)
- Not a new reading mode or spread type
- Not a UI redesign of any surface beyond the specific fix sites
- Not a GPT prompt quality upgrade (sprint 0026 did that; the synthesis prompts are strong)
- Not a natal personalization depth expansion (chart ruler threading was sprint 0026;
  house-awareness was sprint 0025)
- Not a save/discuss infrastructure change (sprint 0025 fixed saves; they work)
- Not a performance or caching sprint
