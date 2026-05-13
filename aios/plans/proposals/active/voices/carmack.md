# John Carmack — Voice Analysis

Sprint-0007 landed correctly: the backend monolith, JWT auth, GPT proxy, and entry sync all shipped. The architectural decisions I pushed for in 0007 held — the app has real accounts, real persistence, and no API keys in the browser. Good. Now sprint-0008 is a UI/UX sprint. That's fine. These sprints are necessary. But every UI/UX sprint has hidden technical work that determines whether the thing ships cleanly or accumulates debt. Let me be precise about what that technical work actually is.

---

## Technical Diagnosis

### The Real Problem Is Not the Button List

The vision correctly identifies that ten equal-weight buttons are bad navigation. But the root cause is simpler than it looks: the `CachedDataLanding` component in `App.tsx` is doing three jobs — birth data display, navigation menu, and daily snapshot host — in a single 220-line inline function with no extraction. Every change to the home screen requires editing `App.tsx`, which is already 847 lines and growing. The button proliferation is a symptom of having no component boundary that forces the question "does this belong here?"

The fix is architectural, not cosmetic. The home screen needs to be a composed component with clear ownership, not an ever-expanding anonymous function inside the app shell.

### The Loading State Pattern Is the Real Performance Bug

The current architecture for AI-driven screens has a fundamental structural flaw: **computation and GPT are coupled in the same effect loop in `App.tsx`.** Look at `runTransit` (lines 544-584): it calculates transits synchronously, then `await`s the GPT call, then dispatches `SET_TRANSIT_RESULTS` which simultaneously sets the data AND transitions the view from `transit-loading` to `transit-results`. The page doesn't render at all until GPT returns.

This is not a loading copy problem. This is not a spinner design problem. This is a sequencing problem. The data is computed in ~5ms. GPT takes 2-10 seconds. The user sees nothing for the full 2-10 seconds. The same pattern exists for synastry (`runSynastry`, lines 595-634) and solar return (`runSolarReturn`, lines 684-725).

The correct fix requires changing what `SET_TRANSIT_RESULTS` and the view state transitions mean. Right now `transit-loading` → `transit-results` is a single atomic transition that requires both data AND interpretation. It needs to become two transitions:
1. `transit-loading` → `transit-results` fires when data is computed (milliseconds)
2. `SET_TRANSIT_INTERPRETATION` fires when GPT resolves (seconds later)

`TransitReadingPage.tsx` already has the conditional `{transitInterpretation && <TransitInterpretation ... />}` — the page component already knows how to render without the interpretation. The issue is that it never gets a chance to render without it because the view transition is gated on GPT completing. The page is architecturally ready for split-render. Only `App.tsx` needs to change.

### The View State Enum Has Become a Mess

`AppView` in `appState.ts` currently has 17 possible values:
`'form' | 'loading' | 'results' | 'transit-select' | 'transit-loading' | 'transit-results' | 'partner-form' | 'synastry-loading' | 'synastry-results' | 'synastry-transit-select' | 'synastry-transit-loading' | 'synastry-transit-results' | 'numerology' | 'solar-return-loading' | 'solar-return' | 'today' | 'journal'`

The `*-loading` variants exist solely as signals to `useEffect` hooks in `App.tsx` to trigger computation. They are not really views — no user ever intentionally navigates to `synastry-loading`. They're an implementation detail of the computation pipeline being expressed as view state. If the split-render refactor is done correctly (computation and GPT decoupled), the `-loading` intermediate views for synastry and solar-return can be either eliminated or collapsed to millisecond-duration transitions that are imperceptible to users. `transit-loading` becomes just a route to `transit-results` with a brief flash.

The `transit-select` view is also redundant after the readings modal is introduced: if transit period is passed directly from the modal (`START_TRANSIT` with `period: 'daily'` directly), `transit-select` becomes an intermediate step that adds no value. It can survive as a fallback for navigation from within transit-results ("Choose Another Reading"), but it should not be a required stop in the happy path.

