# feat-split-render-ai-screens

**Type:** Feature
**Originated by:** Carmack (structural diagnosis), Jobs (experience standard), Miyazaki (craft obligation), Taleb (failure-mode enumeration)

---

## Problem / Opportunity

Every AI-driven full-page view in the app currently blocks the entire render on the GPT call. The computed data — transit aspects, planet positions, compatibility scores — is available in under 10ms. The GPT narrative takes 2–10 seconds. The user sees a blank spinning screen for the entire duration. This is not a slow API problem. It is a sequencing problem: GPT and computation are coupled in the same async chain in `App.tsx`, and the page view transition is gated on both completing together.

### Per-screen diagnosis

**TransitReadingPage** (`src/components/results/TransitReadingPage.tsx`)

The effect `runTransit` (App.tsx lines 544–584) calls `calculateTransits` synchronously, then `await`s `getGptInterpretation`, then dispatches `SET_TRANSIT_RESULTS` which simultaneously sets the data AND transitions `view` from `transit-loading` to `transit-results`. The transit aspects table, current planet positions table, retrograde list, and chart wheel are all computable from `transitData` — which is ready in milliseconds — but the page never renders until GPT returns.

The page already handles the null case correctly: line 289 is `{transitInterpretation && <TransitInterpretation text={transitInterpretation} />}`. The component is architecturally ready; the transition gating in App.tsx is the only blocker.

The `transit-loading` view (App.tsx lines 759–765) shows a spinning `☽` glyph and the text "Reading the transits..." / "Consulting the stars for your {period} guidance" — fully blocking, no data visible.

**SynastryPage** (`src/components/results/SynastryPage.tsx`)

The effect `runSynastry` (App.tsx lines 595–634) computes `calculateSynastry` synchronously, then awaits GPT, then dispatches `SET_SYNASTRY_RESULTS` which transitions to `synastry-results`. The compatibility score bars, cross-aspects table, house overlays, composite chart table, and both individual chart wheels are all available immediately from `synastryData`.

Line 314 is `{synastryInterpretation && <InterpretationSection text={synastryInterpretation} />}`. Same architectural readiness as transit.

The `synastry-loading` view (App.tsx lines 768–774) shows a spinning `♡` and "Analyzing compatibility..." / "Comparing the celestial blueprints of two souls."

**SolarReturnPage** (`src/components/results/SolarReturnPage.tsx`)

The effect `runSolarReturn` (App.tsx lines 684–725) computes `calculateSolarReturn` synchronously, awaits GPT, dispatches `SET_SOLAR_RETURN_RESULTS`. The SR planet table, key placements grid, year selector, and bi-wheel chart are all available immediately from `solarReturnData`.

Line 204 reads `{solarReturnInterpretation ? (<><h2>Year Ahead Reading</h2><SRReading .../></>) : (<div className="text-center py-8 text-mystic-muted">Loading reading...</div>)}`. This is a slot that already exists and already shows a fallback — the fallback is just wrong: "Loading reading..." is generic, unthemed, and sits inside the Reading tab as a dead end while the Chart tab is already fully functional.

The `solar-return-loading` view (App.tsx lines 786–792) shows a spinning `☀` and "Calculating your solar return..." / "Finding the exact moment the Sun returns to your natal position."

**TodayPage** (`src/components/reading/TodayPage.tsx`)

TodayPage manages all state locally rather than through global AppState. The `useEffect` at line 65 computes `getCurrentMoonPhase`, `getTopActiveTransits`, `computeEnergyRating` synchronously and sets them via `useState` hooks, then fires `getTodayPageInterpretation` asynchronously. Moon phase, personal day number, transit energy rating, and sky highlights are all computed synchronously. GPT text is managed via local `gptLoading` / `gptText` state.

The current fallback for the moon card (line 166): `<p className="text-mystic-muted text-sm">Loading moon data…</p>`. Moon data is not loaded — it is calculated synchronously. This phrase is technically inaccurate and breaks the product's voice.

The "Morning Synthesis" card (lines 222–238) shows `<span className="animate-pulse">✦</span><span>Weaving your morning reading…</span>` during GPT load. This copy is already closer to the target but should be audited against the canonical strings below.

