import { normalizeAngle } from './zodiac'
import type { PlanetPosition, BodyName } from './types'

export type AspectType =
  | 'conjunction'
  | 'sextile'
  | 'square'
  | 'trine'
  | 'opposition'
  | 'semi-sextile'
  | 'quincunx'

export interface AspectDefinition {
  name: AspectType
  angle: number
  orb: number
  symbol: string
  nature: 'harmonious' | 'challenging' | 'neutral'
}

export const ASPECT_DEFINITIONS: AspectDefinition[] = [
  { name: 'conjunction', angle: 0, orb: 8, symbol: '☌', nature: 'neutral' },
  { name: 'sextile', angle: 60, orb: 6, symbol: '⚹', nature: 'harmonious' },
  { name: 'square', angle: 90, orb: 8, symbol: '□', nature: 'challenging' },
  { name: 'trine', angle: 120, orb: 8, symbol: '△', nature: 'harmonious' },
  { name: 'opposition', angle: 180, orb: 8, symbol: '☍', nature: 'challenging' },
  { name: 'semi-sextile', angle: 30, orb: 2, symbol: '⚺', nature: 'neutral' },
  { name: 'quincunx', angle: 150, orb: 3, symbol: '⚻', nature: 'challenging' },
]

export interface Aspect {
  planet1: BodyName
  planet2: BodyName
  type: AspectType
  angle: number
  orb: number
  exactAngle: number
  applying: boolean
  nature: 'harmonious' | 'challenging' | 'neutral'
  symbol: string
}

export type AspectPatternType = 'Grand Trine' | 'T-Square' | 'Grand Cross' | 'Yod'

export interface AspectPattern {
  type: AspectPatternType
  planets: (BodyName)[]
}

/**
 * Calculate the shortest angular difference between two longitudes.
 */
function angleDiff(lon1: number, lon2: number): number {
  let diff = Math.abs(normalizeAngle(lon1) - normalizeAngle(lon2))
  if (diff > 180) diff = 360 - diff
  return diff
}

/**
 * Calculate all aspects between planet pairs.
 */
export function calculateAspects(planets: PlanetPosition[]): Aspect[] {
  const aspects: Aspect[] = []

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i]
      const p2 = planets[j]
      const diff = angleDiff(p1.longitude, p2.longitude)

      for (const def of ASPECT_DEFINITIONS) {
        const orb = Math.abs(diff - def.angle)
        if (orb <= def.orb) {
          // Determine if applying or separating by comparing current orb to future orb.
          // If both planets have dailyMotion, simulate positions 24h later and check
          // whether the orb shrinks (applying) or grows (separating).
          let applying: boolean
          if (p1.dailyMotion !== undefined && p2.dailyMotion !== undefined) {
            const futureDiff = angleDiff(p1.longitude + p1.dailyMotion, p2.longitude + p2.dailyMotion)
            const futureOrb = Math.abs(futureDiff - def.angle)
            applying = futureOrb < orb
          } else {
            applying = orb < def.orb * 0.5
          }

          aspects.push({
            planet1: p1.name,
            planet2: p2.name,
            type: def.name,
            angle: def.angle,
            orb: Math.round(orb * 100) / 100,
            exactAngle: diff,
            applying,
            nature: def.nature,
            symbol: def.symbol,
          })
          break // Only one aspect per pair
        }
      }
    }
  }

  // Sort by orb (tightest first)
  aspects.sort((a, b) => a.orb - b.orb)
  return aspects
}

/**
 * Detect aspect patterns.
 */
