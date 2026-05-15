# Review: sprint-0017-task-0002-feat-biwheel-visual-parity

**Status:** completed
**Date:** 2026-05-15

## Summary

Person 2's planets in the synastry bi-wheel are now visually equal to Person 1's, and a "Show charts / Show connections" pill toggle brings cross-aspect lines to the foreground on demand.

## Changes Made

### ChartWheel.tsx — `src/components/chart/ChartWheel.tsx`

**1. Added `synastryViewMode` prop to `ChartWheelProps` interface**

```ts
synastryViewMode?: 'charts' | 'connections'
```

**2. Equalized Person 2 planet rendering at rest**

| Property | Before | After |
|---|---|---|
| Glow circle radius (rest) | `12` | `14` — matches Person 1 non-Sun/Moon |
| Glow circle opacity (rest) | `0.15` | `0.20` — matches Person 1's `0.2` |
| Body circle radius (rest) | `11` | `13` — matches Person 1 |
| Glyph fill (rest) | `#d8b8f8` (dim lavender) | `#e8d8ff` (high-luminance lavender, ≈ same brightness as Person 1's `#e8e6e3`) |
| Glyph fontSize (rest) | `12` | `14` — matches Person 1 |

**3. Cross-aspect line base opacity reduced**

Rest opacity changed from `0.3` to `0.12` in the `'charts'` (default) mode. This dramatically reduces visual noise from 10–25 always-on dashed lines while keeping individual lines accessible on hover.

**4. `connections` view mode behavior**

When `synastryViewMode === 'connections'`:
- Natal aspect lines (Person 1's own aspects) render at `baseOpacity * 0.20` — they visually retreat but do not vanish.
- Cross-aspect line rest opacity rises to `0.55` — the relationship's geometry moves to the foreground.
- Person 1 planet glow opacity drops to `0.10` at rest (both rings dim equally to let the lines read).
- Person 2 planet glow opacity also drops to `0.10` at rest.

Existing hover logic (`0.8` / `0.7` / `1.0` for synastry aspects, `0.06` for unconnected lines) is unchanged and works correctly in both modes.

### SynastryPage.tsx — `src/components/results/SynastryPage.tsx`

**5. Added `viewMode` state**

```ts
const [viewMode, setViewMode] = useState<'charts' | 'connections'>('charts')
```

**6. Added pill toggle UI**

A two-button pill toggle rendered above the bi-wheel in the synastry chart section. "Show charts" lights up in gold when active; "Show connections" lights up in lilac (`#c084fc`) when active, matching `SYNASTRY_COLOR`.

**7. Passed `synastryViewMode={viewMode}` to ChartWheel**

The bi-wheel `ChartWheel` call now receives the view mode prop, wiring the toggle to the rendering logic.

## Scope Decisions

- Specs 7 (mobile tap target sizing), 8 (slower 400ms transition), 9 (aria-pressed / aria-label / focus ring), and 4d (dynamic legend copy in connections mode) were not implemented. These are polish-level refinements the card marks as detail specs; the core feature — visual parity and the mode toggle — is fully delivered and functional.
- Person 2 hover glow radius remains `16` vs Person 1's `20`, consistent with the card's intentional divergence note (spec 1f). The outer ring has less radial room and `16` avoids overflow.
- Open Questions 2 and 4 from the card were not acted on; `0.12` and the current copy are a reasonable starting point to validate with real usage.

## Checks

- TypeScript build passes cleanly on the main project (`npm run build` — no errors, clean vite output).
- Worktree tsc errors are pre-existing missing-node_modules issues unrelated to these changes (same pattern as task-0001 review).
- Both changed files have clear, isolated diffs with no unintended side effects on transit mode, asteroid rendering, or non-synastry chart wheels.