**NumerologyPage** (`src/components/results/NumerologyPage.tsx`)

NumerologyPage already implements the split-render pattern via local state. All core numbers (life path, birthday number, personal year/month/day, expression number) render immediately. GPT calls for narrative, cross-reading, and sky-chart reading fire asynchronously and render into skeleton slots: `NarrativeSkeleton` (lines 238–266) and `CrossReadingSkeleton` (lines 268–288) are production-quality shimmer components already in the codebase.

The `NarrativeSkeleton` uses staggered gradient bars with a `shimmer` keyframe animation. The `CrossReadingSkeleton` uses `animate-pulse` bars. Both have correct error states with "Try Again" buttons and distinct visual treatment from the success state.

NumerologyPage's gap: the `skyReadingLoading` skeleton (lines 429–449) re-implements the same shimmer pattern inline instead of reusing `NarrativeSkeleton`. The ambient loading copy "Reading your sky…" (line 432) and "Reading your chart connections…" (line 276) need audit against canonical strings.

**State machine context**

`AppView` in `src/context/appState.ts` (lines 36–42) has 18 values including `transit-loading`, `synastry-loading`, and `solar-return-loading`. These three intermediate loading views exist solely as triggers for `useEffect` hooks in `AppContent`. No user navigates to them intentionally.

`START_TRANSIT` (appState.ts line 331) already clears `transitInterpretation: null` as part of the action — but only atomically with the view transition to `transit-loading`. Under the current architecture, `transitInterpretation` is null during `transit-loading` and non-null only after `SET_TRANSIT_RESULTS`. Under split-render, there will be a window where `view === 'transit-results'` and `transitInterpretation === null`, which is a new state that every rendering path must explicitly handle.

The existing `saveTransitResults` persistence logic in `AppContext.tsx` (line 27) fires when both `transitData` AND `transitInterpretation` are non-null. Under split-render, `transitData` will be non-null before `transitInterpretation`. The persistence trigger must not fire prematurely with a null interpretation.

`getGptInterpretation` in `src/services/gptInterpretation.ts` (line 69) never throws — it catches internally and returns the error message string (e.g., "Rate limit reached. Sign in to continue.", "Service temporarily unavailable.", "You are offline."). Under split-render, this string will be dispatched as the interpretation value and rendered inside the reading card with no visual distinction from legitimate GPT text. This is the most dangerous silent failure in the pattern.

---

## Vision

When the user taps "Weekly Reading", the transit reading page appears immediately — chart wheel, transit aspects table, current planet positions, retrograde list, all populated. Where the narrative paragraph will land, a shimmer skeleton breathes with the phrase "Consulting the stars..." A few seconds later, the paragraph fades in. The wait feels like anticipation, not brokenness. The user knows their data is already here. The sky is just finding the words.

The same experience on synastry: compatibility bars populate at render time, two chart wheels appear side by side, the aspects table is populated — and the couple reading slot pulses with "Reading your celestial bond..." until the narrative arrives.

On solar return: key placements, the year selector, the bi-wheel chart are all present. The Reading tab shows an amber-tinted skeleton pulsing with "Tracking the Sun's return..." instead of "Loading reading..."

On Today: moon phase, transit energy, sky highlights, personal day number appear immediately. "Weaving your morning reading..." pulses in the Morning Synthesis slot. The phrase "Loading moon data..." never appears.

On Numerology: no change to the already-correct split-render behavior, except the sky-chart skeleton and cross-reading skeleton should use the shared `GptSkeleton` component and themed copy strings.

No screen in the app shows a full-page spinner for data that is already computed. The loading spinner views (`transit-loading`, `synastry-loading`, `solar-return-loading`) either disappear or pass in under 200ms before the results page is immediately shown.

---

## Specifications

### 1. New reducer actions in `src/context/appState.ts`

Six new actions decouple data dispatch from interpretation dispatch:

1.1. `SET_TRANSIT_DATA` — sets `transitData`, `transitPeriod`, `transitTargetMonth`, clears `transitInterpretation: null`, transitions `view: 'transit-results'`, clears `transitLoading: false`. Does NOT set interpretation.

