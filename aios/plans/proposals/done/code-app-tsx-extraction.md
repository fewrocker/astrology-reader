# code-app-tsx-extraction

**Type:** Code Enhancement
**Originated by:** Carmack, Miyazaki

---

## Problem / Opportunity

`src/App.tsx` is 847 lines and carries five responsibilities simultaneously: inline component definitions, five `useEffect` computation pipelines, the app router, state-reading utilities, and the full home screen layout. Every sprint adds directly to this file. Sprint-0008 will add `HomeScreen` redesign changes, `ReadingsModal` integration state, and split-render dispatch logic — all to the same file — before any extraction happens. This is the last practical moment to establish a boundary.

**Specific problems:**

**1. `CachedDataLanding` is a 222-line inline component (lines 197–418) with no file of its own.**
It pulls in `useApp`, `useMemo`, `DreamModal` state, `SkyTodayChart`, `DailySnapshotCard`, `CachedDataNudge`, and dispatches across eight distinct navigation paths. Sprint-0008's home screen redesign will add `ReadingsModal` trigger state, the embedded `DailySnapshotCard` reposition, and the "Change birth information" link to this same block. Without extraction first, `CachedDataLanding` grows past 300 lines inside an already-oversized file. The natural home is `src/components/home/HomeScreen.tsx`.

**2. `transitLoading: boolean` in `AppState` (appState.ts line 62) is a redundant field.**
The reducer sets it to `true` in `START_TRANSIT` and `false` in `SET_TRANSIT_RESULTS` / `SET_TRANSIT_ERROR`. The view state already encodes this: `view === 'transit-loading'` is true for exactly the same duration. No component reads `state.transitLoading` for rendering decisions — search confirms zero consumer usage. The field exists but does nothing. It should be removed from the interface, the `initialState` object (line 292), and the three reducer cases that set it.

**3. Fourteen `onMouseEnter`/`onMouseLeave` inline style hover handlers in `CachedDataLanding` (lines 264–370) duplicate what Tailwind handles declaratively.**
Each interactive button requires three coordinated objects: default `style={{}}`, `onMouseEnter`, and `onMouseLeave`. Changing one button's hover behavior requires three edits. The existing Tailwind config has `mystic-gold`, `mystic-surface`, `mystic-border`, and `mystic-purple` tokens. All fourteen hover patterns can be expressed as `hover:` class variants on those tokens with no visual change. The new `ReadingsModal.tsx` and extracted `HomeScreen.tsx` must not inherit this pattern.

**4. `hasCachedBirthData()` fires on every render in the `showCachedLanding` conditional (App.tsx line 727).**
`hasCachedBirthData()` calls `loadCachedBirthData()` which calls `localStorage.getItem()` — a synchronous DOM read — inside a JSX expression evaluated on every render cycle of `AppContent`. The result does not change between renders unless the user explicitly clears their data. It should be computed once on mount and stored in state or a ref.

---

## Desired State

After this enhancement:

- `src/App.tsx` loses `CachedDataLanding`, `CachedDataNudge`, and the `dreamOpen` state that accompanies them. The router in `AppContent` references `HomeScreen` from its own file. The file shrinks by roughly 260 lines and has a single clear responsibility: wiring providers, routing views, and owning computation effects.
- `src/components/home/HomeScreen.tsx` owns the home screen surface. Sprint-0008 feature tasks (`feat-home-screen-redesign`, `feat-readings-modal`) edit this file, not `App.tsx`. The boundary is enforced by the file system.
- `AppState` has no `transitLoading` field. Loading state is read from `view === 'transit-loading'` at the one point where it matters. The interface is smaller and has one source of truth per concept.
- Button hover states in `HomeScreen.tsx` are expressed as Tailwind `hover:` class variants. The `onMouseEnter`/`onMouseLeave` pattern is gone from the home screen and is not present in any new component added this sprint.
- The `showCachedLanding` localStorage read is computed once on mount. The hot render path does not touch `localStorage`.
