# Code Review: sprint-0008-task-0001-code-app-tsx-extraction

**Branch:** sprint-0008-task-0001-code-app-tsx-extraction
**Diff base:** sprint-0008
**Files changed:** `src/App.tsx`, `src/context/appState.ts` (modified); `src/components/home/HomeScreen.tsx` (new, untracked)

---

## Summary

All four requirements from the card are addressed. The diff is clean (335 lines removed, 10 added across the two tracked files) and TypeScript reports no errors. Three issues require attention before merge.

---

## Issues

### 1. WARNING — `src/App.tsx:399–402` — `useMemo` is the wrong primitive for a localStorage read; `useState`+`useEffect` is correct

The card requires that the `hasCachedBirthData()` localStorage read "be computed once on mount." The implementation uses `useMemo`:

```tsx
const cachedBirthDataExists = useMemo(
  () => hasCachedBirthData(),
  [state.birthData.date, state.birthData.city], // eslint-disable-line react-hooks/exhaustive-deps
)
```

`useMemo` is not guaranteed to run only once — React's documentation explicitly states that memos may be discarded and recomputed at any time (e.g., during concurrent rendering). More practically, it still executes during the render phase, meaning the `localStorage.getItem` call is still on the hot render path. The card explicitly calls for the result to be "stored in state or a ref."

The correct pattern is `useState` + `useEffect`:

```tsx
const [cachedBirthDataExists, setCachedBirthDataExists] = useState(() => hasCachedBirthData())
// No effect needed — the initial state callback runs exactly once on mount.
```

Using a lazy initializer in `useState` runs the function once on mount, stores the boolean in stable state, and removes the localStorage read from subsequent render cycles entirely.

Additionally, the `eslint-disable-line` comment is a code smell: the dependency array `[state.birthData.date, state.birthData.city]` is lying. `hasCachedBirthData()` reads from localStorage, not from those state fields. The deps are there solely to suppress the lint warning, which is the wrong trade-off.

---

### 2. SUGGESTION — `src/components/home/HomeScreen.tsx:73` — One remaining inline style in `CachedDataNudge`

The `onMouseEnter`/`onMouseLeave` handlers in `CachedDataNudge` were correctly converted to Tailwind `hover:` classes. However, the container `<div>` still uses an inline style for its top border:

```tsx
style={{ borderTop: '1px solid rgba(201,168,76,0.12)' }}
```

The Tailwind config defines `mystic-border` (`#1e1e2e`) and `mystic-gold` (`#c9a84c`). `rgba(201,168,76,0.12)` is `mystic-gold` at 12% opacity, which is expressible as `border-t border-mystic-gold/[0.12]` (or the nearest Tailwind opacity step: `border-mystic-gold/10`). This is a minor inconsistency — the rest of the newly extracted code is clean — but it leaves one inline style in a component that was explicitly cited in the card as needing to be cleaned up. Not blocking, but should be addressed before this file is edited again in a future sprint to avoid setting a precedent.

---

### 3. SUGGESTION — `src/components/home/HomeScreen.tsx:119` — `useMemo` dependency on `birthData` object reference is fragile

```tsx
const chartData = useMemo(() => {
  ...
}, [state.chartData, birthData])
```

`birthData` is extracted from `state` as `const { birthData } = state`. Since `birthData` is a nested object on `state`, its reference changes every time any unrelated state field changes (because the reducer spreads `...state` on every action). The memo will recompute `calculateChart` on every dispatch that touches any part of `AppState`, not just when birth data fields change.

The safer dependency array is the individual primitive fields: `[state.chartData, birthData.date, birthData.time, birthData.city, birthData.unknownTime]`. This is the same pattern used elsewhere in the codebase and was the original implementation before extraction. This issue existed in `CachedDataLanding` in the original file and was carried forward unchanged — it should be fixed here rather than left to accumulate in the new file.

---

## What is correct

- `CachedDataLanding` and `CachedDataNudge` are fully extracted to `src/components/home/HomeScreen.tsx`. `App.tsx` shrinks from 835 to 522 lines, well past the target of ~260 lines removed.
- All fourteen `onMouseEnter`/`onMouseLeave` hover handlers in the home screen buttons are replaced with Tailwind `hover:` class variants. No inline JS hover manipulation remains in `HomeScreen.tsx`.
- `transitLoading: boolean` is removed from the `AppState` interface, `initialState`, and all three reducer cases (`START_TRANSIT`, `SET_TRANSIT_RESULTS`, `SET_TRANSIT_ERROR`). No remaining references exist anywhere in `src/`.
- The unused imports (`SkyTodayChart`, `DailySnapshotCard`, `DreamModal`, `NUDGE_DISMISS_KEY`, `JOURNAL_KEY`, helper functions) are all removed from `App.tsx`.
- TypeScript compiles with zero errors (`npx tsc --noEmit` passes clean).
