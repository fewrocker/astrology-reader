import * as Astronomy from 'astronomy-engine'
import { elliptic, planetposition } from 'astronomia'
import vsop87Bearth from 'astronomia/data/vsop87Bearth'

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

// Asteroid names set — inline to avoid cross-rootDir import from src/engine/types.ts
const ASTEROID_NAMES_SET = new Set(['Chiron', 'Ceres', 'Pallas', 'Juno', 'Vesta'])
function isAsteroid(name: string): boolean {
  return ASTEROID_NAMES_SET.has(name)
}

// Keplerian elements for asteroid position calculation (mirrors src/engine/asteroidElements.ts)
// Keep in sync if elements are updated in the client module.
const D2R = Math.PI / 180
const ASTEROID_ELEMENTS: Record<string, {
  axis: number; ecc: number; inc: number; argP: number; node: number; timeP: number
}> = {
  Chiron:  { axis: 13.6378, ecc: 0.38259, inc: 6.9302*D2R,  argP: 339.32*D2R, node: 209.07*D2R, timeP: 2450128.3 },
  Ceres:   { axis: 2.7685,  ecc: 0.07590, inc: 10.5935*D2R, argP: 73.5971*D2R, node: 80.3293*D2R, timeP: 2451096.1 },
  Pallas:  { axis: 2.7726,  ecc: 0.23026, inc: 34.839*D2R,  argP: 310.17*D2R, node: 173.08*D2R, timeP: 2450411.0 },
  Juno:    { axis: 2.6696,  ecc: 0.25625, inc: 12.985*D2R,  argP: 248.15*D2R, node: 169.84*D2R, timeP: 2449954.6 },
  Vesta:   { axis: 2.3619,  ecc: 0.08949, inc: 7.135*D2R,   argP: 149.88*D2R, node: 103.85*D2R, timeP: 2450710.7 },
}

let _earth: unknown = null
function getEarth(): unknown {
  if (!_earth) _earth = new planetposition.Planet(vsop87Bearth)
  return _earth
}

function asteroidEclipticLon(name: string, jde: number, obliquityRad: number): number {
  const elements = ASTEROID_ELEMENTS[name]
  if (!elements) return 0
  const elem = new elliptic.Elements(elements)
  const coord = elem.position(jde, getEarth())
  const lambda = Math.atan2(
    Math.sin(coord.ra) * Math.cos(obliquityRad) + Math.tan(coord.dec) * Math.sin(obliquityRad),
    Math.cos(coord.ra),
  )
  const deg = lambda * (180 / Math.PI)
  return ((deg % 360) + 360) % 360
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
  // Classical element analysis — asteroids excluded to prevent clustering skew
  const classical = planets.filter(p => !isAsteroid((p as { name?: string }).name ?? ''))
  const counts: Record<Element, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 }
  for (const p of classical) {
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

export function getPlanetLongitude(body: Astronomy.Body, time: Astronomy.AstroTime): number {
  if (body === Astronomy.Body.Sun) return Astronomy.SunPosition(time).elon
  if (body === Astronomy.Body.Moon) return Astronomy.EclipticGeoMoon(time).lon
  return Astronomy.Ecliptic(Astronomy.GeoVector(body, time, true)).elon
}

export function getMeanNodeLongitude(time: Astronomy.AstroTime): number {
  const T = time.tt / 36525
  return normalizeAngle(
    125.0445479
    - 1934.1362891 * T
    + 0.0020754 * T * T
    + T * T * T / 467441
    - T * T * T * T / 60616000,
  )
}

export function getDailyMotion(body: Astronomy.Body, time: Astronomy.AstroTime): number {
  const lon1 = getPlanetLongitude(body, time)
  const timePlus = Astronomy.MakeTime(new Date(time.date.getTime() + 86400000))
  const lon2 = getPlanetLongitude(body, timePlus)
  let diff = lon2 - lon1
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return diff
}

export function getHouseForLongitude(longitude: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i]
    const end = cusps[(i + 1) % 12]
    if (start < end ? longitude >= start && longitude < end : longitude >= start || longitude < end) {
      return i + 1
    }
  }
  return 1
}
