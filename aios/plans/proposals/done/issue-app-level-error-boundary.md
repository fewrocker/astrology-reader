# Issue Fix: App-Level React Error Boundary

**Type:** Issue Fix
**Originated by:** Taleb + Carmack

---

## Problem

There is no React error boundary at the application root. Any unhandled rendering error — a null dereference on a planet object, a bad localStorage parse, an unexpected undefined in a component — propagates to the root and renders a completely blank white page. The user sees nothing: no message, no recovery path, no way to reset their session.

This is not a hypothetical — it will happen. The codebase has complex data flows (cached chart data, partner data, transit data) with many opportunities for null access if data is stale, partially written, or from an older app version.

## Why This is an Issue Fix (Not a Feature)

This corrects broken, incomplete behavior. A production React app without an error boundary is objectively deficient. It degrades user experience to zero on any error, which is worse than any error message.

## Proposed Solution

1. Create an `ErrorBoundary` class component in `src/components/ErrorBoundary.tsx` with:
   - `componentDidCatch` to log the error to console
   - A fallback UI in the mystic theme: a golden error glyph, a friendly message ("Something went wrong in the cosmos"), and a "Start Over" button that calls `window.location.reload()` or clears localStorage and reloads
2. Wrap `<AppProvider>` in `App.tsx` (or wrap `<AppContent>` inside it) with `<ErrorBoundary>`
3. Optionally add a second, inner error boundary around the chart rendering components specifically (the chart SVG is complex and a good candidate for isolated error containment)

## Impact

**High** — prevents blank screen failures
**Effort** — Low (~30 lines of code)

## Dependencies

None — fully self-contained.

## Implementation Summary

- New file: `src/components/ErrorBoundary.tsx` (React class component)
- Modified file: `src/App.tsx` — wrap root with `<ErrorBoundary>`
- Fallback UI must match the mystic theme (dark bg, gold accent, font-heading)
