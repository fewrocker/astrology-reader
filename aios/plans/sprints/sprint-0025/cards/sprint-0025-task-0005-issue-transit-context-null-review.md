# Code Review — sprint-0025-task-0005-issue-transit-context-null

## Summary

The fix is a targeted, minimal call-site change. One file was modified: `src/components/tarot/TarotPage.tsx`. The change adds `TransitData` as a type import, extends `buildEngineCtx` to accept `TransitData | null` as a third parameter, replaces the hardcoded `null` with that parameter inside the function body, and updates all three flow components (`SingleReadingFlow`, `ThreeReadingFlow`, `CelticReadingFlow`) to pass `dailyTransitData` into `buildEngineCtx`. In all three flows, the `dailyTransitData` useMemo call was also moved above `engineCtx` to preserve correct declaration order (a dependency must appear before the memo that consumes it, though React hooks do not require this — it is conventional good practice).

## Findings

### suggestion — useMemo dependency on `dailyTransitData` object reference

In each flow, `engineCtx` now depends on `dailyTransitData` in its useMemo dependency array. Because `dailyTransitData` is itself computed by `useMemo(() => calculateTransits(chartData, 'daily'), [chartData])`, its identity is stable (only recomputed when `chartData` changes). The `engineCtx` memo will therefore only re-run when `chartData`, `birthDate`, or `dailyTransitData` changes — which is correct and equivalent in practice to depending on `chartData` and `birthDate` alone. No action required; this is noted for clarity.

### suggestion — `buildEngineCtx` still exists as a helper (not inlined)

The sprint card notes that Carmack's voice suggested inlining `buildEngineCtx` into each flow to eliminate the indirection. The implemented approach retains the helper and extends its signature instead. This is a valid trade-off: the helper avoids duplicating the `buildTarotAstroContext` call, and the signature change makes the dependency explicit. No blocking concern; preference for inlining is a style choice the team can revisit.

### suggestion — `import type { TransitData }` is on a separate line from `import { calculateTransits }`

Both imports come from `../../engine/transits`. They could be merged into a single import statement with a type-only modifier on `TransitData`:

```typescript
import { calculateTransits } from '../../engine/transits'
import type { TransitData } from '../../engine/transits'
```

versus:

```typescript
import { calculateTransits, type TransitData } from '../../engine/transits'
```

Either form is valid TypeScript/ESM. The two-line form used here matches the existing style in this file (e.g., `buildTarotAstroContext` and its types are split across two imports). No action required.

## Verdict

No blocking issues. The fix is correct, complete, and matches the contract described in the sprint card. Build passes with zero TypeScript errors.
