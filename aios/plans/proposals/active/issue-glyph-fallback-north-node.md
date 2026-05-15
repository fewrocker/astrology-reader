**Type:** Issue Fix
**Originated by:** Jobs, Miyazaki, Carmack, Taleb

## Problem

Throughout the rendering layer, any planet or body name that is not a key in `PLANET_GLYPHS` silently falls back to `'☊'` — the North Node glyph — via the TypeScript nullish coalescing pattern `PLANET_GLYPHS[name as PlanetName] ?? '☊'`. When asteroid names (Chiron, Ceres, Pallas, Juno, Vesta) flow through the chart rendering, aspect tooltips, reading cards, and transit displays after the sprint-0014 integration, each one will render the North Node symbol instead of its correct glyph. The North Node (`☊`) carries a specific astrological meaning — the lunar ascending node, fate, karmic direction — that is categorically unrelated to any of the five asteroids. Silently substituting it causes every asteroid rendering site to assert a false astrological identity to the user.

This is not a cosmetic missing-glyph problem. It is a semantic corruption: a user hovering Chiron in their natal ring sees `☊ Chiron` — a pairing that tells an astrologically literate reader "this is the North Node called Chiron," which is nonsense. A user seeing five `☊` symbols in the inner asteroid ring cannot distinguish any of them from each other or from the actual North Node already displayed in the chart.

The pattern occurs in **35 places** across 9 files. Every occurrence uses the same structure: an unsafe cast to `PlanetName`, a lookup in `PLANET_GLYPHS` (which is typed `Record<PlanetName | 'NorthNode', string>` and has no asteroid keys), and a fallback to `'☊'` when the lookup returns `undefined`. Because TypeScript's `Record<K, V>` index does not enforce exhaustiveness on the access side under standard `strict` settings without `--noUncheckedIndexedAccess`, none of these sites produce a compiler error today and none will produce one when asteroid names start flowing through.

There is one additional site — `ChartWheel.tsx` line 661 — where the natal planet rendering does `const glyph = PLANET_GLYPHS[planet.name]` with **no fallback at all**. If an asteroid name reaches this line before `PLANET_GLYPHS` is extended, `glyph` is `undefined` and the SVG `<text>` element renders a blank disk: no symbol, no visual indicator, no error. This is the worst-case failure mode — invisible rather than wrong.

### All occurrences by file

**`src/components/chart/ChartWheel.tsx`**

- Line 141: `const g1 = PLANET_GLYPHS[aspect.planet1 as PlanetName] ?? '☊'` — in `AspectTooltip`, glyph for the first body in a natal aspect pair. Triggered when any asteroid participates in a natal aspect.
- Line 142: `const g2 = PLANET_GLYPHS[aspect.planet2 as PlanetName] ?? '☊'` — same tooltip, second body.
- Line 202: `const glyph = PLANET_GLYPHS[planet.name as PlanetName] ?? '☊'` — in `TransitPlanetTooltip`, glyph for the transiting body header. Triggered when any asteroid is a transit planet.
- Line 236: `const g2 = PLANET_GLYPHS[a.natalPlanet as PlanetName] ?? '☊'` — in `TransitPlanetTooltip`'s related-aspects list, glyph for the natal body. Triggered when any asteroid is a natal target of a transit aspect.
- Line 254: `const g1 = PLANET_GLYPHS[aspect.transitPlanet as PlanetName] ?? '☊'` — in `TransitAspectTooltip`, glyph for the transiting body.
- Line 255: `const g2 = PLANET_GLYPHS[aspect.natalPlanet as PlanetName] ?? '☊'` — same tooltip, natal body.
- Line 661: `const glyph = PLANET_GLYPHS[planet.name]` — natal planet ring rendering, **no fallback**. An asteroid here renders a blank SVG disk.
- Line 792: `const glyph = PLANET_GLYPHS[tp.name as PlanetName] ?? '☊'` — transit planet ring rendering.

**`src/components/chart/SolarReturnBiWheel.tsx`**

- Line 196: `const glyph = PLANET_GLYPHS[p.name as PlanetName] ?? '☊'` — solar return outer ring planet rendering.
- Line 225: `const glyph = PLANET_GLYPHS[p.name as PlanetName] ?? '☊'` — natal inner ring planet rendering in the bi-wheel.
- Line 277: `{PLANET_GLYPHS[planet.name as PlanetName] ?? '☊'}` — hover tooltip glyph in the bi-wheel.

**`src/components/reading/ReadingDisplay.tsx`**

