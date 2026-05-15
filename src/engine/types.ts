export const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const

export type ZodiacSign = typeof ZODIAC_SIGNS[number]

export const ZODIAC_GLYPHS: Record<ZodiacSign, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
}

export type PlanetName =
  | 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars'
  | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto'

export const PLANET_NAMES: PlanetName[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
]

export const PLANET_GLYPHS: Record<PlanetName | 'NorthNode', string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  NorthNode: '☊',
}

export interface ZodiacPosition {
  longitude: number    // 0-360 ecliptic degrees
  sign: ZodiacSign
  signIndex: number    // 0-11
  degree: number       // 0-29 within sign
  minute: number       // 0-59 arcminutes
}

export interface PlanetPosition extends ZodiacPosition {
  name: PlanetName | 'NorthNode'
  retrograde: boolean
  house: number        // 1-12
  dailyMotion?: number // degrees per day; positive = direct, negative = retrograde
}

export interface HouseCusp {
  house: number        // 1-12
  longitude: number    // 0-360
  sign: ZodiacSign
  degree: number
  minute: number
}

export interface ChartAngles {
  ascendant: ZodiacPosition
  midheaven: ZodiacPosition
  descendant: ZodiacPosition
  imumCoeli: ZodiacPosition
}

export type Element = 'Fire' | 'Earth' | 'Air' | 'Water'
export type Modality = 'Cardinal' | 'Fixed' | 'Mutable'

export const SIGN_ELEMENTS: Record<ZodiacSign, Element> = {
  Aries: 'Fire', Taurus: 'Earth', Gemini: 'Air', Cancer: 'Water',
  Leo: 'Fire', Virgo: 'Earth', Libra: 'Air', Scorpio: 'Water',
  Sagittarius: 'Fire', Capricorn: 'Earth', Aquarius: 'Air', Pisces: 'Water',
}

export const SIGN_MODALITIES: Record<ZodiacSign, Modality> = {
  Aries: 'Cardinal', Taurus: 'Fixed', Gemini: 'Mutable', Cancer: 'Cardinal',
  Leo: 'Fixed', Virgo: 'Mutable', Libra: 'Cardinal', Scorpio: 'Fixed',
  Sagittarius: 'Mutable', Capricorn: 'Cardinal', Aquarius: 'Fixed', Pisces: 'Mutable',
}

export interface ChartData {
  planets: PlanetPosition[]
  houses: HouseCusp[]
  angles: ChartAngles
  unknownTime: boolean
  houseSystem: 'placidus' | 'whole-sign'
}
