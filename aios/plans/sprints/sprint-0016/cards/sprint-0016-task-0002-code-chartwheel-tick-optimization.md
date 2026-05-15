# Proposal: ChartWheel Tick-Mark Optimization and HoverState Refactor

**Type:** Code Enhancement
**Originated by:** Carmack, Taleb

---

## User Guidance

> "Define other fixes and enhancements that would make the couples synastry page beautiful and strong"

---

## Problem / Opportunity

Three distinct weaknesses in `ChartWheel.tsx` are worth addressing before the bi-wheel complexity of sprint 0016 lands in the same file.

### 1. Degree tick marks produce 360 individual SVG `<line>` elements

`/projects/astrology-reader/src/components/chart/ChartWheel.tsx`, lines 492–508

```tsx
{Array.from({ length: 360 }, (_, deg) => {
  const angle = offset(deg)
  const isMajor = deg % 10 === 0
  const outerTick = polarToXY(CX, CY, OUTER_R, angle)
  const innerTick = polarToXY(CX, CY, OUTER_R - (isMajor ? 5 : 2.5), angle)
  return (
    <line
      key={`tick-${deg}`}
      x1={outerTick.x} y1={outerTick.y}
      x2={innerTick.x} y2={innerTick.y}
      stroke={isMajor ? '#3a3a50' : '#2a2a3a'}
      strokeWidth={isMajor ? 0.8 : 0.4}
    />
  )
})}
```

This loop emits 360 `<line>` DOM nodes for purely decorative tick marks. Each node is a separate SVG rendering primitive. The SVG already contains zodiac sign sector paths, house cusp lines, planet circles, aspect lines, and transit planets — adding another 360 elements represents roughly 30% of the total element count for a feature that has no interactivity and carries no data. At 1400×1400 effective canvas resolution (700px viewBox × device pixel ratio 2), each repaint visits all 360 lines. This is a preventable cost that compounds when the bi-wheel adds a second planet ring and a set of cross-aspect lines.

### 2. The `HoverState` discriminated union requires per-variant equality checks

`/projects/astrology-reader/src/components/chart/ChartWheel.tsx`, lines 29–34 (type definition) and lines 337–355 (`handleTap` equality logic)

```typescript
type HoverState =
  | { kind: 'planet'; name: string }
  | { kind: 'transit'; name: string }
  | { kind: 'aspect'; index: number }
  | { kind: 'transitAspect'; index: number }
  | { kind: 'house'; house: number }
  | null
```

```typescript
if (tapped && hover && state &&
    hover.kind === state.kind &&
    ((hover.kind === 'planet' && state.kind === 'planet' && hover.name === state.name) ||
     (hover.kind === 'transit' && state.kind === 'transit' && hover.name === state.name) ||
     (hover.kind === 'aspect' && state.kind === 'aspect' && hover.index === state.index) ||
     (hover.kind === 'transitAspect' && state.kind === 'transitAspect' && hover.index === state.index) ||
     (hover.kind === 'house' && state.kind === 'house' && hover.house === state.house))
) {
```

The union currently has 5 variants. Sprint 0016 will add at least 2 more (`synastry` planet, `synastryAspect`). Each new variant requires a new branch in this equality block as well as updates to `tooltipBorderColor` (lines 393–402) and every tooltip render site (four in the desktop hover block, four in the mobile sheet). The structure is correct but does not scale — it encodes a complete equality test manually in a spot that will be touched repeatedly during the sprint.

### 3. `filteredAspects` memoization provides no real benefit

`/projects/astrology-reader/src/components/chart/ChartWheel.tsx`, lines 312–315

```typescript
const filteredAspects = useMemo(() =>
  aspects.filter(a =>
    ['conjunction', 'sextile', 'square', 'trine', 'opposition'].includes(a.type)
  ), [aspects])
```

The `aspects` prop is computed once in `AppContext` and stored in state; its array reference is stable between renders. The `useMemo` recomputes identically on the first render and then never again — it provides no memoization benefit in practice. For a natal chart with at most 45 aspects to filter, the call is also trivially cheap. The wrapper implies a cost concern that does not exist and may mislead future developers about the stability of the `aspects` prop.

### 4. `SIGN_ELEMENTS` is already present — no gap here

`/projects/astrology-reader/src/engine/types.ts`, line 99, exports `SIGN_ELEMENTS: Record<ZodiacSign, Element>`. `ChartWheel.tsx` line 4 already imports it from `../../engine/types`. `synastry.ts` line 3 also imports it. No new constant is needed.

---

## Desired State

- The 360-tick decorative ring is produced by a single `<path>` element whose `d` attribute concatenates all tick mark segments. The SVG element count drops by approximately 360 nodes. The component renders a visibly identical output with one repaint-visible primitive instead of 360.

- `HoverState` carries a single `key: string` field that encodes both kind and identity (e.g., `"planet:Sun"`, `"aspect:3"`, `"synastry:Venus"`) alongside a `kind` field for variant dispatch. The `handleTap` equality check collapses from a five-branch manual comparison to `hover.key === state.key`. Adding a new hover variant in the bi-wheel implementation costs one line, not one branch per equality site.

- The `filteredAspects` `useMemo` wrapper is removed. The filtered array is computed as a plain `const` at render time, accurately representing the cost and stability of the operation.

The file becomes easier to reason about and cheaper to extend before sprint 0016 adds bi-wheel props, a new outer ring render pass, and two additional hover kinds to the same component.