export function detectPatterns(aspects: Aspect[]): AspectPattern[] {
  const patterns: AspectPattern[] = []

  // Build adjacency maps for specific aspect types
  const trines = aspects.filter(a => a.type === 'trine')
  const squares = aspects.filter(a => a.type === 'square')
  const oppositions = aspects.filter(a => a.type === 'opposition')
  const quincunxes = aspects.filter(a => a.type === 'quincunx')
  const sextiles = aspects.filter(a => a.type === 'sextile')

  // Grand Trine: three mutual trines
  for (let i = 0; i < trines.length; i++) {
    for (let j = i + 1; j < trines.length; j++) {
      const shared = findSharedPlanet(trines[i], trines[j])
      if (!shared) continue
      const other1 = getOtherPlanet(trines[i], shared)
      const other2 = getOtherPlanet(trines[j], shared)
      // Check if other1-other2 also have a trine
      if (trines.some(t => hasPair(t, other1, other2))) {
        const trio = [shared, other1, other2].sort()
        if (!patterns.some(p => p.type === 'Grand Trine' && arraysEqual(p.planets.sort(), trio))) {
          patterns.push({ type: 'Grand Trine', planets: trio })
        }
      }
    }
  }

  // T-Square: two squares + one opposition
  for (const opp of oppositions) {
    for (const sq1 of squares) {
      const shared1 = findSharedPlanet(opp, sq1)
      if (!shared1) continue
      const apex = getOtherPlanet(sq1, shared1)
      const oppOther = getOtherPlanet(opp, shared1)
      // Check if apex squares oppOther too
      if (squares.some(s => hasPair(s, apex, oppOther))) {
        const trio = [shared1, oppOther, apex].sort()
        if (!patterns.some(p => p.type === 'T-Square' && arraysEqual(p.planets.sort(), trio))) {
          patterns.push({ type: 'T-Square', planets: trio })
        }
      }
    }
  }

  // Grand Cross: two oppositions + four squares forming a cross
  for (let i = 0; i < oppositions.length; i++) {
    for (let j = i + 1; j < oppositions.length; j++) {
      const opp1 = oppositions[i]
      const opp2 = oppositions[j]
      const all4 = [opp1.planet1, opp1.planet2, opp2.planet1, opp2.planet2]
      if (new Set(all4).size !== 4) continue
      // Check all adjacent pairs have squares
      const hasAllSquares = hasPair(squares[0]!, opp1.planet1, opp2.planet1) || (
        squares.filter(s =>
          hasPair(s, opp1.planet1, opp2.planet1) ||
          hasPair(s, opp1.planet1, opp2.planet2) ||
          hasPair(s, opp1.planet2, opp2.planet1) ||
          hasPair(s, opp1.planet2, opp2.planet2)
        ).length >= 4
      )
      if (hasAllSquares) {
        patterns.push({ type: 'Grand Cross', planets: all4.sort() })
      }
    }
  }

  // Yod: two quincunxes + one sextile
  for (let i = 0; i < quincunxes.length; i++) {
    for (let j = i + 1; j < quincunxes.length; j++) {
      const shared = findSharedPlanet(quincunxes[i], quincunxes[j])
      if (!shared) continue
      const other1 = getOtherPlanet(quincunxes[i], shared)
      const other2 = getOtherPlanet(quincunxes[j], shared)
      if (sextiles.some(s => hasPair(s, other1, other2))) {
        const trio = [shared, other1, other2].sort()
        if (!patterns.some(p => p.type === 'Yod' && arraysEqual(p.planets.sort(), trio))) {
          patterns.push({ type: 'Yod', planets: trio })
        }
      }
    }
  }

  return patterns
}

// Helpers
function findSharedPlanet(a1: Aspect, a2: Aspect): (BodyName) | null {
  if (a1.planet1 === a2.planet1 || a1.planet1 === a2.planet2) return a1.planet1
  if (a1.planet2 === a2.planet1 || a1.planet2 === a2.planet2) return a1.planet2
  return null
}

function getOtherPlanet(a: Aspect, planet: BodyName): BodyName {
  return a.planet1 === planet ? a.planet2 : a.planet1
}

function hasPair(a: Aspect, p1: BodyName, p2: BodyName): boolean {
  return (a.planet1 === p1 && a.planet2 === p2) || (a.planet1 === p2 && a.planet2 === p1)
}

function arraysEqual(a: (string)[], b: (string)[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}
