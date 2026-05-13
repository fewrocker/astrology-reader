# Feature Proposal: Home Screen Redesign — Personal Dashboard

**Type:** Feature
**Originated by:** Jobs, Carmack, Miyazaki, Taleb

---

## Problem / Opportunity

### The home screen is a directory, not a dashboard

The current `CachedDataLanding` component (`src/App.tsx`, lines 197–418) greets returning users with a 40/60 split layout: a left panel containing birth data fields and nine equal-weight navigation buttons, and a right panel showing the `SkyTodayChart`. The nine buttons — "Read My Chart", "Today", "Journal", "Daily / Weekly / Monthly Reading", "Couple Synastry", "Year Ahead", "Dream Interpretation", "Numerology", "Enter New Birth Data" — are ordered by implementation history, not by user intent. No button is visually prioritized over any other. The panel communicates nothing about which actions are primary and which are secondary. It reads as a settings screen.

### The product's richest daily feature is hidden below the fold

`DailySnapshotCard` — which provides moon phase, energy rating, key transit aspect, personal day number, and a personalized two-sentence GPT briefing — is rendered **below** both panels on desktop (lines 409–414, `hidden lg:block`) and squeezed between panels on mobile (lines 390–394, `lg:hidden`). On a typical 1080p desktop display, a user opening the app sees the nine buttons and the sky chart; the daily snapshot requires scrolling. A returning user who comes back every morning to check their day may not know it exists.

### Birth details are displayed as a database row, not an identity

The birth details block (lines 233–246) renders three label-value pairs: `Place: [city], [country]`, `Time: [HH:MM]`, `Date: [MM/DD/YYYY]`. The user entered their birth moment — a cosmically specific coordinate — and the app reflects it back to them as a form receipt. Sun sign, rising sign, and Moon sign are computed values directly available from `state.chartData` (or computable from `birthData` via `calculateChart`) and would be far more personally meaningful. The difference between "Date: 10/28/1992" and "Sun in Scorpio · Libra Rising · Moon in Pisces" is the difference between a database and a relationship.

### "Enter New Birth Data" carries the wrong weight and the wrong label

The action of clearing cached birth data and starting over is maintenance, not a primary use case. Yet it is rendered as a full-width button (lines 378–383) at the same visual height as "Couple Synastry" and "Read My Chart". The label "Enter New Birth Data" implies the user has made an error rather than inviting exploration of another person's chart. It is a CLEAR_CACHE action masquerading as a navigation button.

### Auth entry is invisible

The only auth entry point for unauthenticated users is the `SessionBadge` component (lines 54–126): a `✦` glyph rendered at `rgba(201,168,76,0.3)` opacity in the header. At 30% opacity, most users treat it as decorative. The secondary nudge, `CachedDataNudge` (lines 128–195), only appears after journal entries exist or after 7 days of inactivity, and it renders at the bottom of the panel — below the fold on most viewports. The app's persistence layer — the mechanism by which a user's journal, dream interpretations, and chart data survive device resets — is not visible at the moment the user would most value it: when they are looking at their birth details.

### Post-form navigation drops a first-time user into the most complex screen

After completing the three-step `FormWizard`, `handleNext()` on the final step (line 33 in `src/components/form/FormWizard.tsx`) dispatches `{ type: 'SET_VIEW', view: 'loading' }`. This triggers the natal chart calculation and lands the user on `ResultsPage` — a twelve-house natal wheel with aspect lines, planet positions, and house interpretations. A user who just entered their birthday, time, and city is not oriented enough to understand what they are looking at. The home screen — birth identity, today's sky, a clear path forward — would serve first-time users better as an initial landing.

### The `showCachedLanding` condition creates a latent regression

The condition at `App.tsx` line 727:
```
state.view === 'form' && hasCachedBirthData() && state.formStep === 0 && !!state.birthData.date && !!state.birthData.city
```
includes `state.formStep === 0`. After the final form wizard step, `formStep` is `2`. If `handleNext()` is changed to dispatch `SET_VIEW: 'form'` without also resetting `formStep`, the condition evaluates to `false` and the user sees the blank `FormWizard` at step 0 instead of the home screen. There is no existing action that simultaneously sets `view: 'form'` and resets `formStep: 0` while preserving `birthData`. The `RESET` action resets everything including birth data. The `CLEAR_CACHE` action clears the cache entirely. Neither is appropriate. Additionally, `hasCachedBirthData()` (defined in `appState.ts` line 272) reads from `localStorage` synchronously on every render; calling it inline in the JSX condition at line 727 means a synchronous localStorage read in every render cycle of `AppContent`.

