import type { PlanetName, ZodiacSign, Element, Modality, PlanetPosition, ChartData } from '../../engine/types'
import { SIGN_ELEMENTS, SIGN_MODALITIES } from '../../engine/types'
import type { Aspect } from '../../engine/aspects'
import type { FocusArea } from '../../context/appState'
import type { InterpretationEntry } from './types'
import { FOCUS_AREA_MAPPINGS, ELEMENT_INTERPRETATIONS, MODALITY_INTERPRETATIONS } from './types'
import { PLANET_IN_SIGN } from './planetInSign'
import { PLANET_IN_HOUSE } from './planetInHouse'
import { ASPECT_INTERPRETATIONS } from './aspectInterpretations'

// ---------- lookup helpers ----------

export function getPlanetInSignInterpretation(planet: PlanetName | 'NorthNode', sign: ZodiacSign): InterpretationEntry | null {
  return PLANET_IN_SIGN[`${planet}_${sign}`] ?? null
}

export function getPlanetInHouseInterpretation(planet: PlanetName | 'NorthNode', house: number): InterpretationEntry | null {
  return PLANET_IN_HOUSE[`${planet}_H${house}`] ?? null
}

/** Look up an aspect interpretation. Tries both planet orderings. */
export function getAspectInterpretation(aspect: Aspect): InterpretationEntry | null {
  const typeKey = aspect.type.charAt(0).toUpperCase() + aspect.type.slice(1) as string
  // try canonical order then reversed
  const key1 = `${aspect.planet1}_${typeKey}_${aspect.planet2}`
  const key2 = `${aspect.planet2}_${typeKey}_${aspect.planet1}`
  return ASPECT_INTERPRETATIONS[key1] ?? ASPECT_INTERPRETATIONS[key2] ?? null
}

// ---------- element / modality balance ----------

export interface ElementBalance {
  counts: Record<Element, number>
  dominant: Element
  lacking: Element | null
  interpretation: { dominant: string; lacking: string | null }
}

export interface ModalityBalance {
  counts: Record<Modality, number>
  dominant: Modality
  lacking: Modality | null
  interpretation: { dominant: string; lacking: string | null }
}

export function analyzeElements(planets: PlanetPosition[]): ElementBalance {
  const counts: Record<Element, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 }
  for (const p of planets) {
    counts[SIGN_ELEMENTS[p.sign]] += 1
  }
  const sorted = (Object.entries(counts) as [Element, number][]).sort((a, b) => b[1] - a[1])
  const dominant = sorted[0][0]
  const lacking = sorted[3][1] === 0 ? sorted[3][0] : null
  return {
    counts,
    dominant,
    lacking,
    interpretation: {
      dominant: ELEMENT_INTERPRETATIONS[dominant].dominant,
      lacking: lacking ? ELEMENT_INTERPRETATIONS[lacking].lacking : null,
    },
  }
}

export function analyzeModalities(planets: PlanetPosition[]): ModalityBalance {
  const counts: Record<Modality, number> = { Cardinal: 0, Fixed: 0, Mutable: 0 }
  for (const p of planets) {
    counts[SIGN_MODALITIES[p.sign]] += 1
  }
  const sorted = (Object.entries(counts) as [Modality, number][]).sort((a, b) => b[1] - a[1])
  const dominant = sorted[0][0]
  const lacking = sorted[2][1] === 0 ? sorted[2][0] : null
  return {
    counts,
    dominant,
    lacking,
    interpretation: {
      dominant: MODALITY_INTERPRETATIONS[dominant].dominant,
      lacking: lacking ? MODALITY_INTERPRETATIONS[lacking].lacking : null,
    },
  }
}

// ---------- full reading assembly ----------

export interface PlanetReading {
  planet: PlanetPosition
  signInterpretation: InterpretationEntry | null
  houseInterpretation: InterpretationEntry | null
}

export interface AspectReading {
  aspect: Aspect
  interpretation: InterpretationEntry | null
}

export interface FocusReading {
  area: FocusArea
  description: string
  relevantPlanets: PlanetReading[]
  relevantAspects: AspectReading[]
}

export interface FullReading {
  planets: PlanetReading[]
  aspects: AspectReading[]
  elements: ElementBalance
  modalities: ModalityBalance
  focus: FocusReading | null
}

export function assembleReading(chart: ChartData, aspects: Aspect[], focusArea?: FocusArea): FullReading {
  const planetReadings: PlanetReading[] = chart.planets.map((p) => ({
    planet: p,
    signInterpretation: getPlanetInSignInterpretation(p.name, p.sign),
    houseInterpretation: chart.unknownTime ? null : getPlanetInHouseInterpretation(p.name, p.house),
  }))

  const aspectReadings: AspectReading[] = aspects.map((a) => ({
    aspect: a,
    interpretation: getAspectInterpretation(a),
  }))

  const elements = analyzeElements(chart.planets)
  const modalities = analyzeModalities(chart.planets)

  let focus: FocusReading | null = null
  if (focusArea) {
    const mapping = FOCUS_AREA_MAPPINGS[focusArea]
    const relevantPlanets = planetReadings.filter(
      (pr) => mapping.planets.includes(pr.planet.name as PlanetName)
    )
    const relevantAspects = aspectReadings.filter(
      (ar) =>
        mapping.planets.includes(ar.aspect.planet1 as PlanetName) ||
        mapping.planets.includes(ar.aspect.planet2 as PlanetName)
    )
    focus = {
      area: focusArea,
      description: mapping.description,
      relevantPlanets,
      relevantAspects,
    }
  }

  return { planets: planetReadings, aspects: aspectReadings, elements, modalities, focus }
}
