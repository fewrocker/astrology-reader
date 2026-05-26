## Type

Issue Fix

## Originated by

All four voices (Jobs, Carmack, sprint vision, and the cross-voice consensus flag in the draft stub).

## Problem

In `src/components/tarot/TarotPage.tsx`, the helper `buildEngineCtx` (lines 117–124) calls `buildTarotAstroContext` with `null` hardcoded as the transit data argument:

```typescript
function buildEngineCtx(chartData: ChartData, birthDate: string): TarotAstroContext {
  return buildTarotAstroContext(
    chartData,
    null,       // ← TransitData | null — always null
    computePersonalDay(birthDate),
    null,
  )
}
```

This `buildEngineCtx` is called in all three reading flows:

- `SingleReadingFlow` line 141: `const engineCtx = useMemo(() => buildEngineCtx(chartData, birthDate), [chartData, birthDate])`
- `ThreeReadingFlow` line 239: same pattern
- `CelticReadingFlow` line 303: same pattern

The null propagates into `buildTarotAstroContext` in `src/engine/tarot.ts` (line 454). The entire transit-processing block is gated on `if (transits)` (line 482). When `null` is passed, that block is skipped entirely, leaving three fields at their zero values:

- `currentTransits` stays `[]`
- `retrogradeplanets` stays `[]`
- `dominantTransitPlanet` stays `null`

The resulting `TarotAstroContext` is then consumed by `computeInstantInterpretation` (line 678), which calls `buildTransitInfluence` (line 533). That function has three levels:

**Level 1** (lines 535–558): looks up `TRANSIT_ADAPTATIONS[card.id]` and matches entries against `astroContext.retrogradeplanets` and `astroContext.dominantTransitPlanet`. Because both are always empty/null, no entry ever matches. The 397+ entries in `TRANSIT_ADAPTATIONS_BY_CARD` are unreachable.

**Level 2** (lines 562–582): branches on `if (astroContext.dominantTransitPlanet)`. Since `dominantTransitPlanet` is always `null`, this branch is never entered.

**Level 3** (lines 585–598): the unconditional fallback — reads `ASTRO_CONNECTIONS[card.id].baselineNote` and returns it. This is what every single card draw returns, regardless of what transits are actually active in the sky.

The same null context is used by `buildAstroHeadline` (line 602), which similarly branches on `planet` being non-null. Since `dominantTransitPlanet` is always `null`, the headline always falls through to either the lunar phase fallback or the generic "its wisdom arrives exactly when you need it" fallback.

The transit data is already computed in each flow. `SingleReadingFlow` line 142 and `ThreeReadingFlow` line 240 both call `calculateTransits(chartData, 'daily')` via `useMemo`. `CelticReadingFlow` does the same at line 304. The live `TransitData` object exists in the component scope — it is simply never passed into `buildEngineCtx`.

The result: every tarot reading across all three flows, for every user, for every card, always shows the Level 3 baseline astro note in the "In Your Sky Now" section. The Tower drawn under a Pluto transit reads the same as The Tower on a quiet Wednesday. Saturn retrograde is invisible to the instant interpretation. The 397+ transit adaptation entries exist, are populated, and are never reached by design.

## Expected behavior

When `buildEngineCtx` is called inside `SingleReadingFlow`, `ThreeReadingFlow`, or `CelticReadingFlow`, it should receive the already-computed `dailyTransitData` and pass it as the `transits` argument to `buildTarotAstroContext`. With a non-null `TransitData`, `buildTarotAstroContext` populates `currentTransits`, `retrogradeplanets`, and `dominantTransitPlanet` from the live sky.

`buildTransitInfluence` then reaches Level 1 — matching the drawn card's id against `TRANSIT_ADAPTATIONS_BY_CARD` and finding transit-specific emphasis text when a relevant planet is active or retrograde. When no Level 1 entry matches, Level 2 fires the element-affinity note against the dominant transit planet. Level 3 is the genuine last resort, not the guaranteed outcome.

The "In Your Sky Now" section of `TarotInterpretationPanel` should show a transit-aware note reflecting the user's actual sky at the moment they draw — the text that the 397+ `TRANSIT_ADAPTATIONS` entries were written to deliver. A user drawing The Tower under a Pluto transit should see the Pluto-specific Tower emphasis, not a generic baseline astro note.

The fix is a call-site change: `buildEngineCtx` should accept `dailyTransitData` as a parameter (or be inlined into each flow component as Carmack suggests, eliminating the helper entirely), and `dailyTransitData` should be passed as the second argument to `buildTarotAstroContext` instead of `null`.
