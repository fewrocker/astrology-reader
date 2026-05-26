# Issue Fix: Phantom `instantInterpretations` Dependency in ThreeCardReading

**Type:** Issue Fix

**Originated by:** John Carmack, Nassim Taleb

---

## Problem

**File:** `/projects/astrology-reader/src/components/tarot/ThreeCardReading.tsx`
**Line:** 839

The synthesis `useEffect` dependency array contains a reference to `instantInterpretations`:

```typescript
}, [astroContext, drawnCards, instantInterpretations, placementComplete, spreadMode, spreadPositions, userIntention])
```

`instantInterpretations` does not exist anywhere in the `ThreeCardReading` component. It is not listed in the `ThreeCardReadingProps` interface (line 26), it is not declared as a state variable, and it is not a local constant or computed value anywhere in the component body. The variable name suggests it was passed as a prop or held as state during an earlier architecture where instant interpretation results were stored separately, before that data path was collapsed — each `DrawnCard` now carries its own `.interpretation` field directly.

Because JavaScript does not error on reading an undeclared identifier in a closure that references outer scope, the reference resolves to `undefined` at runtime rather than throwing. TypeScript may or may not flag this depending on whether an `instantInterpretations` identifier leaks from an outer module scope. In either case the observable symptom is one of:

- A TypeScript or ESLint `no-undef` / `react-hooks/exhaustive-deps` error that is currently suppressed or undetected.
- The dependency array silently contains `undefined` as a stable value, meaning the dependency slot never changes and the effect's dependency tracking is inaccurate — it does not re-run if the data that `instantInterpretations` was meant to represent changes.

The effect body does not reference `instantInterpretations` in any expression. It accesses card interpretations via `dc.interpretation` on each element of `drawnCards`. The phantom entry is purely a residue of a prior refactor and provides no functional value.

---

## Expected Behavior

The dependency array should contain only variables that actually exist in the component scope and that the effect's logic genuinely depends on. The corrected array should be:

```typescript
}, [astroContext, drawnCards, placementComplete, spreadMode, spreadPositions, userIntention])
```

With `instantInterpretations` removed, the array accurately reflects the effect's actual dependencies, the dependency tracking is correct, and there are no phantom references triggering lint errors or obscuring future maintenance.
