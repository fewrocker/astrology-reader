# Proposal: Performance Optimization Bundle

## Problem / Opportunity

Several performance issues compound to slow down the app, especially on mobile:

1. **Cities.json (7.3MB raw / 1.8MB gzip)**: The largest single asset. Even lazy-loaded, it blocks city search until fully downloaded. On 3G this takes 10+ seconds.

2. **No code splitting**: All components (transit, synastry, discuss modal) load upfront even if the user only wants a basic natal reading. The bundle includes ~63 modules.

3. **ChartWheel re-renders**: The SVG chart recalculates all planet positions and aspect lines on every render, including hover state changes.

4. **localStorage writes on every state change**: `AppContext` serializes and writes to localStorage on every dispatch, even for trivial UI changes.

## Proposed Solution

A bundle of targeted optimizations:

1. **Reduce city database**: Trim to ~15,000 cities (pop > 50K) for the main bundle (~300KB gzip). Offer "Search more cities" that loads the full set on demand.

2. **Route-based code splitting**: Use `React.lazy` for `TransitReadingPage`, `SynastryPage`, `SynastryTransitPage`, and `DiscussModal`.

3. **Memoize ChartWheel**: Wrap in `React.memo`, use `useMemo` for planet position calculations and aspect line rendering.

4. **Debounce localStorage**: Batch state persistence with a 500ms debounce instead of writing on every change.

## Impact & Effort

- **Impact**: HIGH — Faster load times, smoother interactions, better mobile experience
- **Effort**: Medium (3–4 hours for all four items)
- **Dependencies**: None — all are independent refactors

## Implementation Summary

- **Cities**: Create `scripts/trim-cities.mjs` to filter by population; split into `cities-core.json` + `cities-extended.json`; update `citySearch.ts` to load extended set on demand
- **Code splitting**: Wrap lazy-loaded components in `React.lazy()` + `<Suspense>` in `App.tsx`
- **ChartWheel**: Add `React.memo` wrapper; extract position/line calculations into `useMemo` hooks
- **localStorage**: Add debounced write utility in `AppContext.tsx` using `setTimeout`
