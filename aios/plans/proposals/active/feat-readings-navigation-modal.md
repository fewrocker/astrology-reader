# Feature Proposal: Readings Navigation Modal

**Type:** Feature
**Originated by:** Jobs (Proposals 1 & 2), Carmack (proposal-readings-modal-clean-component, proposal-home-screen-extract-component), Miyazaki (Proposal 6), Taleb (Proposals 4 & 5)

---

## Problem / Opportunity

### The Home Screen Is a Flat Directory, Not a Front Door

`src/App.tsx` — `CachedDataLanding` (lines 197–418) — renders nine equal-weight buttons in a vertical stack: "Read My Chart", "Today", "Journal", "Daily / Weekly / Monthly Reading", "Couple Synastry", "Year Ahead", "Dream Interpretation", "Numerology", "Enter New Birth Data". Every button carries the same font, the same padding, the same visual weight. A returning user who wants their weekly transit reading must visually scan all nine to find it. A first-time user has no idea where to begin. The product has ten distinct features and no information architecture that explains how they relate to each other.

The visual grouping is absent entirely. "Enter New Birth Data" — a destructive cache-clearing action — sits at the bottom of the stack with the same visual authority as "Couple Synastry" or "Read My Chart". The DailySnapshotCard, which is the most temporally relevant content in the application, is hidden below the fold on desktop (`hidden lg:block mt-8`) and squeezed between panels on mobile (`lg:hidden`). The most personally alive feature in the product is the hardest to see.

### The Hover Pattern Is Fragile and Inconsistent

`CachedDataLanding` contains 14 inline `onMouseEnter`/`onMouseLeave` handlers (lines 264–270, 280–286, 323–332, 342–354, 359–372) to replicate hover behavior that Tailwind handles declaratively. Each button hover state requires three synchronized updates: default `style`, `onMouseEnter`, `onMouseLeave`. Changing one color requires three edits. This pattern is inconsistent with buttons that already use Tailwind `hover:` classes (e.g., "Read My Chart", "Daily / Weekly / Monthly Reading") on the same page.

### Back-Navigation from Deep Views Points to a Deprecated Surface

After the modal is introduced, `transit-select` is no longer a primary home surface — it is reached through the modal. But `TransitReadingPage` (line 339 of `TransitReadingPage.tsx`) currently dispatches `SET_VIEW: 'transit-select'` for its "Choose Another Reading" back button. `SynastryTransitPage` (line 167) dispatches `SET_VIEW: 'synastry-transit-select'`. These will strand users in period-selection screens that have no path back to the modal without navigating home first.

The full map of current back-navigation dispatches across deep views:
- `TransitReadingPage` (line 339): `SET_VIEW: 'transit-select'` — deprecated after modal
- `TransitReadingPage` (line 345): `SET_VIEW: 'results'` — acceptable as-is
- `TransitReadingPage` (line 351): `RESET` — labeled "New Birth Data"
- `SynastryPage` (line 351): `SET_VIEW: 'synastry-transit-select'` — OK (intra-synastry navigation)
- `SynastryPage` (line 357): `RESET` — labeled "Back to Menu"
- `SynastryTransitPage` (line 167): `SET_VIEW: 'synastry-transit-select'` — internal, acceptable
- `SynastryTransitPage` (line 173): `SET_VIEW: 'synastry-results'` — correct
- `SolarReturnPage` (line 112): `SET_VIEW: 'form'` — resolves to home, correct
- `SolarReturnPage` (line 269): `SET_VIEW: 'results'` — correct
- `SolarReturnPage` (line 273): `SET_VIEW: 'form'` — correct
- `NumerologyPage` (line 710): `SET_VIEW: 'form'` — labeled "Back to Menu", correct
- `TodayPage` (line 92): `SET_VIEW: 'form'` — correct
- `CosmicJournalPage` (line 362): `SET_VIEW: 'form'` — correct
- `ResultsPage` (line 150): `RESET` — labeled "Back to Menu"

The problematic case is `TransitReadingPage`'s primary back-navigation which goes to `transit-select`. The secondary issue is several pages using `RESET` for back navigation, which discards all computed state rather than navigating home.

### The `DreamModal` Ownership Is Stranded in `CachedDataLanding`

`dreamOpen` state and `setDreamOpen` are local to `CachedDataLanding` (line 201). When Dream Interpretation moves into `ReadingsModal`, this state must either migrate into `ReadingsModal` (where it closes the modal first, then opens DreamModal) or be elevated. Leaving it in `CachedDataLanding` requires prop-drilling a boolean and callback through `ReadingsModal` into the item's click handler — which inverts the dependency direction.

