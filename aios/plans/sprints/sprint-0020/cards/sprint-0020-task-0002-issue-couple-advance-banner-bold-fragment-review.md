# Review: sprint-0020-task-0002-issue-couple-advance-banner-bold-fragment

**Status:** Complete  
**Commit:** `6b5500c`  
**Branch:** `sprint-0020-task-0002-issue-couple-advance-banner-bold-fragment`

---

## Changes Made

### 1. Builder return types updated (`CoupleAdvanceTab.tsx`)

All three couple reason builder functions changed from `): string` to returning `{ reason: string; bannerBoldFragment: string; guidance?: string }`:

- `buildCouplePowerReason` — sets `bannerBoldFragment: planet`
- `buildCoupleAspectReason` — sets `bannerBoldFragment: tightest.transitPlanet`; looks up guidance from `COUPLE_ASPECT_GUIDANCE`
- `buildCoupleShiftReason` — sets `bannerBoldFragment: planet`; no guidance (shift-type markers have no aspect guidance in the individual tab either)

### 2. COUPLE_ASPECT_GUIDANCE table added

A new `COUPLE_ASPECT_GUIDANCE: Partial<Record<string, string>>` constant was added above the builders, keyed by `"${planet}|${nature}"` (mirroring `ASPECT_GUIDANCE` in `AdvanceTab.tsx`). All 22 entries are written in relationship-first voice — using "the two of you", "together", "between you" — rather than reusing the individual tab's copy. Covers: Saturn, Jupiter, Pluto, Uranus, Neptune, Mars, Venus, Sun, Mercury, Moon (both harmonious and challenging for each). Chiron omitted at this stage; noted as task-0006 territory.

### 3. All 5 call sites in `scoreCoupleSnapshot` updated

Every `return` path that invoked a builder now destructures `{ reason, bannerBoldFragment, guidance }` and spreads those fields onto the returned `SnapshotScore`:

- Priority 1 (power — angle contact): destructures `buildCouplePowerReason`
- Priority 2a (shift + favorable/challenging co-occurrence): destructures `buildCoupleAspectReason`
- Priority 2b (pure shift): destructures `buildCoupleShiftReason`
- Priority 3 (favorable): destructures `buildCoupleAspectReason`
- Priority 4 (challenging): destructures `buildCoupleAspectReason`

### 4. Banner render block updated

Lines 678–680 (old split-on-first-word pattern) replaced with the exact `AdvanceTab` pattern from lines 1503–1521:

- `<p>` wrapped in `<div>`
- Bold span reads `snapshot.score.bannerBoldFragment ?? categoryBanner.split(' ')[0]` (fallback preserved)
- Trailing text computed via `categoryBanner.slice(boldFragment.length).trimStart()`
- Conditional guidance `<p>` with `text-xs text-mystic-muted/80 mt-1.5 font-light leading-relaxed`

---

## Build

`npm run build` — clean, no TypeScript errors or warnings.

---

## Notes

- The `buildCoupleShiftReason` path does not populate `guidance` since shift-type banners in `AdvanceTab` also carry no guidance (the shift category is a station event, not an aspect). This is consistent with the reference implementation.
- The `COUPLE_ASPECT_GUIDANCE` table is marked as "minimal stubs" per the card spec; full guidance authoring is deferred to task-0006.
- The `else` branch in `buildCoupleAspectReason` (no `COMPOSITE_PLANET_PHRASES` match) is now fixed: `bannerBoldFragment` is set to the transit planet name explicitly, so "the relationship's…" reason strings no longer result in "**the**" being bolded.
