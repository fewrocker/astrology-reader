export type TarotSuit = 'wands' | 'cups' | 'swords' | 'pentacles'
export type TarotArcana = 'major' | 'minor'
export type TarotElement = 'Fire' | 'Water' | 'Air' | 'Earth'

// Court: Page=11, Knight=12, Queen=13, King=14
// Pip: Ace=1 through 10
// Major Arcana: 0 (The Fool) through 21 (The World)
export type TarotNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21

export interface TarotCard {
  id: string
  name: string
  arcana: TarotArcana
  suit?: TarotSuit
  number: TarotNumber

  element: TarotElement | null
  rulingPlanet?: string
  rulingSign?: string

  keywords: string[]
  uprightMeaning: string
  reversedMeaning: string
  symbolicTheme: string
  emotionalMeaning: string
  practicalGuidance: string
  reflectionQuestion: string
  numerologyResonance: string
}

export type SpreadType =
  | 'single'
  | 'three-past-present-future'
  | 'three-situation-challenge-advice'
  | 'three-mind-heart-action'
  | 'three-self-other-bridge'
  | 'three-theme-shadow-gift'
  | 'celtic-cross'

export interface SpreadPosition {
  id: string
  label: string
  meaning: string
  spreadType: SpreadType
  positionIndex: number
}

export interface CardAstroConnection {
  cardId: string
  element: TarotElement | null
  rulingPlanet: string | null
  rulingSign: string | null
  planetElement: TarotElement | null
  signElement: TarotElement | null
  baselineNote: string
}

export interface TransitAdaptation {
  cardId: string
  planet: string
  condition: 'retrograde' | 'direct' | 'any'
  emphasis: string
}