1.2. `SET_TRANSIT_INTERPRETATION` — sets `transitInterpretation` only. Does not change view or any other state field.

1.3. `SET_SYNASTRY_DATA` — sets `partnerChartData`, `partnerAspects`, `synastryData`, clears `synastryInterpretation: null`, transitions `view: 'synastry-results'`, clears `synastryError: null`.

1.4. `SET_SYNASTRY_INTERPRETATION` — sets `synastryInterpretation` only.

1.5. `SET_SOLAR_RETURN_DATA` — sets `solarReturnData`, `solarReturnTargetYear`, clears `solarReturnInterpretation: null`, transitions `view: 'solar-return'`, clears `solarReturnError: null`.

1.6. `SET_SOLAR_RETURN_INTERPRETATION` — sets `solarReturnInterpretation` only.

The existing combined actions `SET_TRANSIT_RESULTS`, `SET_SYNASTRY_RESULTS`, and `SET_SOLAR_RETURN_RESULTS` must be retained for backward compatibility: the localStorage cache hydration in `buildInitialState` loads both data and interpretation together and the combined actions remain the correct dispatch path for cache-restore scenarios.

The `START_TRANSIT` action (line 331) already sets `transitInterpretation: null` and `transitData: null`. This is correct and must not change — it is the stale-text prevention mechanism (see spec section 7).

### 2. Refactored computation effects in `src/App.tsx`

Each of the three async effects is split into two sequential phases within the same async function. The cancellation token must be checked between phases.

2.1. `runTransit` new structure:
```
Step 1 (sync, < 10ms):
  calculate transitData
  dispatch SET_TRANSIT_DATA  ← view transitions to transit-results immediately
  // user sees page with skeleton in interpretation slot

Step 2 (async, 2–10s):
  await getGptInterpretation(prompt)
  if !cancelled: dispatch SET_TRANSIT_INTERPRETATION
```

2.2. `runSynastry` new structure:
```
Step 1 (sync):
  calculate chart2, synData
  dispatch SET_SYNASTRY_DATA  ← view transitions to synastry-results immediately

Step 2 (async):
  await getGptInterpretation(prompt)
  if !cancelled: dispatch SET_SYNASTRY_INTERPRETATION
```

2.3. `runSolarReturn` new structure:
```
Step 1 (sync):
  calculate srData
  dispatch SET_SOLAR_RETURN_DATA  ← view transitions to solar-return immediately

Step 2 (async):
  await getGptInterpretation(prompt)
  if !cancelled: dispatch SET_SOLAR_RETURN_INTERPRETATION
```

The 300ms `setTimeout` before each effect (App.tsx lines 583, 631, 723) may be reduced or eliminated. The original reason — "defer so the loading spinner renders first" — no longer applies when the results page renders immediately. However, if any calculation itself momentarily blocks the JS thread, a brief yield (e.g., `await new Promise(r => setTimeout(r, 0))`) before the synchronous step may be needed to ensure the previous render cycle completes before the calculation runs.

### 3. Shared `GptSkeleton` component at `src/components/ui/GptSkeleton.tsx`

Extract from `NumerologyPage.tsx`'s existing `NarrativeSkeleton` (lines 238–266). The shared component accepts:
- `label` prop: the themed ambient copy string (e.g., "Consulting the stars...")
- `accentColor` prop: `'gold'` (default) | `'pink'` (synastry) | `'amber'` (solar return) — controls gradient and pulse color
- `lines` prop: number of shimmer bars to render (default 8)

The shimmer animation (`@keyframes shimmer`) must be extracted to the global stylesheet or defined once inside the component via injected `<style>` to avoid duplication across instances. The staggered delay pattern (`i * 0.1s`) from the existing skeleton must be preserved — it is what makes the animation read as "breathing" rather than "flashing."

The component must NOT render a heading. The heading ("✦ Your Reading", "✦ Your Couple Reading", etc.) is the page's responsibility, not the skeleton's. The skeleton replaces only the paragraph content area.

Error state: when the GPT call has resolved with an error string (see spec section 8), `GptSkeleton` is not shown. The reading card renders the error treatment instead.

### 4. Per-screen integration of `GptSkeleton`

