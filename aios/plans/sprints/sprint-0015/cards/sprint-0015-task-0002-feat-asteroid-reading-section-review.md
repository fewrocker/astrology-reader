# Code Review: feat-asteroid-reading-section

**Branch:** `sprint-0015-task-0002-feat-asteroid-reading-section`
**Reviewer:** Code Review Agent
**Date:** 2026-05-15

---

## Summary

The implementation is complete and correct. The build passes with zero TypeScript errors. All 55 specifications are met. No blocking issues found.

---

## Spec Checklist

### Data requirements (specs 1–6)
- ✅ Spec 1: Wire-up was implemented as part of this task (interpretations/index.ts guards removed).
- ✅ Spec 2: `AsteroidSection` filters via `isAsteroid(pr.planet.name as BodyName)` internally.
- ✅ Spec 3: `ASTEROID_ARCHETYPES[asteroid.name as AsteroidName]` used correctly.
- ✅ Spec 4: `getBodyGlyph(asteroid.name as BodyName)` used for glyphs.
- ✅ Spec 5: `ZODIAC_GLYPHS[asteroid.sign]` used for sign glyphs.
- ✅ Spec 6: `ASTEROID_NAMES` array used to enforce canonical display order.

### Component architecture (specs 7–11)
- ✅ Spec 7: `AsteroidCard` is file-local (not exported), defined in ReadingDisplay.tsx.
- ✅ Spec 8: `AsteroidSection` is exported from ReadingDisplay.tsx.
- ✅ Spec 9: `AsteroidSection` uses the existing `Section` component with `defaultOpen={false}`.
- ✅ Spec 10: Props `{ reading: FullReading; showHouse: boolean }` match.
- ✅ Spec 11: Null-guard `if (orderedAsteroids.every(pr => !pr.signInterpretation)) return null` present.

### AsteroidCard collapsed state (specs 12–15)
- ✅ Spec 12: Collapsed row shows glyph, name, Rx badge (when retrograde), sign glyph + name, house (when showHouse), brief text, +/− indicator.
- ✅ Spec 13: Archetype badge inline on name row: `bg-amber-900/20 text-amber-400 border border-amber-400/20 rounded px-1.5 py-0.5 text-xs font-medium`.
- ✅ Spec 14: `border border-amber-400/10 rounded-lg p-4 mb-2`.
- ✅ Spec 15: `w-full text-left flex items-start gap-3` on button.

### AsteroidCard expanded state (specs 16–20)
- ✅ Spec 16: `mt-3 ml-9 space-y-3 text-sm` inset.
- ✅ Spec 17: Sign interpretation block with `text-amber-400/80` label and `text-mystic-text/90` body.
- ✅ Spec 18: House interpretation block conditional on `showHouse && pr.houseInterpretation`.
- ✅ Spec 19: Retrograde block with `bg-red-900/10`, `text-red-400` label.
- ✅ Spec 20: `useState(false)` inside each card, independent state.

### AsteroidSection header and intro (specs 21–23)
- ✅ Spec 21: Title "Asteroids & Minor Bodies".
- ✅ Spec 22: Intro paragraph present with exact required text.
- ✅ Spec 23: Intro does not mention specific asteroid names.

### Placement in ResultsPage (specs 24–26)
- ✅ Spec 24: `AsteroidSection` imported alongside other section imports.
- ✅ Spec 25: Placed between `PlanetSection` and `AspectSection`.
- ✅ Spec 26: Not added to SynastryPage or SynastryTransitPage.

### PlanetSection filtering (specs 27–29)
- ✅ Spec 27: `PlanetSection` filters `.filter(pr => !isAsteroid(pr.planet.name as BodyName))`.
- ✅ Spec 28: `PlanetaryStrengthSection` filters `&& !isAsteroid(pr.planet.name as BodyName)`.
- ✅ Spec 29: `RetrogradeSummarySection` now explicitly filters asteroids to prevent double-display (asteroid retrograde data IS present in NATAL_RETROGRADE, so this guard was necessary).

### Visual design — amber theming (specs 30–32)
- ✅ Spec 30: Amber Tailwind classes used throughout, not `mystic-gold`.
- ✅ Spec 31: All required amber class values present and correct.
- ✅ Spec 32: `Section` component not modified; its title retains `text-mystic-gold`.

