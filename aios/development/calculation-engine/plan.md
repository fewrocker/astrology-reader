# Calculation Engine — Plan

## Description
Core astronomical calculation module using `astronomy-engine`. Computes all planetary positions, house cusps, and angles from birth data.

## Tasks
- [x] Define TypeScript types for all calculation outputs (PlanetPosition, HouseCusp, ChartData, etc.)
- [x] Implement planetary position calculations (Sun through Pluto + North Node) using astronomy-engine
- [x] Implement zodiac sign/degree/minute conversion from ecliptic longitude
- [x] Implement Ascendant and Midheaven calculation
- [x] Implement Placidus house cusp calculations
- [x] Implement retrograde detection
- [x] Create main `calculateChart()` function that orchestrates all calculations
- [x] Test with known birth charts for accuracy verification