### `App.tsx` Is Doing Too Much

The 847-line `App.tsx` contains:
- `SessionBadge` component (73 lines)
- `CachedDataNudge` component (68 lines)
- `CachedDataLanding` component (222 lines)
- `TransitSelectScreen` component (30 lines)
- `SynastryTransitSelectScreen` component (36 lines)
- `AppContent` routing function (280 lines) with five inline `useEffect` calculation hooks
- `MigrationGate` wrapper (21 lines)
- `App` root (13 lines)

This is a file that will keep growing every sprint. The calculation effects (`runTransit`, `runSynastry`, `runSolarReturn`) are especially misplaced here — they are business logic disguised as React lifecycle code. They belong in a service or hook layer, not inline in the app shell. Moving them out would also eliminate the `// eslint-disable-line react-hooks/exhaustive-deps` suppressions on lines 535, 585, 635, and 725, which exist because the dependency arrays are intentionally incomplete to avoid retriggering calculations on every state change. That's a code smell that signals the computation logic is in the wrong place.

### Inline Styles Are Inconsistent and Accumulating

The codebase uses Tailwind for most styling but falls back to inline `style={{}}` objects for colors that aren't in the Tailwind theme — particularly the gold variants (`rgba(201,168,76,...)`) at different opacity levels, the amber solar return color (`#e8a830`, `rgba(232,168,48,...)`), and pink synastry colors. `CachedDataLanding` alone has 14 inline style objects for hover states (lines 264-270, 280-286, 323-332, 342-354, 359-372) that duplicate `onMouseEnter`/`onMouseLeave` handlers to replicate hover behavior that Tailwind handles declaratively. This pattern is fragile — you have to update three places (default style, mouseEnter, mouseLeave) to change one button's hover state. When `ReadingsModal.tsx` is created, this pattern should not be inherited.

### The SolarReturnPage Has a Silent GPT Wait

`SolarReturnPage.tsx` line 211: `{solarReturnInterpretation ? (<>...<SRReading .../></>) : (<div className="text-center py-8 text-mystic-muted">Loading reading...</div>)}`. This is the exact problem the vision targets — generic "Loading reading..." text blocking the reading tab while GPT resolves. The page already has all the non-GPT data available (`KeyPlacements`, the year selector, the bi-wheel chart in the Chart tab), but the Reading tab is a dead end until GPT returns. Same structural fix applies as transit: render the page structure immediately, render the GPT slot as a skeleton or themed pulse.

---

## The Clean Path

### 1. Decouple Computation from GPT in App.tsx Effects

The correct split for `runTransit`:

```
Step 1 (sync, ~5ms):
  - calculate transitData
  - dispatch { type: 'SET_TRANSIT_DATA', transitData }  ← new action
  - view transitions to 'transit-results' immediately

Step 2 (async, 2-10s):
  - await getGptInterpretation(prompt)
  - dispatch { type: 'SET_TRANSIT_INTERPRETATION', interpretation }
```

`AppView` loses `transit-loading` as a meaningful state. The `transit-results` view renders immediately with computed data. The interpretation card uses `NarrativeSkeleton` (already built in `NumerologyPage.tsx`) until GPT resolves. Same pattern for synastry and solar return.

This is ~60 lines of changes in `App.tsx` and ~30 lines adding new actions to `appState.ts`. The component pages require no changes because they already conditionally render the GPT slots.

New actions needed:
- `SET_TRANSIT_DATA` (sets transitData, transitions view to transit-results)
- `SET_TRANSIT_INTERPRETATION` (sets transitInterpretation only)
- `SET_SYNASTRY_DATA` (same pattern)
- `SET_SYNASTRY_INTERPRETATION` (same pattern)
- `SET_SOLAR_RETURN_DATA` (same pattern)
- `SET_SOLAR_RETURN_INTERPRETATION` (same pattern)

### 2. Extract a `useCalculations` Hook

