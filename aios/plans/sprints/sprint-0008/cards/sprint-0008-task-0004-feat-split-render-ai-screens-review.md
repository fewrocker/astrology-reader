# Code Review — sprint-0008-task-0004-feat-split-render-ai-screens

**Reviewer:** Claude (automated)
**Branch:** sprint-0008-task-0004-feat-split-render-ai-screens
**Diff base:** sprint-0008
**Date:** 2026-05-13

---

## Blocking Issues

None.

Every spec criterion has been verified as implemented correctly. Detailed findings below.

---

## Verification Against Each Criterion

### 1. All 5 screens have split-render applied

- **TransitReadingPage**: Three-state render applied (`null → GptSkeleton`, error → error card, valid → `TransitInterpretation`). App.tsx effect dispatches `SET_TRANSIT_DATA` synchronously, then awaits GPT and dispatches `SET_TRANSIT_INTERPRETATION`.
- **SynastryPage**: Three-state render applied (`null → GptSkeleton`, error → error card, valid → `InterpretationSection`). App.tsx splits dispatch accordingly.
- **SolarReturnPage**: Three-state render in Reading tab (`null → GptSkeleton`, error → error card, valid → `h2 + SRReading`). App.tsx splits dispatch accordingly.
- **TodayPage**: `GptSkeleton` replaces the inline `animate-pulse` div in the Morning Synthesis slot. Moon card fallback string replaced.
- **NumerologyPage**: `NarrativeSkeleton` replaced by `GptSkeleton`. Inline sky chart skeleton replaced by `GptSkeleton`. `CrossReadingSkeleton` retained with updated copy string (acceptable per spec section 4e / Q4).

PASS.

### 2. GptSkeleton component exists and is used consistently

`src/components/ui/GptSkeleton.tsx` exists. Accepts `label`, `accentColor` (`'gold' | 'pink' | 'amber'`), `lines` props. Shimmer animation defined inline via `<style>`. Staggered delay (`i * 0.1s`) preserved from original `NarrativeSkeleton`. No heading rendered inside the component — heading is each page's responsibility.

Used in: TransitReadingPage, SynastryPage, SolarReturnPage, TodayPage, NumerologyPage (×2 slots).

One cosmetic observation (non-blocking): the container border is always `border-mystic-gold/25` regardless of `accentColor`. The pink and amber variants use accent-colored shimmer bars but a gold border. This is not a spec requirement — the spec does not prescribe the border color per accent.

PASS.

### 3. Six new reducer actions in appState.ts

All 6 are present in the `AppAction` union type (lines 110–115) and in the reducer switch (lines 372–382):
- `SET_TRANSIT_DATA`
- `SET_TRANSIT_INTERPRETATION`
- `SET_SYNASTRY_DATA`
- `SET_SYNASTRY_INTERPRETATION`
- `SET_SOLAR_RETURN_DATA`
- `SET_SOLAR_RETURN_INTERPRETATION`

The existing combined actions `SET_TRANSIT_RESULTS`, `SET_SYNASTRY_RESULTS`, `SET_SOLAR_RETURN_RESULTS` are retained for cache-restore paths.

PASS.

### 4. App.tsx computation effects are split correctly

All three effects (`runTransit`, `runSynastry`, `runSolarReturn`) now follow the two-phase pattern:
1. Synchronous calculation → dispatch `SET_{SCREEN}_DATA` (guarded by `if (!cancelled)`)
2. `await getGptInterpretation(...)` → dispatch `SET_{SCREEN}_INTERPRETATION` (guarded by `if (!cancelled)`)

Cancellation token checked between phases in all three effects.

PASS.

### 5. Stale interpretation cleared by SET_*_DATA actions

- `SET_TRANSIT_DATA` reducer (line 373): sets `transitInterpretation: null`
- `SET_SYNASTRY_DATA` reducer (line 377): sets `synastryInterpretation: null`
- `SET_SOLAR_RETURN_DATA` reducer (line 381): sets `solarReturnInterpretation: null`

Note: There is no `START_SYNASTRY` action — the synastry flow uses `SET_VIEW: 'synastry-loading'` (dispatched from `PartnerForm.tsx` line 20), which does NOT clear `synastryInterpretation`. However, this is not a regression: during `synastry-loading`, `SynastryPage` is not rendered (App.tsx line 773 only renders `SynastryPage` when `view === 'synastry-results'`), so the stale interpretation is never visible. When `SET_SYNASTRY_DATA` fires and transitions to `synastry-results`, the null is set simultaneously. This matches the spec's described prevention mechanism.

PASS.

### 6. Ambient copy strings match the canonical list

All forbidden strings have been removed. Verified against every affected file:

| Location | Before | After | Status |
|---|---|---|---|
| App.tsx transit-loading line 1 | "Reading the transits..." | "Consulting the stars..." | PASS |
| App.tsx transit-loading line 2 | "Consulting the stars for your {period} guidance" | "Mapping the sky for your chart..." | PASS |
| App.tsx synastry-loading line 1 | "Analyzing compatibility..." | "Reading your celestial bond..." | PASS |
| App.tsx synastry-loading line 2 | "Comparing the celestial blueprints of two souls" | "Aligning two cosmic blueprints..." | PASS |
| App.tsx solar-return-loading line 1 | "Calculating your solar return..." | "Tracking the Sun's return..." | PASS |
| App.tsx solar-return-loading line 2 | "Finding the exact moment..." | "Calculating your solar threshold..." | PASS |
| TransitReadingPage GPT slot | (was absent on null) | "Consulting the stars..." | PASS |
| SynastryPage GPT slot | (was absent on null) | "Reading your celestial bond..." | PASS |
| SolarReturnPage Reading tab | "Loading reading..." | "Tracking the Sun's return..." | PASS |
| TodayPage moon card | "Loading moon data…" | "Reading the lunar sky…" | PASS |
| TodayPage Morning Synthesis | "Weaving your morning reading…" | "Reading today's sky for you..." | PASS |
| NumerologyPage narrative | (was NarrativeSkeleton with "✦ Your Reading") | "Decoding your frequencies..." | PASS |
| NumerologyPage sky chart | "✦ Reading your sky…" | "Reading your sky in numbers..." | PASS |
| NumerologyPage cross-reading | "Reading your chart connections…" | "Weaving your chart and numbers together..." | PASS |

