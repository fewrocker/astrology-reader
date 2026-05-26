# Technical Analysis — Sprint 0025
## Voice: John Carmack

---

I've read the sprint vision, then read every file it points at. Let me tell you what's actually broken, what's silently wrong, and where the debt is compounding.

---

## The Save No-Op: Confirmed and Worse Than Described

The vision correctly identifies the `onSave={() => {}}` no-ops at `TarotPage.tsx` lines 217, 284, and 329. But the full scope of the problem is worth naming precisely.

`CelticCrossReading.tsx` is actually the furthest along: its `handleSave` at line 633 constructs a complete `SavedReading` object — `readingType`, `drawnCards`, `spreadType`, `userIntention`, `astroContextSnapshot`, `interpretationPayload`, `synthesisText` — and passes it to `onSave(reading)`. The parent, `CelticReadingFlow` in `TarotPage.tsx`, receives that at line 329 and throws it away: `onSave={() => {}}`.

`ThreeCardReading.tsx` is in the middle: `handleSave` at line 852 calls `onSave()` with no arguments and sets `saveState` to `'saved'`. The `onSave` prop is typed as `() => void` — no payload. The component also has a `BackConfirmModal` with a "Save before leaving" option that calls the same payloadless `handleSave`. So even the defensive save path does nothing.

`SingleCardReading.tsx` is the most minimal: `handleSave` at line 85 calls `onSave()`, flashes `'Saved'` for 2 seconds via `setTimeout`, then resets. The user receives confirmation UI for a transaction that never happened.

The `saveReading` function in `readingsService.ts` is correct and already wired for use. The `TarotContext` has a `SAVE_READING` action that updates `currentReadingId` and `savedReadingIds`. The infrastructure exists end-to-end. What's missing is the wiring across the parent boundary.

The fix structure is:
1. `SingleReadingFlow` needs to hold synthesisPayload state and a token from `useApp()`, then implement a real `handleSave` using `saveReading()` from `readingsService`.
2. `ThreeCardReading`'s `onSave` prop needs to be retyped to carry the reading payload, or the save call needs to happen inside `ThreeReadingFlow` which already holds all the data (`drawnCards`, `synthesisPayload`, `userIntention`).
3. `CelticReadingFlow`'s `onSave` needs to call `saveReading()` with the `SavedReading` payload it already receives.
4. On success, each flow should dispatch `SAVE_READING` to the context so the saved readings page reflects it.

The deceptive "Saved" label is the most user-hostile bug in the module. It creates false confidence in persistence that does not exist.

---

## Transit Null at Context Build Time: Confirmed

`buildEngineCtx` in `TarotPage.tsx` at line 117:

```typescript
function buildEngineCtx(chartData: ChartData, birthDate: string): TarotAstroContext {
  return buildTarotAstroContext(
    chartData,
    null,       // ← always null
    computePersonalDay(birthDate),
    null,       // ← always null
  )
}
```

`buildTarotAstroContext` in `engine/tarot.ts` at line 454 handles `TransitData | null` correctly — the whole transit processing block is guarded by `if (transits)`. When `null` is passed, `currentTransits` stays `[]`, `retrogradeplanets` stays `[]`, `dominantTransitPlanet` stays `null`, and `lunarPhaseName` stays `null`.

Then in `buildTransitInfluence` (tarot.ts, line 533), the lookup for transit adaptations from `TRANSIT_ADAPTATIONS` requires a match against `astroContext.retrogradeplanets` or `astroContext.dominantTransitPlanet`. Both are empty arrays / null. The function falls all the way through to Level 3 — the static `ASTRO_CONNECTIONS[card.id].baselineNote`. The 397+ `TRANSIT_ADAPTATIONS` entries are completely unreachable at the instant interpretation layer.

The irony is that each reading flow already computes `dailyTransitData` via `useMemo(() => calculateTransits(chartData, 'daily'), [chartData])`. The transit data is right there. It just isn't passed into `buildEngineCtx`.

The fix is exactly what the vision says: pass `dailyTransitData` (which gives you `TransitData`) into `buildTarotAstroContext` as the second argument. But there's a sequencing wrinkle: `buildEngineCtx` is called inside the flow component via `useMemo`, and `dailyTransitData` is also computed via `useMemo` in the same component. The engine context memo depends on `chartData` and `birthDate` but not yet on `dailyTransitData`. The simplest fix is to fold `buildEngineCtx` inline into each flow component so the transit data can be passed directly:

```typescript
const engineCtx = useMemo(
  () => buildTarotAstroContext(chartData, dailyTransitData, computePersonalDay(birthDate), null),
  [chartData, dailyTransitData, birthDate]
)
```

This eliminates the `buildEngineCtx` helper function entirely, which is a positive simplification — it existed only because the context builder call was factored out, but now that it needs additional arguments, it's just an indirection layer with no value.

---

## The `instantInterpretations` Phantom Dependency

This one the vision missed. In `ThreeCardReading.tsx` at line 839, the synthesis `useEffect` dependency array reads:

```typescript
}, [astroContext, drawnCards, instantInterpretations, placementComplete, spreadMode, spreadPositions, userIntention])
```

