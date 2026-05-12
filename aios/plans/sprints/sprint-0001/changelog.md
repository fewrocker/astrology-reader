# Sprint 0001 Changelog

## Completed Tasks: 5 / 5

---

### Task 0001 — issue-app-level-error-boundary

**Originating proposal:** issue-app-level-error-boundary

**Problem:** No React error boundary existed at the app root. Any unhandled rendering error — a null dereference, a bad localStorage parse — produced a completely blank white page with no recovery path.

**Solution:** Created `src/components/ErrorBoundary.tsx` (React class component) with a mystic-themed fallback UI (golden ✦ glyph, "Something shifted in the cosmos" heading, Start Over button). Wrapped the entire app root with `<ErrorBoundary>`. Added a second inner error boundary around the chart wheel SVG for isolated containment.

---

### Task 0002 — issue-gpt-retry-on-rate-limit

**Originating proposal:** issue-gpt-retry-on-rate-limit

**Problem:** All GPT API calls failed immediately on the first transient error (429, network timeout) — destroying the user's transit or dream reading with no recovery attempt.

**Solution:** Added `retryWithBackoff<T>` utility (3 attempts, 1s/2s/4s delays) and a shared `callOpenAI()` helper in `gptInterpretation.ts`. Retry applies to 429, 503, 504, and network errors. Non-retryable errors (401, 400) propagate immediately. All 5 GPT functions now use this. File reduced from ~233 to ~160 effective lines.

---

### Task 0003 — code-extract-period-select-panel

**Originating proposal:** code-extract-period-select-panel

**Problem:** `TransitSelectScreen` and `SynastryTransitSelectScreen` in `App.tsx` shared ~70% identical code (period buttons, month picker, API key input, error display, back button) — a maintenance trap where changes had to be applied twice.

**Solution:** Extracted `PeriodSelectPanel` component to `src/components/form/PeriodSelectPanel.tsx` with `accentColor` prop for gold/pink theming. Both screens reduced from ~95 lines each to ~22 lines. `App.tsx` net: −261 lines.

---

### Task 0004 — feat-numerology-reading

**Originating proposal:** feat-numerology-reading

**What it is:** A complete Numerology Reading feature — Life Path Number, Birthday Number, Personal Year Number, and optional Expression Number (with name input). Each number is displayed as a beautiful mystic card with archetype title, essence text, shadow side, and keyword pills. A "Cosmic Connections" section dynamically cross-references each number with actual natal chart placements.

**How to use it:** Tap "Numerology ✦" on the landing page. Your birth date numbers are calculated instantly. Optionally enter your full birth name for the Expression Number. Cross-references to your natal chart appear at the bottom.

**New files:** `src/engine/numerology.ts`, `src/data/numerologyInterpretations.ts`, `src/components/results/NumerologyPage.tsx`

---

### Task 0005 — feat-solar-return-chart

**Originating proposal:** feat-solar-return-chart

**What it is:** A Solar Return / Year Ahead reading — calculates the exact moment the Sun returns to its natal degree in the current (or next) year, renders a bi-wheel (natal inner ring / solar return outer ring in amber), and delivers a GPT-powered year-ahead reading. Shows the precise solar return datetime ("Your Sun returns on Month Day, Year at HH:MM UTC"), a placement summary grid (SR ASC, Sun house, Moon, MC), planet position table with natal comparison, and a Discuss modal.

**How to use it:** Tap "Year Ahead ☀" on the landing page. Requires an OpenAI API key for the GPT reading. Use the year selector to view the current or next year's solar return.

**New files:** `src/engine/solarReturn.ts`, `src/components/chart/SolarReturnBiWheel.tsx`, `src/components/results/SolarReturnPage.tsx`

---

## Failed / Deferred Tasks

None.
