# Sprint 0014 — Review Plan

Manual QA guide for asteroid integration. Test each area after merging sprint-0014 to master.

---

## 1. Birth Chart — Asteroid Rendering

**What to check:**
- Open any birth chart. The chart wheel should show 5 asteroid glyphs (⚷ Chiron, ⚳ Ceres, ⚵ Pallas, ⚴ Juno, ⚶ Vesta) in an outer ring, distinct from classical planets.
- Glyphs should be smaller and amber-colored, not the same style as planets.
- Hovering/tapping each glyph should show a tooltip with: asteroid name, archetype, sign, degree, house.
- Degree values should look plausible (not 0° or NaN).

**Regression check:**
- Classical planets are still in their normal ring at correct positions.
- Element/modality analysis (if shown) should NOT count asteroid placements.

---

## 2. Synastry Chart — Asteroids + Chiron Themes

**What to check:**
- Open a synastry chart. Asteroids should appear for both charts.
- If one person's Chiron conjuncts or opposes the other's planet, a wound-healer theme should appear in Key Themes.
- Chiron Return detection: For a person ~age 50, Chiron transit should trigger a Chiron Return note in the timeline.

**Regression check:**
- Non-Chiron synastry themes (Venus conjunct Moon, etc.) still appear correctly.
- Applying/separating labels on aspects should be correct (applying = orb decreasing, separating = orb increasing).

---

## 3. Transits — Energy Rating + Asteroid Aspects

**What to check:**
- Open Today / Transit view. The energy rating (high/medium/low) should NOT spike because of slow asteroid transits.
- Asteroid transit aspects should still appear as individual rows, but not count toward the energy score.
- Chiron transits should have meaningful brief text (not "Unknown planet transiting…").

**Regression check:**
- Classical planet transits still show correct energy contribution.
- Timeline aspect rows load without errors.

---

## 4. Aspect Direction (Applying/Separating)

**What to check:**
- On any chart with aspects, verify that "Applying" means the two bodies are moving toward exact aspect (orb shrinking over next day), and "Separating" means the orb is growing.
- A quick sanity check: Moon moves ~13°/day. If Moon is 2° before an exact conjunction with Sun, it should be "Applying."

---

## 5. Interpretations — Asteroid in Sign / House

**What to check:**
- Click on an asteroid placement (sign or house). An interpretation should load — not a fallback "no interpretation found" message.
- Verify text quality: should read at synastry-brief level (2-3 sentences, specific, astrological).
- Check at least: Chiron in Aries, Ceres in 4th house, Vesta retrograde.

---

## 6. TypeScript / Build

**What to check:**
- `npm run typecheck` passes with 0 errors.
- `npm run build` completes without errors.
- No runtime console errors when loading any chart view.

---

## 7. Production Dependency

**What to check:**
- `package.json` lists `astronomia` under `dependencies` (not `devDependencies`).
- After a clean `npm ci --omit=dev`, asteroid positions still calculate correctly (no "Cannot find module 'astronomia'" error).