`instantInterpretations` is not defined anywhere in the `ThreeCardReading` component. It's not a prop (the interface at line 26 has no such field), it's not a state variable, and it's not a local constant. This is either a stale reference from a refactor that removed the variable, or it resolves to `undefined` from outer scope somehow.

In React's dependency tracking, a reference to an undefined variable in a dep array either causes a lint error or silently does nothing harmful — the array still works because the other dependencies are correct. But this is a code smell indicating that a refactor removed a data path (`instantInterpretations` was probably once passed as a prop when the engine layer was split differently) without cleaning up the dependency array. The synthesis effect uses `drawnCards` directly — `dc.interpretation` is already on each `DrawnCard`. The `instantInterpretations` reference should be removed from the dep array.

---

## Double Computation of Transit Data

Each reading flow computes both daily and weekly transits:

```typescript
const dailyTransitData = useMemo(() => calculateTransits(chartData, 'daily'), [chartData])
const weeklyTransitData = useMemo(() => calculateTransits(chartData, 'weekly'), [chartData])
```

`TarotPage.tsx` also constructs an `astroContext` at the module level (line 493) for the `TarotProvider`:

```typescript
const astroContext = useMemo((): TarotAstroContext | null => {
  if (!chartData) return null
  return buildTarotAstroContext(chartData, null, computePersonalDay(birthDate), null)
}, [chartData, birthDate])
```

So the transit calculations are running once at the page level (with null transits), and then again inside each reading flow (with real transits, but still not feeding the engine context). That's three transit computations: one in `SingleReadingFlow`, one in `ThreeReadingFlow`, one in `CelticReadingFlow` — each calling `calculateTransits` twice (daily and weekly). If `calculateTransits` is O(n²) across transit aspect pairs, this is a non-trivial repeated cost for what is effectively the same data. The chart data doesn't change during a session.

The fix here is to hoist the transit calculations into `TarotPageInner` and pass them down as props to the flow components. This also naturally enables passing live transits into the `buildTarotAstroContext` call. Better yet, build the `TarotAstroContext` once in `TarotPageInner` with real transits and pass it down — eliminating the per-flow `buildEngineCtx` calls entirely.

---

## Two Separate `shuffleTarotDeck` and `computeCardReversal` Implementations

`TarotPage.tsx` defines `shuffleTarotDeck` at line 25 and `computeCardReversal` at line 36.

`CelticCrossReading.tsx` defines its own `shuffleTarotDeck` at line 49 and its own `computeCardReversal` at line 58.

Both implementations are identical. This is copy-paste code. `engine/tarot.ts` already exports `drawCards` and `assignReversals` functions that do the same thing deterministically. The ad-hoc `shuffleTarotDeck` functions use `Math.random()` directly and don't produce repeatable results. There is also a `computeDailyDrawSeed` export in `tarot.ts` that's presumably for deterministic draws — but neither the single, three-card, nor Celtic flows use it. The shuffle is pure noise. That's a design choice, but it means two duplicate Fisher-Yates implementations are floating around when one should live in a shared utility.

---

## The `formatTransitSummary` Duplication

`TarotPage.tsx` defines `formatTransitSummary` at line 78. `server/services/gptTarot.ts` defines an identical function at line 380. The client-side version formats transit data from `calculateTransits` (frontend engine), the server version from `calculateTransits` (server engine). They produce the same string format.

This is not a problem for correctness today — client sends the formatted string to the server, and the server has its own formatting function for the server-auth path (when `userId` is provided). But the format contract between client and server is defined implicitly by two separate implementations. If one changes, the other may drift. Both functions should at minimum be documented as format-contract mirrors. Ideally the format would be a shared spec.

---

## The `TarotAstroContext` in Provider is Transit-Blind and Unused

`TarotPage.tsx` line 493 builds an `astroContext` for `TarotProvider`. That context is what gets injected into `TarotContextValue.astroContext`. But `TarotPageInner` doesn't use `useTarot()` to access this context for the reading flows — instead, each flow calls `buildEngineCtx` locally. The provider-level context is used only by `TarotHomeView` (which uses `useTarot()` to show the home view content).

So there are two `TarotAstroContext` objects in memory simultaneously: one in the provider (transit-blind, for the home view) and one in each reading flow (also transit-blind due to the null pass-through, but the intent is that it could be transit-aware). Neither is actually transit-aware.

This is an architectural smell. The provider should hold the canonical context, built once with real transits, and reading flows should read from it via `useTarot()` rather than each constructing their own. The split between "provider context" and "per-flow context" is creating confusion about which one is authoritative.

---

## Natal House Data: Confirmed Absent