**4a. TransitReadingPage** (`src/components/results/TransitReadingPage.tsx`)

The current `{transitInterpretation && <TransitInterpretation text={transitInterpretation} />}` block (line 289) must be replaced with a three-state render:

```
null interpretation → GptSkeleton label="Consulting the stars..." accentColor="gold"
non-null interpretation that is a known error string → error card with retry affordance
non-null interpretation that is valid text → TransitInterpretation
```

The `TransitInterpretation` sub-component is already correct and needs no changes.

**4b. SynastryPage** (`src/components/results/SynastryPage.tsx`)

The current `{synastryInterpretation && <InterpretationSection text={synastryInterpretation} />}` block (line 314) must follow the same three-state pattern:

```
null → GptSkeleton label="Reading your celestial bond..." accentColor="pink"
error string → error card
valid text → InterpretationSection
```

**4c. SolarReturnPage** (`src/components/results/SolarReturnPage.tsx`)

The current Reading tab content (lines 202–213):
```
{solarReturnInterpretation ? (
  <>
    <h2 ...>Year Ahead Reading</h2>
    <SRReading text={solarReturnInterpretation} />
  </>
) : (
  <div className="text-center py-8 text-mystic-muted">Loading reading...</div>
)}
```

Must be replaced with three-state render:
```
null → GptSkeleton label="Tracking the Sun's return..." accentColor="amber"
error string → error card
valid text → (existing h2 + SRReading)
```

The "Discuss" button in navigation (line 262) is currently gated on `{solarReturnInterpretation && (...)}`. This gating should change to be gated on the interpretation being valid (non-null, non-error-string). Under split-render, the button is hidden while GPT loads and while in error state.

**4d. TodayPage** (`src/components/reading/TodayPage.tsx`)

TodayPage already manages loading state locally. No AppState changes required. Changes needed:

- Moon card fallback (line 166): replace `"Loading moon data…"` with `"Reading the lunar sky…"`. Moon phase is computed synchronously in `useEffect` at line 67; however, `moon` state is null on first render before the effect fires. The phrase must be replaced but the condition is valid — it applies only during the render before the effect runs (typically one frame).

- Morning Synthesis card (line 228): replace `"Weaving your morning reading…"` with `"Reading today's sky for you..."` to align with the canonical string from the sprint vision. (The DailySnapshotCard already uses this exact phrase at line 229.)

- The existing `gptLoading && !gptText` condition is correct and handles the skeleton display. The `GptSkeleton` component should be used here in place of the current `<div>` with inline `animate-pulse` span.

**4e. NumerologyPage** (`src/components/results/NumerologyPage.tsx`)

NumerologyPage's GPT slots already work correctly with loading/error/success states. Changes needed:

- Extract the `NarrativeSkeleton` and replace its usage with `GptSkeleton label="Decoding your frequencies..." accentColor="gold"`.
- Replace the inline sky chart skeleton (lines 429–449) with `GptSkeleton label="Reading your sky in numbers..." accentColor="gold"`.
- Replace `CrossReadingSkeleton` with `GptSkeleton label="Weaving your chart and numbers together..." accentColor="gold"` or keep `CrossReadingSkeleton` as-is given its visually distinct purple-border treatment.

### 5. Ambient copy strings — canonical list

These strings are the authoritative replacements for all generic loading text in the affected components. No screen may display "Loading...", "Calculating...", "Please wait...", "Reading the transits...", "Analyzing compatibility...", "Calculating your solar return...", "Loading reading...", or "Loading moon data..." as user-visible copy.