---

## Vision

A returning user opens the app in the morning. The header says "Astral Chart". The left panel greets them with who they are — not a date and a city, but their sign placements, one line: "Sun in Scorpio · Libra Rising · Moon in Pisces". Below that, a small quiet link: "Change birth information". Below that, the `DailySnapshotCard` fills the lower portion of the panel — moon phase, energy dots, key transit, personal day, and two sentences that feel written for this person today. At the bottom of the panel, a single gold button: "Get Your Readings ✦". The right panel holds the `SkyTodayChart` exactly as it is now.

For unauthenticated users, a soft line appears near the birth identity block: "Save your readings ✦" — not a banner, not a dismissable nudge, just a steady ambient invitation. It opens the register modal.

When the user taps "Get Your Readings ✦", a modal opens organized into three named groups — "You", "Transits", "Journals" — each with its items, glyphs, and one-line descriptors. Finding any feature takes two seconds. The modal closes when a selection is made.

When a first-time user completes the FormWizard, they land here — on their new home screen — not on the birth chart. The birth chart is a deliberate choice from the modal, not the default destination.

The signature moment of this feature is every morning: the user opens the app, reads their name in the stars in the first line of the panel, sees the moon and their energy score already loaded, and knows exactly what to do next. The home screen earns its place as the emotional center of the product.

---

## Specifications

### Layout and Structure

1. The `CachedDataLanding` component must be extracted from `src/App.tsx` into a standalone file — either `src/components/home/HomeScreen.tsx` or a similarly named dedicated module. The 220-line inline function within an 847-line file is the structural root of the problem. New logic added for this feature (modal state, auth nudge, snapshot embed) must not further expand `App.tsx`.

2. The left panel retains its 40% width on desktop (`lg:w-[40%]`) and full-width on mobile. The right panel retains its 60% width on desktop (`lg:w-[60%]`) with `SkyTodayChart` unchanged. The outer wrapper (`max-w-7xl`, flex row on desktop) is unchanged.

3. The left panel must contain the following sections in order, top to bottom:
   - Birth identity block (see specs 7–11)
   - "Change birth information" link (see spec 12)
   - Auth nudge for unauthenticated users (see specs 13–15)
   - `DailySnapshotCard` embedded inside the panel at full panel width (see specs 16–21)
   - "Get Your Readings ✦" primary CTA button (see spec 22)

4. The nine individual navigation buttons currently in `CachedDataLanding` — "Read My Chart", "Today", "Journal", "Daily / Weekly / Monthly Reading", "Couple Synastry", "Year Ahead", "Dream Interpretation", "Numerology", "Enter New Birth Data" — are removed from the Home screen entirely. None of them must appear on the redesigned home screen.

5. The `DailySnapshotCard` rendered below both panels on desktop (the `hidden lg:block` div at lines 409–414) is removed. The mobile-only `DailySnapshotCard` between panels (the `lg:hidden` div at lines 390–394) is also removed. There is exactly one instance of `DailySnapshotCard` on the home screen: inside the left panel, visible at all viewport sizes.

6. The `CachedDataNudge` component (the "Protect your cosmic record" nudge) is removed from the bottom of the left panel. The auth nudge described in specs 13–15 replaces it as the primary auth invite surface on this screen.

### Birth Identity Block

7. The birth details section no longer renders label-value fields for Place, Time, and Date. Instead it renders the user's three core sign identities as a single line in this format: `Sun in [Sign] · [Sign] Rising · Moon in [Sign]`. These values must be derived from computed `chartData` (available in `state.chartData` or computable via `calculateChart` from `birthData`). If `chartData` is not yet computed, this line must not show a blank — it must either compute the chart synchronously for this display or fall back to the formatted date and city text until chartData is available.

