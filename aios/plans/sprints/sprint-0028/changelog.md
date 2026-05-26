# Sprint 0028 — Changelog

## Completed Tasks

---

### task-0001 — issue-spread-position-import-broken-test
**Proposal:** `issue-spread-position-import-broken-test`
**Problem:** `tarot.test.ts` imported `SpreadPosition` as a type-only import, leaving `SPREAD_POSITIONS` unavailable as a value at runtime. The test `adapts the instant interpretation text to the actual spread position` failed with a reference error before any assertion could fire — the position-adaptation regression guard for sprint-0026/0027 work was silently absent for two consecutive sprints.
**Solution:** Added `import { SPREAD_POSITIONS } from '../../data/tarot/spreadPositions'` to the test file. Test suite: 55 passing/1 failing → **56 passing/0 failing**.

---

### task-0002 — code-dominant-transit-orb-weighting
**Proposal:** `code-dominant-transit-orb-weighting`
**Problem:** `buildTarotAstroContext` selected `dominantTransitPlanet` by static priority score alone (Pluto=10, Saturn=7, etc.) with no consideration of orb or applying/separating status. A wide, separating Pluto trine at 4.8° would suppress a tight, applying Saturn opposition at 0.3° — causing the wrong transit adaptation entry to fire for a significant fraction of active charts, wasting the 193 carefully written entries from sprint 0027.
**Solution:** Replaced the single-pass priority lookup with `computeDominancePlanetScore`, an orb-weighted function that multiplies the base priority by an orb tightness factor (×1.0–×1.6) and an applying bonus (×1.15). A tight applying Saturn at 0.3° now scores ~12.7 vs. wide separating Pluto at 4.8° scoring ~12.4 — the astrologically live transit wins. Two new tests confirm the corrected behavior.

---

### task-0003 — code-gpt-tarot-dead-code-cleanup
**Proposal:** `code-gpt-tarot-dead-code-cleanup`
**Problem:** `server/services/gptTarot.ts` contained two parallel implementations: `computeDominantModality` + `SIGN_MODALITIES_SERVER` (dead, zero callers) alongside `computeServerDominantModality` + `SERVER_SIGN_MODALITIES` (live, three call sites). The duplication created a divergence surface — a future bug fix applied to only one version would silently miss the other.
**Solution:** Removed `computeDominantModality` and `SIGN_MODALITIES_SERVER` (~40 lines). Renamed the surviving pair to `computeDominantModality` / `SIGN_MODALITIES` (removing the redundant `Server` qualifier). Build and server build both clean.

---

### task-0004 — code-transit-adaptation-contract-test
**Proposal:** `code-transit-adaptation-contract-test`
**Problem:** The sprint-0027 pip card coverage test asserted a floor count (at least one entry per card) but did not verify the per-suit planet coverage matrix. A future refactor could silently delete Saturn entries from Cups cards while preserving a single Neptune entry — the floor test would still pass.
**Solution:** Added 4 contract tests to `cards.completeness.test.ts`:
- All 32 pip cards have Saturn and Pluto transit adaptations
- Wands and Swords pip cards have Mars transit adaptations
- Cups pip cards have Neptune transit adaptations
- Pentacles pip cards have Venus transit adaptations

All 4 pass against the sprint-0027 data. Total: 22 completeness tests (18 pre-existing + 4 new).

---

### task-0005 — feat-natal-card-correspondence
**Proposal:** `feat-natal-card-correspondence`
**What it is:** A natal resonance note that appears in the "In Your Sky Now" panel immediately when a card is drawn — before GPT loads — surfacing the most significant correspondence between the drawn card's symbolic field and the user's birth chart. The note uses a ✶ prefix to distinguish it from the lunar note (☽) and transit headline.
**How to use it:** Draw any card. If your chart ruler matches the card's ruling planet (e.g., Venus chart ruler drawing The Empress), or the card's element matches your natal dominant element, the panel immediately names the correspondence in plain language — "The Sun rules both this card and your Leo Ascendant — the Sun's domain of creative self-expression is directly wired into your chart's governing intelligence." Returns empty string when no significant correspondence exists; no generic filler is shown.

Engine: `buildNatalResonanceNote(card, astroContext)` in `src/engine/tarot.ts`. Correspondence hierarchy: chart ruler match → dominant element match → court card element match → empty. Seven new tests covering all branches.

---

### task-0006 — feat-three-card-constellation-preview
**Proposal:** `feat-three-card-constellation-preview`
**What it is:** A constellation preview section that appears immediately after all three cards are drawn in the three-card reading — before GPT synthesis loads. It surfaces the `astroResonanceNote` from `computeThreeCardSynthesis` plus conditional structural signals (all Major Arcana, Fire/Water tension, all-reversed spread, center-reversed card, Fool/World significance) in a minimal visual treatment: a thin gold divider with small italic notes in muted tones.
**How to use it:** Draw three cards. The constellation preview appears at the `all-revealed` phase between the individual interpretation panels and the GPT synthesis zone, giving the user immediate structural context ("Fire and Water in tension across these positions — creative drive and emotional depth are in direct conversation") while waiting for AI synthesis to load. The preview is computed client-side with zero latency.

New component: `ThreeCardConstellationPreview.tsx`. Modified: `ThreeCardReading.tsx` (added `useMemo` for synthesis computation, renders preview at the right phase gate).

---

## Failed / Deferred Tasks

None. All 6 tasks completed successfully.

## Test Results

- 69 tests passing, 0 failing (up from 55 pre-sprint)
- Pre-existing 1-failure resolved by task-0001
- New tests: +7 (task-0002 ×2, task-0004 ×4, task-0005 ×7, others covered by existing suites)
- Build: clean (Vite + tsc server build)