---

## Vision

The readings modal should feel like opening the menu at a fine restaurant you trust. Not a settings panel, not a dropdown, not a list of checkboxes. When the user taps "Get Your Readings ✦" — the single prominent CTA on the home screen — a panel rises over the page that immediately communicates: *these are three different kinds of things you can do here*. The group headers (You, Transits, Journals) name the conceptual categories in human terms. Each item has a glyph that you recognize at a glance, a label that names the feature, and one line beneath that earns the click — not a feature label, but an invitation.

The modal closes the moment a reading is selected. There is no second confirmation. The transition is immediate: the user chose, the app responds.

Back-navigation from any deep view arrives at home or re-opens the modal — never at an intermediate selection screen that has no path forward. Every "← Back" button leads somewhere the user can orient from.

The entire modal is built with Tailwind `hover:` variants. No `onMouseEnter`/`onMouseLeave` inline style objects. This is new code; it sets the pattern.

---

## Specifications

### 1. New Component File

Create `src/components/navigation/ReadingsModal.tsx` as a self-contained presentational component. Its props interface:

```
interface ReadingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (action: AppAction) => void
  onOpenDream: () => void
}
```

`onSelect` accepts any `AppAction` from `src/context/appState.ts`. The parent (`CachedDataLanding` or `HomeScreen`) dispatches the action. The modal does not import `useApp` or `useDispatch` directly — it is purely presentational, receiving dispatch capability through props.

### 2. Group Structure and Item Definitions

The modal renders three named groups. Group headers use `font-heading` (Cormorant Garamond), gold color, tracking-widest at a smaller size than section headings. Group separators are subtle horizontal rules (`border-mystic-border` at reduced opacity) — not boxes, not cards. The three groups read as chapters in one document.

**Group 1 — You**
Items:
- Glyph: `✦` / Label: `Birth Chart` / Descriptor: `Your natal positions, decoded once and kept forever` / Dispatch: `{ type: 'SET_VIEW', view: 'loading' }` (triggers natal chart calculation)
- Glyph: `✦` / Label: `Numerology` / Descriptor: `Your life numbers and what they say about your path` / Dispatch: `{ type: 'SET_VIEW', view: 'numerology' }`

**Group 2 — Transits**
Items:
- Glyph: `☀` / Label: `Daily Reading` / Descriptor: `What the sky is doing to your chart right now, today` / Dispatch: `{ type: 'START_TRANSIT', period: 'daily' }`
- Glyph: `✦` / Label: `Weekly Reading` / Descriptor: `This week's planetary influence — themes, communication, energy` / Dispatch: `{ type: 'START_TRANSIT', period: 'weekly' }`
- Glyph: `☽` / Label: `Monthly Reading` / Descriptor: `Slow-moving planets, retrogrades, and deeper currents this month` / Dispatch: `{ type: 'START_TRANSIT', period: 'monthly' }`
- Glyph: `☀` / Label: `Year Ahead` / Descriptor: `Your solar return chart — the sky on your next birthday` / Dispatch: `{ type: 'START_SOLAR_RETURN' }`
- Glyph: `♡` / Label: `Couple Synastry` / Descriptor: `Two charts overlaid — where you align and where you stretch` / Dispatch: `{ type: 'SET_VIEW', view: 'partner-form' }`

**Group 3 — Journals**
Items:
- Glyph: `✦` / Label: `Cosmic Journal` / Descriptor: `Your annotated sky record — entries, tags, and reflections` / Dispatch: `{ type: 'SET_VIEW', view: 'journal' }`
- Glyph: `☽` / Label: `Dream Interpretation` / Descriptor: `Symbols from your sleep, read through your natal chart` / Action: calls `props.onOpenDream()` (opens DreamModal, does not dispatch a view change)
- Glyph: `✦` / Label: `Today` / Descriptor: `Moon phase, personal day number, and a reading for this exact day` / Dispatch: `{ type: 'SET_VIEW', view: 'today' }`

### 3. Item Structure (DOM)

Each item renders as a `<button>` with this internal layout:
```
[glyph — fixed width, right-aligned, muted gold]  [label — font-heading, full gold]
                                                    [descriptor — text-xs, text-mystic-muted]
```

