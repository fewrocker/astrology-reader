# Proposal: Today — Immersive Daily View

**Type:** Feature
**Originated by:** Jobs + Miyazaki + Taleb
**Impact:** High
**Effort:** Medium

---

## Problem

The returning user's landing screen is a menu of navigation buttons. Every capability of the app is accessible from it, but nothing is *presented*. The user must make choices before they've received anything. For a product meant to be a daily ritual, this is the wrong first experience.

All the ingredients for a compelling "Today" view already exist in the codebase:
- `calculatePersonalDay(birthDate)` — in `engine/numerology.ts`
- `getCurrentMoonPhase()` — in `engine/lunar.ts`
- `calculateCurrentPositions()` + `calculateTransitAspects()` — in `engine/transits.ts`
- `getTopActiveTransits()` — in `engine/transits.ts`
- `getDailySnapshotInterpretation()` — in `services/gptInterpretation.ts`

They are computed in fragments across `DailySnapshotCard` and other components but never brought together into a single, immersive experience.

## Proposed Solution

Add a **"Today"** page as a first-class view in the app — navigable from the `CachedDataLanding` menu with a prominent button.

The Today page shows:
1. **Date header** — day of week, month, date
2. **Personal Day** — the number large and centered, with its archetype title ("Personal Day 7 · The Seeker") and a 1-sentence interpretation from `numerologyInterpretations`
3. **Moon** — current phase emoji + phase name + moon sign + void-of-course indicator if active
4. **Sky Highlights** — top 3 active transit aspects with planet glyphs, aspect symbol, brief keyword (e.g., "☉ △ ♃ · Expansion") — using the same glyph system as the chart wheel
5. **Transit Energy** — the energy rating dot + label from `computeEnergyRating` (already in DailySnapshotCard)
6. **GPT Morning Synthesis** — 2-3 sentence personalized reading that weaves all of the above together (personal day + key transits + moon). Uses a new `getTodayPageInterpretation()` function in `gptInterpretation.ts`. Gracefully hidden if no API key.
7. **Back** — a quiet "← Back to menu" link

**Design principles:**
- Vertical scroll, generous spacing, dark background — feels like opening a sacred morning page
- Personal day number is the largest typographic element (think tarot card style: big number, centered)
- Moon phase emoji corresponds to the actual phase (same PHASE_EMOJIS map from DailySnapshotCard)
- GPT section renders only after data loads — no spinner blocking the page; data shows first, GPT appends
- Fully functional without an API key (numerology + moon + transits are all offline)

## Why This Is a Feature, Not a Code Enhancement

This adds a distinct new user-facing view with its own route, visual composition, and GPT synthesis prompt. It creates a new daily ritual behavior pattern that doesn't exist today.

## Implementation Summary

**Files to create:**
- `src/components/reading/TodayPage.tsx` — the new view component

**Files to modify:**
- `src/context/appState.ts` — add `'today'` to `AppView` union type
- `src/App.tsx` — add `'today'` to the view renderer and `TodayPage` import
- `src/components/results/CachedDataLanding` section in App.tsx — add "Today ✦" button routing to `'today'`
- `src/services/gptInterpretation.ts` — add `getTodayPageInterpretation(chart, moon, aspects, personalDay)` function

**No new engine code needed.** All data sources already exist.

## Dependencies

- Sprint 4 personal day number work (✅ done)
- `DailySnapshotCard` patterns can be reused (component can import helpers from it or shared utils)

## Acceptance Criteria

- [ ] "Today ✦" button visible on the cached landing menu
- [ ] Today page renders with date header, personal day number + archetype, moon phase, top 3 transits, energy rating
- [ ] Personal day number is the largest visual element on the page
- [ ] GPT synthesis appears after a short delay if API key is set; page is fully useful without it
- [ ] Moon phase emoji matches actual phase
- [ ] Back navigation returns to landing menu
- [ ] Design matches the mystic dark theme with gold accents (gold `#c9a84c`, bg `#0a0a0f`, Playfair Display headings)
- [ ] Works correctly when `chartData` is available; handles null gracefully with fallback message
