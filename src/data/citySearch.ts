import type { City } from './cityTypes'

let citiesCache: City[] | null = null

export async function loadCities(): Promise<City[]> {
  if (citiesCache) return citiesCache
  const data = await import('./cities.json')
  citiesCache = data.default as City[]
  return citiesCache
}

export function searchCities(cities: City[], query: string, limit = 10): City[] {
  if (!query || query.length < 2) return []
  const lower = query.toLowerCase()

  const results: { city: City; score: number }[] = []

  for (const city of cities) {
    const nameLower = city.name.toLowerCase()

    let score = 0
    if (nameLower === lower) {
      score = 100
    } else if (nameLower.startsWith(lower)) {
      score = 80
    } else if (nameLower.includes(lower)) {
      score = 50
    } else {
      continue
    }

    // Boost by population (log scale)
    score += Math.log10(Math.max(city.pop, 1)) * 2

    results.push({ city, score })
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, limit).map(r => r.city)
}

export function formatCity(city: City): string {
  if (city.region && !/^\d+$/.test(city.region)) {
    return `${city.name}, ${city.region}, ${city.country}`
  }
  return `${city.name}, ${city.country}`
}
