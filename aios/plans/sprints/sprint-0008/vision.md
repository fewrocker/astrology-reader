# Sprint 0008 Vision

## Sprint Focus

This sprint reshapes the app's navigation architecture from a flat list of buttons into a deliberate two-level flow: a clean Home screen that grounds the user in their birth identity and today's sky, followed by a grouped "Get Your Readings" portal that organizes every feature into coherent categories. Alongside the navigation overhaul, every AI-driven screen gets a split-render upgrade — calculated data appears instantly while GPT fields populate themselves with ambient loading animations that feel like the sky is thinking, not the browser is waiting.

## Why Now

Seven sprints have shipped a genuinely rich feature set: natal chart, transits (daily/weekly/monthly/year ahead), synastry, solar return, numerology, today view, dream interpretation, cosmic journal, and a full auth/backend layer. Every feature works. The problem is that reaching any of them requires scrolling through ten buttons of equal visual weight in a single panel — "Read My Chart", "Today", "Journal", "Daily / Weekly / Monthly Reading", "Couple Synastry", "Year Ahead", "Dream Interpretation", "Numerology", "Enter New Birth Data" — none grouped, none ranked by use frequency, none inviting exploration. The menu has become a flat directory.

This is precisely the inflection point management identified: the product is feature-complete enough that information architecture now matters more than any individual new feature. A first-time user who just entered their birth data lands at this wall of buttons with no sense of what to do first. A returning user who wants "Weekly Reading" must scan all ten buttons to find it. The Daily Snapshot — arguably the richest ambient feature in the app — is buried below the fold on desktop and squeezed between panels on mobile, invisible to most users. The session badge (the only auth entry point) is a tiny `✦` glyph in the header that most users never notice.

Sprint 0007 built the persistence layer and auth. The app now has real user accounts. What it needs next is a front door worthy of those accounts.

On the performance side, the current loading pattern makes AI-driven screens feel slow even when the instant data — transit aspects, planet positions, compatibility scores — is already computed client-side. The GPT call is blocking the entire page render. Synastry, transit readings, solar return, and today page all have the same structural opportunity: show the chart and computed data immediately, then stream in the GPT paragraphs asynchronously with a themed ambient animation. This pattern exists in DailySnapshotCard (which shows moon phase and energy score instantly while the GPT text loads separately) but has not been applied to the full-page views.

## Where to Look

### Home screen — `src/App.tsx` (CachedDataLanding component, lines 197–418)

The `CachedDataLanding` component is the main surface to redesign. Currently it renders:
- Left panel (40%): birth details + 9 equal-weight navigation buttons + CachedDataNudge
- Mobile: DailySnapshotCard squeezed between panels
- Right panel (60%): SkyTodayChart
- Desktop: DailySnapshotCard below both panels, easily missed

