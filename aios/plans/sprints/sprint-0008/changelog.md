# Sprint 0008 Changelog

**Status:** complete
**Branch merged:** sprint-0008 → master (`3a88d1c`)
**Tasks completed:** 4 / 4

---

## Completed Tasks

### code-app-tsx-extraction
**Proposal:** code-app-tsx-extraction
**Problem:** `src/App.tsx` had grown to 847 lines with `CachedDataLanding` (222 lines) defined inline, a redundant `transitLoading: boolean` field duplicating `view === 'transit-loading'`, and 14 `onMouseEnter`/`onMouseLeave` inline style hover handlers. Adding the sprint-0008 feature work would have pushed it past 1 100 lines.
**Solution:** Extracted `CachedDataLanding` and `CachedDataNudge` into `src/components/home/HomeScreen.tsx`. Removed `transitLoading` from `AppState` and all reducer cases. Replaced all 14 inline hover handler triples with Tailwind `hover:` classes. Memoized the `hasCachedBirthData()` localStorage read so it no longer fires on every render.

---

### feat-home-screen-redesign
**Proposal:** feat-home-screen-redesign
**What it is:** A completely redesigned home screen that greets the user as a person, not a database row.
**Problem / Opportunity:** After entering birth data, users landed on the birth chart — the most complex screen in the app — with no context or orientation. The home screen itself was nine equal-weight navigation buttons with no hierarchy, and the Daily Snapshot (the richest ambient feature) was buried below the fold where most users never saw it. Birth details were displayed as clinical label-value rows.
**Solution:** `HomeScreen.tsx` now renders a birth identity line ("Sun in ♏ Scorpio · ♎ Libra Rising · Moon in ♓ Pisces"), a quiet "Change birth information" link replacing the heavy "Enter New Birth Data" button, a "Save your readings ✦" auth nudge for unauthenticated users, the Daily Snapshot card embedded inside the left panel (not below it), and one prominent "Get Your Readings ✦" CTA replacing all nine buttons. Post-form navigation is fixed: completing the FormWizard dispatches `COMPLETE_FORM`, landing the user on the home screen dashboard instead of the birth chart. `showCachedLanding` no longer depends on `formStep === 0`.
**How to use it:** Enter your birth data — you now land on the home dashboard. The sky chart is on the right, your identity summary on the left, and daily snapshot embedded in the panel.

---

### feat-readings-navigation-modal
**Proposal:** feat-readings-navigation-modal
**What it is:** A "Get Your Readings" modal that organizes every feature in the app into three coherent groups.
**Problem / Opportunity:** All nine features were reachable only through nine equal-weight buttons in the home panel. Users had no sense of which features were about their fixed natal identity vs. what's changing in the sky today vs. what they contribute daily.
**Solution:** `src/components/navigation/ReadingsModal.tsx` opens from the "Get Your Readings ✦" CTA. It presents three named groups — **You** (Birth Chart, Numerology), **Transits** (Daily / Weekly / Monthly / Year Ahead / Couple Synastry), and **Journals** (Cosmic Journal, Dream Interpretation, Today) — each item with a glyph, a bold label, and a one-line descriptor (e.g., "Your natal positions, decoded once and kept forever"). The modal uses `role="dialog" aria-modal="true"`, a focus trap, Escape-to-close, backdrop-click-to-close, and Tailwind-only hover handling. Back-navigation from all deep result views (TransitReadingPage, SynastryPage, SolarReturnPage, NumerologyPage, ResultsPage) was fixed to return home rather than to deprecated surfaces like `transit-select`.
**How to use it:** From the home screen, tap "Get Your Readings ✦". Choose your reading from the grouped menu.

---

### feat-split-render-ai-screens
**Proposal:** feat-split-render-ai-screens
**What it is:** Instant page loads for every AI-driven screen — computed data appears immediately, GPT interpretation streams in asynchronously.
**Problem / Opportunity:** Five screens (TransitReadingPage, SynastryPage, SolarReturnPage, TodayPage, NumerologyPage) showed a full-page spinner for 2–10 seconds while waiting for a GPT call, even though all the computed data — transit tables, planet positions, compatibility scores, core numbers — was already available synchronously. Users had no way to know anything was happening.
**Solution:** Created `src/components/ui/GptSkeleton.tsx` — a shared ambient-loading component that accepts a themed `message` prop and shows a pulsing shimmer until the GPT response arrives. All five screens now render their computed data immediately; only the interpretation slot shows the skeleton. The App.tsx computation effects were refactored to dispatch the view transition as soon as synchronous calculation completes, with GPT dispatched asynchronously afterward. `state.transitInterpretation` (and equivalents) is now cleared at the START of each new computation to prevent stale text from a prior reading appearing in a new reading's slot. Full ambient copy audit: "Loading moon data…" → "Reading today's sky for you…", "Reading the transits…" → "Consulting the stars…", synastry → "Reading your celestial bond…", solar return → "Tracking the Sun's return…", numerology → "Decoding your frequencies…". Also added `src/services/gptErrors.ts` with `isGptError()` helper for consistent GPT error state handling.
**How to use it:** Open any transit, synastry, numerology, or solar return reading — the data tables appear instantly. Watch the themed animation while the sky interpretation writes itself in.
