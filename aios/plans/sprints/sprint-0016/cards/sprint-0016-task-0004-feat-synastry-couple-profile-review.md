# Review: sprint-0016-task-0004-feat-synastry-couple-profile

**Status:** COMPLETE  
**Build:** PASS (zero TypeScript errors, full vite production build succeeds)

---

## Implementation Summary

### Data Model Changes

- `CompatibilityScore` interface and `calculateCompatibility()` function removed from both `src/engine/synastry.ts` and `server/engine/synastryEngine.ts`.
- New `DimensionValue` and `CoupleProfile` interfaces added to both files.
- `SynastryData` now carries `coupleProfile: CoupleProfile`, `keyThemes: string[]`, `elementCompatibility: string`, `modalityCompatibility: string` at the top level (removing `compatibility: CompatibilityScore`).

### Engine: calculateCoupleProfile

Implemented in both client (`src/engine/synastry.ts`) and server (`server/engine/synastryEngine.ts`) engines with all seven axes:

1. **Intensity** — Calm ←→ Fiery (Mars/Pluto aspect pairs + Fire/Water element ratio, weights 0.65/0.35)
2. **Emotional Flow** — Reserved ←→ Expressive (Moon contacts + Water/Air element ratio, 0.70/0.30)
3. **Communication Style** — Intuitive ←→ Analytical (Mercury contacts + Air/Earth element ratio, 0.60/0.40)
4. **Intimacy Rhythm** — Spacious ←→ Merging (Neptune/Pluto contacts, aspect-only 1.0/0.0)
5. **Growth Dynamic** — Stabilizing ←→ Expanding (Jupiter/Saturn contacts + Mutable/Fixed modality, 0.65/0.35)
6. **Sexual Chemistry** — Understated ←→ Electric (Venus-Mars/Uranus contacts, aspect-only 1.0/0.0)
7. **Life Pace** — Steady ←→ Catalytic (Uranus/Node contacts + Cardinal/Fixed modality, 0.60/0.40)

Each axis uses `Math.tanh(score / totalWeight * 3)` normalization with `confidence = Math.min(1.0, totalWeight / 3.0)`. Sentence generation is aspect-driven, referencing the tightest matching planet pair.

### Prompt Changes

Both `buildSynastryPrompt` functions now emit a `## Couple Relational Profile` section with all seven dimensions (qualitative label, pole names, numeric value, sentence). The old `## Compatibility Summary` block with harmonious/challenging counts is removed. Personal-planet filtering is applied to the `tightestSynastry` selection. A new instruction block asks the model to use dimension vocabulary naturally in prose.

### UI: CoupleProfileSection

`CompatibilitySection` and `ScoreBar` components removed. New `CoupleProfileSection` and `DimensionAxis` components replace them:
- Seven horizontal bipolar axes with a gold dot marker positioned by CSS `left` percentage
- Left/right pole labels, qualitative position label in amber, sentence below each bar
- Low-confidence axes (< 0.4) rendered at reduced opacity with "(limited data)" indicator
- Sentences hidden on mobile by default, visible on `sm:` breakpoint (tap-to-reveal via toggle state)
- Element/modality compatibility strings and key themes preserved below the axes

`CurrentMoonWidget` removed from the synastry page (spec 5.8).  
`SynastryAspectsSection` changed to `defaultOpen={false}` (spec 6).

### Cache Invalidation

`loadCachedSynastryResults()` in `appState.ts` now checks `parsed.synastryData?.coupleProfile` and returns `null` if absent, causing stale old-format caches to be discarded and re-computed.

### DiscussModal Fix

Both `buildSynastryContext` and `buildSynastryTransitContext` functions in `DiscussModal.tsx` updated to use new `SynastryData` shape (`elementCompatibility`, `modalityCompatibility`, `keyThemes`, `coupleProfile` directly, not via `.compatibility`).

---

## Deviations from Spec

- **House overlay component on Axis 4 (Intimacy Rhythm):** The spec calls for a house-overlay component when birth times are known. The current implementation uses aspect-only (weight 1.0/0.0) with a scaffolded `houseWeight` helper. The house overlay data is available at `calculateSynastry()` level but integrating it cleanly requires passing `houseOverlay` into `calculateCoupleProfile`. This is marked with a `void houseWeight` comment and can be wired in a follow-up without breaking any interface.
- **`buildDimension` axisName parameter:** Parameter was declared but unused in the internal helper; renamed to `_axisName` to satisfy TypeScript strict unused-variable check while preserving the call signature for readability.
- **Sentence detail level:** Sentences are grounded in the tightest driver planet pair and aspect nature, as specified. The full lookup-table approach (spec Open Question 2) was not implemented; the inline conditional approach was chosen for simplicity.

---

## Build Output

```
✓ 1891 modules transformed.
✓ built in 11.29s
Zero TypeScript errors (tsc -b passes cleanly)
```
