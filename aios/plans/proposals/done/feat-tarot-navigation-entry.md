# Proposal: Tarot Navigation and App Entry Point

- **Slug:** `tarot-navigation-entry`
- **Type:** Feature
- **Filename:** `feat-tarot-navigation-entry.md`
- **Originated by:** Carmack, vision document
- **Sprint:** 0023
- **Status:** Active

---

## User Guidance

From `aios/guidelines.md`:

> "Tarot is not treated as isolated card meanings. The system should synthesize: Tarot symbolism + Natal chart identity + Current sky/transits + Numerology cycles + Current energetic timing."

> "The experience should feel: Mystical but modern / Emotionally immersive / Visually cinematic / Psychologically insightful / Fast and reliable / Personal rather than generic."

> "Every reading should feel like a ritualized symbolic encounter."

> "The app should contain built-in interpretations for: Every tarot card / Upright/reversed meanings / Every spread position / Combined card-position interpretations. This ensures: Fast response / Reliability / Offline resilience / Consistent symbolic foundation."

> "Before the final synthesis: 'The cards are now being read as a constellation.'"

These principles drive the navigation entry architecture: Tarot must be discoverable and feel native to the app, load instantly with AI-free content, and never require the user to wait for a network call before entering a ritual state.

---

## Problem / Opportunity

The app currently has no navigation entry point for Tarot. The `AppView` union type in `src/context/appState.ts` has no `'tarot'` value. `App.tsx` has no render branch for a Tarot page. `HomeScreen.tsx` and `ReadingsModal.tsx` have no Tarot entry. `TarotPage.tsx` does not exist.

Without this proposal, all other Tarot proposals (data layer, engine, reading UIs, GPT synthesis) have nowhere to mount. This is the skeletal entry that the entire Tarot module hangs from.

The secondary problem is architectural: `AppState` in `src/context/appState.ts` is already 414 lines managing transit, synastry, solar return, and storage state across 80+ fields. Adding 10–12 Tarot fields — current reading type, drawn cards, instant interpretations, GPT synthesis status, synthesis loading/error states, saved reading list, user intention, reversal array, active spread mode, sub-view — would cause re-render cascades in every non-Tarot component that calls `useAppState()`. Every authenticated component re-renders on any field change; Tarot drawing a card would repaint the journal, the chart, the transit reading, and the numerology page if they were mounted. This is not premature optimization. It is the established React architecture pattern this codebase already uses for auth state via `AuthContext.tsx`.

---

## Vision

Tarot enters the app as a peer of Today, Transits, and Synastry — naturally discoverable from the ReadingsModal, immediately recognizable as a first-class reading type, not a hidden feature or a beta label. A user landing on the HomeScreen who clicks "Get Your Readings ✦" sees Tarot listed alongside Daily Reading and Cosmic Journal. One tap enters the ritual. The entry is frictionless. The first thing they see is not a spinner — it is the intention-setting moment, rendered instantly from local state.

Within Tarot, navigation is self-contained. The user moves through sub-views (intention → mode selection → draw ritual → reading → synthesis) without touching App-level routing. Back navigation within Tarot is handled by `TarotPage.tsx`'s own internal state machine; only the final "exit Tarot" action dispatches a `SET_VIEW` to return to `'form'`.

---

## Specifications

### 1. `AppView` type extension

In `src/context/appState.ts`, add `'tarot'` to the `AppView` union type:

```typescript
// Before (line 36–43):
export type AppView = 'form' | 'loading' | 'results' | 'transit-select' | 'transit-loading' | 'transit-results'
  | 'partner-form' | 'synastry-loading' | 'synastry-results'
  | 'synastry-transit-select' | 'synastry-transit-loading' | 'synastry-transit-results'
  | 'numerology'
  | 'solar-return-loading' | 'solar-return'
  | 'today'
  | 'journal'

// After:
export type AppView = 'form' | 'loading' | 'results' | 'transit-select' | 'transit-loading' | 'transit-results'
  | 'partner-form' | 'synastry-loading' | 'synastry-results'
  | 'synastry-transit-select' | 'synastry-transit-loading' | 'synastry-transit-results'
  | 'numerology'
  | 'solar-return-loading' | 'solar-return'
  | 'today'
  | 'journal'
  | 'tarot'
```

