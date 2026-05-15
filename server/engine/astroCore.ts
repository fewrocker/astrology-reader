import * as Astronomy from 'astronomy-engine'
export { getPlanetLongitude, getMeanNodeLongitude, getDailyMotion, getHouseForLongitude } from '../../src/engine/ephemeris'

// ---------- Types ----------

export const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const
export type ZodiacSign = typeof ZODIAC_SIGNS[number]

export const PLANET_NAMES = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const
export type PlanetName = typeof PLANET_NAMES[number]

export interface ZodiacPosition {
  longitude: number
  sign: ZodiacSign
  signIndex: number
  degree: number
  minute: number
}

export const BODY_MAP: Record<PlanetName, Astronomy.Body> = {
  Sun: Astronomy.Body.Sun,
  Moon: Astronomy.Body.Moon,
  Mercury: Astronomy.Body.Mercury,
  Venus: Astronomy.Body.Venus,
  Mars: Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn: Astronomy.Body.Saturn,
  Uranus: Astronomy.Body.Uranus,
  Neptune: Astronomy.Body.Neptune,
  Pluto: Astronomy.Body.Pluto,
}

// ---------- Aspect definitions ----------

export type AspectType =
  | 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'
  | 'semi-sextile' | 'quincunx'

export interface AspectDefinition {
  name: AspectType
  angle: number
  orb: number
  symbol: string
  nature: 'harmonious' | 'challenging' | 'neutral'
}

// Canonical natal orbs — base table for all period-scaled transit calculations
export const ASPECT_DEFINITIONS: AspectDefinition[] = [
  { name: 'conjunction',  angle: 0,   orb: 8, symbol: '☌', nature: 'neutral'     },
  { name: 'sextile',      angle: 60,  orb: 6, symbol: '⚹', nature: 'harmonious'  },
  { name: 'square',       angle: 90,  orb: 8, symbol: '□', nature: 'challenging' },
  { name: 'trine',        angle: 120, orb: 8, symbol: '△', nature: 'harmonious'  },
  { name: 'opposition',   angle: 180, orb: 8, symbol: '☍', nature: 'challenging' },
  { name: 'semi-sextile', angle: 30,  orb: 2, symbol: '⚺', nature: 'neutral'     },
  { name: 'quincunx',     angle: 150, orb: 3, symbol: '⚻', nature: 'challenging' },
]

// ---------- Element analysis ----------

type Element = 'Fire' | 'Earth' | 'Air' | 'Water'

export const SIGN_ELEMENTS: Record<ZodiacSign, Element> = {
  Aries: 'Fire',       Taurus: 'Earth',     Gemini: 'Air',   Cancer: 'Water',
  Leo: 'Fire',         Virgo: 'Earth',      Libra: 'Air',    Scorpio: 'Water',
  Sagittarius: 'Fire', Capricorn: 'Earth',  Aquarius: 'Air', Pisces: 'Water',
}

const ELEMENT_INTERPRETATIONS: Record<Element, { dominant: string; lacking: string }> = {
  Fire: {
    dominant: "You lead with passion, enthusiasm, and courage. You're naturally action-oriented and inspire others with your energy and confidence.",
    lacking: "You may sometimes struggle with motivation or assertiveness. Cultivating spontaneity and physical activity can help ignite your inner fire.",
  },
  Earth: {
    dominant: "You're grounded, practical, and reliable. You build things that last and have a strong connection to the material world and physical senses.",
    lacking: "You may find it challenging to stay organized or follow through on practical matters. Establishing routines and connecting with nature can help.",
  },
  Air: {
    dominant: "You're intellectually curious, communicative, and socially adept. Ideas flow easily to you, and you thrive on mental stimulation and connection.",
    lacking: "You may sometimes struggle to articulate your thoughts or feel disconnected from intellectual pursuits. Journaling and conversation can stimulate this energy.",
  },
  Water: {
    dominant: "You're deeply intuitive, emotionally rich, and empathetic. You navigate the world through feeling and have powerful instincts about people and situations.",
    lacking: "You may find it difficult to access or express emotions. Creative outlets and time near water can help you connect with your emotional depth.",
  },
}

export interface ElementBalance {
  counts: Record<Element, number>
  dominant: Element
  lacking: Element | null
  interpretation: { dominant: string; lacking: string | null }
}

// ported from src/data/interpretations/index.ts — keep in sync with frontend
export function analyzeElements(planets: ZodiacPosition[]): ElementBalance {
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

// ---------- Core utility functions ----------

export function normalizeAngle(a: number): number {
  return ((a % 360) + 360) % 360
}

export function longitudeToZodiac(lon: number): ZodiacPosition {
  const norm = ((lon % 360) + 360) % 360
  const signIndex = Math.floor(norm / 30)
  const degInSign = norm - signIndex * 30
  const degree = Math.floor(degInSign)
  const minute = Math.floor((degInSign - degree) * 60)
  return { longitude: norm, sign: ZODIAC_SIGNS[signIndex], signIndex, degree, minute }
}