Move the five `useEffect` computation hooks from `AppContent` into `src/hooks/useCalculations.ts`. This hook takes `state` and `dispatch` and owns all computation side effects. `App.tsx` becomes a router. The hook becomes testable. The `eslint-disable` suppressions go away because the dependency arrays can be correct once the logic is not entangled with view rendering.

### 3. `ReadingsModal.tsx` Must Use Tailwind-Only Styling

When building `src/components/navigation/ReadingsModal.tsx`, do not inherit the `onMouseEnter`/`onMouseLeave` inline style pattern from `CachedDataLanding`. Use Tailwind `hover:` variants throughout. The existing color tokens (`mystic-gold`, `mystic-purple`, `mystic-surface`, etc.) in `tailwind.config.ts` are sufficient. The only inline styles that belong in new components are those using CSS custom properties or values that genuinely cannot be expressed in the Tailwind config (which should be none for a modal).

### 4. Form Completion Landing Change Is Low-Risk

The change in `FormWizard.tsx` `handleNext()` from `dispatch({ type: 'SET_VIEW', view: 'loading' })` to `dispatch({ type: 'SET_VIEW', view: 'form' })` is a one-line change. The `showCachedLanding` condition in `AppContent` — `state.view === 'form' && hasCachedBirthData() && state.formStep === 0 && !!state.birthData.date && !!state.birthData.city` — already handles this correctly. After the final step, birth data is cached, `formStep` is still 2, but `SET_STEP: 0` would need to be dispatched or `showCachedLanding` would need to relax the `formStep === 0` check. The cleanest path: after form submission, dispatch `{ type: 'SET_VIEW', view: 'form' }` AND `{ type: 'SET_STEP', step: 0 }`. The landing condition already works. Zero new logic required.

---

## Proposals I'm Making

### proposal-split-render-decouple-gpt

**What:** Split the `runTransit`, `runSynastry`, and `runSolarReturn` computation effects in `App.tsx` into two phases: (1) synchronous calculation that immediately transitions the view to the results page, and (2) async GPT call that dispatches only the interpretation when it resolves.

**Why it's right:** The user has zero reason to see a loading screen for data that was computed in 5ms. The loading screen exists because computation and GPT are coupled in the same async chain. Decoupling them is the minimal correct fix. No new dependencies, no new components — just splitting one async chain into two dispatch calls. The result pages already handle `null` interpretation with conditional rendering.

**New actions required:** `SET_TRANSIT_DATA`, `SET_TRANSIT_INTERPRETATION`, `SET_SYNASTRY_DATA`, `SET_SYNASTRY_INTERPRETATION`, `SET_SOLAR_RETURN_DATA`, `SET_SOLAR_RETURN_INTERPRETATION`. These replace the combined `SET_TRANSIT_RESULTS`, `SET_SYNASTRY_RESULTS`, `SET_SOLAR_RETURN_RESULTS` actions (or supplement them — keep the combined actions for backward compatibility with localStorage cache hydration where both data and interpretation are available simultaneously).

**Scope:** `src/context/appState.ts` (new actions + reducer cases), `src/App.tsx` (split the three effects). ~90 lines total. No component changes needed.

### proposal-readings-modal-clean-component

**What:** Build `src/components/navigation/ReadingsModal.tsx` as a self-contained component that receives `onSelect: (action: AppAction) => void` and `onClose: () => void` props. It renders three groups with Tailwind-only styling. No inline style objects.

**Why it's right:** This is new code. Starting it clean sets the pattern for all future navigation components. If the readings modal uses the same `onMouseEnter`/`onMouseLeave` inline style pattern as `CachedDataLanding`, that pattern becomes entrenched. Writing it with `hover:` Tailwind variants instead demonstrates the right approach and makes `CachedDataLanding`'s inline styles look like what they are — a refactor target.

**Note on the DreamModal integration:** `DreamModal` is currently opened by local state in `CachedDataLanding` (`const [dreamOpen, setDreamOpen] = useState(false)`). When Dream Interpretation moves to the readings modal, the dream open state needs to live either in `CachedDataLanding` (passed down) or in `ReadingsModal` itself (cleaner — modal closes, then DreamModal opens). Choosing at design time avoids prop-drilling a boolean three levels deep.

