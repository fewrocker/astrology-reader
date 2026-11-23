# Technical Analysis — Tarot Module (Sprint 0029)
*Voice: John Carmack*

---

## What This Sprint Actually Is

Five bugs. Three of them block core interactions. Two are content failures that make the premium feature look unfinished. The vision document gives a technically precise account of each one, and I've verified it against the code. My job here is to say where the analysis is correct, where it's incomplete, and what the cleanest fix path looks like for each.

Sprint 0028 was a depth sprint. This is a repair sprint. The distinction matters because the right engineering posture is different: no new abstractions, no infrastructure changes, no feature gating. Every fix should be the smallest change that makes the observable behavior correct.

---

## Bug 1 — Single-card: card stands with no affordance after shuffle

**Root cause:** `SingleCardReading.tsx` renders `card !== null` and `revealReady = selectedCount > 0` immediately after `handleSelect` fires — but `setRevealed(true)` doesn't happen until 480ms later via `window.setTimeout`. The gap state (`card present, revealReady true, revealed false`) has no UX attached to it. The "Seeking clarity on:" text was in `DeckShuffleAnimation` and disappears when that component unmounts.

The current render path at the gap state:
- `card` is not null — CardReveal renders
- `revealReady` is true — opacity ramps to 1 (via `translateY(0)` and `opacity: 1` on the container)
- `revealed` is false — CardReveal shows the back face
- No text, no instruction, no glow

The vision document's description of this as a "72% opacity" limbo is correct except that opacity actually reaches 1 by `revealReady = true`. The card is fully visible and fully silent.

**Clean fix:** Add a conditional block to `SingleCardReading.tsx` that renders when `revealReady && !revealed`. Inside it: a glow animation on the card container (CSS keyframes, same approach used in `ThreeCardReading.tsx` for `tarot-ring-pulse`), and the text "Visualize your intention and click on the card to start the ritual." This is a one-spot render gate. No state machine change, no new hooks.

The text and glow should render beneath the card visual, not overlaid on it — preserve the existing layout contract. The glow should be on the card's wrapping `div` (the one with `maxHeight: 'none'`), not on `CardReveal` internally, because `CardReveal` is a shared component.

**One thing the vision document doesn't mention:** `handleSelect` in `SingleCardReading` also calls `onPickCard(deckIndex)` before starting the 480ms timer. That means the parent has already pre-picked the card via its own `useEffect` in `SingleReadingFlow` before `handleSelect` fires. The 480ms timer in `SingleCardReading` is the only gate between card selection and reveal. If someone clicks the card in that window — which is now going to be afforded by the glow — the `onClick` on `CardReveal` needs to be wired. Looking at `CardReveal.tsx` (the version imported in `SingleCardReading`, not the inline one in `ThreeCardReading`), it handles reveal via props. `SingleCardReading` doesn't pass an `onClick` to `CardReveal` at all — it's treating the card as a pure display component and relying on the timer. The affordance text is inviting the user to click something that has no click handler. **This is the actual bug to fix: wire a click handler on the card back that fires `setRevealed(true)` immediately when `revealReady && !revealed`.** The timer is there as a fallback for the ritual flow path; direct click should shortcut it.

---

## Bug 2 — Three-card: stuck after placement, first card has no glow or click

The vision document's diagnosis here is correct but slightly misdirected about which staleness path is actually failing. Let me be precise.

`handleCardTap` is a `useCallback` with dependency array `[activeCardIndex, triggerRevealOverlay]`. `activeCardIndex` is derived as:

```typescript
const activeRevealIndex = placementComplete && revealedCount < 3 ? revealedCount : null
const activeCardIndex = activeRevealIndex
```

When `placementComplete` transitions from false to true (the `selectedCount === 3 && drawnCards.length === 3` check), `activeCardIndex` immediately becomes `0`. React re-renders. `handleCardTap` is reconstructed because `activeCardIndex` changed. **That part is fine.**

The actual problem is in `CardReveal`'s `onClick` binding:

```tsx
onClick={hasPickedCard && !revealed && isActive ? onTap : undefined}
```