The glyph column is `w-8` fixed, text aligned right, color `text-mystic-gold/50`. The label is `font-heading text-base text-mystic-gold`. The descriptor is `text-xs text-mystic-muted mt-0.5`. The entire button row has `px-0 py-3` with a `border-b border-mystic-border/30` between items within the same group. No border after the last item of each group.

Hover state uses Tailwind only: `hover:bg-mystic-gold/5 transition-colors duration-150 rounded-lg`. No `onMouseEnter`/`onMouseLeave`.

### 4. Modal Shell

The modal shell mirrors `AuthModal`'s overlay approach:

- Backdrop: `fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:items-center sm:pt-4` with `bg-black/75 backdrop-blur-sm`
- Clicking the backdrop calls `onClose()`
- Inner container: `w-full max-w-sm rounded-2xl overflow-hidden` — narrower than AuthModal's `max-w-md` since this is a navigation menu, not a form
- Background gradient: same as AuthModal — `linear-gradient(160deg, rgba(22,16,8,0.98) 0%, rgba(15,11,5,0.99) 100%)`
- Border: `1px solid rgba(201,168,76,0.3)`
- Box shadow: `0 0 48px rgba(201,168,76,0.08), 0 24px 64px rgba(0,0,0,0.7)`
- `role="dialog"` `aria-modal="true"` `aria-label="Choose a reading"`

Header inside the modal:
- Small heading: `font-heading text-xl text-mystic-gold mb-1` — text: `Your Readings ✦`
- Subtext: `text-xs text-mystic-muted tracking-widest uppercase` — text: `What calls to you today`
- Close button (`×`) top-right using Tailwind: `text-mystic-gold/35 hover:text-mystic-gold/75 transition-colors`

### 5. Modal Scroll Behavior

The inner content area (the three groups and all items) must be scrollable when the viewport is shorter than the content. The container uses `overflow-y-auto max-h-[70vh]` on the scrollable content region. At 375px width and 667px height (iPhone SE), all three groups plus their items must be reachable by scrolling without the modal itself overflowing the viewport.

### 6. Modal Open/Close Behavior

**Opening:** A boolean `isOpen` prop controls visibility. When `isOpen` is false, the component returns `null` (same pattern as `AuthModal`). Opening is triggered by the "Get Your Readings ✦" CTA button in `CachedDataLanding` (or its extracted `HomeScreen` successor), managed by local `useState` in that parent component.

**Closing without selection:** The modal closes when:
- The user presses `Escape` (keyboard event listener attached when `isOpen === true`, removed on cleanup — same pattern as `AuthModal` lines 39–46)
- The user clicks the backdrop (`onClick` on the outer div, guarded by `e.target === e.currentTarget`)
- The close button `×` is clicked

**Closing on selection:** When the user clicks any item, the parent's `onSelect` is called with the appropriate `AppAction`, then `onClose()` is called. The order is: dispatch first, close second. This ensures the view state transitions before the modal unmounts.

**Dream exception:** When Dream Interpretation is clicked, `props.onOpenDream()` is called, then `onClose()`. `DreamModal` opens after the readings modal closes.

### 7. DreamModal State Migration

`dreamOpen` state moves out of `CachedDataLanding`'s inline function and into the parent scope that renders both `ReadingsModal` and `DreamModal`. Concretely, the parent manages:
```
const [readingsOpen, setReadingsOpen] = useState(false)
const [dreamOpen, setDreamOpen] = useState(false)
```
`ReadingsModal` receives `onOpenDream={() => setDreamOpen(true)}`. `DreamModal` receives `open={dreamOpen} onClose={() => setDreamOpen(false)}`. These two modals never open simultaneously.

### 8. CTA Button Change on Home Screen

The nine navigation buttons in `CachedDataLanding` (lines 248–382) are removed entirely. In their place, within the same card (`bg-mystic-surface/50 border border-mystic-border rounded-xl p-8 glow-gold`), the card contains:
- Birth details block (existing, unchanged)
- "Change birth information" link — small, secondary, `text-xs text-mystic-muted hover:text-mystic-text transition-colors underline-offset-2 underline`, dispatches `{ type: 'CLEAR_CACHE' }` — replaces the "Enter New Birth Data" button
- `DailySnapshotCard` embedded inside the card, full width, between the birth details and the CTA
- A single CTA: `<button>Get Your Readings ✦</button>` — `w-full px-6 py-3 bg-mystic-gold text-mystic-bg font-heading rounded-lg hover:bg-mystic-gold/90 transition-colors` — opens the readings modal via `setReadingsOpen(true)`