| Screen | Slot | Canonical string |
|---|---|---|
| App.tsx transit-loading view | Full-page spinner subtext | "Consulting the stars..." |
| App.tsx transit-loading view | Second line | "Mapping the sky for your chart..." |
| App.tsx synastry-loading view | Full-page spinner subtext | "Reading your celestial bond..." |
| App.tsx synastry-loading view | Second line | "Aligning two cosmic blueprints..." |
| App.tsx solar-return-loading view | Full-page spinner subtext | "Tracking the Sun's return..." |
| App.tsx solar-return-loading view | Second line | "Calculating your solar threshold..." |
| TransitReadingPage | GPT slot skeleton label | "Consulting the stars..." |
| SynastryPage | GPT slot skeleton label | "Reading your celestial bond..." |
| SolarReturnPage | Reading tab GPT slot | "Tracking the Sun's return..." |
| TodayPage | Moon card null fallback | "Reading the lunar sky..." |
| TodayPage | Morning Synthesis skeleton | "Reading today's sky for you..." |
| NumerologyPage | Narrative skeleton | "Decoding your frequencies..." |
| NumerologyPage | Sky chart reading skeleton | "Reading your sky in numbers..." |
| NumerologyPage | Cross-reading skeleton | "Weaving your chart and numbers together..." |
| DailySnapshotCard | GPT loading line | "Reading today's sky for your chart…" (already correct — do not change) |

The `transit-loading`, `synastry-loading`, and `solar-return-loading` full-page spinner views remain in `App.tsx` as brief intermediate states under the split-render approach. They transition to the results page within ~10–300ms (the synchronous calculation time), so the ambient copy they display should match the destination screen's skeleton strings for continuity of voice.

### 6. Stale-text prevention

This is the highest-risk failure mode of the split-render pattern (Taleb). The core risk: a user initiates a Weekly reading, sees it rendered, then initiates a Monthly reading. During the Monthly calculation's async GPT phase, `transitInterpretation` in state still holds the Weekly text. The Monthly transit page renders immediately — and until the GPT resolves, the Weekly interpretation text is visible in the Monthly reading's narrative slot.

**Prevention mechanism:**

`START_TRANSIT` already sets `transitInterpretation: null` (appState.ts line 331). This is the correct prevention point. Under the current architecture, this null is never visible because the page is on `transit-loading` when it's null. Under split-render, the null IS visible because the page is already on `transit-results` when the new computation starts.

The requirement is: `transitInterpretation` MUST be `null` at the moment `SET_TRANSIT_DATA` renders the page. Since `START_TRANSIT` sets `transitInterpretation: null` before any async work begins, and `SET_TRANSIT_DATA` is dispatched after the synchronous calculation (which follows `START_TRANSIT`), the sequence is correct: null is guaranteed at page render time.

The same applies to `synastryInterpretation` (cleared by `START_SYNASTRY` equivalent) and `solarReturnInterpretation` (cleared by `START_SOLAR_RETURN`, appState.ts line 355).

Implementation requirement: the `TransitReadingPage`, `SynastryPage`, and `SolarReturnPage` components must treat a null interpretation field as an explicit "loading" signal — rendering `GptSkeleton` — not as absent content. The `{interpretation && <Component />}` pattern is insufficient; it renders nothing when interpretation is null, which is visually identical to a stale-cleared state and indistinguishable from a GPT call that never started.

Correct pattern:
```
{interpretation === null
  ? <GptSkeleton label="Consulting the stars..." />
  : isErrorString(interpretation)
    ? <ErrorCard text={interpretation} />
    : <ReadingComponent text={interpretation} />
}
```

### 7. Error state in the GPT slot

`getGptInterpretation` (gptInterpretation.ts lines 69–76) never throws. It returns error message strings directly: `GPT_RATE_LIMIT`, `GPT_RATE_LIMIT_UNAUTH`, `GPT_SERVER_ERROR`, `GPT_OFFLINE` (defined in `src/services/gptErrors.ts`). These strings are dispatched as the interpretation value and will appear inside reading cards with no visual distinction from legitimate GPT text unless explicitly handled.

A helper function `isGptError(text: string): boolean` must be implemented and used in all three-state renders. It checks whether the text is one of the known error constants. If true, the error card is rendered instead of the reading card.

Error card behavior:
- Must be visually distinct from both the skeleton and the reading card. Recommended: `bg-mystic-surface/50 border border-mystic-border` (neutral, not red — red implies a catastrophic failure; GPT errors are routine)
- Must display a human-readable message, not the raw error string. Mapping: rate limit errors → "The stars are pausing — try again in a moment." / offline → "No connection to the sky. Check your network."
- Must include a retry affordance: a "✦ Ask again" button that re-initiates the GPT call only (not the full computation). This requires that the computation result be preserved in state while only the interpretation is re-requested.
- The `Discuss` button in navigation for TransitReadingPage and SolarReturnPage should remain hidden while interpretation is null or in error state.

