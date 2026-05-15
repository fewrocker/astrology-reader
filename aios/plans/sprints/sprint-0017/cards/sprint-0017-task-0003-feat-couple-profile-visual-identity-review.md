# Review: sprint-0017-task-0003-feat-couple-profile-visual-identity

**Status:** completed
**Branch:** sprint-0017-task-0003-feat-couple-profile-visual-identity
**Commit:** cd4a033

## Summary

Implemented per-dimension visual identity for the 7 couple profile axes in `SynastryPage.tsx`. Each dimension now has a distinct color scheme, icon, and a directional fill bar that extends left or right from a center divider.

## Changes

**File modified:** `src/components/results/SynastryPage.tsx`

### Added `DIMENSION_CONFIG`

A static record mapping each of the 7 dimension keys to:
- `label` — human-readable name
- `icon` — emoji representing the dimension's energy
- `fillColor` — Tailwind bg class for the active fill (full string, not dynamic)
- `trackColor` — Tailwind bg class for the track background at low opacity
- `accentClass` — Tailwind text class for the qualitative label on the right

Color assignments:
- intensity → orange
- emotionalFlow → sky
- communicationStyle → violet
- intimacyRhythm → teal
- growthDynamic → emerald
- sexualChemistry → rose
- lifePace → amber

### Rewrote `DimensionAxis`

- Removed the slider-dot metaphor (button with absolute position) in favor of a directional fill bar
- Fill bar extends from center (50%) toward the appropriate pole based on `dim.value` sign
- Fill width = `Math.max(Math.abs(dim.value) * 50, 3)%` (3% minimum so a tiny signal is still visible)
- No fill rendered when `Math.abs(dim.value) < 0.02`
- Fill opacity: `opacity-80` normally, `opacity-40` when `dim.confidence < 0.4`
- Center divider: 1px white/40 vertical line at 50%
- Card wrapper: `rounded-lg p-4 border border-white/10 bg-white/[0.03]` (neutral, not per-color)
- Confidence degradation:
  - `confidence < 0.2`: no fill bar, show "Not enough cross-chart contacts..." message in place of sentence
  - `confidence >= 0.2 && < 0.4`: fill shown at reduced opacity, "weak signal" note below bar
- `dim.sentence` always shown (removed `hidden sm:block` restriction)
- Removed tooltip `useState` — no longer needed

### Updated `CoupleProfileSection`

- Replaced the hardcoded `axes` array with `Object.entries(coupleProfile)` iteration
- Changed `space-y-5` to `space-y-3` (tighter spacing suits card layout)

## Build Verification

- `node_modules/.bin/tsc -b` — no errors
- `node_modules/.bin/vite build` — clean build in 9.65s

## Notes

- All Tailwind color classes are complete strings (no dynamic assembly), ensuring JIT purging works correctly
- The `DIMENSION_CONFIG` fallback handles unknown keys gracefully with a derived label and gold accent
- No changes to the synastry engine or data layer — purely a presentation change
