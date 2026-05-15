**Type:** Issue Fix
**Originated by:** Taleb
**User guidance:** N/A

## Problem

`SynastryData` is serialized to localStorage under the key `astral-chart-synastry-results` and rehydrated into app state on every cold start. The write path is in `/projects/astrology-reader/src/context/AppContext.tsx` (lines 36–45) via `saveSynastryResults`, which serializes the full `CachedSynastryResults` object — including `synastryData: SynastryData` — as raw JSON with no schema version marker.

The read path is in `/projects/astrology-reader/src/context/appState.ts`, `loadCachedSynastryResults` (lines 217–225), which calls `JSON.parse(raw) as CachedSynastryResults` and returns the result with no shape validation. The parsed value is then assigned directly to `synastryData` in `buildInitialState` (line 304), which runs at module load time before any React component mounts.

Sprint 0016 changes the `SynastryData` interface in `/projects/astrology-reader/src/engine/synastry.ts`: the `compatibility: CompatibilityScore` field (currently lines 61–65) is replaced by a new `coupleProfile` field. Any user whose browser holds a pre-0016 synastry result will have a cached object with `compatibility` present and `coupleProfile` absent.

When `SynastryPage.tsx` renders after hydration and the new `CoupleProfileSection` component attempts to read `synastryData.coupleProfile`, it receives `undefined`. TypeScript types are erased at runtime, so no type error is thrown. The component silently renders nothing — no error boundary trips, no console warning appears, and the user sees a blank dimension section with no indication that their cached data is stale. The `CompatibilitySection` reference (`synastryData.compatibility`) is simultaneously removed from the page, so the old data also goes unused. The net effect: the visual profile area of the synastry page is empty for all returning users until they recompute.

The inverse transition is also a risk: a user who downgrades or whose CDN cache serves the old bundle after a partial deploy will have a `coupleProfile`-shaped cache and a `compatibility`-reading component, producing the same silent blank.

There is no schema version field on the cached shape, no version check in `loadCachedSynastryResults`, and no invalidation mechanism anywhere in the read or write path.

## Expected Behavior

`loadCachedSynastryResults` should detect when the cached `SynastryData` was produced by a different schema version and return `null` rather than the stale object. A schema version constant (e.g., `SYNASTRY_CACHE_VERSION = 2`) should be written into the serialized payload by `saveSynastryResults` as a top-level field (e.g., `_v: 2`) and checked on read before the parsed value is returned. If the `_v` field is absent or does not match the current constant, `loadCachedSynastryResults` returns `null` and the caller (`buildInitialState`) initializes `synastryData` to `null` as it does for a fresh session. The stale localStorage entry should be removed at that point so it does not accumulate silently. No migration of the old shape is required — the user simply recomputes, which is already the zero-state path.

## Outcome
Implemented. SYNASTRY_CACHE_VERSION = 2 added to appState.ts. loadCachedSynastryResults now validates _v field and clears stale cache. Build passes.
