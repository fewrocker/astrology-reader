## Type

Issue Fix

## Originated by

Jobs, Carmack, Taleb (three-voice consensus flag in the draft stub).

## Problem

In `src/components/tarot/TarotPage.tsx`, the helper `buildEngineCtx` (lines 117–124) calls `buildTarotAstroContext` with `null` hardcoded as the fourth argument — the `advanceScore` parameter:

```typescript
function buildEngineCtx(chartData: ChartData, birthDate: string): TarotAstroContext {
  return buildTarotAstroContext(
    chartData,
    null,       // ← TransitData | null
    computePersonalDay(birthDate),
    null,       // ← SnapshotScore | null — always null
  )
}
```

The same null is also hardcoded at the provider-level context build in `TarotPage.tsx` line 495:

```typescript
return buildTarotAstroContext(chartData, null, computePersonalDay(birthDate), null)
```

In `src/engine/tarot.ts`, `buildTarotAstroContext` (line 454) accepts `advanceScore: SnapshotScore | null` as its fourth argument. When that argument is `null`, lines 526–527 set both output fields to their zero values:

```typescript
advanceCategory: advanceScore?.category ?? null,
advanceReason:   advanceScore?.reason   ?? null,
```

So `TarotAstroContext.advanceCategory` is always `null` and `TarotAstroContext.advanceReason` is always `null`.

The null propagates into `computeInstantInterpretation` (line 678), which calls `buildAdvanceCategoryNote(astroContext)` (line 688). That function (lines 673–676) is guarded by:

```typescript
function buildAdvanceCategoryNote(astroContext: TarotAstroContext): string {
  if (!astroContext.advanceCategory) return ''
  return ADVANCE_CATEGORY_NOTES[astroContext.advanceCategory] ?? ''
}
```

Because `advanceCategory` is always `null`, the guard fires on every call and returns `''`. The `advanceCategoryNote` field in every `InstantInterpretation` object (line 701) is always an empty string.

This makes `ADVANCE_CATEGORY_NOTES` in `src/engine/tarot.ts` (lines 142–148) completely dead code at the instant interpretation layer. All five entries — `power`, `favorable`, `challenging`, `shift`, `neutral` — are populated and well-crafted, but none is ever returned:

```typescript
const ADVANCE_CATEGORY_NOTES: Record<string, string> = {
  power:       'Today\'s sky is heightened — this card\'s energy arrives with unusual force and clarity.',
  favorable:   'The sky supports your movement — this card\'s guidance lands in fertile ground.',
  challenging: 'The sky asks for conscious engagement — this card\'s lesson comes with real stakes.',
  shift:       'Something is turning in the larger picture — this card marks the pivot point.',
  neutral:     'The sky holds steady — this card speaks on its own terms, uncolored by dramatic transits.',
}
```

The advance score for today's session is available in the app. `advanceSnapshotSessionCache` is exported from `src/components/reading/AdvanceTab.tsx` (line 45) as a session-level `LruMap<string, AdvanceSnapshot[]>`. Both `TodayPage.tsx` (lines 143–151) and `TransitReadingPage.tsx` read from this cache to resolve today's `SnapshotScore`. The pattern for extracting the score from the cache is established: iterate `advanceSnapshotSessionCache.entries()`, find the snapshot where `s.dateStr` equals today's ISO date string, and read `snapshot.score`. The data is present in memory — it is simply never passed through to the tarot engine.

## Expected behavior

When `buildEngineCtx` is called (or when the equivalent `buildTarotAstroContext` call is made inline in each reading flow), it should read today's `SnapshotScore` from `advanceSnapshotSessionCache` and pass it as the fourth argument instead of `null`. The lookup pattern is already implemented in `TodayPage.tsx` lines 143–151 and can be extracted into a shared utility or replicated at the call site.

With a non-null `SnapshotScore`, `buildTarotAstroContext` sets `advanceCategory` and `advanceReason` on the resulting `TarotAstroContext`. `buildAdvanceCategoryNote` then passes the guard on line 674 and returns the appropriate entry from `ADVANCE_CATEGORY_NOTES`.

The `advanceCategoryNote` field in `InstantInterpretation` should reflect the character of today's sky: a user on a Power Day drawing The High Priestess should see "Today's sky is heightened — this card's energy arrives with unusual force and clarity." A user in a Challenging Period drawing the Five of Swords should see "The sky asks for conscious engagement — this card's lesson comes with real stakes." This contextualizes every card draw within the user's actual advance score for the session, making the instant interpretation responsive to information the app has already computed and cached.

If no advance score is cached for today (the user has not yet visited the Advance or Today tab in the current session), the fourth argument remains `null` and behavior is unchanged — `advanceCategoryNote` stays empty, which is correct.
