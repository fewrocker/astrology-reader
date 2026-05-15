# Code Review: ChartWheel Tick-Mark Optimization and HoverState Refactor

**Task:** sprint-0016-task-0002-code-chartwheel-tick-optimization
**File changed:** `src/components/chart/ChartWheel.tsx`
**Build result:** PASS — zero TypeScript errors, production bundle generated

---

## Change 1: Tick-mark 360-line loop → two `<path>` elements

**Status: Correct**

The `Array.from({ length: 360 }, ...)` block (previously lines 492–508) that produced 360 individual `<line>` SVG elements was replaced with an IIFE that builds two compound `d` strings and renders them as two `<path>` elements — one for major ticks (deg % 10 === 0, 36 segments) and one for minor ticks (324 segments). Each segment is `M{x1},{y1}L{x2},{y2}` concatenated without separators, which is valid SVG path syntax. The `toFixed(2)` call keeps attribute string length reasonable.

Visual output is identical: major ticks use stroke `#3a3a50` at width 0.8, minor ticks use `#2a2a3a` at width 0.4. DOM element count drops from 360 `<line>` nodes to 2 `<path>` nodes — a ~99% reduction in element count for that section.

**No regressions identified.**

---

## Change 2: HoverState key unification

**Status: Correct, all call sites updated**

The discriminated union:
```typescript
type HoverState =
  | { kind: 'planet'; name: string }
  | { kind: 'transit'; name: string }
  | { kind: 'aspect'; index: number }
  | { kind: 'transitAspect'; index: number }
  | { kind: 'house'; house: number }
  | null
```

was replaced with the flat form:
```typescript
type HoverState = { kind: string; key: string } | null
```

All 11 HoverState creation sites were updated:
- Planet glyphs (classical): `{ kind: 'planet', key: planet.name }` (1 site)
- Asteroid glyphs: `{ kind: 'planet', key: asteroid.name }` (1 site)
- Aspect lines: `{ kind: 'aspect', key: String(i) }` (1 site)
- Transit aspect lines: `{ kind: 'transitAspect', key: String(origIdx) }` (1 site)
- Transit planets: `{ kind: 'transit', key: tp.name }` (1 site)
- House numbers: `{ kind: 'house', key: String(house.house) }` (1 site)

Each site has both `onMouseEnter` and `onClick` handlers updated (6 × 2 = 12 handler updates).

The `handleTap` equality check collapsed from a 5-branch manual OR to:
```typescript
if (tapped && hover && state && hover.key === state.key && hover.kind === state.kind) {
```

All tooltip render sites in both the desktop hover tooltip block and the mobile bottom sheet block were updated to read `hover.key` instead of `hover.name`/`hover.index`/`hover.house`. Numeric lookups use `parseInt(hover.key)`.

The `hoveredPlanet` and `hoveredTransit` derived strings were updated to use `hover.key`.

The `tooltipBorderColor` useMemo uses `parseInt(hover.key)` to look up the aspect nature.

**No regressions identified.**

---

## Change 3: Remove useMemo from filteredAspects

**Status: Correct**

```typescript
const filteredAspects = useMemo(() =>
  aspects.filter(a =>
    ['conjunction', 'sextile', 'square', 'trine', 'opposition'].includes(a.type)
  ), [aspects])
```

was replaced with:
```typescript
const filteredAspects = aspects.filter(a =>
  ['conjunction', 'sextile', 'square', 'trine', 'opposition'].includes(a.type)
)
```

The `useMemo` import was NOT removed because it is still used by `tooltipStyle` (line 357) and `tooltipBorderColor` (line 379). This is correct.

**No regressions identified.**

---

## Overall Assessment

All three changes implement exactly what the sprint card specifies. The build passes cleanly. No logic regressions were introduced. The file is easier to extend: adding a new hover kind in sprint-0016 now costs one line at each creation site, and the equality check in `handleTap` requires no modification at all.