### UI states and edge cases (specs 33–38)
- ✅ Spec 33: `showHouse={false}` correctly omits house number and house interpretation block.
- ✅ Spec 34: No retrograde badge or block when `retrograde: false` and `retrogradeInterpretation: null`.
- ✅ Spec 35: Missing `signInterpretation` handled defensively (no brief, no sign block).
- ✅ Spec 36: Missing `houseInterpretation` when `showHouse` true is handled (block simply omitted).
- ✅ Spec 37: Section-level null-guard per spec 11.
- ✅ Spec 38: `flex items-start gap-3` layout handles mobile wrapping; badge may wrap (acceptable).

### Accessibility (specs 39–42)
- ✅ Spec 39: `aria-expanded={expanded}` on button element.
- ✅ Spec 40: Section-level accessibility inherited from `Section` component.
- ✅ Spec 41: Archetype badge is visible text, no extra aria needed.
- ✅ Spec 42: `title={asteroid.name}` on glyph span.

### Performance (specs 43–45)
- ✅ Spec 43: All five cards rendered unconditionally when section is open. No virtualization needed.
- ✅ Spec 44: O(n) filter, no memoization needed.
- ✅ Spec 45: Independent `useState(false)` per card.

### Acceptance checks (specs 46–55)
- ✅ Spec 46: PlanetSection now excludes asteroids (filter applied).
- ✅ Spec 47: AsteroidSection renders exactly 5 cards when all asteroids present.
- ✅ Spec 48: Unknown time shows only sign placements.
- ✅ Spec 49: Known time shows both sign and house when expanded.
- ✅ Spec 50: Section collapsed by default (`defaultOpen={false}`).
- ✅ Spec 51: Independent expand state per card.
- ✅ Spec 52: PlanetaryStrengthSection excludes asteroids.
- ✅ Spec 53: RetrogradeSummarySection now explicitly excludes asteroids (asteroid retrograde data IS present — the "by coincidence" assumption in the spec was incorrect, so explicit filtering was added).
- ✅ Spec 54: Planet Positions table unchanged.
- ✅ Spec 55: TypeScript compiles with zero errors.

---

## Additional Changes (beyond spec scope, but necessary)

### types.ts duplicate declarations fixed
The base `sprint-0015` branch had duplicate definitions of `AsteroidName`, `BodyName`, `ASTEROID_NAMES`, `ASTEROID_GLYPHS`, `ASTEROID_ARCHETYPES`, `isAsteroid`, and `getBodyGlyph`. This caused 14 TypeScript errors. The duplicates were removed, keeping the first (correct) versions.

### Pre-existing unused import errors fixed
The following files had `noUnusedLocals` violations that blocked the build:
- `SolarReturnBiWheel.tsx`: `PlanetName` type, `PLANET_GLYPHS`
- `ResultsPage.tsx`: `PlanetName` type, `PLANET_GLYPHS`
- `SynastryPage.tsx`: `PLANET_GLYPHS`
- `SynastryTransitPage.tsx`: `PLANET_GLYPHS`
- `synastry.ts`: `HouseCusp` type
- `transits.ts`: `normalizeAngle`

All removed as they were genuinely unused.

### Wire-up implemented (task-0001 scope)
The `code-asteroid-interpretation-wire-up` changes were implemented as part of this task:
- `getPlanetInSignInterpretation` and `getPlanetInHouseInterpretation` signatures widened to accept `BodyName`
- `isAsteroid()` guards removed from `assembleReading()` for `signInterpretation`, `houseInterpretation`, `retrogradeInterpretation`
- `PlanetTooltip` in `ChartWheel.tsx` guards removed; `ASTEROID_GLYPHS` added to import; Rx badge condition simplified

---

## Issues

### Blocking
None.

### Warnings
None.

### Suggestions
- The `Section` component title for asteroids renders in `text-mystic-gold` (inherited from shared `Section` component). The task card's open question #5 notes this is intentional to avoid modifying shared infrastructure. Acceptable as-is.
- The `RetrogradeSummarySection` count in the section title (e.g., "℞ Retrograde Planets (3)") will now exclude retrograde asteroids, which are handled in `AsteroidSection`. The count is semantically accurate for the section's content.