Target layout for sprint-0008:
- Left panel: birth info block + "Change birth info" link (replaces the "Enter New Birth Data" button that's currently at the bottom of the stack) + DailySnapshotCard embedded inside the panel (not below it) + ONE prominent "Get Your Readings ✦" CTA button
- Right panel: SkyTodayChart unchanged (it is beautiful and should stay)
- The current nine navigation buttons are removed from the Home screen entirely

The `dispatch({ type: 'CLEAR_CACHE' })` action currently buried as "Enter New Birth Data" button becomes a small secondary link labeled "Change birth information" under the birth details block.

### "Get Your Readings" modal — new component

A new modal overlay triggered by the "Get Your Readings ✦" button. It replaces the flat button list with three named groups:

**Group 1 — You** (features about the user's fixed natal identity)
- Birth Chart ✦ (`SET_VIEW: 'loading'`)
- Numerology ✦ (`SET_VIEW: 'numerology'`)

**Group 2 — Transits** (features about what's changing in the sky right now)
- Daily Reading ☀ → opens transit-select pre-filtered to daily, or dispatches `START_TRANSIT` with `period: 'daily'` directly
- Weekly Reading ✦ → `START_TRANSIT` with `period: 'weekly'`
- Monthly Reading ☽ → `START_TRANSIT` with `period: 'monthly'`
- Year Ahead ☀ → `START_SOLAR_RETURN`
- Couple Synastry ♡ → `SET_VIEW: 'partner-form'`

**Group 3 — Journals** (features the user contributes to daily)
- Cosmic Journal ✦ (`SET_VIEW: 'journal'`)
- Dream Interpretation ☽ (opens `DreamModal`)
- Today ✦ (`SET_VIEW: 'today'`)

Design constraints: the three groups must be visually distinct sections (headers, subtle dividers, or card clusters) but feel like a single coherent panel — not three separate boxes. Each item should have its glyph/icon, label, and a one-line descriptor (e.g., "Your natal positions, decoded" / "This week's planetary influence on your chart"). The modal should close when a reading is selected.

New component file: `src/components/navigation/ReadingsModal.tsx`

### Post-form navigation — `src/App.tsx` (FormWizard completion, line 34)

Currently, after the user submits their birth data in `FormWizard`, `handleNext()` dispatches `SET_VIEW: 'loading'` which runs the chart calculation and lands them on `ResultsPage`. Management wants this changed: after form submission the user should land on the Home screen (`CachedDataLanding`), not the birth chart. The `'loading'` → `'results'` path should only be triggered when the user explicitly selects "Birth Chart" from the readings modal.

This means `handleNext()` on the final form step should dispatch `SET_VIEW: 'form'` (which will show `CachedDataLanding` because birth data is now cached) rather than `SET_VIEW: 'loading'`. The `calculateChart` flow triggered by the `'loading'` view stays intact — it just needs a different entry point.

### Split-render pattern for AI-driven screens

Every screen that currently shows a full-screen spinner while waiting for GPT should be refactored to the pattern DailySnapshotCard already uses:

1. Render the page immediately with computed (non-GPT) data
2. Mark GPT fields with an ambient "thinking" animation
3. Populate GPT fields asynchronously when the call completes

Affected views and their instantly-renderable data:

- **TransitReadingPage** (`src/components/results/TransitReadingPage.tsx`): Transit aspects table, current positions table, retrograde list, transit timeline — all computable instantly. Only `transitInterpretation` (the GPT narrative) needs the async slot.
- **SynastryPage** (`src/components/results/SynastryPage.tsx`): Compatibility score bars, cross-aspects table, house overlays, composite chart — all computable instantly from `synastryData`. Only `synastryInterpretation` is GPT.
- **SolarReturnPage** (`src/components/results/SolarReturnPage.tsx`): SR planet table, key placements, bi-wheel chart — all instant. Only the SR reading narrative is GPT.
- **TodayPage** (`src/components/reading/TodayPage.tsx`): Moon phase, energy rating, transit pills, personal day number — all instant. Only `gptText` is async.
- **NumerologyPage** (`src/components/results/NumerologyPage.tsx`): All core numbers (life path, personal year/month/day, birthday number) — instant. GPT narrative and cross-reading are async.

The loading state for these screens should be changed from full-page spinners in `App.tsx` (`transit-loading`, `synastry-loading`, `solar-return-loading`) to immediate page renders where only the interpretation card has an ambient animation. The `transit-loading`, `synastry-loading`, and `solar-return-loading` views in `AppView` may be eliminated or reduced to a brief 200ms flash if the chart calculation itself (not GPT) is the bottleneck.

Ambient loading copy to use (replacing "Loading..." and generic spinners):
- Transit screens: "Consulting the stars..." / "Mapping the sky for your chart..."
- Synastry: "Reading your celestial bond..." / "Aligning two cosmic blueprints..."
- Solar return: "Tracking the Sun's return..." / "Calculating your solar threshold..."
- Today / daily snapshot: "Reading today's sky for you..." (already correct in DailySnapshotCard)
- Numerology: "Decoding your frequencies..."

These strings should appear as an animated pulse on the GPT text slot — a shimmer skeleton or a soft breathing glyph with the phrase — not a full-page block.

### `src/context/appState.ts` — potential view state changes

If the `transit-loading` / `synastry-loading` / `solar-return-loading` views are replaced by showing the results page immediately with async GPT fields, the `AppView` type may need updating. Alternatively, these loading views can remain but transition to the results page within ~300ms (after only the fast synchronous calculation completes), with the GPT call continuing asynchronously from the results page. Either approach satisfies the goal; the implementation plan should pick one.

### Auth entry point — `src/App.tsx` (SessionBadge, lines 54–126)

The SessionBadge `✦` glyph in the header is currently too subtle for most users to notice. Consider a small improvement: when the user is not authenticated and has been using the app for some time (i.e., `CachedDataLanding` is showing), display a small "Save your readings ✦" text-link near the birth info block rather than relying solely on the invisible header glyph and the CachedDataNudge at the bottom. This surfaces auth naturally without being intrusive.

## Quality Bar

"Deep, not shallow" for this sprint means:

1. **The Home screen must feel complete, not stripped.** Removing eight buttons and replacing them with one "Get Your Readings" modal cannot leave the Home screen feeling sparse or less useful. The DailySnapshotCard embedded in the left panel must carry its weight — moon phase, energy rating, key transit pill, and GPT text. The sky chart on the right remains prominent. The Home screen should feel like a personal dashboard, not a minimized version of what was there before.

2. **The readings modal must be genuinely navigable.** The three-group layout needs real visual hierarchy. Group headers should name the conceptual category, not just list features. Each item needs its one-line descriptor — not just a label. The modal must be scrollable on mobile (375px screens) and feel as polished as AuthModal. Opening it should feel like opening a beautiful menu at a fine restaurant, not a settings panel.

3. **The split-render pattern must be consistent.** Every AI-driven screen must show its computed data before the GPT call returns. There should be no screen in the app that displays a full-page spinner for more than ~400ms. The 300ms debounce before calculation (`setTimeout(runTransit, 300)` etc. in App.tsx) is fine to keep; the problem is the page not rendering until that promise resolves. Computed data and GPT data must be decoupled in every affected component.

4. **Ambient loading copy must feel thematic, not generic.** Every instance of "Loading...", "Calculating...", "Reading the transits..." (the generic versions) must be replaced with the themed phrases from the guidelines. The copy is part of the product's voice. Audit every loading state in every affected component.

5. **No navigation regression.** Every feature reachable from the current flat button list must remain reachable, in the same number of clicks or fewer, after the redesign. The readings modal is one extra click compared to direct buttons — that trade-off is acceptable only if the modal itself is fast to open and visually organized so users find things quickly.

## What This Sprint Is NOT

- **Not a new astrological feature.** No new chart calculations, transit algorithms, numerology layers, dream journal expansions, or GPT prompt work beyond replacing loading copy. Every engineer-hour in this sprint goes to navigation architecture and render performance.
- **Not a mobile app.** The responsive improvements are for the existing web layout (375px+). No native app shells, PWA service workers, or app-store targets.
- **Not a design system overhaul.** The existing mystic color palette, font choices (Cormorant Garamond headings, Inter body), and surface treatments (`bg-mystic-surface/50`, `border-mystic-border`, `rounded-xl`, gold accents at `#c9a84c`) stay exactly as they are. This sprint reorganizes surfaces; it does not retheme them.
- **Not a routing system introduction.** The app uses a view-state enum in `AppContext` (`AppView`) with no URL routing. This sprint does not introduce React Router, URL-based navigation, or browser history. Navigation stays state-driven.
- **Not a performance engineering sprint.** The split-render improvement is about UX perception, not bundle size, code splitting, or server-side rendering. Do not spend time on Vite build optimization, lazy loading chunks, or network-level caching.
- **Not an onboarding flow.** The FormWizard's three steps (date, time, place) are not being redesigned. The change is only in what happens after the final step completes: landing on Home instead of the birth chart. The form wizard itself is untouched.
- **Not a backend sprint.** The Express/SQLite backend, auth system, JWT handling, and API endpoints are not being modified. All changes in this sprint are frontend-only.
- **Not a Couple Synastry redesign.** The partner form (`PartnerForm.tsx`), synastry results page (`SynastryPage.tsx`), and synastry transit flow are not being restructured beyond the split-render upgrade for the loading state. The synastry feature is accessed from the readings modal (Group 2, Transits) and that is the full scope of its involvement this sprint.
