# Sprint 0015 — Changelog

**Completed:** 2026-05-15

## Code Improvements

### Asteroid Interpretation Wire-up (task-0001)
**Problem:** 125 asteroid interpretation entries authored in sprint-0014 (60 sign, 60 house, 5 retrograde) were unreachable at runtime because `getPlanetInSignInterpretation` and `getPlanetInHouseInterpretation` accepted only `PlanetName | 'NorthNode'`, and `assembleReading()` had explicit `!isAsteroid()` guards forcing all three interpretation fields to `null` for every asteroid. The chart tooltip (`PlanetTooltip` in `ChartWheel.tsx`) had the same three suppression guards independently.
**Solution:** Widened both lookup function signatures to accept `BodyName` (the full union), removed the three `isAsteroid()` guards from `assembleReading()` on `signInterpretation`, `houseInterpretation`, and `retrogradeInterpretation`, and removed the matching guards from `PlanetTooltip`. The `dignity` guard remains — asteroid dignity is not a defined concept. All 125 interpretation entries are now live.

## Features

### Asteroid Reading Section (task-0002)
**Problem:** The five asteroids (Chiron, Ceres, Pallas, Juno, Vesta) appeared only as bare position rows in the planet table — their 60 sign and 60 house interpretations were never displayed to the user, and the archetype vocabulary (Wounded Healer, Nourisher, Strategist, Devoted Partner, Sacred Flame) had no surface in the reading UI.
**Solution:** Added a new `AsteroidSection` accordion component in the birth chart reading, rendered between the classical planet section and the aspect section. Each asteroid gets its own `AsteroidCard` with archetype badge, sign/house placement, and full expanded interpretation blocks (sign detail, house detail, retrograde note when applicable). Updated `PlanetSection` and `PlanetaryStrengthSection` to filter out asteroids so they no longer appear mixed into the classical planet list.
**What it is:** A dedicated "Asteroids & Minor Bodies" accordion — collapsed by default — that surfaces expressive, personalized interpretations for all five asteroids in the user's natal chart, using amber theming to visually distinguish this deeper symbolic layer from the classical planet content.
**How to use it:** Open the birth chart reading, scroll past the Planets section, and click "Asteroids & Minor Bodies" to expand. Click any asteroid card to read its full sign and house interpretation.