The mobile-only `DailySnapshotCard` between panels (`lg:hidden` div, lines 390–394) and the desktop-only `DailySnapshotCard` below panels (`hidden lg:block mt-8`, lines 410–414) are both removed. The snapshot lives inside the left panel at all screen sizes.

### 9. Back-Navigation Fixes for Deep Views

Each fix dispatches `{ type: 'SET_VIEW', view: 'form' }`, which resolves to `CachedDataLanding` when birth data is cached. This is the universal "home" target.

**`src/components/results/TransitReadingPage.tsx`**
- Line 339: Change `SET_VIEW: 'transit-select'` to `SET_VIEW: 'form'`. Button label changes from "← Choose Another Reading" to "← Home". A separate "Choose Another Period" path (optional, secondary) can still navigate to `transit-select` if desired, but the primary back button navigates home.

**`src/components/results/ResultsPage.tsx`**
- Line 150: Change `RESET` dispatch to `SET_VIEW: 'form'`. Label changes from "Back to Menu" to "← Home". `RESET` wipes all computed state; navigation home does not.

**`src/components/results/SynastryPage.tsx`**
- Line 357: Change `RESET` dispatch to `SET_VIEW: 'form'`. Label changes from "Back to Menu" to "← Home". `synastry-transit-select` back (line 351) remains — it is valid intra-synastry navigation.

**`src/components/reading/TodayPage.tsx`**
- Line 92: No change needed — already dispatches `SET_VIEW: 'form'` and the behavior is correct.

**`src/components/journal/CosmicJournalPage.tsx`**
- Line 362: No change needed — already dispatches `SET_VIEW: 'form'`.
- Line 419: "Read My Chart" button dispatches `SET_VIEW: 'loading'` — this is valid and intentional, no change.

**`src/components/results/SolarReturnPage.tsx`**
- Lines 112 and 273: Already dispatch `SET_VIEW: 'form'` — correct, no change.
- Line 269: `SET_VIEW: 'results'` — valid secondary path to birth chart, no change.

**`src/components/results/NumerologyPage.tsx`**
- Line 710: Already dispatches `SET_VIEW: 'form'` — correct, no change.

**`src/components/results/SynastryTransitPage.tsx`**
- Line 167: `SET_VIEW: 'synastry-transit-select'` — intra-synastry navigation, acceptable. No change required for this sprint.
- Line 173: `SET_VIEW: 'synastry-results'` — correct, no change.

### 10. `transit-select` Role After Modal Introduction

`TransitSelectScreen` in `App.tsx` (lines 421–450) and its route `{state.view === 'transit-select' && <TransitSelectScreen />}` (line 758) remain in the codebase this sprint. `transit-select` now serves a reduced role: it is the destination for the `RESET`-replaced "Choose Another Reading" fallback from `TransitReadingPage`, and it remains reachable if `state.reading` is set (the `onBack` handler in `TransitSelectScreen` already dispatches `SET_VIEW: state.reading ? 'results' : 'form'`). It is not removed — it is demoted. The happy path through the modal bypasses it entirely.

### 11. Mobile Responsiveness

At 375px viewport width:
- The modal opens anchored to top of screen (`pt-16` from top or `items-start`) to ensure the header is always visible
- Content area scrolls internally — `overflow-y-auto max-h-[70vh]` — so all three groups are reachable
- The left panel on mobile becomes full-width; `DailySnapshotCard` embedded inside has no extra outer border — the snapshot card's own border (`border border-mystic-gold/20` or equivalent) is the only border visible. No border-within-border nesting.
- Touch targets for each item row are minimum 44px tall (achieved by `py-3` plus the two-line content)

### 12. Keyboard Accessibility

- `Escape` closes the modal (event listener pattern from `AuthModal`)
- Modal container receives `role="dialog"` `aria-modal="true"` and a descriptive `aria-label`
- On open, focus moves to the first interactive element inside the modal (the close button or first item) using a `useEffect` with `setTimeout(..., 50)` after `isOpen` transitions to `true` — same pattern as `AuthModal` line 29
- All items are `<button type="button">` elements — they receive Tab focus in DOM order
- The backdrop click handler does not steal focus

### 13. Animation