8. The sign identity line must use the `font-heading` (Cormorant Garamond) font at a comfortable reading size (approximately `text-lg` or `text-xl`). Color must be `text-mystic-gold` or equivalent from the existing token set.

9. Below the sign identity line, the birth date and city must be rendered in smaller muted text for reference. This text is secondary — it should not compete with the identity line visually. Approximate style: `text-xs text-mystic-muted`. No labels ("Date:", "Place:", "Time:") should appear. A single line like "October 28, 1992 · London, UK" is sufficient. Unknown time must be handled gracefully (omit time, or show "time unknown").

10. If `chartData` is null and `birthData` is missing `date` or `city`, the birth identity block must not render a broken or empty state without recovery. A fallback line — the formatted birth date and city in the sign identity position — is acceptable until computation completes.

11. The section header "Your Birth Details" and "Welcome back" labels above it (lines 233–234) are removed. The identity line begins the panel without a preamble header. The panel may open with a small muted label if needed for visual grounding (e.g., "Welcome back" at `text-xs text-mystic-muted uppercase tracking-widest`) but any such label must be visually subordinate.

### "Change Birth Information" Link

12. The "Enter New Birth Data" button is replaced by a small secondary link labeled "Change birth information" positioned directly below the birth identity block. This link must:
   - Render as a text link, not a button. `text-xs` size, `text-mystic-muted` color, with a hover transition to `text-mystic-text`.
   - Dispatch `{ type: 'CLEAR_CACHE' }` when activated, identical to the current "Enter New Birth Data" button behavior.
   - Carry no visual weight that competes with the primary CTA. It must read as maintenance, not navigation.
   - Be reachable by keyboard (focusable, `Enter`/`Space` activation).

### Auth Nudge

13. For unauthenticated users (`isAuthenticated === false` from `useAuth()`), a soft auth invitation must appear in the birth identity section — either immediately below the "Change birth information" link or immediately above it. The exact text must be "Save your readings ✦". Activating it opens the register tab of `AuthModal`.

14. The auth nudge must be styled as a text link, not a button or card. It should be quieter than the primary CTA but more visible than a 30%-opacity icon. Approximate style: `text-xs`, gold at approximately 55–65% opacity, with a hover transition to full gold. No dismiss button. No ability to permanently hide it on this page.

15. The auth nudge is invisible when `isAuthenticated === true`. It does not render at all for authenticated users.

### DailySnapshotCard Embed

16. `DailySnapshotCard` is rendered inside the left panel, between the birth identity/link/nudge group and the "Get Your Readings ✦" CTA. It receives `chart={chartData}` and `birthDate={birthData.date}` as props, identical to current usage.

17. When `chartData` is null (no chart computed yet), `DailySnapshotCard` must not render. The left panel must still render correctly without it — the CTA button must not shift position or become the only visible element. A minimum visual weight must be maintained in the panel even without the snapshot.

18. The `DailySnapshotCard` when embedded inside the panel must not create a nested border-within-border visual on mobile. The existing card has `border border-mystic-gold/30 rounded-xl` and `mb-8`. When embedded in the panel (which itself has a border and padding), the card's bottom margin must be adjusted so it does not create excessive spacing above the CTA. The card's `mb-8` should be reduced to `mb-4` or equivalent when embedded in this context, or the spacing should be managed at the container level.

19. The `DailySnapshotCard` must mount and unmount correctly as the user navigates to and from the home screen. Because `showCachedLanding` gates the entire home screen render, the card mounts on each return to home. The existing cache mechanism in `DailySnapshotCard` (cache key: `daily-snapshot-{sunLongitude}-{today}`, checked at mount via `localStorage`) must prevent redundant GPT calls on re-mount within the same day. This behavior is already implemented and must not be broken.

20. When a user activates the refresh button on `DailySnapshotCard` and then navigates to a transit reading, and then returns home, the component remounts. If the cache was cleared by the refresh, the component fires a new GPT call. Any concurrent in-flight GPT calls from a transit reading that is still loading may conflict on the rate limiter. The specification for handling this collision is: `DailySnapshotCard` must not fire its GPT call if called within 500ms of mount when the cache is empty. A 500ms initial delay on the GPT request — applied only on the first load attempt when cache is empty — staggers the call relative to any concurrent transit/synastry/solar return call.

