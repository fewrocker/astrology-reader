# Review: sprint-0020-task-0003-code-couple-advance-scoring-parity

**Status:** Complete  
**Branch:** `sprint-0020-task-0003-code-couple-advance-scoring-parity`  
**Commit:** `9118be8`

---

## Changes Made

### 1. AdvanceTab.tsx — Exported four previously local identifiers

- `COMBINATION_PLANETS` — `const` → `export const`
- `COMBINATION_WEIGHT_THRESHOLD` — `const` → `export const`
- `COMBINATION_WEIGHT_NORMALIZE` — `const` → `export const`
- `computeCombinedWeight` — `function` → `export function`

No behavior change in AdvanceTab itself.

### 2. CoupleAdvanceTab.tsx — Full scoring parity and structural upgrades

**Imports updated:**
- Removed `computeEnergyRating` from `../../engine/transits` (no longer used)
- Added `COMBINATION_PLANETS`, `COMBINATION_WEIGHT_THRESHOLD`, `COMBINATION_WEIGHT_NORMALIZE`, `computeCombinedWeight` from `./AdvanceTab`

**Reason builders — all three now return `{ reason, bannerBoldFragment, guidance? }`:**

- `buildCouplePowerReason` — returns structured object with `bannerBoldFragment: planet`
- `buildCoupleAspectReason` — returns structured object; `bannerBoldFragment: planet`; looks up `guidance` from new `COUPLE_ASPECT_GUIDANCE` table
- `buildCoupleShiftReason` — returns structured object with `bannerBoldFragment: planet`

**`COUPLE_ASPECT_GUIDANCE` table added** — 22 entries keyed by `"${planet}|${nature}"` using relationship-first navigational language, covering the same planet set as `ASPECT_GUIDANCE` in AdvanceTab.

**`scoreCoupleSnapshot` Priority 2 (shift co-occur):** replaced `computeEnergyRating` + `rating.score >= 4` / `<= 2` gate with `computeCombinedWeight` + `COMBINATION_WEIGHT_THRESHOLD` gate; mirrors `scoreSnapshot` exactly. Intensity now uses `Math.min(1, combinedWeight / COMBINATION_WEIGHT_NORMALIZE)` instead of `rawScore / 2`. Structured reason fields propagated to return values.

**`scoreCoupleSnapshot` Priority 3 (favorable):** replaced `computeEnergyRating` gate with `computeCombinedWeight` + slow-planet-aware threshold (`COMBINATION_WEIGHT_THRESHOLD` or `× 2`). Mirrors `scoreSnapshot` exactly. `bannerBoldFragment` and `guidance` added to return value.

**`scoreCoupleSnapshot` Priority 4 (challenging):** same treatment as Priority 3.

**Priority 1 (power) return value** updated to destructure `{ reason, bannerBoldFragment }` from `buildCouplePowerReason` and include `bannerBoldFragment` in the returned `SnapshotScore`.

**Cache key fixed:** `.toFixed(2)` → `.toFixed(4)`, midheaven longitude added for both charts, `unknownTime` added for both charts. New key format: `${period}:${baseDate.toISOString()}:${asc1.toFixed(4)}:${mc1.toFixed(4)}:${unknownTime1}:${asc2.toFixed(4)}:${mc2.toFixed(4)}:${unknownTime2}`

**Banner bold fragment:** replaced fragile `categoryBanner.split(' ')[0]` pattern with `snapshot.score.bannerBoldFragment ?? categoryBanner.split(' ')[0]` fallback; added `snapshot.score.guidance` paragraph rendering below the reason text, matching `AdvanceTab.tsx` lines 1503–1522. Wrapped in `<div>` to allow sibling paragraph elements.

---

## Build Verification

`npm run build` — clean, zero TypeScript errors, zero ESLint warnings related to this change. Bundle sizes unchanged within normal variance.

---

## Parity Checklist

| Item | Status |
|------|--------|
| Priority 2 uses `computeCombinedWeight` gate | Done |
| Priority 3 uses `computeCombinedWeight` gate | Done |
| Priority 4 uses `computeCombinedWeight` gate | Done |
| Slow-planet threshold doubling for fast-only clusters | Done |
| Intensity from `combinedWeight / COMBINE_WEIGHT_NORMALIZE` | Done |
| `bannerBoldFragment` set by all builders | Done |
| `COUPLE_ASPECT_GUIDANCE` table with relational language | Done |
| `guidance` rendered in couple banner | Done |
| Banner uses `bannerBoldFragment` not raw split | Done |
| Cache key `.toFixed(4)` precision | Done |
| Cache key includes midheaven for both charts | Done |
| Cache key includes `unknownTime` for both charts | Done |