The modal entrance does not require a complex animation this sprint. A minimal CSS transition is acceptable: `opacity-0 → opacity-100` on the backdrop and `scale-95 → scale-100` on the inner container, using Tailwind's `transition-all duration-150`. If Tailwind's built-in transition classes are insufficient for the enter/exit sequence without a headless UI library, a static render (no animation) is preferred over an `onMouseEnter`/`onMouseLeave` workaround. Simplicity over flourish.

### 14. Styling Constraints

Per Carmack: no `onMouseEnter`/`onMouseLeave` inline style objects in `ReadingsModal.tsx`. The Tailwind theme (`tailwind.config.ts`) already exposes `mystic-gold`, `mystic-purple`, `mystic-surface`, `mystic-border`, `mystic-muted`, `mystic-text`, `mystic-bg` — these are sufficient for all hover and focus states. The only inline `style` attributes permitted in `ReadingsModal.tsx` are those using CSS values that genuinely cannot be expressed in the existing Tailwind config (in practice: none).

---

## Out of Scope

- Redesigning `TransitSelectScreen` or `SynastryTransitSelectScreen` beyond their role as fallback destinations
- Introducing React Router, URL-based navigation, or browser history integration
- Adding new astrological calculations or GPT prompt changes
- Redesigning the `AuthModal` component
- The split-render pattern (decoupling GPT from computed data) — this is a separate proposal (`proposal-split-render-decouple-gpt` per Carmack)
- Extracting `CachedDataLanding` into a separate `HomeScreen.tsx` file — this is described as a separate proposal in Carmack's voice analysis and should be tracked independently
- Extracting `SessionBadge` and `CachedDataNudge` into separate files — same scope boundary
- The "Save your readings ✦" auth nudge surface near the birth details block — separate from this modal feature
- Rewriting the birth details block to show Sun sign / Rising sign — separate from this modal feature
- Adding a Sun sign glyph to the header
- The `COMPLETE_FORM` action for post-form landing (Taleb Proposal 2) — separate state management change
- Removing the `transitLoading: boolean` field from `AppState` (Carmack)
- Adding a typed state transition guard (Taleb Proposal 1)

---

## Open Questions

1. **"Today" placement in Group 3 (Journals) vs. Group 2 (Transits).** Taleb raises this directly: `TodayPage` shows moon phase, personal day number, sky highlights, and a GPT interpretation — it behaves more like an ambient transit reading than a journaling tool. Placing it in Journals alongside Dream Interpretation creates an expectation mismatch for users who think of "Today" as a reading. Should "Today" move to Group 2 (Transits), as the fifth item below Year Ahead? Or does Journals benefit from having three items to feel substantively populated?

2. **What does the TransitReadingPage "Choose Another Reading" experience look like after the modal exists?** Spec item 9 demotes the back button from `transit-select` to `SET_VIEW: 'form'`, meaning to get another transit period the user goes home and re-opens the modal. Is one extra click acceptable? Or should the "← Home" button be accompanied by a secondary "← Choose Another Period" link that navigates to `transit-select`? This affects how much of the old `TransitSelectScreen` flow survives.

3. **`DailySnapshotCard` concurrent GPT call management.** Taleb Proposal 4 describes a 500–800ms stagger on the DailySnapshotCard GPT call when cache is empty, to avoid collisions with in-flight GPT calls from result pages. This stagger is relevant when the card is embedded in the home screen panel. Should it be implemented as part of this proposal (since the embed is part of this spec) or tracked separately?

4. **`RESET` vs. `SET_VIEW: 'form'` for `ResultsPage` back navigation.** The current `ResultsPage` back button dispatches `RESET`, which clears all computed state (chart, transits, synastry). Changing it to `SET_VIEW: 'form'` preserves computed state and returns to home. However, if the user navigated to birth chart from a fresh form submission and presses Back, they expect to be able to re-enter data. Is `RESET` the correct semantic here, or is home-navigation-with-preserved-state the right default?

5. **Focus trap inside modal.** `AuthModal` does not implement a full focus trap — Tab can escape the modal. For a navigation modal, this is likely acceptable. Should this proposal require a proper focus trap (cycling Tab within the modal's interactive elements), or is the current `AuthModal` accessibility level sufficient?

6. **"Change birth information" link styling and placement.** The spec places it as a small text link below the birth details block. Should it appear before `DailySnapshotCard` (between birth details and the snapshot) or after (between snapshot and the CTA)? Placing it after the snapshot keeps destructive actions visually separated from identity information; placing it before keeps the panel's reading flow unbroken (identity → change → snapshot → action).
