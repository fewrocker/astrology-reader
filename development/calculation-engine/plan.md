# Calculation Engine — Plan

## Description
Core astronomical calculation module using `astronomy-engine`. Computes all planetary positions, house cusps, and angles from birth data.

## Tasks
- [ ] Define TypeScript types for all calculation outputs (PlanetPosition, HouseCusp, ChartData, etc.)
- [ ] Implement planetary position calculations (Sun through Pluto + North Node) using astronomy-engine
- [ ] Implement zodiac sign/degree/minute conversion from ecliptic longitude
- [ ] Implement Ascendant and Midheaven calculation
- [ ] Implement Placidus house cusp calculations
- [ ] Implement retrograde detection
- [ ] Create main `calculateChart()` function that orchestrates all calculations
- [ ] Test with known birth charts for accuracy verification