21. The `↻ refresh` button label inside `DailySnapshotCard` is currently "↻ refresh". This label should be changed to "↻ ask again" to use language that fits the product voice. The button behavior is unchanged — it clears the cache key and triggers a re-fetch. This change is in `src/components/reading/DailySnapshotCard.tsx` line 172.

### Primary CTA Button

22. A single "Get Your Readings ✦" button must appear at the bottom of the left panel, below `DailySnapshotCard` (or below the auth nudge and "Change birth information" if `chartData` is null). This button:
   - Must be styled as the primary CTA: `bg-mystic-gold text-mystic-bg font-heading`, full panel width (`w-full`), `rounded-lg`, minimum height consistent with other primary buttons (`py-3`).
   - Opens the Readings Modal (see specs 23–40) when activated.
   - Must be reachable by keyboard.

### Readings Modal

23. A new `ReadingsModal` component must be created at `src/components/navigation/ReadingsModal.tsx`. It is a modal overlay triggered by the "Get Your Readings ✦" CTA on the home screen.

24. The modal must contain three visually distinct named groups:

   **Group 1 — "You"** (features about the user's fixed natal identity):
   - Birth Chart ✦ — descriptor: "Your natal positions, decoded once and kept forever" — action: `dispatch({ type: 'SET_VIEW', view: 'loading' })`
   - Numerology ✦ — descriptor: "Your life path, personal year, and frequency decoded" — action: `dispatch({ type: 'SET_VIEW', view: 'numerology' })`

   **Group 2 — "Transits"** (features about the current sky):
   - Daily Reading ☀ — descriptor: "What the sky is doing to your chart today" — action: `dispatch({ type: 'START_TRANSIT', period: 'daily' })`
   - Weekly Reading ✦ — descriptor: "Key themes, communication, and relationship energy this week" — action: `dispatch({ type: 'START_TRANSIT', period: 'weekly' })`
   - Monthly Reading ☽ — descriptor: "Slow planet transits, retrogrades, and major shifts this month" — action: `dispatch({ type: 'START_TRANSIT', period: 'monthly' })`
   - Year Ahead ☀ — descriptor: "Your solar return chart and the year's defining themes" — action: `dispatch({ type: 'START_SOLAR_RETURN' })`
   - Couple Synastry ♡ — descriptor: "Compare two charts and read your relationship's celestial blueprint" — action: `dispatch({ type: 'SET_VIEW', view: 'partner-form' })`

   **Group 3 — "Journals"** (features the user contributes to):
   - Cosmic Journal ✦ — descriptor: "Your personal archive of readings, reflections, and insights" — action: `dispatch({ type: 'SET_VIEW', view: 'journal' })`
   - Dream Interpretation ☽ — descriptor: "Decode last night's dream through your natal chart" — action: opens `DreamModal`
   - Today ✦ — descriptor: "Moon phase, personal day number, and today's sky at a glance" — action: `dispatch({ type: 'SET_VIEW', view: 'today' })`

25. Each item in the modal must render: the glyph/icon at a consistent size, the feature label in `font-heading`, and the one-line descriptor in `text-xs text-mystic-muted`. The glyph, label, and descriptor must be visually grouped as a single item unit.

26. Group headers must use `font-heading` (Cormorant Garamond) at a larger size than item labels (approximately `text-base` or `text-lg`). They must be visually distinct from item labels — not the same size as "Birth Chart ✦". The visual treatment for groups should feel like chapter headings, not section dividers.

27. The three groups must be separated by subtle visual dividers or spacing that makes each group scannable as a unit. They must not feel like three separate boxes or cards. They must read as one coherent panel organized into chapters.

28. The modal must close when any reading item is selected. The selection triggers the corresponding dispatch action and the modal unmounts or transitions away.

29. Dream Interpretation is a special case: selecting it from the modal must close the modal and open `DreamModal`. The modal close and dream modal open must happen in the correct sequence — no flash where both are dismissed simultaneously. The `dreamOpen` local state currently in `CachedDataLanding` (line 201) must migrate to the appropriate owner; it should live in the home screen component (`HomeScreen.tsx`) so the `DreamModal` is rendered at the home screen level, not inside `ReadingsModal`.

30. The modal must close when the user presses the `Escape` key. A `keydown` event listener for `Escape` must be added when the modal mounts and removed when it unmounts. This is a universal user expectation for modal overlays.

31. The modal must close when the user clicks or taps the backdrop (the overlay area outside the modal panel). A click on the backdrop calls `onClose`.

32. The modal must be scrollable on viewports as narrow as 375px without any content being clipped or hidden. On mobile, the modal panel must fill the screen or be tall enough to accommodate all three groups without requiring the user to navigate away to see Group 3.

33. The modal must use Tailwind `hover:` variants for all hover states. No `onMouseEnter`/`onMouseLeave` inline style objects. The `onMouseEnter`/`onMouseLeave` pattern from the current `CachedDataLanding` (14 instances across lines 264–372) must not be inherited by `ReadingsModal`. The existing Tailwind color tokens (`mystic-gold`, `mystic-purple`, `mystic-surface`, `mystic-border`) are sufficient for all styling in this component.

34. The modal must have a visible close control — either a `✕` button in the corner or a labeled "Close" link. The close control must be reachable by keyboard and must have an `aria-label`.

35. The modal must trap focus while open. Tab navigation must cycle through interactive elements within the modal; tabbing past the last item must wrap to the first, and shift-tabbing past the first must wrap to the last. This is a baseline accessibility requirement for modal dialogs.

36. The modal must have `role="dialog"` and `aria-modal="true"`. The group headers must use appropriate heading hierarchy (e.g., `role="group"` with `aria-labelledby` or semantic heading elements within the dialog). Each item must be a `<button>` element, not a `<div>` with an `onClick`.

37. The modal animation on open must feel intentional — not an instant pop. A brief fade-in or scale-up over 150–200ms is appropriate. It should open like a chamber, not teleport.

38. The modal panel must use the same dark-mystic palette as the rest of the product: dark background (`bg-mystic-bg` or `bg-mystic-surface`), gold accents (`border-mystic-border`/`border-mystic-gold/30`), body text in `text-mystic-text`, muted text in `text-mystic-muted`. It must not introduce new colors or surface treatments not present elsewhere in the product.

39. The `Transit-select` intermediate screen (`TransitSelectScreen` in `App.tsx`) must remain reachable as a fallback for period-customization (monthly with custom month), but the modal dispatches `START_TRANSIT` directly for daily and weekly. For monthly, the modal may either dispatch `START_TRANSIT` with `period: 'monthly'` directly (using the current month), or open a simplified period selector. The monthly custom-month selection path must not be removed. This is a design decision left open in spec 40.

40. Open question deferred: whether the Monthly Reading item in Group 2 dispatches `START_TRANSIT, period: 'monthly'` directly (current month default) or opens the period select screen for month customization. Either choice is valid; the implementation plan must resolve it.

### Post-Form Navigation Fix

41. After the final step of `FormWizard` (`formStep === 2`), `handleNext()` must land the user on the home screen (`CachedDataLanding`) rather than the birth chart loading screen. The dispatch must not result in `state.view === 'loading'` on completion.

42. A new reducer action `COMPLETE_FORM` must be added to `AppAction` in `src/context/appState.ts`. This action must:
   - Set `view: 'form'`
   - Set `formStep: 0`
   - Leave `birthData` intact (the user just entered their data)
   - Leave all other state fields unchanged

43. `FormWizard.handleNext()` on the final step must dispatch `{ type: 'COMPLETE_FORM' }` instead of `{ type: 'SET_VIEW', view: 'loading' }`. The `saveProfile` call for authenticated users must remain on this same path.

44. The `showCachedLanding` condition in `AppContent` (`App.tsx` line 727) must be updated to not require `state.formStep === 0`. After `COMPLETE_FORM` dispatches, `formStep` is `0` (reset by the action). However, the `formStep === 0` guard must be re-evaluated: its original purpose was to prevent the landing screen from showing while the user is mid-wizard. With `COMPLETE_FORM` atomically resetting both view and step, the `formStep === 0` check in the condition becomes redundant. It may be removed, or retained as a safety guard, but the implementation must confirm that no render-between-dispatches flash can occur that shows the FormWizard at step 0 briefly.

45. The `hasCachedBirthData()` call inside the `showCachedLanding` expression (line 727, called on every render of `AppContent`) reads from `localStorage` synchronously. This value must be computed once on mount and stored in a `useRef` or `useState`, not called inline in JSX on every render. The value does not need to be reactive; it is sufficient to compute it once when `AppContent` mounts and update it when birth data changes (after `CLEAR_CACHE` or `COMPLETE_FORM`).

### Interaction Rules and Edge Cases

46. If the user navigates from the home screen into a reading (e.g., Transit Weekly) and then returns home, `DailySnapshotCard` remounts. If the snapshot was already cached for today, it loads instantly from cache — no GPT call fires. The home screen must feel instant on this return path.

47. If the user has birth data cached but `chartData` is null (e.g., cache was cleared but birth data was not, or a cold app load where chart results were not cached), the birth identity block must still render — falling back to the date/city text — and the CTA button must still appear. The `DailySnapshotCard` must not render in this state (`chartData` is required).

48. If `birthData.city` is null while `birthData.date` is non-null (a partial cache state), the home screen must not crash. The birth identity line must degrade gracefully to whatever is available.

49. The `DreamModal` currently receives `chartData` as a prop from `CachedDataLanding` (line 416). When `CachedDataLanding` is refactored to `HomeScreen.tsx`, the `chartData` computation — currently in the `useMemo` at lines 213–222 — must be preserved in the new home screen component. The `DreamModal` prop must not be broken.

50. The home screen must remain fully functional when the app is running without an active internet connection (localStorage-based birth data and cached snapshot still render; GPT calls fail gracefully with the existing error state in `DailySnapshotCard`).

51. The header at the top of `AppContent` — "Astral Chart", subtitle, `SessionBadge` — is unchanged. The `SessionBadge` (`✦` glyph) in the header remains as a secondary auth entry point. The "Save your readings ✦" nudge in the left panel and the header glyph coexist.

52. On mobile, the redesigned left panel must be readable and usable without horizontal scrolling. The sign identity line ("Sun in Scorpio · Libra Rising · Moon in Pisces") must not overflow at 375px width. Line truncation with ellipsis is acceptable if the sign line is excessively long, but wrapping to two lines is preferred over truncation.

53. The home screen must not exhibit a flash of empty content between when the app loads and when birth data is confirmed from localStorage. The existing `buildInitialState()` call in `appState.ts` already hydrates `birthData` from localStorage synchronously at startup, so this is not expected to be an issue — but the implementation must verify no intermediate empty state is rendered.

### Accessibility

54. The "Get Your Readings ✦" button must have a clear `aria-label` if the glyph character could confuse screen readers: `aria-label="Get Your Readings"`.

55. The "Change birth information" link must be a `<button>` element or an `<a>` without an `href` with `role="button"`. It must be activatable by both `Enter` and `Space` keys.

56. The "Save your readings ✦" auth nudge must be a `<button>` element with `aria-label="Create an account to save your readings"` or equivalent.

57. The `DailySnapshotCard` when embedded inside the panel must not have its existing accessibility attributes altered. The existing `animate-pulse` loading state has no `aria` attribute; this is acceptable but adding `role="status" aria-live="polite"` to the loading line would improve screen reader experience. This is a recommendation, not a blocking requirement for this feature.

58. Focus management on modal open: when `ReadingsModal` opens, focus must move to the first interactive element inside the modal (typically the first item in Group 1, or the close button). When the modal closes, focus must return to the "Get Your Readings ✦" button that triggered it.

### Performance Expectations

59. The home screen must be perceptibly instant on return navigation. Any user action that takes the user away from home and back (selecting a reading, pressing back) must render the home screen with DailySnapshotCard populated from cache within one animation frame. No spinner, no loading state should appear on return if data is cached.

60. The `ReadingsModal` must open within one animation frame of the button press — no loading state, no delay. The modal content is entirely static (no data fetching) and must render synchronously.

61. The sign identity line computation must not introduce a perceptible delay. If `chartData` is available in state, reading sign names from `chart.planets` is a synchronous array lookup. If `chartData` is null, the fallback rendering must be synchronous too. No `useEffect`-based async chart computation should gate the identity line.

---

## Out of Scope

- The split-render refactor for `TransitReadingPage`, `SynastryPage`, `SolarReturnPage`, `TodayPage`, and `NumerologyPage` — the pattern of showing computed data immediately while GPT calls resolve asynchronously. This is covered by a separate proposal.
- Ambient loading copy replacement ("Consulting the stars...", "Reading your celestial bond...", etc.) across AI-driven screens. This is part of the split-render proposal, not the home screen redesign.
- The `FormWizard` steps themselves (date, time, place). Only what happens after the final step is in scope.
- The `TransitSelectScreen` and `SynastryTransitSelectScreen` components beyond their integration into the modal navigation flow.
- The `SessionBadge` header glyph redesign. It remains unchanged.
- `SolarReturnPage`, `SynastryPage`, `TransitReadingPage`, and `ResultsPage` back-navigation. The question of what the back buttons in result pages should target after the removal of the flat button list is a real concern (raised by Taleb), but it is a separate proposal from the home screen redesign.
- URL routing, browser history management, or programmatic `history.pushState`.
- New astrological features, chart calculations, or GPT prompts.
- Backend changes.
- Mobile PWA, service worker, or offline-first changes beyond the existing localStorage caching.
- Design system changes: the color palette, fonts, surface treatments, and border radius conventions are unchanged.

---

## Open Questions

1. **Monthly Reading modal item behavior.** Does selecting "Monthly Reading ☽" from the Readings Modal dispatch `START_TRANSIT` with `period: 'monthly'` directly (defaulting to the current calendar month), or does it open the existing `TransitSelectScreen` for custom month selection? Direct dispatch is simpler and consistent with Daily/Weekly; the period select screen is more flexible. If the custom-month selection is considered core to Monthly (not just a power-user feature), the modal should route to `TransitSelectScreen` for monthly only.

2. **Sign identity line with no chartData on first load.** On a cold first load where `state.chartData` is null but `birthData` is available, should the home screen synchronously compute the chart in a `useMemo` (the pattern already used in `CachedDataLanding` at lines 213–222) or accept the date/city fallback for the identity line until the chart is hydrated? The `useMemo` approach risks a blocking synchronous calculation on the main thread during initial render. The fallback approach means a brief moment where the identity line shows a date instead of sign names.

3. **DailySnapshotCard inside the panel on mobile: nested border treatment.** The card has its own `border border-mystic-gold/30 rounded-xl`. When placed inside a panel that already has `border border-mystic-border rounded-xl`, the nested border may look cramped at 375px. Should the card's outer border be suppressed when embedded inside the panel (via a prop like `embedded?: boolean` that removes the outer border), or should the panel's inner padding and the card's visual weight be managed through spacing alone?

4. **"Today" grouping in the modal.** `TodayPage` is currently a standalone button in the flat list. The sprint vision places it in Group 3 (Journals). Taleb flags that its content — moon phase, personal day number, sky highlights, GPT briefing — is more consistent with Transits (Group 2) than Journals. Its placement in Group 3 may reduce discoverability for users looking for an ambient daily reading. The grouping should be confirmed before implementation. If Today belongs in Group 2, the group descriptors and item ordering need updating.

5. **CachedDataNudge removal.** The `CachedDataNudge` component is proposed for removal in favor of the "Save your readings ✦" inline nudge. However, `CachedDataNudge` has logic — it only shows after 7 days of inactivity or after the user has journal entries, and it can be dismissed. The "Save your readings ✦" text link is always visible to unauthenticated users. Should the always-visible nudge replace the timed/conditional nudge entirely, or should both exist (inline text link always visible, bottom nudge appearing after thresholds are met)? The concern is that a permanently visible "Save your readings" link may feel pressuring to users who choose not to sign up.

6. **Back-navigation from result pages after readings modal is introduced.** `TransitReadingPage`, `SynastryPage`, and `SolarReturnPage` all have back buttons that currently dispatch to `transit-select`, `synastry-transit-select`, or `form`. After this redesign, `transit-select` is no longer accessible from the home screen — it lives behind the modal. A user pressing back from a transit reading currently goes to `TransitSelectScreen`. Should that back button go to `SET_VIEW: 'form'` (home screen) instead? This decision affects the sprint but is not fully scoped in this proposal.
