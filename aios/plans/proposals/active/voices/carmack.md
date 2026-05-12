# John Carmack — Sprint 5 Proposal Voice

Sprint 4 delivered. Personal year/month/day cards are in NumerologyPage and daily snapshot. Dream sky context works. Let me assess the next viable improvements from an engineering standpoint.

## feat: Unified Today page

This is a view composition problem, not a new system. Everything needed already exists:
- `calculatePersonalDay(birthDate)` — in `engine/numerology.ts`
- `getCurrentMoonPhase()` — in `engine/lunar.ts`
- `calculateCurrentPositions() + calculateTransitAspects()` — in `engine/transits.ts`
- `getDailySnapshotInterpretation()` — in `services/gptInterpretation.ts`
- `getTopActiveTransits()` — in `engine/transits.ts`

The implementation is: new React component `TodayPage.tsx` that orchestrates these existing calls, renders the data, and adds a new view `'today'` in App.tsx's view state. Button in `CachedDataLanding` routing to `'today'`. No new engine code needed.

The `SET_VIEW` dispatch is already the routing mechanism. Adding `'today'` to the view union type is 1 line. The component itself is UI work.

**Complexity: low-medium.** Existing data sources are all stable. The only uncertain piece is GPT integration — the existing `getDailySnapshotInterpretation` already builds the right prompt for the daily card, but for a dedicated Today page we'd want a richer synthesis that mentions the personal day number. I'd create a `getTodayPageInterpretation()` function in gptInterpretation.ts that builds a context string combining numerology + transits + moon and asks GPT for a 3-4 sentence morning reading.

**No new dependencies.** No new engine logic. Pure composition.

## feat: Natal dream resonance

The current `buildNatalContext()` in DreamModal.tsx (line 77) returns ALL natal planets as flat text. The GPT receives this as generic background. The improvement is to add a `buildDreamscapeContext()` function that extracts and foregrounds the dream-relevant subset:

```ts
function buildDreamscapeContext(chart: ChartData): string {
  const neptune = chart.planets.find(p => p.name === 'Neptune')
  const moon = chart.planets.find(p => p.name === 'Moon')
  const twelfthHousePlanets = chart.planets.filter(p => p.house === 12)
  const piscesRising = chart.houses?.[0]?.sign === 'Pisces'
  
  let ctx = '## Dreamscape Natal Blueprint\n'
  if (neptune) ctx += `Neptune (dream ruler): ${neptune.sign}, House ${neptune.house}\n`
  if (moon) ctx += `Moon (emotional/nocturnal): ${moon.sign}, House ${moon.house}\n`
  if (twelfthHousePlanets.length > 0) {
    ctx += `12th house planets (hidden/unconscious): ${twelfthHousePlanets.map(p => `${p.name} in ${p.sign}`).join(', ')}\n`
  }
  if (piscesRising) ctx += `Pisces Rising: naturally porous to the dream realm\n`
  return ctx
}
```

Then in `getDreamInterpretation()` in `gptInterpretation.ts`, prepend this focused context before the full natal dump. The GPT gets a "spotlight" before the full chart — it knows to center the interpretation on these specific placements.

**Complexity: low.** Single helper function, one prompt modification, a handful of UI lines to surface the dreamscape blueprint in the modal's sky context display. No new data needed — all computed from existing ChartData.

## code: Personal day engine unification

This is a genuine duplicate. `DailySnapshotCard.tsx` line 72 defines `calculatePersonalDay(birthDate: string)` using `reduceToSingleDigit` from the engine. `engine/numerology.ts` line 69 exports `calculatePersonalDay(birthDate: string)` with identical logic.

Fix: delete lines 72-82 of DailySnapshotCard.tsx, add `calculatePersonalDay` to the import from `../../engine/numerology`. That's it. 5-minute change. The function signatures are identical — same parameter name, same return type, same algorithm.

**Risk: none.** Both functions produce the same output. This is pure deduplication.

## What I'm NOT recommending

- Animated sky scrubber: The binary search approach used in TransitTimeline is expensive to run live as a user drags a slider. You'd need a completely different ephemeris evaluation strategy (probably pre-sampling). Ship this when there's time to do it right.
- Full transit timeline caching: The timeline computes correctly today. It's not a performance bottleneck in practice. Don't optimize prematurely.
- Dream journal history (cross-day): The DREAM_SESSION_KEY is already per-day in localStorage. Adding cross-day history requires UI for listing/selecting past sessions. That's a medium-sized feature with clear UX questions (how do you display a list of past dreams? do you search them?). Worth a future sprint dedicated to it.