No other `AppState` fields change. Tarot reading state lives in `TarotContext`, not in `AppState`. The only footprint Tarot leaves in `AppState` is the `'tarot'` view value.

### 2. `TarotView` type and `TarotState` interface

Create `src/context/TarotContext.tsx`. This file owns all Tarot reading state and is mounted inside `TarotPage.tsx`, not in `App.tsx`. Its scope is bounded to the Tarot module — it unmounts when the user exits Tarot.

Define the following types inside `TarotContext.tsx`:

```typescript
export type TarotSubView =
  | 'home'            // intention setting + mode selection
  | 'single-reading'  // single card draw, reveal, interpretation
  | 'three-reading'   // three-card spread
  | 'celtic-reading'  // Celtic Cross
  | 'saved-readings'  // saved readings list

export type ReadingMode = 'single' | 'three' | 'celtic'

export interface TarotState {
  subView: TarotSubView
  readingMode: ReadingMode | null
  userIntention: string
  drawnCards: DrawnCard[]           // from src/engine/tarot.ts
  reversals: boolean[]
  instantInterpretations: InstantInterpretation[]  // from src/engine/tarot.ts
  spreadMode: SpreadMode | null     // from src/data/tarot/spreadPositions.ts
  gptSynthesis: string | null
  gptSynthesisStatus: 'idle' | 'loading' | 'success' | 'error' | 'rate-limited'
  gptSynthesisError: string | null
  savedReadingIds: string[]         // shallow list of IDs, full payloads fetched on demand
  currentReadingId: string | null   // set after the reading is saved to server
}
```

Define context value shape:

```typescript
interface TarotContextValue {
  state: TarotState
  dispatch: React.Dispatch<TarotAction>
  // Computed session data passed from App-level state — avoids recomputing
  astroContext: TarotAstroContext | null
}
```

The `TarotProvider` wraps only `TarotPage.tsx`'s children, not the entire app.

### 3. `TarotAstroContext` — session data reuse

Carmack's Proposal 1: when the user navigates from the Today page to Tarot, transit aspects, moon phase, and advance category are already computed in `TodayPage.tsx`'s local state (via `calculateTransitAspects`, `getCurrentMoonPhase`, `advanceSnapshotSessionCache`). These are expensive calculations — `advanceScoring.ts` runs a multi-pass forward simulation.

`TarotPage.tsx` receives this precomputed data as optional props from `App.tsx`. `App.tsx` can pass it through because `TodayPage` already computes it and App-level state holds `chartData` and `birthData`.

Define in `src/engine/tarot.ts`:

```typescript
export interface TarotAstroContext {
  chartData: ChartData
  birthDate: string
  personalDay: number
  moonPhase: CurrentMoonPhase | null
  // Optional — populated if user came through Today page or if transits were pre-computed
  transitAspects: TransitAspect[] | null
  advanceCategory: string | null  // 'peak' | 'building' | 'neutral' | 'rest' — from advanceScoring
  // Computed at TarotPage mount time if not provided
  dominantElement: 'Fire' | 'Water' | 'Air' | 'Earth' | null
}

export function buildTarotAstroContext(
  chartData: ChartData,
  birthDate: string,
  opts?: {
    transitAspects?: TransitAspect[]
    advanceCategory?: string
    moonPhase?: CurrentMoonPhase
  }
): TarotAstroContext
```

`buildTarotAstroContext` always computes `personalDay` and `dominantElement` from local data. It accepts `transitAspects`, `advanceCategory`, and `moonPhase` as optional pre-computed values to avoid redundant server calls or expensive local recalculations.

### 4. `TarotPage.tsx` as module root

Create `src/components/tarot/TarotPage.tsx`.

**Props:**

```typescript
interface TarotPageProps {
  chartData: ChartData | null
  birthDate: string
  // Optional — populated if user transited through Today page
  precomputedTransitAspects?: TransitAspect[]
  precomputedAdvanceCategory?: string
  precomputedMoonPhase?: CurrentMoonPhase
  onOpenUpgrade: (info: RateLimitInfo, tier?: 'basic' | 'advanced') => void
}
```

**Responsibilities:**

