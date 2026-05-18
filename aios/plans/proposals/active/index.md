# Active Proposals — Sprint 0022

_Generated for sprint-0022. All proposals originated from the four-voice analysis (Jobs, Carmack, Miyazaki, Taleb) guided by sprint-0022 vision._

---

## Features

| File | Originated by | Summary |
|------|--------------|---------|
| `feat-today-gpt-prompt-enrichment.md` | Jobs, Carmack, Miyazaki | Enrich `getTodayPageInterpretation` to include natal Big Three, personal day essence, void-of-course flag, advance category, and natal moon phase — producing a truly personal daily synthesis. |
| `feat-synastry-aspect-house-note.md` | Jobs, Carmack, Miyazaki | When a synastry aspect row expands, selectively surface a one-line house overlay note when the involved planet lands in a high-signal house (1, 5, 7, 8). |
| `feat-gpt-request-timeout.md` | Taleb | Add 30-second AbortController timeout to `callProxy` and matching server-side OpenAI constructor timeout; surface timeout as distinct user-facing error with retry affordance. |

---

## Issue Fixes

| File | Originated by | Summary |
|------|--------------|---------|
| `issue-advance-session-cache-unbounded.md` | Carmack, Taleb | `advanceSnapshotSessionCache` at `AdvanceTab.tsx:128` is plain `Map` missed by sprint-0021 LRU sweep — one-line fix: `new LruMap(6)`. |
| `issue-daily-snapshot-cache-key-precision.md` | Taleb | `DailySnapshotCard` cache key uses `toFixed(0)` — consecutive-day charts collide and exchange GPT readings. Fix: `toFixed(4)` + Ascendant + Moon sign. |
| `issue-error-boundary-localstorage-clear.md` | Taleb | `ErrorBoundary.handleStartOver` calls `localStorage.clear()`, destroying journal entries. Fix: targeted key removal. |
| `issue-today-back-navigation.md` | Miyazaki | "← Back" on `TodayPage` may render birth form instead of home. Fix `showCachedLanding` in `App.tsx` to gate on `chartData` presence. |
| `issue-today-energy-rating-contradiction.md` | Jobs, Carmack | Transit Energy dot bar contradicts advance category banner. Suppress dots when advance score is present and non-neutral. |
| `issue-transit-skeleton-label-warmth.md` | Miyazaki | Transit skeleton shows "Consulting the stars..." — the only impersonal skeleton label. Replace with period-specific warm copy. |

---

## Code Enhancements

| File | Originated by | Summary |
|------|--------------|---------|
| `code-advance-scoring-extraction.md` | Jobs | Extract 14 engine-level symbols from `AdvanceTab.tsx` to `src/engine/advanceScoring.ts`. |
| `code-timeline-aspect-brief-consolidation.md` | Jobs, Carmack, Miyazaki | Route Timeline aspect-perfection `detailText` through `computeTransitAspectBrief`; delete `HOUSE_BRIEF_BY_PLANET_ASPECT_HOUSE` (~250 redundant lines). |
| `code-today-synthesis-timezone.md` | Taleb | Client passes local `YYYY-MM-DD` in payload so server synthesis describes the user's actual day, not server UTC time. |
