# Proposal: TarotContext State Architecture

- **Slug:** `refactor-tarot-context`
- **Type:** Code Enhancement
- **Originated by:** Taleb
- **User guidance:** N/A

---

## Problem / Opportunity

`AppState` in `src/context/appState.ts` (415 lines) is already a God Object carrying state for seven distinct feature domains: natal chart (3 fields), transit reading (5 fields), synastry (8 fields), synastry transit (4 fields), solar return (4 fields), form state (3 fields), and storage warning (1 field). Every component that calls `useApp()` in `src/context/AppContext.tsx` receives a reference to this single object and re-renders whenever any field in it changes — regardless of whether that field is relevant to the component.

The sprint 0023 navigation proposal (proposal 9) specifies adding to `AppState`: current reading type, drawn cards, instant interpretations, GPT synthesis status, saved reading list, and user intention. That is 10–12 new Tarot fields on a God Object that already has 28 named fields and 32 action types across 415 lines.

The re-render consequence is concrete. Today, when a transit interpretation arrives via `SET_TRANSIT_INTERPRETATION`, every consumer of `useApp()` re-renders — including `HomeScreen`, `FormWizard`, `SynastryPage`, and `CosmicJournalPage`. They happen to be gated behind `state.view` conditionals, so the wasted renders are invisible today. Once 10 Tarot fields are added, a card flip animation updating `drawnCards` will trigger re-renders across every mounted non-Tarot component. Progressive reveal interactions — which fire state updates on each of the 10 Celtic Cross positions — will compound this. The result is not a theoretical slowdown: it is a concrete re-render cascade that will appear as animation jank in `CardReveal.tsx` during the 600ms flip transition.

The codebase already has the correct pattern: `AuthContext.tsx` (323 lines) is entirely separate from `AppContext.tsx` and `appState.ts`. Auth state is isolated, auth consumers re-render only on auth changes, and the pattern is well-understood by anyone reading this codebase.

---

## Desired State

`src/context/TarotContext.tsx` holds all Tarot reading state. `AppState` receives only one new field: `tarotView: TarotView | null`, signaling that Tarot is the active module. The `AppView` union type in `appState.ts` gains `'tarot'` as a single value; all Tarot sub-navigation lives inside `TarotContext`.

### `TarotContext.tsx` — state interface

```typescript
export type TarotReadingType = 'single' | 'three-card' | 'celtic-cross'

export type TarotView =
  | 'intention'      // intention-setting screen
  | 'mode-select'    // reading type picker
  | 'draw'           // draw ritual and shuffle animation
  | 'reveal'         // card reveal in progress
  | 'interpretation' // instant interpretation visible
  | 'synthesis'      // GPT synthesis panel active
  | 'saved'          // saved readings list

export interface DrawnCard {
  cardId: string
  reversed: boolean
  position: number
  spreadPositionLabel: string
}

export interface InstantInterpretation {
  cardId: string
  uprightMeaning: string
  reversedMeaning: string
  emotionalMeaning: string
  practicalGuidance: string
  reflectionQuestion: string
  numerologyResonance: string
  astroHeadline: string       // ≤ 20 words, sky-specific
  transitInfluence: string    // always non-empty (three-level fallback)
}

export type SynthesisStatus = 'idle' | 'loading' | 'success' | 'unavailable' | 'rate-limited'

export interface TarotState {
  tarotView: TarotView
  readingType: TarotReadingType | null
  spreadMode: string | null              // e.g. 'past-present-future'
  userIntention: string
  drawnCards: DrawnCard[]
  interpretations: InstantInterpretation[]
  revealIndex: number                    // which card has been flipped so far
  synthesisStatus: SynthesisStatus
  synthesisText: string | null
  savedReadingIds: string[]
}
```

### What `AppState` gains

One field added to the `AppState` interface in `appState.ts`:

```typescript
tarotView: TarotView | null
```

One value added to the `AppView` union:

```typescript
export type AppView = 'form' | 'loading' | 'results' | 'transit-select' | 'transit-loading'
  | 'transit-results' | 'partner-form' | 'synastry-loading' | 'synastry-results'
  | 'synastry-transit-select' | 'synastry-transit-loading' | 'synastry-transit-results'
  | 'numerology' | 'solar-return-loading' | 'solar-return' | 'today' | 'journal'
  | 'tarot'   // <-- only addition
```

### Provider nesting

`TarotProvider` wraps only the Tarot module subtree, not the entire app. In `App.tsx`:

```typescript
{state.view === 'tarot' && (
  <TarotProvider>
    <TarotPage />
  </TarotProvider>
)}
```

This means `TarotContext` is mounted only when Tarot is active. State is reset automatically on unmount without requiring explicit reset actions in `appReducer`.

### Follows the `AuthContext` pattern

`AuthContext.tsx` is the established precedent: a dedicated `createContext`, a `Provider` component managing all feature-domain state via `useState`/`useCallback`, and a `useTarot()` hook that throws if called outside the provider. The `TarotContext` implementation follows this pattern exactly, not the `useReducer`-based `AppContext` pattern, because Tarot state transitions are local to the module and do not need to be persisted to `localStorage` on every change.

### Non-Tarot components do not re-render during Tarot interactions

Once `TarotProvider` is the only consumer of `TarotState`, all Tarot field updates — card draws, reveal progress, synthesis loading, GPT text arrival — are invisible to `HomeScreen`, `ResultsPage`, `SynastryPage`, `TodayPage`, `CosmicJournalPage`, and every other mounted component. The only AppState change that propagates to non-Tarot consumers is `view: 'tarot'` on entry, and `view: 'form'` (or wherever) on exit. All 10+ Celtic Cross reveal state updates stay contained.

---

## Implementation notes

- `src/context/TarotContext.tsx` — new file, analogous in structure to `AuthContext.tsx`
- `src/context/appState.ts` — add `tarotView: TarotView | null` to `AppState`; add `'tarot'` to `AppView`; add `SET_TAROT_VIEW` action; update `initialState` and `appReducer`; no other changes
- `src/App.tsx` (663 lines) — add one conditional render block for `state.view === 'tarot'`; no other changes
- `src/components/home/HomeScreen.tsx` — add Tarot entry point that dispatches `SET_VIEW: 'tarot'`

The `TarotAstroContext` builder (proposal 2) accepts already-computed `transitData`, `moonPhase`, and `advanceCategory` from `AppState` as optional parameters, passed in from `TarotPage.tsx` at mount time, so Tarot can consume session-cached calculations without triggering re-computation.

This is not premature optimization. `AppState` is already 415 lines with 28 fields and 32 action types. A 30-minute structural decision made now eliminates a multi-sprint re-render debugging session once the Celtic Cross progressive reveal is shipping.
