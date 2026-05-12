import type { ChartData } from './types'
import { reduceToSingleDigit } from './numerology'

export interface NumerologyChartPoint {
  label: string
  eclipticDegree: number
  reducedNumber: number
  source: 'planet' | 'house_cusp' | 'node'
}

export interface NumerologyChartData {
  points: NumerologyChartPoint[]
  frequencyMap: Record<number, NumerologyChartPoint[]>
}

export function buildNumerologyChartData(chartData: ChartData): NumerologyChartData {
  const points: NumerologyChartPoint[] = []

  // Planets (10 planets + NorthNode)
  for (const planet of chartData.planets) {
    const degreeInt = Math.floor(planet.longitude)
    const reducedNumber = reduceToSingleDigit(degreeInt)

    if (planet.name === 'NorthNode') {
      points.push({
        label: 'North Node',
        eclipticDegree: planet.longitude,
        reducedNumber,
        source: 'node',
      })
    } else {
      points.push({
        label: planet.name,
        eclipticDegree: planet.longitude,
        reducedNumber,
        source: 'planet',
      })
    }
  }

  // House cusps — only when birth time is known
  if (!chartData.unknownTime) {
    for (const house of chartData.houses) {
      const degreeInt = Math.floor(house.longitude)
      const reducedNumber = reduceToSingleDigit(degreeInt)
      points.push({
        label: `House ${house.house}`,
        eclipticDegree: house.longitude,
        reducedNumber,
        source: 'house_cusp',
      })
    }
  }

  // Build frequency map
  const frequencyMap: Record<number, NumerologyChartPoint[]> = {}
  for (const point of points) {
    if (!frequencyMap[point.reducedNumber]) {
      frequencyMap[point.reducedNumber] = []
    }
    frequencyMap[point.reducedNumber].push(point)
  }

  return { points, frequencyMap }
}
