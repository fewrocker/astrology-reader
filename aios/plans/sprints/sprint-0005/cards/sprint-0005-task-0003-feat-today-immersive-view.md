# Sprint 0005 — Task 0003: feat-today-immersive-view

**From proposal:** `proposals/active/feat-today-immersive-view.md`

---

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
- Color palette: gold `#c9a84c`, purple `#7c5cbf`, teal `#5ec4c4`, bg `#0a0a0f`
- Font: `font-heading` = Playfair Display for the large personal day number and section headers

## Implementation Summary

**Files to create:**
- `src/components/reading/TodayPage.tsx` — the new view component

**Files to modify:**
- `src/context/appState.ts` — add `'today'` to `AppView` union type
- `src/App.tsx` — add `'today'` case to the view renderer (alongside existing view cases), import `TodayPage`
- `src/App.tsx` — add "Today ✦" button in `CachedDataLanding` that dispatches `SET_VIEW` → `'today'`
- `src/services/gptInterpretation.ts` — add `getTodayPageInterpretation(chart, moon, aspects, personalDay)` function that builds a richer synthesis prompt (personal day + moon + transits) and returns a 2-3 sentence morning reading

**No new engine code needed.** All data sources already exist.

## Dependencies

- Sprint 4 personal day number work (✅ done — `calculatePersonalDay` already exported from engine)
- `DailySnapshotCard` patterns (use same data-fetching patterns and PHASE_EMOJIS map)

## Acceptance Criteria

- [x] "Today ✦" button visible on the cached landing menu
- [x] Today page renders with date header, personal day number + archetype, moon phase, top 3 transits, energy rating
- [x] Personal day number is the largest visual element on the page (large Playfair Display font, gold color)
- [x] GPT synthesis appears after a short delay if API key is set; page is fully useful without it
- [x] Moon phase emoji matches actual phase (New Moon 🌑, Full Moon 🌕, etc.)
- [x] Back navigation ("← Back") returns to landing menu via `dispatch({ type: 'SET_VIEW', view: 'form' })`
- [x] Design matches the mystic dark theme: gold `#c9a84c`, bg `#0a0a0f`, Playfair Display headings, Inter body
- [x] Works correctly when `chartData` is available; handles null gracefully (shows personal day + moon only, transit section shows "Enter birth data to see your transit highlights")
- [x] TypeScript compiles with zero errors

---

## Outcome

**Completed 2026-05-12.**

**Files created:**
- `src/components/reading/TodayPage.tsx` — full Today page with personal day card (responsive fluid font, gold), moon phase card (emoji + sign + void-of-course), sky highlights card (top 3 transit aspects with glyphs + aspect symbol + 1-word keyword), transit energy rating, and GPT morning synthesis section.

**Files modified:**
- `src/context/appState.ts` — added `'today'` to the `AppView` union type.
- `src/services/gptInterpretation.ts` — added `getTodayPageInterpretation()` function building a richer 2-3 sentence personalized synthesis from personal day + moon + transits.
- `src/App.tsx` — imported `TodayPage`, added `'Today ✦'` button (second position, gold styling) in `CachedDataLanding`, added `'today'` case to view renderer passing `chartData` and `birthDate`.

**Build:** Zero TypeScript errors. Clean production build (88 modules, 8.13s).