### 8. `AppContext.tsx` persistence guard

The persistence effect in `AppContext.tsx` (line 27) fires `saveTransitResults` when both `transitData` AND `transitInterpretation` are non-null. Under split-render, `transitData` becomes non-null before `transitInterpretation`. The condition `state.transitData && state.transitInterpretation` is already correct and prevents premature persistence. No change needed — but this must be verified and noted as an invariant not to relax.

### 9. The `TransitReadingPage` null guard

`TransitReadingPage` line 201: `if (!chartData || !transitData || !transitPeriod) return null`. Under split-render, `transitData` is guaranteed non-null when the view is `transit-results` (dispatched by `SET_TRANSIT_DATA`). `chartData` must also be guaranteed non-null at that point — the effect already handles this: if `chartData` is null when `runTransit` fires, it calculates the natal chart first and dispatches `SET_RESULTS` before proceeding to transit calculation. The guard at line 201 remains valid as a defensive null check for impossible-in-normal-flow states. Do not remove it.

The same applies to `SynastryPage` line 275: `if (!chartData || !partnerChartData || !synastryData) return null`.

### 10. Full-page loading views during the brief sync phase

During the time between `START_TRANSIT` dispatch (view = `transit-loading`) and `SET_TRANSIT_DATA` dispatch (view = `transit-results`), the full-page `transit-loading` view renders. With the synchronous calculation taking < 10ms (plus the setTimeout delay), this view is visible for 300–310ms at most. This is acceptable — it is below the 400ms quality bar from the sprint vision.

The ambient copy in these brief full-page views must use the canonical strings from spec section 5 rather than the current generic text. Specifically:
- App.tsx line 762: replace "Reading the transits..." with "Consulting the stars..."
- App.tsx line 763: replace "Consulting the stars for your {period} guidance" with "Mapping the sky for your chart..."
- App.tsx line 771: replace "Analyzing compatibility..." with "Reading your celestial bond..."
- App.tsx line 772: replace "Comparing the celestial blueprints of two souls" with "Aligning two cosmic blueprints..."
- App.tsx line 789: replace "Calculating your solar return..." with "Tracking the Sun's return..."
- App.tsx line 790: replace "Finding the exact moment the Sun returns to your natal position" with "Calculating your solar threshold..."

### 11. User-navigates-away edge case

All three async effects use the `cancelled` boolean pattern correctly. When the user navigates away mid-call (e.g., clicks "← Back" while GPT is in-flight), `cancelled` is set to `true` via the `useEffect` cleanup and the `SET_{SCREEN}_INTERPRETATION` dispatch is suppressed. This is already handled correctly and must be preserved under the refactored structure.

When `SET_{SCREEN}_DATA` has already fired (view is on results page) and then the user navigates away while GPT is still in flight, the in-flight call continues until it resolves. If the user returns to the same reading within the same session (which is possible via browser navigation), the interpretation may or may not have resolved. The page must handle the null interpretation state on re-entry, showing the skeleton again if null.

### 12. GPT timeout / very long call edge case (> 15 seconds)

`getGptInterpretation` has no client-side timeout. If a GPT call takes > 15 seconds (which can happen under heavy backend load), the skeleton will animate indefinitely. This is acceptable for a first implementation — the skeleton is not a spinner, it is an ambient breathing animation. However, a future spec should define a timeout threshold.

For this sprint: if the call takes > 15 seconds and the user has not navigated away, the skeleton continues to animate. No timeout behavior required. This is the current implicit behavior for NumerologyPage's skeleton and is acceptable.

### 13. Year-change re-fetch on SolarReturnPage

`SolarReturnPage` has a year selector (lines 148–171) that dispatches `START_SOLAR_RETURN` with a different `targetYear`. This causes the full loading sequence to re-run: `solarReturnInterpretation` is cleared, `solarReturnData` is cleared, and the computation effect fires again. Under split-render, this works correctly: `START_SOLAR_RETURN` clears both fields, `SET_SOLAR_RETURN_DATA` populates `solarReturnData` immediately and shows the new key placements, `SET_SOLAR_RETURN_INTERPRETATION` fills the reading slot when GPT completes. The year selector remains fully functional.

