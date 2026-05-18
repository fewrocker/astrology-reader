# Sprint 0022 — Review Plan

**Sprint:** sprint-0022
**Merged:** 2026-05-18

---

## Issue Fixes

### advance-session-cache-unbounded
**File:** `src/components/reading/AdvanceTab.tsx` line 128
- Verify `advanceSnapshotSessionCache` is declared as `new LruMap<string, AdvanceSnapshot[]>(6)`, not `new Map`.
- Confirm `LruMap` import is present at the top of the file (was already there — just verify it wasn't disturbed).
- Load the advance tab, navigate to several different dates, confirm the cache evicts old entries.

### daily-snapshot-cache-key-precision
**File:** `src/components/reading/DailySnapshotCard.tsx` — `getCacheKey`
- Confirm key uses `toFixed(4)` on Sun longitude.
- Confirm Ascendant sign and Moon sign are included in the key string.
- Test with two charts that share the same Sun degree but different Ascendants — readings should not cross-contaminate.

### error-boundary-localstorage-clear
**File:** `src/components/ErrorBoundary.tsx` — `handleStartOver`
- Confirm `localStorage.clear()` is gone.
- Confirm `removeItem` calls for the four chart-cache constants from `appState.ts`.
- Confirm prefix-based sweep for `daily-snapshot-` and `advance-today-signal-` keys.
- Manually set a journal entry, trigger the error boundary, confirm the journal entry survives.
- Verify the updated message copy ("Clearing cached chart data and restarting — your journal and birth data are preserved.") is shown.

### today-back-navigation
**File:** `src/App.tsx` — `showCachedLanding`
- Confirm condition is `(state.formCompleted || !!state.chartData)`.
- Load chart → navigate to Today page → press Back → should land on HomeScreen, not the birth form.

### today-energy-rating-contradiction
**File:** `src/components/reading/TodayPage.tsx` around line 252
- Confirm Transit Energy card guard includes `!(advanceScore && advanceScore.category !== 'neutral')`.
- On a day with a Power/Shift/Favorable/Challenging advance score, confirm the dot bar is hidden.
- On a neutral-score day, confirm the dot bar still renders.

### transit-skeleton-label-warmth
**File:** `src/components/results/TransitReadingPage.tsx`
- Confirm `SKELETON_LABELS` record exists typed as `Record<TransitPeriod, string>`.
- Confirm `GptSkeleton` uses `SKELETON_LABELS[transitPeriod]`, not a static string.
- Load the transit reading page for at least two different transit periods — confirm the skeleton shows period-appropriate copy, not "Consulting the stars...".

---

## Code Enhancements

### advance-scoring-extraction
**New file:** `src/engine/advanceScoring.ts`
- Confirm file exists and has no React imports.
- Confirm `AdvanceTab.tsx` imports scoring symbols from `../../engine/advanceScoring`.
- Confirm `CoupleAdvanceTab.tsx` imports scoring symbols from `../../engine/advanceScoring`, UI symbols from `./AdvanceTab`.
- Verify that all previously-exported engine symbols (`PLANET_WEIGHT`, `computeCombinedWeight`, etc.) are no longer defined in `AdvanceTab.tsx`.
- Run `npx tsc -b` — must be zero errors.

### timeline-aspect-brief-consolidation
**Files:** `src/components/reading/TransitTimeline.tsx`, `src/data/interpretations/transitEvents.ts`
- Confirm `HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE` and `getPersonalizedEventBrief` are deleted from `transitEvents.ts`.
- Confirm `TransitTimeline.tsx` imports `computeTransitAspectBrief` and uses it in the `aspect-perfection` branch.
- Load the Transit Timeline for a chart with active transits — aspect cards should still show house-contextual briefs.

### today-synthesis-timezone
**Files:** `src/services/gptInterpretation.ts`, `server/services/gpt.ts`
- Confirm `localDate` (`en-CA` locale string) is included in the `today-synthesis` payload.
- Confirm `handleTodaySynthesis` derives `targetDate` from `payload.localDate` when present.
- Confirm `targetDate` is passed to `calculatePersonalDay` and used for the date header.
- Test: if possible, simulate a request from UTC+2 after midnight UTC — the synthesis should describe the local day, not the prior UTC day.

---

## Features

### gpt-request-timeout
**Files:** `src/services/gptErrors.ts`, `src/services/gptInterpretation.ts`, `server/services/gpt.ts`, `server/routes/gpt.ts`, `src/components/reading/TodayPage.tsx`, `src/components/results/TransitReadingPage.tsx`, `src/components/reading/DailySnapshotCard.tsx`, `src/context/AppContext.tsx`
- Confirm `GPT_TIMEOUT` sentinel exists in `gptErrors.ts` and is in `GPT_ERROR_STRINGS`.
- Confirm `callProxy` creates an `AbortController` with 30 s timeout; `AbortError` → throws `GPT_TIMEOUT`.
- Confirm server `OpenAI` constructor has `timeout: 30_000` and per-request abort at 28 s.
- Confirm server route returns HTTP 504 on timeout.
- Confirm `TodayPage` shows "The reading took too long" + "✦ Try again" on timeout (not the generic error).
- Confirm `TransitReadingPage` shows "✦ Try again" on timeout vs "✦ Ask again" on other errors.
- Confirm `DailySnapshotCard` and `AppContext` do not cache `GPT_TIMEOUT` strings to localStorage.

### synastry-aspect-house-note
**Files:** `src/components/reading/AspectRow.tsx`, `src/components/results/SynastryPage.tsx`
- Confirm `AspectRow` accepts `expansionNote?: string` and renders it beneath the brief in muted italic.
- Confirm expansion panel height increases to `8rem` when `expansionNote` is present.
- Confirm `resolveHouseNote` only fires for inner planets (`Sun, Moon, Mercury, Venus, Mars`) in houses `[1, 5, 7, 8]`.
- Test: open a synastry with a Venus-to-5th-house placement — expansion should show the house note.
- Test: open a synastry with a Saturn aspect to an outer house — no house note should appear.

### today-gpt-prompt-enrichment
**Files:** `src/components/reading/TodayPage.tsx`, `src/services/gptInterpretation.ts`, `server/services/gpt.ts`
- Confirm `getTodayPageInterpretation` signature includes natal Big Three, Moon house, Moon phase, advance category/reason, aspect brief sentences, personal day essence.
- Confirm server prompt has four named sections: `## Natal Chart`, `## Personal Day N — Archetype`, `## Today's Sky`, `## Advance Signal`.
- Confirm `## Advance Signal` section is omitted when advance score is null.
- Confirm ordinal suffix is correct for 1st, 2nd, 3rd, 4th, 11th, 12th, 13th.
- Read a today synthesis — it should reference the user's natal Sun/Moon/Ascendant signs, not just transits.
