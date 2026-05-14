# Sprint 0012 — Changelog

**Theme:** Backend Sovereignty  
**Status:** Complete — 7/7 tasks delivered

---

## Completed Tasks

### task-0001 — issue-birth-place-silent-failure

**Proposal:** `issue-birth-place-silent-failure`  
**Problem:** When `birth_place` was stored in the DB with string-encoded coordinates or missing fields, the server silently fell back to a wrong chart or crashed without any log, making the bug impossible to trace.  
**Solution:** Extracted `resolveUserBirthContext(userId)` — a shared validation helper that checks and coerces `lat`/`lng` to numbers, validates `tz` is a non-empty string, and emits a structured `console.warn` with the field and userId on any failure. Returns `null` (never throws) so callers fall back gracefully.

---

### task-0002 — code-server-astrocore-module

**Proposal:** `code-server-astrocore-module`  
**Problem:** Core astronomical symbols (`normalizeAngle`, `longitudeToZodiac`, `getPlanetLongitude`, etc.) were duplicated across `chartEngine.ts` and every new engine file the sprint would produce — with no single canonical definition.  
**Solution:** Created `server/engine/astroCore.ts` — a leaf module importing only `astronomy-engine`. It exports all shared primitives, the canonical 7-entry `ASPECT_DEFINITIONS` table (matching `src/engine/aspects.ts` exactly with full natal orbs), `SIGN_ELEMENTS`, `analyzeElements` (ported from frontend with sync comment), and `getDailyMotion`. `chartEngine.ts` now imports from `astroCore.ts`. `server/services/gpt.ts` retired its stripped `ChartData`/`Planet`/`Angles` interfaces in favor of `ServerChartData`.

---

### task-0003 — feat-server-aspect-engine

**Proposal:** `feat-server-aspect-engine`  
**Problem:** Natal aspect calculation lived only in `src/engine/aspects.ts`. The server could not compute or verify natal aspects from stored birth data.  
**Solution:** Created `server/engine/aspectEngine.ts` — a port of the frontend aspect engine using `astroCore.ts` primitives. The dream interpretation handler now enriches its server-assembled natal context with natal aspects and pattern formations computed from stored birth data.

**What it is:** The server can now compute natal aspects (conjunctions, squares, trines, etc.) and pattern formations (T-Squares, Grand Trines, Stelliums, etc.) from stored birth data independently.  
**How to use it:** Triggered automatically when authenticated users request GPT readings that include natal context. No client action required.

---

### task-0004 — feat-server-numerology-engine

**Proposal:** `feat-server-numerology-engine`  
**Problem:** All numerology numbers were computed in the browser and sent to the server verbatim — no server-side verification. If the client sent the wrong `personalDay`, the reading was permanently wrong.  
**Solution:** Created `server/engine/numerologyEngine.ts` — a verbatim port of `src/engine/numerology.ts` (zero external imports). Three handlers upgraded: `handleTodaySynthesis` computes `personalDay` server-side and logs mismatches; `handleAstroNumerologyCross` and `handleNumerologyNarrative` compute life path, birthday number, and personal year server-side and label them `(server-computed)` in the GPT prompt. Name-dependent numbers remain client-provided with explicit documentation.

**What it is:** Server-authoritative date-derived numerology for authenticated users, with provenance labeling in GPT prompts so GPT knows which numbers were server-verified.  
**How to use it:** Works automatically for logged-in users requesting numerology readings.

---

### task-0005 — feat-server-solar-return-engine

**Proposal:** `feat-server-solar-return-engine`  
**Problem:** Solar return chart calculation lived entirely in `src/engine/solarReturn.ts`. The server received a pre-built prompt and forwarded it to GPT with no ability to verify the solar return moment was correct.  
**Solution:** Created `server/engine/solarReturnEngine.ts` — a port of the solar return engine using `astroCore.ts`. `handleSolarReturnInterpretation` now computes the solar return chart server-side from stored birth data, assembles the GPT prompt, and calls OpenAI directly.

**What it is:** The server independently computes any user's solar return chart and assembles a complete GPT prompt from stored birth data.  
**How to use it:** Request a Solar Return interpretation while logged in. The server computes the chart; the client continues to display it instantly from its own calculation.

---

### task-0006 — feat-server-synastry-engine

**Proposal:** `feat-server-synastry-engine`  
**Problem:** Synastry was routed through the generic `transit-interpretation` handler with a pre-built prompt string. The server had no dedicated synastry handler and no visibility into cross-chart aspects, house overlays, or composite chart data.  
**Solution:** Created `server/engine/synastryEngine.ts` (648 lines) — a port of `src/engine/synastry.ts` using `astroCore.ts` and `transitEngine.ts`. Two new handlers: `handleSynastryInterpretation` and `handleCoupleTransitInterpretation`. Both accept raw birth data for both people; the server computes everything (charts, cross-aspects, house overlays, composite chart, compatibility, prompt). Two new route types: `synastry-interpretation` and `couple-transit-interpretation`. Client `SynastryPage.tsx` updated to send raw birth fields instead of pre-built prompts.

**What it is:** The server owns synastry computation end-to-end — both charts, cross-chart aspects, house overlays, composite chart, compatibility scores, and the GPT prompt.  
**How to use it:** Open the Synastry page, enter birth details for both people, and request an interpretation. The server computes everything from the raw birth data entered. Retry also uses the new server path.

---

### task-0007 — feat-server-transit-engine

**Proposal:** `feat-server-transit-engine`  
**Problem:** `handleTransitInterpretation` accepted a pre-built `systemPrompt` string and forwarded it blindly to GPT. If the browser computed transits for the wrong period or with wrong orbs, the reading was wrong — with no server-side correction.  
**Solution:** Created `server/engine/transitEngine.ts` (314 lines) — a port of `src/engine/transits.ts` using `astroCore.ts`. Exports `calculateCurrentPositions`, `calculateTransitAspects` (period-scaled orbs from canonical `ASPECT_DEFINITIONS`: 0.3×/0.5×/0.7× for daily/weekly/monthly), `detectIngresses`, `getRetrogradeStatus`, `buildTransitPrompt` (all sections including Natal Element Profile), `getTopActiveTransits`, and more. `handleTransitInterpretation` upgraded: authenticated users send `{transitPeriod, targetMonth}` and the server computes everything from stored birth data. `handleJournalAnnotation` upgraded: uses server-computed `getTopActiveTransits` for historical journal entry dates. Client updated to send period+targetMonth instead of a pre-built prompt.

**What it is:** The server computes the complete transit picture (positions, period-scaled aspects, ingresses, retrogrades, element profile) and assembles the GPT prompt for authenticated users — no dependence on browser-computed data.  
**How to use it:** Request a Daily, Weekly, or Monthly transit reading while logged in. Journal annotations also use server-computed historical transits for the entry's date.

---

## No Failed or Deferred Tasks

All 7 tasks delivered. No tasks failed or deferred.
