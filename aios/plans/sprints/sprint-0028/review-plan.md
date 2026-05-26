# Sprint 0028 — Review Plan

## How to Review

### task-0001 — Broken test import fix
**Files to check:**
- `src/engine/__tests__/tarot.test.ts` — line 19: `import { SPREAD_POSITIONS } from '../../data/tarot/spreadPositions'` should exist
- Run `npx vitest run` — should show 69 passing, 0 failing
- **Acceptance:** The test `adapts the instant interpretation text to the actual spread position` is listed as passing (not failing/skipped)

---

### task-0002 — Orb-weighted transit dominance
**Files to check:**
- `src/engine/tarot.ts` — look for `computeDominancePlanetScore` function near `PLANET_PRIORITY`
- The function should multiply base priority × orb tightness factor × applying bonus
- `src/engine/__tests__/tarot.test.ts` — look for tests: "tight applying Saturn outscores wide separating Pluto" and "equal orbs preserve Pluto > Saturn hierarchy"
- **Acceptance:** Test cases pass; `buildTarotAstroContext` uses `computeDominancePlanetScore` to select `dominantTransitPlanet`

---

### task-0003 — Dead code cleanup
**Files to check:**
- `server/services/gptTarot.ts` — `SIGN_MODALITIES_SERVER` and `computeDominantModality` (the dead ones) should NOT appear
- The surviving `SIGN_MODALITIES` / `computeDominantModality` (renamed from `Server*`) should be present with 3 call sites inside the file
- Run `npm run server:build` — should compile clean
- **Acceptance:** No duplicate lookup tables, no unused function, no TypeScript errors

---

### task-0004 — Contract tests for pip transit coverage
**Files to check:**
- `src/data/tarot/__tests__/cards.completeness.test.ts` — 4 new `it(...)` blocks checking Saturn, Pluto, Mars (Wands/Swords), Neptune (Cups), Venus (Pentacles)
- Run `npx vitest run` — all 22 completeness tests should pass
- **Acceptance:** Contract tests are present and passing; any future deletion of suit-specific entries will produce a named failure

---

### task-0005 — Natal card correspondence (★)
**Files to check:**
- `src/engine/tarot.ts` — exported `buildNatalResonanceNote(card, astroContext)` function; `natalResonanceNote: string` on `AstroConnection` interface
- `src/components/tarot/TarotInterpretationPanel.tsx` — renders `interpretation.astroConnection.natalResonanceNote` with `✶` prefix when non-empty, positioned above transit headline
- `src/engine/__tests__/tarot.test.ts` — `buildNatalResonanceNote` test block covering chart ruler match, element match, no-match (returns `''`)
- **Acceptance:** Drawing The Sun with a Leo Ascendant (Sun chart ruler) → ✶ note appears before GPT loads. Drawing a random card with no correspondence → no note, no filler text.

---

### task-0006 — Three-card constellation preview (★)
**Files to check:**
- `src/components/tarot/ThreeCardConstellationPreview.tsx` — new component accepting `ThreeCardSynthesisInput`, renders constellation signals
- `src/components/tarot/ThreeCardReading.tsx` — imports and renders `ThreeCardConstellationPreview` at `phase === 'all-revealed'`
- **Acceptance:** After drawing 3 cards, the constellation section appears immediately (no loading wait) between the 3 card panels and the GPT synthesis zone. Should show: `astroResonanceNote` + conditional signals (all Major Arcana, Fire/Water tension, all-reversed, etc.). Visual treatment: understated, italic, muted gold.

---

## Quick Check Commands

```bash
# Build
npm run build       # frontend — should be clean
npm run server:build  # tsc — should be clean

# Tests
npx vitest run      # should show 69 passing, 0 failing
```