### proposal-home-screen-extract-component

**What:** Extract `CachedDataLanding` from `App.tsx` into `src/components/home/HomeScreen.tsx`. Extract `SessionBadge` and `CachedDataNudge` into `src/components/auth/SessionBadge.tsx` and `src/components/auth/AuthNudge.tsx`.

**Why it's right:** `App.tsx` is already too long and every sprint adds to it. The home screen redesign in this sprint will add `ReadingsModal` state, the `DailySnapshotCard` embed, the new CTA button, and the "Save your readings" auth nudge. If all of that stays in `App.tsx`, the file will exceed 1000 lines. Extract before adding, not after.

### proposal-numerology-skeleton-reuse

**What:** `NumerologyPage.tsx` already has a production-quality `NarrativeSkeleton` component (lines 238-266) with shimmer animation for GPT loading states. The transit, synastry, and solar return reading pages should import and reuse this skeleton pattern (or a shared version in `src/components/ui/GptSkeleton.tsx`) rather than each implementing their own.

**Why it's right:** The skeleton shimmer animation is implemented twice already (once in `NumerologyPage.tsx`, once inline in the sky reading section of the same file). The transit and synastry pages will need a third and fourth version if they each implement it. Extract once, use everywhere. The animation itself — gradient bars pulsing at staggered intervals — is the right ambient animation for "the sky is thinking." A shared `GptSkeleton` component with a `label` prop for the themed copy ("Consulting the stars...", "Reading your celestial bond...") is 30 lines and eliminates duplication.

---

## What I'd Simplify

**Eliminate the `onMouseEnter`/`onMouseLeave` inline style hover pattern.** There are 14 instances in `CachedDataLanding` alone. Every one of them can be replaced with Tailwind `hover:` variants on the existing color tokens. This is dead code in the sense that it accomplishes nothing that Tailwind can't do declaratively. The new `ReadingsModal` and `HomeScreen` components should set the pattern. The `CachedDataLanding` refactor that happens as part of this sprint is the opportunity to remove it there too.

**The `transit-select` intermediate screen for the happy path.** With the readings modal, direct dispatch of `START_TRANSIT` with a period means users never need to see the period selection screen when entering from the modal. `TransitSelectScreen` should remain for the "Choose Another Reading" back-navigation from inside `TransitReadingPage`, but it should not be a required step in the forward path. Similarly, `transit-loading` as a full-screen view can be reduced to a transient state that resolves in ~50ms (just the sync calculation time) before the results page appears.

**The `transitLoading` boolean in `AppState`.** It exists alongside `view === 'transit-loading'` and they track the same thing. One source of truth is enough. If the view state is `transit-loading`, loading is in progress. The `transitLoading: boolean` field in `AppState` (line 63 of `appState.ts`) can be removed. It appears to be unused in the current rendering logic anyway — no component reads `state.transitLoading` directly for rendering decisions.

**The 400ms setTimeout before chart calculation.** In `App.tsx` line 529-533, there's a `setTimeout(() => { ... }, 400)` before running the natal chart calculation "so the loading spinner renders first." With the split-render approach, this reason no longer applies — the results page renders immediately. The 300ms setTimeout before transit/synastry/solar calculations (lines 583, 631, 723) similarly exists to allow a spinner to render before computation blocks the thread. If split-render is implemented, these delays can be reduced to 0 or eliminated entirely, making the perceived performance genuinely faster, not just cosmetically faster.

**The `showCachedLanding` conditional logic in `AppContent`.** The condition `state.view === 'form' && hasCachedBirthData() && state.formStep === 0 && !!state.birthData.date && !!state.birthData.city` on line 727 calls `hasCachedBirthData()` which reads `localStorage` on every render. This is a synchronous localStorage read in a hot render path. The result should be computed once on mount and stored in a ref or state, not called in JSX on every render cycle.