- Wraps its children in `<TarotProvider>`, which holds `TarotState`
- Calls `buildTarotAstroContext(chartData, birthDate, precomputedOpts)` once on mount
- Provides the constructed `astroContext` to children via `TarotContext`
- Manages internal sub-view routing by reading `state.subView` from `TarotContext`
- Renders one of: `<TarotHomeView>`, `<SingleCardReading>`, `<ThreeCardReading>`, `<CelticCrossReading>`, `<SavedReadingsPage>` based on `state.subView`
- Passes `onOpenUpgrade` down to whichever reading component is active
- Renders a back button in the top-left of every sub-view, which calls `dispatch({ type: 'NAVIGATE_TAROT', subView: 'home' })` from within a reading, or calls `appDispatch({ type: 'SET_VIEW', view: 'form' })` when already at `subView === 'home'`

**Loading state on mount:**

If `chartData` is null (unlikely in practice since Tarot is only accessible from `HomeScreen` which requires birth data, but must be handled), `TarotPage.tsx` renders:

```
✦
Reading your sky for the cards...
```

with the same spinner treatment used across other loading states in `App.tsx`. This loading state resolves in under 100ms in the common case since `buildTarotAstroContext` is synchronous when transit data is provided.

If transit data is not precomputed, `buildTarotAstroContext` skips the transit-specific context fields and returns a partial context. The instant interpretation layer still functions; only the `transitInfluence` field of `AstroConnection` is null until the user either navigates through Today first or Tarot fetches transit data independently.

**Sub-view navigation state machine:**

```
home (intention + mode selection)
  → single-reading  (single card draw initiated)
  → three-reading   (three-card spread initiated)
  → celtic-reading  (Celtic Cross initiated)
  → saved-readings  (saved readings list opened)

single-reading → home  (back button)
three-reading  → home  (back button)
celtic-reading → home  (back button)
saved-readings → home  (back button)

home → app home  (back button at home level)
```

The `TarotAction` type covers:

```typescript
type TarotAction =
  | { type: 'NAVIGATE_TAROT'; subView: TarotSubView }
  | { type: 'SET_INTENTION'; intention: string }
  | { type: 'SET_READING_MODE'; mode: ReadingMode }
  | { type: 'SET_SPREAD_MODE'; spreadMode: SpreadMode }
  | { type: 'SET_DRAWN_CARDS'; cards: DrawnCard[]; reversals: boolean[] }
  | { type: 'SET_INSTANT_INTERPRETATIONS'; interpretations: InstantInterpretation[] }
  | { type: 'SET_GPT_SYNTHESIS_STATUS'; status: TarotState['gptSynthesisStatus'] }
  | { type: 'SET_GPT_SYNTHESIS'; synthesis: string }
  | { type: 'SET_GPT_SYNTHESIS_ERROR'; error: string }
  | { type: 'SAVE_READING'; readingId: string }
  | { type: 'RESET_READING' }
```

`RESET_READING` clears `drawnCards`, `reversals`, `instantInterpretations`, `gptSynthesis`, `gptSynthesisStatus`, `gptSynthesisError`, `readingMode`, `spreadMode`, and `userIntention`, but preserves `savedReadingIds` and `currentReadingId`.

### 5. `TarotHomeView` — intention and mode selection

`TarotHomeView` is a sub-component within `TarotPage.tsx` (or a separate file `src/components/tarot/TarotHomeView.tsx`) rendered when `state.subView === 'home'`.

**Layout — first-time users vs. returning users:**

Check `state.savedReadingIds.length === 0` to determine first visit. On first visit, render a brief module introduction above the intention field:

```
✦ Tarot

The symbolic language of the cards, interpreted through your personal sky.
```

One sentence. No bulleted feature list. The design should feel like an invitation, not an onboarding flow. On returning visits (any saved readings exist), skip the introduction and go directly to the intention field.

**Intention-setting moment:**

The first interactive element is always the intention field, not the mode selector. This ordering — intention before mode — is specified in the sprint vision and the draw ritual proposal. It changes the emotional register of the entire experience.

```
What would you like clarity on today?

[ Love ] [ Career ] [ Growth ] [ Decision ] [ Today's Energy ] [ General ]

or type your own...
```