`isActive` is `i === activeCardIndex`. On the render immediately after `placementComplete` becomes true, `activeCardIndex` is `0` and `revealedCount` is `0`. Card 0 should be active. But look at what's above the card grid in the render:

```tsx
{selectedCount < 3 && (
  <TarotDeckSelection ... />
)}
```

When `selectedCount === 3`, `TarotDeckSelection` unmounts. React performs a batch update. The question is whether `drawnCards.length === 3` has caught up at the moment `selectedCount === 3` is true. The parent calls `onPickCard(deckIndex)` via `handleActualDeckSelect`, which sets `selectedCount` via `handleDeckSelect`. But `drawnCards` is set in the parent and passed as a prop — it's owned by the parent. The `drawnCards` prop and `selectedCount` state are out of sync by exactly one render in the common case: the parent sets `drawnCards` and triggers a re-render, then the child receives the new `drawnCards`, but `selectedCount` was already at 3 from the previous render.

So `placementComplete = selectedCount === 3 && drawnCards.length === 3` actually gates correctly — it requires both. This is fine.

**The real bug I see:** look at `dimmed`:

```tsx
dimmed={!revealedMask[i] && (selectedCount === 0 || i !== activeCardIndex)}
```

When `placementComplete` is true and `activeCardIndex === 0`:
- Card 0: `dimmed = !false && (false || 0 !== 0) = false` — not dimmed, correct
- Card 1: `dimmed = !false && (false || 1 !== 0) = true` — dimmed
- Card 2: `dimmed = !false && (false || 2 !== 0) = true` — dimmed

The ring-pulse animation fires on card 0:
```
animation: !revealed ? `tarot-breathe 3s ease-in-out infinite${isActive ? ', tarot-ring-pulse 2s ease-in-out infinite' : ''}` : 'none',
```

So card 0 DOES get the pulse when `isActive = true`. This means the visual affordance should be there. If it's not visible in testing, the problem is either:
1. The `phase !== 'all-revealed'` guard on the instruction panel — it correctly shows "All three cards are placed. Reveal them one by one." But this panel only shows when `activePosition` is defined, and `activePosition` is null when both `activePlacementIndex` and `activeRevealIndex` are null. Wait — `activeRevealIndex` is `revealedCount < 3 ? revealedCount : null` when `placementComplete` — so it IS 0. So `activePosition` is `spreadPositions[0]`, and the panel should show "Click [Position] to reveal it."

Let me look more carefully. The instruction panel shows when `phase !== 'all-revealed'`. The initial `phase` is `'idle'`. After `placementComplete`, `phase` is still `'idle'` until the first `handleCardTap` fires. So the instruction panel IS visible. The text is "Click [Position] to reveal it." The glow should be on card 0.

