import type { ChartData, PlanetName } from '../../engine/types'

export interface NatalPlanetContext {
  house: number | null
  sign: string
}

/**
 * Returns the natal house and sign for a given planet name, using the provided ChartData.
 *
 * House is returned as `null` when `chartData.unknownTime` is true (houses are not computed
 * without a birth time) or when the planet is not found in the chart. This prevents the
 * "House 0" display bug and forces callers to handle the null case explicitly, falling back
 * to sign-only language rather than rendering nonsense or crashing.
 *
 * Sign is always returned (empty string if planet not found) because sign placement is
 * available regardless of birth time.
 */
export function getNatalPlanetContext(
  planetName: PlanetName | 'NorthNode',
  chartData: ChartData
): NatalPlanetContext {
  const planet = chartData.planets.find(p => p.name === planetName)
  if (!planet) {
    return { house: null, sign: '' }
  }
  return {
    house: chartData.unknownTime ? null : (planet.house > 0 ? planet.house : null),
    sign: planet.sign ?? '',
  }
}
