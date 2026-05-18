# Sprint 0022 — Changelog

**Merged:** 2026-05-18
**Branch:** sprint-0022 → master
**Commit:** bab1556

---

## Issue Fixes

### advance-session-cache-unbounded
`AdvanceTab.tsx` line 128: `advanceSnapshotSessionCache` converted from plain `new Map` to `new LruMap(6)`. The module-level singleton was the only Map missed by the sprint-0021 LRU sweep; it could grow without bound across a long session. Now capped at 6 entries.

### daily-snapshot-cache-key-precision
`DailySnapshotCard.tsx` `getCacheKey`: longitude precision raised from `toFixed(0)` to `toFixed(4)`, Ascendant sign and natal Moon sign added as discriminators. Consecutive-day charts with nearly identical Sun longitudes no longer exchange GPT readings.

### error-boundary-localstorage-clear
`ErrorBoundary.handleStartOver` replaced `localStorage.clear()` with targeted removal of the four chart-cache keys plus prefix-based removal of `daily-snapshot-*` and `advance-today-signal-*`. Journal entries, dream sessions, birth data, auth token, and payment flags are preserved. The user-facing message now accurately describes what is cleared.

### today-back-navigation
`App.tsx` `showCachedLanding` condition extended: `(state.formCompleted || !!state.chartData)`. Previously only `formCompleted` was checked; pressing Back from TodayPage could fall through to the birth form when `formCompleted` lagged behind `chartData`. `chartData` presence is now the authoritative gate.

### today-energy-rating-contradiction
`TodayPage.tsx` Transit Energy dot bar suppressed when `advanceScore?.category !== 'neutral'`. The two signals are now mutually exclusive: when the advance engine is confident enough to label the day power/shift/favorable/challenging, the dot bar does not appear alongside it.

### transit-skeleton-label-warmth
`TransitReadingPage.tsx`: static `"Consulting the stars..."` replaced with a `SKELETON_LABELS` record keyed by `TransitPeriod` — three period-specific warm copy variants. The transit page now matches the personal, period-aware tone of every other loading state in the app.

---

## Code Enhancements

### advance-scoring-extraction
New file: `src/engine/advanceScoring.ts`. Fourteen symbols extracted from `AdvanceTab.tsx` (870 lines removed from the component): types `MarkerCategory`, `SnapshotScore`, `AdvanceSnapshot`, `AdvanceConfig`; constants `ADVANCE_CONFIG`, `PLANET_WEIGHT`, `COMBINATION_PLANETS`, `COMBINATION_WEIGHT_THRESHOLD`, `COMBINATION_WEIGHT_NORMALIZE`, `ORB_THRESHOLDS`, `MARKER_HYSTERESIS_ORB`, `SLOW_PLANETS_FOR_BANNER`, `ASPECT_VERB_BANNER`; functions `computeCombinedWeight`, `detectAngleContact`, `scoreSnapshot`, `runAdvancePreCalculation`, `preCalculateSnapshots`. `CoupleAdvanceTab.tsx` and all consumer files import scoring symbols from the engine module; `AdvanceTab.tsx` import in `CoupleAdvanceTab` narrows to UI-only symbols.

### timeline-aspect-brief-consolidation
`TransitTimeline.tsx` aspect-perfection `detailText` now routed through `computeTransitAspectBrief` (the canonical house-aware function). `HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE` table (~350 lines, 240 hardcoded strings) and `getPersonalizedEventBrief` deleted from `transitEvents.ts`. Net: 385 lines removed, zero behavior change for well-covered combinations.

### today-synthesis-timezone
`getTodayPageInterpretation` now derives `localDate` via `new Date().toLocaleDateString('en-CA')` and includes it in the `today-synthesis` payload. `handleTodaySynthesis` on the server uses `localDate` for both the date header in the GPT prompt and the `calculatePersonalDay` cross-check. Users east of UTC+0 no longer receive a synthesis describing yesterday during the UTC-midnight window.

---

## Features

### gpt-request-timeout
30-second `AbortController` timeout added to `callProxy` in `gptInterpretation.ts`. Server-side `OpenAI` constructor receives `timeout: 30_000`; `callOpenAI` adds a per-request abort at 28 s to release the rate-limit slot before the client fires. `AbortError` produces the `GPT_TIMEOUT` sentinel (not `GPT_OFFLINE`). `TodayPage` and `TransitReadingPage` render a distinct "The reading took too long" message with a "✦ Try again" button. Timeout strings are never written to localStorage cache.

### synastry-aspect-house-note
`AspectRow` accepts a new optional `expansionNote?: string` prop; the expansion panel height grows from `6rem` to `8rem` when it is present, and the note renders in muted italics beneath the aspect brief. `SynastryAspectsSection` receives `houseOverlay` and computes per-aspect notes via `resolveHouseNote`: checks both person's planets landing in `QUALIFYING_HOUSES = [1, 5, 7, 8]`, inner planets only, returns a one-line factual cross-reference or null.

### today-gpt-prompt-enrichment
`getTodayPageInterpretation` extended with 9 new parameters; `handleTodaySynthesis` prompt rebuilt into four named sections: **Natal Chart** (Big Three + Moon house in ordinal form), **Personal Day N — Archetype** (essence first sentence), **Today's Sky** (brief sentences via `computeTransitAspectBrief`), **Advance Signal** (omitted when null). The synthesis is now grounded in the user's natal identity, not just transiting positions.