---

## Out of Scope

- **SynastryTransitPage** (`src/components/results/SynastryTransitPage.tsx`): The synastry transit screen (`synastry-transit-loading` / `synastry-transit-results`) is not included in this feature. It uses the same coupled pattern but is a secondary feature and is excluded from this sprint.
- **Streaming GPT responses**: Populating the narrative word-by-word via a streaming endpoint. The current architecture uses a single POST/response cycle. Streaming would require changes to the proxy server, the interpretation service, and the component rendering. Not in scope.
- **Eliminating the `-loading` view states**: The sprint vision raised eliminating `transit-loading`, `synastry-loading`, and `solar-return-loading` from `AppView`. This proposal keeps them as brief intermediate states. Removing them would require changes to the `useEffect` trigger mechanism in AppContent and creates state machine complexity. Elimination is a separate cleanup task.
- **`useCalculations` hook extraction**: Moving the five `useEffect` computation hooks from `AppContent` into `src/hooks/useCalculations.ts`. This is the correct long-term architecture (per Carmack's analysis) but is scope for a dedicated refactor sprint, not bundled here.
- **Retry from within the page**: Re-running the full computation from within the result page. The error card retry affordance (spec section 7) re-requests GPT only — it assumes `transitData` (or equivalent) is already set and non-null.
- **Typed state transition guard**: A transition table enforcing valid `AppView` → `AppView` sequences. Taleb's proposal 1. Valuable but scoped separately.
- **Server-side changes**: The GPT proxy (`server/services/gpt.ts`, `server/middleware/gptRateLimit.ts`) is not modified.

---

## Open Questions

**Q1: Error string detection strategy.** `getGptInterpretation` returns error strings directly as text. Should `isGptError` compare against the imported constants (`GPT_RATE_LIMIT`, `GPT_RATE_LIMIT_UNAUTH`, `GPT_SERVER_ERROR`, `GPT_OFFLINE` from `src/services/gptErrors.ts`), or should the service be changed to throw on error (letting callers handle) with the interpretation field remaining strictly `string | null`? Throwing would require changing all five call sites in App.tsx and eliminating the silent fallback behavior — cleaner long-term but higher change surface.

**Q2: Interpretation field types.** After split-render, `transitInterpretation` in AppState is `string | null` where null means "GPT not yet resolved" and a non-null string may be either valid text or an error string. Should a discriminated type be introduced (`{ status: 'loading' } | { status: 'success'; text: string } | { status: 'error'; message: string }`) to make these states explicit in the type system rather than relying on runtime string comparison? This would eliminate the `isGptError` helper but requires updating all reducer actions and usages.

**Q3: Skeleton animation during year-change on SolarReturnPage.** When the user clicks year selector while a GPT call is already in-flight for the current year, the old call is cancelled (per the `cancelled` flag) and a new one starts. The key placements update immediately. Does the skeleton need to distinguish "initial load" from "year-change reload"? The current UI does not differentiate — the skeleton looks the same in both cases. Is this acceptable or should the year-change show a more specific "Recalculating for [year]..." label?

**Q4: `NarrativeSkeleton` and `CrossReadingSkeleton` in NumerologyPage.** Should these be replaced with the shared `GptSkeleton`, or maintained as separate components given their existing production stability? The cross-reading skeleton has a distinct purple-border visual treatment that signals the "Astrology & Numerology" section specifically. Replacing it with a generic `GptSkeleton` may lose visual context.

**Q5: `transitLoading: boolean` field in AppState.** Carmack identifies this field (appState.ts line 63) as a redundant source of truth alongside `view === 'transit-loading'`. Under split-render, `view` no longer encodes the loading state (since the page is on `transit-results` while GPT loads). Should `transitLoading` be repurposed to signal the async GPT phase specifically — i.e., set to `true` by `SET_TRANSIT_DATA` and `false` by `SET_TRANSIT_INTERPRETATION`? Or removed and replaced by checking `transitInterpretation === null`? Components do not currently read `state.transitLoading` for rendering — any repurposing would require deliberately introducing that dependency.
