# issue-today-back-navigation

**Type:** Issue Fix
**Originated by:** Miyazaki

## Problem

The "← Back" button in `TodayPage.tsx` (`handleBack`, lines 96–98) dispatches `{ type: 'SET_VIEW', view: 'form' }`. In `App.tsx` (line 534), the `form` view is dual-purpose: when `state.formCompleted` is true and birth data fields are populated (`showCachedLanding`), it renders `HomeScreen`; otherwise it renders `FormWizard`.

On the typical happy path — a user who has completed the form and is browsing from `HomeScreen` — dispatching `'form'` happens to land on `HomeScreen` because `formCompleted` is true. The correctness is coincidental and depends entirely on `formCompleted` remaining set. It breaks in any state where `chartData` is present but `formCompleted` is false: for example, after a `RESET` action that repopulates `chartData` from cache before `formCompleted` is re-asserted, or in future navigation sequences that reach `'today'` without going through the form completion path. In those states, pressing Back from the Today page renders `FormWizard` — the birth data entry flow — rather than `HomeScreen`.

Miyazaki's voice (sprint-0022, "Small Gestures" section) names this: "A user who taps 'Back' from the Today page expecting the Home screen may encounter the birth data form instead, depending on how the `form` view is resolved when chart data is already present in state."

The root cause is that `showCachedLanding` in `App.tsx` gates the `HomeScreen` render on `state.formCompleted` alone, without considering whether `state.chartData` is already present. `formCompleted` is a derived signal that can fall out of sync with chart availability; `chartData` is the authoritative signal that the user has a computed chart and belongs on `HomeScreen`.

## Expected Behavior

When the user presses "← Back" from `TodayPage`, they should arrive at `HomeScreen` whenever a chart is available — regardless of `formCompleted` state.

The fix is a one-expression change in `App.tsx` at line 534. The `showCachedLanding` guard should include `!!state.chartData` as an additional condition so that any navigation to `'form'` while chart data is present reliably renders `HomeScreen`:

```tsx
// Before
const showCachedLanding = state.view === 'form' && state.formCompleted && !!state.birthData.date && !!state.birthData.city

// After
const showCachedLanding = state.view === 'form' && (state.formCompleted || !!state.chartData) && !!state.birthData.date && !!state.birthData.city
```

`TodayPage.tsx` requires no change to `handleBack`. The `'form'` dispatch remains correct; the fix ensures the router correctly interprets it as `HomeScreen` whenever chart data is in state. The birth data field guards (`!!state.birthData.date && !!state.birthData.city`) remain, so a user with `chartData` but no birth data fields (an impossible runtime state, but a defensive boundary) still falls through to `FormWizard`.