Focus chips are pre-selected options that populate the intention field with a single word. The custom text input appears below the chips. A "Skip and draw" link (small, subdued) allows bypassing intention entirely for users who prefer spontaneous draws.

**Mode selection (appears after intention is set or skipped):**

Three cards presented as a vertical list, not a grid:

```
Single Card
A daily moment of guidance. Quick, clear, personal.

Three-Card Spread
Past, present, future — or any of five spread modes.

Celtic Cross
A full ten-position reading. Deep, slow, symbolic.
[ Advanced only ]
```

The Celtic Cross card shows an "Advanced" badge if the user's tier is free. Tapping it opens `UpgradeModal` rather than entering the reading.

Selecting Single Card or Three-Card dispatches:
```typescript
dispatch({ type: 'SET_READING_MODE', mode: 'single' })
dispatch({ type: 'NAVIGATE_TAROT', subView: 'single-reading' })
```

### 6. `App.tsx` changes

In `AppContent`, add a render branch immediately after the `'journal'` branch:

```typescript
{state.view === 'tarot' && (
  <TarotPage
    chartData={journalChartData}
    birthDate={state.birthData.date}
    onOpenUpgrade={openUpgrade}
  />
)}
```

The `journalChartData` memo is already computed and available in `AppContent` — the same reference used for `TodayPage` and `CosmicJournalPage`. No new chart calculation is required.

Add the import at the top of `App.tsx`:

```typescript
import TarotPage from './components/tarot/TarotPage'
```

### 7. `ReadingsModal.tsx` — Tarot navigation entry

Add a new "Divination" group to the `GROUPS` array in `src/components/navigation/ReadingsModal.tsx`, positioned between "Transits" and "Journals":

```typescript
{
  heading: 'Divination',
  items: [
    {
      icon: Layers,   // from lucide-react — represents layered symbolic depth
      accent: '#7c3aed',  // violet — distinct from gold (charts), teal (transits), green (journal)
      label: 'Tarot Reading',
      descriptor: 'The symbolic language of the cards, read through your personal sky',
      action: { type: 'SET_VIEW', view: 'tarot' },
    },
  ],
},
```

The `Layers` icon from lucide-react (already a dependency) is the best available semantic match for "layered symbolic systems." If a more thematically precise icon is identified before implementation, it may be substituted — but avoid generic icons like `Star` (already used elsewhere in the gold palette) or `Wand` (not in lucide-react core). The violet accent (`#7c3aed`) distinguishes Tarot from every other group's accent color without conflicting with the app's existing palette.

The Tarot entry renders as a full-width card in its group (single item, so `isLastOdd` applies and `gridColumn: '1 / -1'` stretches it). This gives it visual prominence proportional to the reading's depth.

Add the `Layers` import to the existing lucide-react import line:

```typescript
import {
  Sun, Wind, Moon, Compass, Heart,
  BookOpen, Eye, Hash, Sparkles, Layers,
} from 'lucide-react'
```

### 8. Back navigation within Tarot

Back navigation uses two distinct mechanisms:

**Within Tarot sub-views (reading → home):**
A back button rendered in the top-left of every reading component:

```typescript
<button
  onClick={() => {
    tarotDispatch({ type: 'RESET_READING' })
    tarotDispatch({ type: 'NAVIGATE_TAROT', subView: 'home' })
  }}
  style={{ color: 'rgba(201,168,76,0.6)' }}
>
  ← Back
</button>
```

`RESET_READING` clears the in-progress reading state so re-entering a reading from home starts fresh. The back button does not appear mid-ritual (during a Celtic Cross sequential reveal) — it is only visible at the TarotHomeView and at the post-synthesis screens.

**From Tarot home → App home:**

`TarotHomeView` renders:

```typescript
const { dispatch: appDispatch } = useApp()

<button onClick={() => appDispatch({ type: 'SET_VIEW', view: 'form' })}>
  ← Home
</button>
```

This exits Tarot entirely and returns to `HomeScreen`. The `TarotProvider` unmounts, clearing all Tarot state. This is the correct behavior — there is no persistent Tarot state to preserve between app-level navigation events (saved readings are server-persisted and reloaded on the next Tarot entry).

### 9. State management: what `TarotPage` holds vs. what comes from `AppState`