The vision document says the bug is a stale closure where `activeCardIndex` is `null` in the old `handleCardTap`. I think the actual failure mode is more likely a timing issue with `drawnCards.length` — specifically: if `selectedCount` reaches 3 but `drawnCards` has only 2 entries (because the parent hasn't finished processing the third selection), then `placementComplete` is false, `activeCardIndex` is null, and the old `handleCardTap` correctly guards with `if (index !== activeCardIndex) return` (where `activeCardIndex` is null, so `index !== null` is always true, meaning the tap does nothing).

**The real fix:** The parent component needs to guarantee that `drawnCards.length === selectedCount` at all times. If `drawnCards` is populated synchronously when `onPickCard` fires, there's no gap. If it's async or batched differently, there is. Verify the parent's state update order. If the gap is real, the fix is to merge `selectedCount` into derived state from `drawnCards.length` rather than tracking them separately.

**Secondary fix:** Even if the glow and click work correctly, the instruction text "All three cards are placed. Reveal them one by one." shows in `activeInstruction` only when `activePlacementIndex === null && activeRevealIndex === null` — but as I showed, `activeRevealIndex` is 0 when `placementComplete`, so the instruction says "Click [position] to reveal it." That's correct. No bug here.

**The actual fix needed:** Wire `handleCardTap` correctly so the click registers. The vision doc's "stale closure" framing is plausible in development/StrictMode but not the production failure. In production, the more likely bug is that `drawnCards.length` lags `selectedCount` by one render frame. The fix: in the parent component, update `drawnCards` synchronously with `selectedCount`, or derive `selectedCount` from `drawnCards.length`.

---

## Bug 3 — Celtic Cross: clicking a card does not scroll to interpretation content

This one is simple and the vision document nails it. `InterpretationPanel` in `CelticCrossReading.tsx` mounts below the card grid. The card grid takes up most of the viewport. The user taps a card (which calls `handleContinue`), `setPhase('holding')` fires, `reveal(next)` fires, `InterpretationPanel` mounts — but it's 600–900px below the fold on mobile.

The fix: add a `useRef` to the `InterpretationPanel` container div, and in the `useEffect` that watches `activePosition` and `phase`, call `interpretatonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })`. Guard with `window.matchMedia('(prefers-reduced-motion: reduce)').matches` — if reduced motion, use `behavior: 'instant'`.

There are two places where `reveal()` can be called that should trigger scroll:
1. `revealInitialCross()` — positions 1 and 2 simultaneously
2. `handleContinue()` — each subsequent position

The cleanest approach: `useEffect` that watches `[activePosition, revealedPositions]`. When `revealedPositions.has(activePosition)` and `phase === 'holding' || phase === 'continuing'`, scroll to the panel ref. This handles both paths.

One practical issue: the `InterpretationPanel` is conditionally rendered based on `currentInterp && currentDc && (phase === 'holding' || phase === 'continuing')`. If the ref is on the conditional container, it won't exist until after the re-render that creates the panel. Use `useEffect` with a small `requestAnimationFrame` or `setTimeout(0)` to wait one frame before scrolling, giving React time to mount the panel DOM node.

**Do not use `window.scrollTo` with a hardcoded pixel value.** Use `scrollIntoView` on the ref — it's layout-agnostic and survives mobile/desktop/font-size differences.

---

## Bug 4 — Celtic Cross instant interpretations have zero positional awareness

This is the cleanest diagnosis in the whole vision document and it's exactly right. The call chain:

`computeInstantInterpretation(sourceCard, reversed, celticPosition, tarotAstroContext)`
→ `adaptInterpretationToPosition(interpretation, position)`
→ `getThreeCardSpreadProfile(position)`
→ returns `null` because `position.spreadType === 'celtic-cross'`
→ returns interpretation unchanged

The position data is being passed in — `celticPosition` is a `CelticCrossPosition` from `CELTIC_CROSS_POSITIONS` — but the `adaptInterpretationToPosition` function only handles three-card spread types. The Celtic Cross positions aren't in `SPREAD_POSITIONS` at all; they use the parallel `CELTIC_CROSS_POSITIONS` array with `CelticCrossPosition` type (which has `name`/`description` instead of `label`/`meaning`). These are two different data shapes for the same conceptual thing.

**The structural problem:** `computeInstantInterpretation` takes a `SpreadPosition` from `src/data/tarot/spreadPositions.ts` — the SPREAD_POSITIONS array. But `handleActualDeckSelect` in `CelticCrossReading.tsx` passes `CELTIC_CROSS_POSITIONS[selectionIndex]` which is a `CelticCrossPosition`, a different interface. TypeScript is allowing this because `CelticCrossPosition` has compatible required fields for `SpreadPosition`. But the `label` and `meaning` fields on `SpreadPosition` come from `CELTIC_CROSS_POSITIONS`'s `name` and `description` — except... wait. Let me check the actual call:

```typescript
const celticPosition = CELTIC_CROSS_POSITIONS[selectionIndex]
const interpretation = computeInstantInterpretation(
  sourceCard,
  reversed,
  celticPosition ?? null,
  tarotAstroContext,
)
```

And `computeInstantInterpretation` expects `SpreadPosition | null`. `CelticCrossPosition` has `id`, `number`, `name`, `description`, `zone`, `gridArea` but NOT `label`, `meaning`, `spreadType`, `positionIndex`. These are different types entirely. TypeScript should be catching this. It's passing `null` check because `celticPosition ?? null` can be null, and when it's not null, TypeScript is either doing structural duck-typing or the types have been incorrectly widened somewhere.

Looking at the engine call: `positionLabel: position?.id !== 'single' ? (position?.label ?? null) : null`. If `CelticCrossPosition` doesn't have `label`, this resolves to `undefined ?? null = null`. So `positionLabel` in the InstantInterpretation is always null for Celtic Cross cards.

**The fix has two parts:**

1. Wire `positionLabel` and `positionMeaning` to the Celtic Cross card's position name and description. In `handleActualDeckSelect`, before calling `computeInstantInterpretation`, construct a minimal adapter or pass position info separately. The cleanest approach: in `computeInstantInterpretation`, add a separate `celticPositionOverride?: { label: string; meaning: string }` parameter, or check for `CelticCrossPosition` shape by duck-typing on `name` vs `label`. I'd prefer just adapting `CelticCrossPosition` to `SpreadPosition` at the call site — it's one mapping.

2. Add static positional meaning strings. The vision document is right that these should be written at the same register as the existing `CELTIC_CROSS_POSITIONS` descriptions — not generic. Each string should name what this card's draw at this position means for reading: "The Outcome position asks what this card points toward when all other energies have had their say — not what it promises, but what its direction implies." That register. This can live directly in `CELTIC_CROSS_POSITIONS` as a new `cardDemand` field, or in a separate map keyed by position id.

**What not to do:** Don't try to make `adaptInterpretationToPosition` handle Celtic Cross positions. That function is built around the three-card spread profile model (5 spread types × 3 positions × 4 interpretation frames). Adding Celtic Cross would require 10 positions × 4 frames = 40 strings, and the result would be a massive expansion of a function that already has a clear, bounded scope. Keep Celtic Cross positional depth separate — in the position data itself, surfaced in the rendering layer.

---

## Bug 5 — Celtic Cross GPT synthesis always fails

The vision document lists three candidates. I've read the code and I can rank them.

**The most likely failure:** The client-side `TarotCelticSynthesisPayload` interface in `src/services/gptInterpretation.ts` has `natalDominantModality: 'Cardinal' | 'Fixed' | 'Mutable' | null`, but the server-side `TarotCelticSynthesisPayload` in `server/services/gptTarot.ts` has `natalMoonPhase: string | null` as a field. The client sends `natalMoonPhase` because the interface has it — but does the client's `buildCelticSynthesisPayload` actually populate it?

Looking at `buildCelticSynthesisPayload` in `CelticCrossReading.tsx`:
```typescript
natalMoonPhase: astroContext.lunarPhaseName,
```

`astroContext.lunarPhaseName` is `string | null`. This populates fine.

**What's actually different between client and server types:**

Client's `TarotCelticSynthesisPayload` has `natalDominantModality`. Server's has `natalDominantModality` too. They match. But the client's payload-building code in `buildCelticSynthesisPayload` doesn't include `chartRulerPlanet` — check line by line:

```typescript
// Server type has:
chartRulerPlanet: string | null

// Client buildCelticSynthesisPayload sends:
// ... not listed in the function
```

Looking at `buildCelticSynthesisPayload`:
```typescript
return {
  cards: cards.map(...),
  positions: ...,
  userIntention,
  natalSunSign: astroContext.natalSunSign ?? '',
  natalMoonSign: astroContext.natalMoonSign ?? '',
  natalAscSign: astroContext.natalAscendantSign ?? '',
  chartRulerPlanet: astroContext.chartRulerPlanet,   // ← present
  natalDominantModality: astroContext.natalDominantModality,
  natalMoonPhase: astroContext.lunarPhaseName,
  ...
  personalYear: 0,   // ← HARDCODED ZERO
  lifePathNumber: 0, // ← HARDCODED ZERO
```

The `personalYear: 0` and `lifePathNumber: 0` are hardcoded. These go into the prompt. The server computes authoritative versions from `userId` when available. This is not the crash cause — it's a data quality issue.

**The actual crash site:** The server's `handleTarotCelticSynthesis` does this:

```typescript
const { cards, positions } = payload
const signals = payload.signals ?? computeCelticStructuralSignals(cards)

const cardLines = cards.slice(0, 10).map((card, i) => {
  const pos = positions[i]
  const reversalText = card.reversed ? ' (reversed)' : ' (upright)'
  return `${i + 1}. ${pos.label} — ${card.name}${reversalText}
   ${card.symbolicTheme}. ${card.coreMeaning}
   Sky connection: ${card.astroHeadline}`
}).join('\n\n')
```

If `positions[i]` is undefined for any `i` in `[0, 9]`, `pos.label` throws `TypeError: Cannot read properties of undefined (reading 'label')`. When does this happen?

The client sends `positions` as:
```typescript
positions: CELTIC_CROSS_POSITIONS.map((pos, i) => ({
  index: i,
  label: pos.name,
  meaning: pos.description,
})),
```

`CELTIC_CROSS_POSITIONS` has 10 entries. `cards` is `drawnCards.map(...)`. But `drawnCards` in `CelticCrossReading.tsx` is populated one at a time as users select cards. `fireEarlySynthesis` fires during `cross-staff-transition` phase — that's when `activePosition` moves from 6 to 7. At that point, 6 cards have been revealed (positions 1-6), but ALL 10 cards have been DRAWN (the user selects all 10 in the drawing phase before any reveals happen). So `drawnCards.length` should be 10 when synthesis fires.

**Wait, look more carefully.** The `fireEarlySynthesis` fires inside the `cross-staff-transition` `useEffect`:

```typescript
useEffect(() => {
  if (phase !== 'cross-staff-transition') return
  setTransitionVisible(true)
  fireEarlySynthesis()
  ...
}, [phase])
```

`fireEarlySynthesis` is a `useCallback` with `[drawnCards, tarotAstroContext, userIntention, dailyTransitSummary, weeklyTransitSummary, moonSign]`. At the time `cross-staff-transition` fires, `drawnCards` should have all 10 cards. The `selectedCount === 10` happens in the drawing phase, before the reading phase begins. This path looks correct.

**The real failure is somewhere else.** The curl in `aios/guidelines.md` sends 10 cards and 10 positions. The request gets to the server. The server routes to `handleTarotCelticSynthesis`. Let me look at what can throw between route entry and the OpenAI call.

The server handler starts with:
```typescript
if (userId) {
  const ctx = resolveUserBirthContext(userId)
  if (ctx) {
    ...
    const natalChart = calculateChart(ctx.birthDate, ctx.birthTime, ctx.lat, ctx.lng, ctx.tz, ctx.unknownTime)
```

If `resolveUserBirthContext` returns a context with missing/malformed `lat`, `lng`, or `tz` fields, `calculateChart` may throw. This error is NOT caught — the `if (userId)` block has no try/catch. A thrown error propagates to the route handler and returns a 500.

**This is the most likely actual failure** for authenticated users. The curl in the guidelines sends a valid `auth_token` cookie. The session resolves to a user. The birth context lookup or chart calculation throws.

**The fix:** Wrap the entire `if (userId)` block in `try/catch`. On catch, log the error and fall through to the client-supplied values. This is the defensive pattern used elsewhere in the codebase (both `computeDominantElement` and `computeDominantModality` in `tarot.ts` have `try/catch` with null fallback).

There's also a secondary robustness issue: `getTarotCelticSynthesis` on the client side throws `Error('Empty synthesis response')` if `parseCelticChapters` returns zero chapters. The regex split in `parseCelticChapters` is:

```typescript
text.split(/\n(?=(?:#{1,6}\s+|\*\*[^*\n]+\*\*\s*$|\d+\.\s+[A-Z]))/m)
```

If GPT returns its sections in a format that doesn't match any of these three heading patterns — a realistic failure when the model deviates from formatting instructions — the entire response is not split, falls through, and the single part becomes one chapter with heading `'Synthesis'` and body equal to the full text. The filter `c.body.length > 0 || c.heading !== 'Synthesis'` then drops it because heading IS 'Synthesis' and body.length > 0... wait, no: `c.body.length > 0 || c.heading !== 'Synthesis'`. For our case: `true || false = true`. So it's kept. The `chapters.length === 0` check would only fail if the text is empty. The real issue is structural, not the empty check.

**Summary of Bug 5 fixes:**
1. Add `try/catch` around `if (userId)` block in `handleTarotCelticSynthesis` — primary fix
2. Log the error server-side so it can be diagnosed
3. Verify that `payload.cards.length === 10` at the server before accessing `positions[i]` — add a guard
4. Fix the hardcoded `personalYear: 0` in `buildCelticSynthesisPayload` — not the crash cause but wrong data going to GPT

---

## The Structural Problem Nobody Named

There are two parallel data models for Celtic Cross positions. `CELTIC_CROSS_POSITIONS` (with `name`/`description`/`number`/`zone`/`gridArea`) and the entries in `SPREAD_POSITIONS` filtered by `spreadType === 'celtic-cross'` (with `id`/`label`/`meaning`/`positionIndex`). The `CelticCrossReading.tsx` component uses `CELTIC_CROSS_POSITIONS`. The engine (`computeInstantInterpretation`) uses `SPREAD_POSITIONS`. These never meet, which is why Bug 4 exists.

The right long-term fix is to have one authoritative Celtic Cross position array. Either:
- Make `CELTIC_CROSS_POSITIONS` the authority and have the component + engine both use it
- Or merge the grid layout data (`zone`, `gridArea`) into the `SPREAD_POSITIONS` entries

Either approach eliminates the current fragility where a developer can add a new field to one array and not update the other. For sprint 0029, an adapter at the call site is faster and lower risk. But this structural debt should be logged as a follow-on task.

---

## The Dead Code from Sprint 0028 Is Still There

In the previous analysis I noted that `gptTarot.ts` had duplicate `computeDominantModality` functions. After reading the current file, there's now only one (`computeDominantModality` with `SIGN_MODALITIES` from the same file). Sprint 0029's version has cleaned this up — or it was cleaned between sprints. Either way, the dead code concern from sprint 0028 is resolved.

---

## What I Would Not Do

- Don't try to generalize `adaptInterpretationToPosition` to handle Celtic Cross. It's a clean, bounded three-card function. Keep it that way.
- Don't add a feature flag or runtime config for the scroll behavior. Just scroll.
- Don't add new state to `ThreeCardReading.tsx` to track the "tap affordance shown" phase. The existing state is sufficient — derive from `placementComplete && revealedCount === 0`.
- Don't use `window.scrollTo` with computed pixel offsets for Bug 3. `scrollIntoView` on the panel ref is the right primitive.

---

## Priority Order

1. **Bug 5 — GPT crash:** Wrap `if (userId)` in try/catch in `handleTarotCelticSynthesis`. This unblocks the premium feature entirely. Should take 15 minutes.

2. **Bug 2 — Three-card stuck:** Verify whether `drawnCards.length` and `selectedCount` are synchronized at the parent level. If not, derive `selectedCount` from `drawnCards.length`. If they are synchronized, the `useCallback` dependency array is the issue — add a direct `activeCardIndex` ref that updates synchronously.

3. **Bug 1 — Single-card no affordance:** Wire click handler on the card back + render the glow + instruction text at `revealReady && !revealed`. The text and glow are additive UI; the click handler is the functional fix.

4. **Bug 3 — Celtic Cross no scroll:** Add ref to `InterpretationPanel` container, add `useEffect` that calls `scrollIntoView` when `revealedPositions` changes.

5. **Bug 4 — Celtic Cross positional awareness:** Map `CelticCrossPosition` to `SpreadPosition` at the call site in `handleActualDeckSelect`. Write the 10 static positional demand strings directly into `CELTIC_CROSS_POSITIONS` as a new `cardDemand` field. Render in `InterpretationPanel`.

*The code is structurally sound. These are real bugs in real interaction paths, and they're all fixable without architectural changes.*
