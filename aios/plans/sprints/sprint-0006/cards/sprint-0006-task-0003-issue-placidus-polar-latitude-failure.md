# issue-placidus-polar-latitude-failure

**Type:** Issue Fix  
**Originated by:** Taleb  
**User guidance:** Not directly addressed in guidelines.md — this is a correctness fix for users at high latitudes, not a new feature.

---

## Problem

`placidusCusp()` in `src/engine/astronomy.ts` (lines 155–192) silently produces wrong house cusps for birth latitudes above roughly 60°N (Helsinki 60.2°N, Oslo 59.9°N, Stockholm 59.3°N, Reykjavik 64.1°N, Anchorage 61.2°N).

**The exact failure mechanism (lines 171–176):**

```ts
for (let i = 0; i < 50; i++) {
  const lon = eclipticLongFromRA(targetRA * Astronomy.DEG2RAD, oblRad)
  const decl = Math.asin(Math.sin(oblRad) * Math.sin(lon * Astronomy.DEG2RAD))
  const ad = Math.asin(Math.tan(latRad) * Math.tan(decl))

  if (!isFinite(ad)) break // polar regions
  ...
}
```

At high latitudes, `Math.tan(latRad) * Math.tan(decl)` can exceed ±1, causing `Math.asin(...)` to return `NaN`. The guard `if (!isFinite(ad)) break` exits the loop immediately — but it does so without setting any flag or throwing any error. Execution falls through to line 191:

```ts
return eclipticLongFromRA(targetRA * Astronomy.DEG2RAD, oblRad)
```

`targetRA` at that point is still the equal-arc initial guess from line 168 (never refined), so the function returns a plausible-looking but astronomically incorrect ecliptic longitude.

**Downstream propagation:**

- `calculatePlacidusHouses()` (lines 120–147) calls `placidusCusp()` for houses 11, 12, 2, and 3, receiving four quietly incorrect cusps. Houses 5, 6, 8, and 9 are derived from these by adding 180°, so all eight intermediate cusps are wrong.
- `getHouseForLongitude()` (lines 204–218) uses these corrupted cusps to assign every planet to a house number. All planet house assignments are silently incorrect.
- `ChartData.houses` (built at lines 283–291 of `astronomy.ts`) carries the wrong cusp longitudes into every consuming component.

**Every surface that displays house information is affected:**

| Component | File | What it shows |
|---|---|---|
| `HousesOverview` | `src/components/reading/ReadingDisplay.tsx:412` | Cusp sign per house, planets per house |
| `PlanetCard` | `src/components/reading/ReadingDisplay.tsx:78` | "House N" label per planet |
| `PlanetTooltip` / `HouseTooltip` | `src/components/chart/ChartWheel.tsx:68, 175` | House cusp in tooltip, planets in house |
| Planet positions table | `src/components/results/ResultsPage.tsx:85–99` | House column per planet |
| `ChartWheel` house spokes | `src/components/chart/ChartWheel.tsx:552–597` | House cusp lines drawn on wheel SVG |

**Reproduction:** Enter any birth data with latitude above ~60°N and a known time. Houses 11, 12, 2, 3 (and their opposites 5, 6, 8, 9) will be at equal-arc positions (30° arcs from MC/ASC), not Placidus positions. For charts where a planet sits near a cusp boundary, it may be assigned to the wrong house entirely.

## Expected Behavior

When `placidusCusp()` cannot converge for a given latitude — because `!isFinite(ad)` fires on the first iteration or any iteration — the engine should:

1. **Detect the failure** and signal it clearly rather than returning the unconverged initial guess.
2. **Fall back to Whole Sign houses**: house 1 starts at 0° of the Ascendant's sign, each subsequent house is the next whole sign (30° wide). This is the oldest, most geographically universal system and is arithmetically valid at any latitude.
3. **Annotate `ChartData`** with a flag (e.g. `houseSystem: 'placidus' | 'whole-sign'`) so UI components can conditionally surface a note to the user.
4. **Display a brief, non-alarming note** in the Results page — something like "Whole Sign houses used (Placidus is undefined above 60°N)" — so the user understands their chart is accurate but uses a different system.

No error should be thrown; the chart should render completely and correctly. The note should be subtle (e.g. a muted line beneath the Houses Overview section title), not a modal or warning banner.

## Files to Change

| File | Change |
|---|---|
| `src/engine/types.ts` | Add `houseSystem: 'placidus' \| 'whole-sign'` to `ChartData` interface |
| `src/engine/astronomy.ts` | Refactor `placidusCusp()` to return `number \| null` (null = unconverged); update `calculatePlacidusHouses()` to detect null returns, fall back to Whole Sign cusps, and return both the cusp array and the system used; thread `houseSystem` into `calculateChart()` return value |
| `src/components/reading/ReadingDisplay.tsx` | Accept `houseSystem` in `HousesOverview` props; render a muted note when `houseSystem === 'whole-sign'` |

## Impact

**High** — produces silently wrong house data for all users born above ~60°N, with no error surfaced. Any interpretation that references house placement (planet-in-house readings, houses overview, cusp signs on the wheel) is incorrect.

**Effort** — Low (~40 lines across three files). The Whole Sign fallback is trivially computed: `cusps[i] = normalizeAngle(Math.floor(ascLon / 30) * 30 + i * 30)`. No new dependencies.

## Dependencies

None — fully self-contained in the engine and two display components.