| Data | Location | Rationale |
|---|---|---|
| `AppView === 'tarot'` | `AppState` | Minimal App footprint; needed to render `<TarotPage>` |
| `chartData`, `birthDate` | `AppState` (passed as props to `TarotPage`) | Already computed; no duplication |
| `subView` | `TarotState` | Internal Tarot routing |
| `readingMode` | `TarotState` | Ephemeral per-session |
| `userIntention` | `TarotState` | Ephemeral per-reading |
| `drawnCards`, `reversals` | `TarotState` | Ephemeral per-reading |
| `instantInterpretations` | `TarotState` | Computed from engine, ephemeral |
| `spreadMode` | `TarotState` | Ephemeral per-reading |
| `gptSynthesis`, status, error | `TarotState` | Ephemeral per-reading |
| `savedReadingIds` | `TarotState` | Loaded from server on `TarotPage` mount |
| `astroContext` | `TarotContext` (computed on mount) | Derived from props; not part of reducer |

The `TarotAstroContext` is computed once on `TarotPage` mount via `buildTarotAstroContext(chartData, birthDate, precomputedOpts)` and stored in the context value directly — not in the reducer state, because it is pure derivation from props and does not change during a Tarot session.

### 10. First-time vs. returning user experience

**First-time user** (no saved readings, `savedReadingIds.length === 0`):

1. `TarotHomeView` renders the module introduction: one-sentence description of the experience.
2. Intention field is shown immediately below.
3. Mode selector appears after intention is set.

No tutorial modal. No onboarding carousel. No "here's how Tarot works" copy block. The ritual begins on entry. The design trusts the user.

**Returning user** (one or more saved readings):

1. `TarotHomeView` skips the module introduction.
2. A small "Saved Readings" link appears in the top-right of the home view, navigating to `subView: 'saved-readings'`.
3. Intention field is shown directly.
4. Mode selector appears after intention is set.

The returning user's most recent reading type is not auto-selected — the user actively chooses mode each time. Ritual requires intention.

### 11. Loading state when entering Tarot

`TarotPage.tsx` mounts `buildTarotAstroContext` synchronously. If `chartData` is available (it will be in virtually all cases, since Tarot is gated behind the birth-data HomeScreen), context computation is immediate. No loading screen is shown.

If `chartData` is null (user somehow navigated to `'tarot'` view without a chart — defensive case), `TarotPage.tsx` renders:

```
✦
One moment while we read your sky.
```

This spinner auto-resolves when `chartData` becomes available in App state, or redirects to `'form'` after 3 seconds if chart data is still null (indicating the user lost their birth data cache).

For the saved readings fetch: `TarotPage.tsx` fires `GET /api/readings` on mount. While the fetch is in flight, `savedReadingIds` is `[]` and the "Saved Readings" link is not shown. This prevents a flash of the saved readings UI while the count is unknown.

### 12. Bottom navigation bar

The app currently does not have a persistent bottom navigation bar — navigation is handled by `ReadingsModal.tsx` opened from the HomeScreen "Get Your Readings ✦" button. Tarot does **not** receive a dedicated bottom nav icon in this proposal.

The navigation entry point for Tarot is:

1. `ReadingsModal.tsx` → "Divination" group → "Tarot Reading" card (primary entry point)
2. Any future `DailySnapshotCard` prompt that links directly to Tarot (e.g., "Today's energy invites a card draw" → tap to open Tarot with `subView: 'single-reading'` pre-selected and `readingMode: 'single'`) — this is a product decision for a later sprint, not this proposal

If a bottom navigation bar is introduced in a future sprint, Tarot should receive a slot between Today and Journal, using the same violet accent. That architectural decision is deferred.

### 13. `TarotPage.tsx` directory structure

New files created by this proposal:

```
src/components/tarot/
  TarotPage.tsx           — module root, TarotProvider, sub-view router
  TarotHomeView.tsx       — intention setting + mode selection

src/context/
  TarotContext.tsx        — TarotState, TarotAction, TarotProvider, useTarot hook
```

Files modified by this proposal:

```
src/context/appState.ts            — add 'tarot' to AppView union
src/App.tsx                        — add TarotPage render branch
src/components/navigation/ReadingsModal.tsx  — add Divination group with Tarot entry
```

Files that must exist (created by other proposals) before `TarotPage.tsx` is functional end-to-end:

```
src/engine/tarot.ts                 — buildTarotAstroContext, TarotAstroContext type
src/components/tarot/SingleCardReading.tsx
src/components/tarot/ThreeCardReading.tsx
src/components/tarot/CelticCrossReading.tsx
src/components/tarot/SavedReadingsPage.tsx
```

`TarotPage.tsx` can be wired with stub components for these reading surfaces during development, rendering `<div>Coming soon</div>` in each sub-view slot and replaced as the other proposals land.

### 14. `TarotPage.tsx` complete props and context interface

Final props interface (for reference by other proposals that need to interact with TarotPage):

```typescript
// src/components/tarot/TarotPage.tsx

interface TarotPageProps {
  chartData: ChartData | null
  birthDate: string
  precomputedTransitAspects?: TransitAspect[]   // from TodayPage session
  precomputedAdvanceCategory?: string            // from advanceSnapshotSessionCache
  precomputedMoonPhase?: CurrentMoonPhase        // from getCurrentMoonPhase in TodayPage
  onOpenUpgrade: (info: RateLimitInfo, tier?: 'basic' | 'advanced') => void
}
```

The `useTarot()` hook exported from `TarotContext.tsx` returns `{ state: TarotState, dispatch: React.Dispatch<TarotAction>, astroContext: TarotAstroContext | null }`. All child components of `TarotPage.tsx` use `useTarot()` instead of `useApp()` for reading-specific state.

---

## Out of Scope

- **Reading content:** The interpretation panel, GPT synthesis display, and card reveal animation are specified in proposals 5 (Single Card), 6 (Three Card), and 7 (Celtic Cross). This proposal only defines where those components mount and how navigation reaches them.
- **Subscription gating:** The tier-check logic for Celtic Cross access is implemented in proposal 11. This proposal only notes that the "Celtic Cross" mode button in `TarotHomeView` shows a badge and opens `UpgradeModal` — it does not implement the gating middleware.
- **Saved readings server route:** Defined in proposal 10. This proposal only specifies that `TarotPage.tsx` fires `GET /api/readings` on mount and that `savedReadingIds` is initialized from the result.
- **Card visual assets:** Specified in proposal 3.
- **GPT synthesis dispatch:** Specified in proposals 8 and 13.
- **TarotContext state architecture rationale (detailed):** Specified in proposal 14. This proposal references the same architecture decision and implements it; proposal 14 provides the detailed argument.

---

## Open Questions

**1. Should Tarot get a dedicated bottom nav icon, or is HomeScreen → ReadingsModal the permanent entry path?**

The current app has no persistent bottom navigation bar. If one is introduced in a future sprint, Tarot should receive a slot. If the HomeScreen-only pattern is sufficient for retention (the Today page also requires navigating through ReadingsModal, and it has strong daily-habit metrics), no bottom nav is needed. This question should be answered after the first cohort of Tarot users and their session start patterns are analyzed. The violet accent (`#7c3aed`) is reserved for Tarot across the app's visual system regardless of which entry point is used.

**2. Should `TarotPage.tsx` independently fetch transit data when precomputed aspects are not available?**

If the user navigates to Tarot without having opened the Today page first, `precomputedTransitAspects` will be null. `buildTarotAstroContext` will return a partial context with `transitAspects: null`. The `computeInstantInterpretation` engine falls back to element-affinity scoring when no transit aspects are available. This is the graceful degradation path.

The alternative is for `TarotPage.tsx` to fire a server-side transit computation on mount when aspects are null. This adds latency and server load. Recommendation: defer the independent transit fetch to a follow-up task. The element-affinity fallback in `computeInstantInterpretation` is sufficient for v1.

**3. Should Tarot be accessible to unauthenticated users?**

The Today page and journal require authentication. Transit readings work unauthenticated but are rate-limited. Tarot's personalization depends on birth data (stored locally for unauthenticated users) and natal chart computation (local). The AI synthesis layer requires authentication and the GPT rate limit. Recommendation: allow unauthenticated users to enter Tarot and see AI-free instant interpretations. GPT synthesis and saved readings require authentication, surfaced via the same `onOpenAuth` pattern used elsewhere. This matches the existing rate-limit-as-auth-gate pattern.