The `DailySnapshotCard` "Reading today's sky for your chart…" string was not touched (correct per spec).

PASS.

### 7. Three-state render pattern in all pages

All three global-state pages use the correct pattern:
```
{interpretation === null || retrying
  ? <GptSkeleton .../>
  : isGptError(interpretation)
    ? <ErrorCard with "✦ Ask again"/>
    : <ReadingComponent text={interpretation}/>
}
```

TodayPage and NumerologyPage use local `loading` boolean state — they do not need the three-state pattern for null interpretation because null is not a "loading" signal in their architecture (they use `loading: true` flags instead). Correct per spec sections 4d and 4e.

PASS.

### 8. isGptError helper in gptErrors.ts and used in all 3 pages

`isGptError(text: string): boolean` defined in `src/services/gptErrors.ts` using a `Set` of the 4 known error constants (`GPT_RATE_LIMIT`, `GPT_RATE_LIMIT_UNAUTH`, `GPT_SERVER_ERROR`, `GPT_OFFLINE`).

`getGptErrorMessage(text: string): string` also added — maps error strings to user-facing messages.

Used in: TransitReadingPage (lines 304, 358), SynastryPage (lines 330, 332), SolarReturnPage (lines 220, 222, 287).

PASS.

### 9. Error cards include retry affordance with "✦ Ask again" button

All three error cards (TransitReadingPage, SynastryPage, SolarReturnPage) include:
- `bg-mystic-surface/50 border border-mystic-border` styling (neutral, as spec requires)
- Human-readable message via `getGptErrorMessage()`
- `"✦ Ask again"` button triggering `handleRetryGpt()`

Each `handleRetryGpt` function:
- Guards against null data / already-retrying state
- Re-invokes `getGptInterpretation` with the same prompt (data preserved in state)
- Dispatches only `SET_{SCREEN}_INTERPRETATION` (not the full computation)

PASS.

### 10. Discuss button gating in TransitReadingPage and SolarReturnPage

- **TransitReadingPage** (line 358): `{transitInterpretation !== null && !isGptError(transitInterpretation) && (…)}` — hidden when null or error state.
- **SolarReturnPage** (line 287): `{solarReturnInterpretation !== null && !isGptError(solarReturnInterpretation) && (…)}` — hidden when null or error state.
- **SynastryPage**: Discuss button is always visible (not gated). This is correct — the spec (section 7) names only TransitReadingPage and SolarReturnPage for this requirement.

PASS.

### 11. TypeScript build

`npx tsc --noEmit` completed with no output (exit code 0). No type errors.

PASS.

### 12. AppContext.tsx persistence guard

`saveTransitResults` at line 27–30 fires only when `state.transitData && state.transitInterpretation && state.transitPeriod` are all non-null. Under split-render, when `SET_TRANSIT_DATA` fires, `transitInterpretation` is set to `null`, so the condition is false and persistence does not fire prematurely. When `SET_TRANSIT_INTERPRETATION` later fires with a valid string, all three conditions become non-null and persistence fires correctly.

The `saveSynastryResults` effect at lines 37–44 fires when `partnerChartData && synastryData && synastryInterpretation` are all non-null — same correct guard pattern.

No `saveSolarResults` persistence effect exists in `AppContext.tsx` (solar return results are not persisted to localStorage), so no guard issue there.

PASS.

---

## Non-blocking Notes

1. **GptSkeleton border color**: The container border is always `border-mystic-gold/25` for all accent colors, including `pink` (synastry) and `amber` (solar return). A future polish pass could apply `border-pink-400/25` for pink and `border-amber-400/25` for amber to match the shimmer bar color. Not a spec requirement.

2. **CrossReadingSkeleton retained**: Per spec section 4e / Open Question Q4, `CrossReadingSkeleton` is kept as a distinct component with its purple-border visual treatment rather than replaced by `GptSkeleton`. The copy string inside it has been updated to "Weaving your chart and numbers together..." per canonical list. This is the correct call.

3. **`retrying` state uses local boolean, not interpretation null**: The retry skeleton (`retrying === true`) shows `GptSkeleton` even when `interpretation` is currently an error string. This means the UI does not briefly flash the error card while the retry is in flight. This is a better UX than strict null-checking and is an acceptable implementation choice.

4. **`synastry-transit-loading` copy not updated**: App.tsx line 779 still reads "Consulting the stars for your relationship's {period} guidance" — this is the `synastry-transit-loading` view, which is explicitly out of scope for this sprint (spec Out of Scope section).

5. **No timeout on GptSkeleton**: As noted in spec section 12, no client-side timeout is implemented. Acceptable for this sprint.

---

## Verdict

**PASS**

All 12 spec criteria are fully and correctly implemented. TypeScript build is clean. No blocking issues found. The implementation faithfully follows the split-render pattern: synchronous data dispatch transitions the view immediately, GPT interpretation arrives asynchronously into a skeleton slot, error states are handled with user-friendly messages and retry affordance, and stale text is prevented at the reducer level. The persistence guard invariant in AppContext is preserved.