The `TarotAstroContext` type (tarot.ts, line 19) has no house fields. `buildTarotAstroContext` (tarot.ts, line 454) never reads `planet.house` from any natal planet. The `ChartData` type does include house assignments on planets (the transit engine's `formatTransitSummary` uses `aspect.natalHouse` in its output string — line 95 of TarotPage.tsx). The data is in the natal chart; it just isn't extracted into the context.

The sprint vision asks for Moon house, Venus house, and North Node house at minimum. Adding these three fields to `TarotAstroContext` is a straightforward read from `natalChart.planets.find(p => p.name === 'Moon')?.house`. The GPT synthesis prompts in `gptTarot.ts` would then need a line added to "This Person's Sky Right Now" — something like `Moon in ${natalMoonHouse ? `house ${natalMoonHouse}` : 'unknown house'}`.

---

## Discuss Context: Confirmed Thin, and ThreeCard is Better Than Single

`SingleCardReading.tsx` `discussContext` at lines 64–77 is exactly as described in the vision: card name, reversal, arcana, core meaning, symbolic theme, emotional meaning, practical guidance, reflection question, personal day. No natal signs, no transits, no synthesis text.

`ThreeCardReading.tsx` at line 880 is actually richer: it includes the spread type, intention, all three card core meanings, themes, guidance, and a line from the synthesis. Still no natal signs and no transit data, but it's structurally better than the single-card context.

`CelticCrossReading.tsx` `buildDiscussContext` at line 151 is the richest: natal Sun/Moon/Ascendant signs, moon phase, personal day, advance category, all ten positions with card name and headline, pre-synthesis signals (major arcana count, dominant element, reversals), and all synthesis chapters. This is the pattern to copy for single and three-card.

The inconsistency across three flows in the same feature is a maintenance problem. A future developer adding a natal field must remember to add it in three separate string-building sites with no shared abstraction to enforce completeness.

---

## Advance Score: Confirmed Not Threading

`buildEngineCtx` always passes `null` as the fourth argument to `buildTarotAstroContext`. The vision identifies that `advanceSnapshotSessionCache` is importable from `AdvanceTab.tsx`. I cannot confirm the exact import path without reading that file, but the pattern is correct: the cached advance score exists, is accessible, and is not being passed into the engine context. The result is that `buildAdvanceCategoryNote` in tarot.ts (line 673) always receives a null `advanceCategory` and returns an empty string. The `ADVANCE_CATEGORY_NOTES` map (five entries, lines 142–148) is dead code for the instant interpretation layer.

---

## The `TarotCelticSynthesisPayload` Has Duplicate Fields

In `gptTarot.ts` lines 270–292, `TarotCelticSynthesisPayload` declares `dailyTransitSummary` and `weeklyTransitSummary` twice:

```typescript
export interface TarotCelticSynthesisPayload {
  // ...
  dailyTransitSummary: string | null      // line 284
  weeklyTransitSummary: string | null     // line 285
  localDate: string
  signals?: CelticStructuralSignals
  dailyTransitSummary?: string | null     // line 289 — duplicate, optional
  weeklyTransitSummary?: string | null    // line 290 — duplicate, optional
}
```

TypeScript handles this by using the last declaration, making the first two non-optional declarations effectively overridden. This is a type system bug that TypeScript doesn't error on in interface bodies — the field ends up typed as `string | null | undefined` which is looser than the intended `string | null`. It should be cleaned up.

---

## The `userId: ''` in `SavedReading` Construction

`CelticCrossReading.tsx` line 637: `userId: ''`. The `SavedReading` type has a userId field that is supposed to be set by the auth context, but the component hardcodes an empty string. This reading, if it were ever actually persisted, would be saved without a user identifier. The pattern of building the `SavedReading` struct inside the reading component — rather than in the flow container that has access to auth state — is wrong. The reading component should emit the card/synthesis payload; the flow container with auth context should own the `saveReading` call and supply the userId from the session.

---

## What Needs to Happen in Priority Order

1. **Fix save wiring across all three flows.** This is the only user-visible data loss bug. The `saveReading` function in `readingsService.ts` is correct. Each flow container in `TarotPage.tsx` needs to implement a real `handleSave` that calls it with a proper payload and dispatches `SAVE_READING` on success. Error states from the API call must surface to the user.

2. **Pass live transit data into `buildTarotAstroContext`.** Change the two `null` arguments to real transit and advance score data. The simplest path is to hoist transit computation into `TarotPageInner`, build the context once there, and pass it down — eliminating per-flow `buildEngineCtx` calls and the parallel transit computations.

3. **Add house fields to `TarotAstroContext`.** Three fields: `natalMoonHouse`, `natalVenusHouse`, `natalNorthNodeHouse`. Read from natal chart planets. Thread through to GPT synthesis prompts.

4. **Unify discuss context construction.** Extract a shared `buildDiscussContext` function that all three flows call. The Celtic Cross version is the reference implementation. Single and three-card should reach that richness level.

5. **Remove the `instantInterpretations` ghost from the ThreeCardReading dep array.**

6. **Fix the duplicate fields in `TarotCelticSynthesisPayload`.**

7. **Extract the two `shuffleTarotDeck` / `computeCardReversal` duplicates** into the shared engine or a tarot utilities file.

The first two items are functionally blocking. Everything the sprint vision describes as "the connective tissue" is real and the analysis is correct. The code is well-structured at the component level — the architecture isn't the problem. The problem is a set of wiring failures at the prop and call-site boundaries that leave the deep data the engine computes stranded and undelivered.