- Line 155: `const g1 = PLANET_GLYPHS[ar.aspect.planet1 as PlanetName] ?? '☊'` — in `AspectRow`, first body in a natal aspect row.
- Line 156: `const g2 = PLANET_GLYPHS[ar.aspect.planet2 as PlanetName] ?? '☊'` — same row, second body.
- Line 286: `{PLANET_GLYPHS[ps.name as PlanetName] ?? '☊'}` — in `PatternCard`, planet-sign listing within an aspect pattern card.
- Line 338: `{PLANET_GLYPHS[pr.planet.name as PlanetName] ?? '☊'}` — in `FocusSection`, key planet header.
- Line 417: `const glyph = PLANET_GLYPHS[p.name as PlanetName] ?? '☊'` — in `HousesOverview`, planet-to-house mapping for house cards.
- Line 447: `const glyph = PLANET_GLYPHS[name] ?? '☊'` — in `StrengthBar`, planetary strength section glyph.
- Line 473: `const g1 = PLANET_GLYPHS[mr.planet1] ?? '☊'` — in `MutualReceptionCard`, first body.
- Line 474: `const g2 = PLANET_GLYPHS[mr.planet2] ?? '☊'` — same card, second body.
- Line 589: `glyph={PLANET_GLYPHS[pr.planet.name as PlanetName] ?? '☊'}` — planet reading card glyph prop passed to `PlanetCard`.

**`src/components/reading/AspectRow.tsx`**

- Line 65: `const g1 = PLANET_GLYPHS[transitPlanet as PlanetName] ?? '☊'` — transit aspect row, transiting body glyph.
- Line 66: `const g2 = PLANET_GLYPHS[natalPlanet as PlanetName] ?? '☊'` — same row, natal body glyph.

**`src/components/reading/TransitTimeline.tsx`**

- Line 14: `const planetGlyph = event.planet ? (PLANET_GLYPHS[event.planet as PlanetName] ?? '☊') : ''` — timeline event card primary planet glyph.
- Line 15: `const secondGlyph = event.secondPlanet ? (PLANET_GLYPHS[event.secondPlanet as PlanetName] ?? '☊') : ''` — timeline event card secondary planet glyph.

**`src/components/reading/AdvanceTab.tsx`**

- Line 453: `{PLANET_GLYPHS[p.name as PlanetName] ?? '☊'}` — planet position list in the advance/preview tab.

**`src/components/results/SynastryTransitPage.tsx`**

- Line 77: `{PLANET_GLYPHS[p.name as PlanetName] ?? '☊'}` — planet positions table in the synastry transit view.

**`src/components/results/TransitReadingPage.tsx`**

- Line 185: `{PLANET_GLYPHS[p.name as PlanetName] ?? '☊'}` — planet positions table in the transit reading view.

**`src/components/results/SynastryPage.tsx`**

- Line 187: `const planetGlyph = PLANET_GLYPHS[entry.planet as PlanetName] ?? '☊'` — house overlay entry planet glyph.
- Line 257: `{PLANET_GLYPHS[p.name as PlanetName] ?? '☊'}` — Person 1 planet positions table.
- Line 307: `{PLANET_GLYPHS[p.name as PlanetName] ?? '☊'}` — Person 2 planet positions table.

**`src/components/results/ResultsPage.tsx`**

- Line 96: `{PLANET_GLYPHS[p.name as PlanetName] ?? '☊'}` — planet positions table in the natal results view.

**`src/engine/types.ts`** (reference, not a bug site)

- Line 27: `NorthNode: '☊'` — this is the correct definition of the North Node glyph in `PLANET_GLYPHS`. The fallback in every rendering site above resolves to this entry.

## Expected behavior

When a body name that is not in `PLANET_GLYPHS` appears at any of these 35 rendering sites, the rendered glyph should reflect the actual body or degrade gracefully — not silently assert the North Node's astrological identity.

The correct fix has two parts:

**Part 1 — Add asteroid glyphs to the lookup.** A separate `ASTEROID_GLYPHS` constant (or a merged `BODY_GLYPHS` record keyed on `BodyName`) must be defined in `src/engine/types.ts` alongside `PLANET_GLYPHS`, containing the five Unicode asteroid symbols:

- Chiron: `⚷`
- Ceres: `⚳`
- Pallas: `⚴`
- Juno: `⚵`
- Vesta: `⚶`

Every lookup site should consult `ASTEROID_GLYPHS` as a second step before falling back. The cleanest implementation: define a helper function `getBodyGlyph(name: BodyName): string` in `types.ts` that returns `PLANET_GLYPHS[name as PlanetName | 'NorthNode'] ?? ASTEROID_GLYPHS[name as AsteroidName] ?? '?'` and replace every `PLANET_GLYPHS[... as PlanetName] ?? '☊'` call site with `getBodyGlyph(name)`. This centralizes the fallback logic so it can be updated in one place.

**Part 2 — Replace the North Node fallback with a neutral placeholder.** Even with asteroid glyphs registered, unknown future body names should fall back to `'?'` (or a small circle `'●'`), not `'☊'`. The North Node glyph must not be used as a generic unknown-body placeholder anywhere in the codebase. The final fallback in `getBodyGlyph` should be a visually distinct, astrologically neutral character.

**Part 3 — Fix the no-fallback site.** `ChartWheel.tsx` line 661 (`const glyph = PLANET_GLYPHS[planet.name]`) must be converted to `getBodyGlyph(planet.name)` to prevent the blank-disk failure mode on asteroid names. This is the highest-priority individual site because it produces an invisible rendering failure rather than a misleading one.

In development mode, `getBodyGlyph` should also emit a console warning when it falls through to the final `'?'` fallback, so new body names added in future sprints are caught immediately rather than silently.
